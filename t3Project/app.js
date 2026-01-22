/* 파일 경로: /t3Project/app.js (루트 폴더) */

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';

// =========================================================
// 1. [VALUE DECLARATION] (전역 설정 및 환경 변수)
// =========================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config(); // [의도] .env 파일에서 API 키를 가져옵니다. [cite: 2025-11-17]

const app = express();
const PORT = 3000;

const TARGET_MODEL = "gemini-2.5-flash"; 
const API_KEYS = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5
];
let currentKeyIndex = 0; // [의도] 키 에러 발생 시 다음 키를 가리키는 인덱스입니다. [cite: 2025-11-17]

const SYSTEM_INSTRUCTION = `
1. 너는 여행 계획 AI야. 
2. 중요한 키워드는 **굵게** 표시해줘.
3. 답변은 300자 이내로 요약해줘.
4. 사용자의 답변을 기억하고 대화에 반영해줘.
5. 사용자가 여행지를 추천받고 싶다 하면 여행 태마를 물어보고 그에맞는 곳을 3가지 추천해줘
6. 사용자가 여행 일정을 짜달라고 하면 몇일 기준으로 짤지 물어보고 사용자에 답변에 맞게 아침, 점심, 저녁 일정과 장소를 추천해줘.
`;

app.use(express.json()); // [의도] 클라이언트의 JSON 요청을 받기 위한 설정입니다. [cite: 2025-11-17]

// =========================================================
// 2. [MAIN LOOP / ROUTES] (라우팅 및 통신 루프)
// =========================================================

// [의도] 브라우저가 각 폴더의 자원(js, css, html)을 찾을 수 있게 경로를 열어줍니다. [cite: 2025-11-17]
app.use('/html', express.static(path.join(__dirname, 'html')));
app.use('/Ai', express.static(path.join(__dirname, 'Ai')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));

// [의도] 기본 도메인 접속 시 인덱스 페이지를 보여줍니다. [cite: 2025-11-17]
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "html", "index.html"));
});

// [메인 루프] 클라이언트(AIchat.js)가 보낸 질문을 받아 AI 답변을 생성하여 응답합니다. [cite: 2025-11-17]
app.post("/chat", async (req, res) => {
    // [인자 출처: 브라우저 AIchat.js의 fetch body 데이터] [cite: 2025-11-17]
    const { message } = req.body; 
    console.log(`[서버 로그] 수신 질문: ${message}`);

    try {
        // [의도] 아래 선언된 getAiResponseWithFailover 함수를 호출하여 AI와 대화합니다. [cite: 2025-11-17]
        // [인자 출처: message(수신 질문), SYSTEM_INSTRUCTION(상단 선언 밸류)] [cite: 2025-11-17]
        const aiResponse = await getAiResponseWithFailover(message, SYSTEM_INSTRUCTION);
        
        // [결과] 생성된 최종 답변을 JSON 형식으로 클라이언트에 보냅니다. [cite: 2025-11-17]
        res.json({ reply: aiResponse });
    } catch (criticalError) {
        console.error("서버 내부 중명적 오류:", criticalError);
        res.status(500).json({ reply: "현재 서버 내부에서 답변을 생성할 수 없습니다." });
    }
});

// [의도] 설정된 포트에서 서버 대기를 시작합니다. [cite: 2025-11-17]
app.listen(PORT, () => {
    console.log(`🚀 서버 구동 완료: http://localhost:${PORT}`);
});

// =========================================================
// 3. [FUNCTION DECLARATION] (세부 로직 및 AI 통신 함수)
// =========================================================

/**
 * [의도] 여러 API 키를 순회하며 성공할 때까지 AI 답변을 시도합니다. [cite: 2025-11-17]
 * @param {string} prompt - [인자 출처: 메인 루프 app.post의 message] [cite: 2025-11-17]
 * @param {string} instruction - [인자 출처: 1번 밸류 선언 구역의 SYSTEM_INSTRUCTION] [cite: 2025-11-17]
 */
async function getAiResponseWithFailover(prompt, instruction) {
    for (let i = 0; i < API_KEYS.length; i++) {
        // [인자 출처: 1번 밸류 선언 구역의 API_KEYS 배열과 currentKeyIndex] [cite: 2025-11-17]
        const activeKey = API_KEYS[currentKeyIndex];
        
        // [의도] 아래 선언된 callGeminiApi 함수를 사용하여 직접 API를 호출합니다. [cite: 2025-11-17]
        const result = await callGeminiApi(activeKey, prompt, instruction);

        if (!result.isError) return result.text; // [결과] 성공 시 AI 답변 텍스트 반환 [cite: 2025-11-17]
        
        console.warn(`${currentKeyIndex + 1}번 키 실패. 다음 키로 교체합니다.`);
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length; // [의도] 인덱스를 다음 키로 순환시킵니다. [cite: 2025-11-17]
    }
    return "모든 API 키가 만료되거나 사용할 수 없는 상태입니다.";
}

/**
 * [의도] Google Generative AI 라이브러리를 통해 실제 API 요청을 수행합니다. [cite: 2025-11-17]
 * @param {string} key - [인자 출처: getAiResponseWithFailover 함수가 선택한 activeKey] [cite: 2025-11-17]
 * @param {string} text - [인자 출처: getAiResponseWithFailover 함수가 전달한 prompt] [cite: 2025-11-17]
 * @param {string} instruction - [인자 출처: getAiResponseWithFailover 함수가 전달한 instruction] [cite: 2025-11-17]
 */
async function callGeminiApi(key, text, instruction) {
    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ 
            model: TARGET_MODEL, // [인자 출처: 1번 밸류 선언 구역의 TARGET_MODEL] [cite: 2025-11-17]
            systemInstruction: instruction 
        });
        const result = await model.generateContent(text);
        return { isError: false, text: result.response.text() };
    } catch (error) {
        return { isError: true, text: error.message };
    }
}