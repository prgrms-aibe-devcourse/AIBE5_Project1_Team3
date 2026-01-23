/* 파일 경로: /js/AIchat.js */
// [의도] 외부 라이브러리 직접 로드 (브라우저가 AI와 직접 통신)
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// =========================================================
// 1. [VALUE DECLARATION] - 설정 및 전역 변수
// =========================================================

// [의도] marked 렌더러 생성 [cite: 2025-11-17]
const renderer = new marked.Renderer();

/**
 * [수정 핵심] marked 최신 버전에서는 인자가 객체 형태로 들어오는 경우가 많습니다.
 * 아래와 같이 인자를 구조 분해 할당하거나, 안전하게 href를 추출해야 합니다. [cite: 2025-11-17]
 */
renderer.link = (arg) => {
    // [의도] 인자가 객체일 경우와 일반 문자열일 경우를 모두 대응 [cite: 2025-11-17]
    const href = arg.href || arg; 
    const text = arg.text || href;
    const title = arg.title || "";

    // [결과] [object Object] 방지를 위해 명확한 href 문자열 사용 [cite: 2025-11-17]
    return `<a href="${href}" title="${title}" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

marked.setOptions({ renderer: renderer });

// [의도] 서버에서 관리하던 5개의 키를 클라이언트로 이동 (로테이션 관리)
const API_KEYS = [
    "AIzaSyBAzemH99kmlJWNHxMdo77eToqT48HBLIo",
    "AIzaSyB_UQO3yrYJgKf1GrrxN_eTIhL7mLusOxE",
    "AIzaSyB3UZbwSdKMyLDPD4V4qQJXkcsYp2FL93A",
    "AIzaSyARP9esQe-nx_Bzbm4fTqtLHMXTrcAV4e0",
    "AIzaSyANKs0xet8h2n_OeAFgYM_5sW0iJ_E-C_8"
];

let currentKeyIndex = 0; // [의도] 실패 시 다음 키를 가리키는 인덱스

// [인자 출처: HTML 상단 data.js에서 로드된 전역 변수 ARTICLES]
const localKnowledge = ARTICLES || []; 

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const inputContainer = document.getElementById('input-container');

// =========================================================
// 2. [MAIN LOOP] - 사용자 요청 및 이벤트 처리 루프
// =========================================================

// [의도] 전송 버튼 클릭 및 엔터키 입력 시 대화 프로세스 시작
sendButton.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
    // [의도] 로딩 중이 아닐 때만 엔터키 전송 허용
    if (e.key === 'Enter' && !sendButton.disabled) {
        sendMessage();
    }
});

/**
 * [의도] 대화의 전체 시퀀스를 제어 (입력->빌드->AI호출->출력)
 */
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // 1) UI 업데이트: 사용자 메시지 즉시 표시 및 입력창 초기화
    addMessage('user', message);
    userInput.value = '';
    setLoading(true);

    try {
        // 2) 프롬프트 빌드 (함수 선언부 참조)
        const finalPrompt = buildPrompt(message, localKnowledge);

        // 3) AI 응답 획득 (키 로테이션 로직 포함 함수 호출)
        const aiResponse = await getAiWithFailover(finalPrompt);
        
        // 4) UI 업데이트: AI 답장 표시 및 JSON 데이터 추출
        addMessage('ai', aiResponse);
        handleExtraction(aiResponse);

    } catch (error) {
        console.error("최종 통신 실패:", error);
        addMessage('ai', "모든 API 키가 만료되었거나 네트워크 연결에 문제가 있습니다.");
    } finally {
        setLoading(false);
    }
}

// =========================================================
// 3. [FUNCTION DECLARATION] - 핵심 로직 및 보조 함수들
// =========================================================

/**
 * [의도] API 키 5개를 순환하며 성공할 때까지 AI 호출을 시도함
 * @param {string} prompt - [인자 출처: sendMessage 내 buildPrompt 결과값]
 */
async function getAiWithFailover(prompt) {
    // [의도] 키 배열의 길이만큼 반복하며 실패 시 다음 키 시도
    for (let i = 0; i < API_KEYS.length; i++) {
        const activeKey = API_KEYS[currentKeyIndex];
        
        try {
            const genAI = new GoogleGenerativeAI(activeKey);
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash",
                systemInstruction: `
                너는 'T3 여행 가이드'야. 
                반드시 제공된 [여행지 데이터] 목록에 있는 장소만을 추천해야 해. 
                데이터에 없는 장소에 대해 물으면 모른다고 답하거나 데이터 내의 유사한 곳을 제안해.
                추천 장소를 언급할 때는 반드시 아래 링크 형식을 사용해.
                형식: [장소이름](http://127.0.0.1:5500/html/article.html?id=장소ID)
                답변 끝에는 항상 {"recommend_id": "해당_ID"} 형식의 JSON을 붙여줘.
                `
            });

            const result = await model.generateContent(prompt);
            return result.response.text(); // 성공 시 텍스트 반환 후 루프 종료

        } catch (err) {
            console.warn(`${currentKeyIndex + 1}번 키 오류, 다음 키로 전환합니다.`);
            // [의도] 다음 키 인덱스로 갱신 (마지막 번호면 0으로 순환)
            currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        }
    }
    throw new Error("All Keys Exhausted");
}

/**
 * [의도] 질문과 ARTICLES 데이터를 결합하여 최종 지시문 생성
 * @param {string} msg - [인자 출처: sendMessage의 message]
 * @param {Array} articles - [인자 출처: 1번 밸류 선언부의 localKnowledge]
 */
function buildPrompt(msg, articles) {
    // [의도] AI가 이해하기 쉽게 데이터 전처리
    const context = JSON.stringify(articles.map(a => ({ 
        id: a.id, 
        title: a.title, 
        tags: a.tags, 
        desc: a.description 
    })));

    return `
        [여행 데이터베이스]:
        ${context}

        [사용자 질문]:
        ${msg}

        위 데이터를 기반으로 답변하고, 추천하는 장소가 있다면 반드시 아래 형식의 JSON을 답변 끝에 포함해줘:
        {"recommend_id": "장소ID"}
    `;
}

/**
 * [의도] 화면에 메시지 말풍선을 추가하고 마크다운을 렌더링함
 * @param {string} sender - 'user' 또는 'ai' [인자 출처: sendMessage]
 * @param {string} text - 출력할 텍스트 [인자 출처: AI 답변 혹은 입력값]
 */
function addMessage(sender, text) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    
    // [의도] AI 답변일 경우에만 marked.js를 사용하여 마크다운 적용
    const content = (sender === 'ai') ? marked.parse(text) : text;
    
    div.innerHTML = `<div class="message-bubble">${content}</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * [의도] AI 답변 텍스트에서 JSON 데이터를 골라내어 처리함
 * @param {string} rawText - [인자 출처: AI가 뱉은 전체 텍스트 aiResponse]
 */
function handleExtraction(rawText) {
    try {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
            const data = JSON.parse(match[0]);
            console.log("[추출된 데이터]:", data);
            // [의도] 향후 마이페이지 저장 등의 로직을 여기에 연결함 [cite: 2025-11-17]
        }
    } catch (e) {
        console.warn("JSON 데이터 추출 불가");
    }
}

/**
 * [의도] 전송 상태에 따라 버튼과 입력창 UI를 제어함
 * @param {boolean} isLoading - [인자 출처: sendMessage 내 호출]
 */
function setLoading(isLoading) {
    sendButton.disabled = isLoading;
    if (inputContainer) {
        isLoading ? inputContainer.classList.add('loading') : inputContainer.classList.remove('loading');
    }
    if (!isLoading) userInput.focus();
}