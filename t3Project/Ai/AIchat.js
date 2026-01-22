
// 1. [VALUE DECLARATION] - 요소 선언
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const inputContainer = document.getElementById('input-container');


// ---------------------------------------------------------

// 2. [MAIN LOOP] - 이벤트 리스너 (엔터키 반응 포함)
// 전송 버튼 클릭 시
sendButton.addEventListener('click', sendMessage);

// 입력창에서 엔터키 눌렀을 때 (수정된 부분)
userInput.addEventListener('keydown', (e) => {
    // e.key가 'Enter'이고, 전송 중이 아닐 때만 실행
    if (e.key === 'Enter' && !sendButton.disabled) {
        sendMessage();
    }
});

// ---------------------------------------------------------

// 3. [FUNCTION DECLARATION] - 실행 함수들
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage('user', message); // 화면에 내 글 표시
    userInput.value = '';        // 입력창 비우기
    
    setLoading(true);            // [인자: true - 로딩 시작]

    const reply = await askServer(message); // [인자: message - 사용자 질문]
    addMessage('ai', reply);      // 화면에 AI 답장 표시

    setLoading(false);           // [인자: false - 로딩 끝]
}

// [의도] 서버와 대화하는 메인 통신 루프
async function askServer(msg) {
    try {
        // [수정 핵심] 주소를 "/chat"에서 "http://localhost:3000/chat"으로 변경합니다.
        // iframe 안에서는 상대 경로가 꼬일 수 있기 때문입니다. [cite: 2025-11-17]
        const response = await fetch("http://localhost:3000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg }) // [인자 출처: sendMessage 함수의 message]
        });
        
        if (!response.ok) throw new Error("404 혹은 서버 응답 없음");
        
        const data = await response.json();
        return data.reply; // [인자 출처: 서버 app.js의 res.json({ reply: ... })]
    } catch (e) {
        console.error("디버깅 정보:", e);
        return "서버와 연결할 수 없습니다. 포트 3000번이 열려있는지 확인하세요.";
    }
}

// 에러가 났던 setLoading 함수를 여기에 정의합니다.
function setLoading(isLoading) {
    if (isLoading) {
        sendButton.disabled = true;
        if(inputContainer) inputContainer.classList.add('loading');
    } else {
        sendButton.disabled = false;
        if(inputContainer) inputContainer.classList.remove('loading');
        userInput.focus();
    }
}

/**
 * [의도] 화면에 말풍선을 생성하고, AI 응답일 경우 마크다운을 적용함
 * @param {string} sender - 'user' 또는 'ai' [인자 출처: sendMessage 함수]
 * @param {string} text - 출력할 메시지 내용 [인자 출처: askServer의 반환값 또는 userInput]
 */
function addMessage(sender, text) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    
    // [의도] AI 응답(marked.parse) 시 줄바꿈과 굵은 글씨를 HTML로 변환 [cite: 2025-11-17]
    const content = (sender === 'ai') ? marked.parse(text) : text;
    
    div.innerHTML = `<div class="message-bubble">${content}</div>`;
    chatContainer.appendChild(div);
    
    // [의도] 새 메시지가 오면 자동으로 스크롤을 맨 아래로 내림
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
