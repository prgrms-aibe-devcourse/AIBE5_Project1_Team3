 (이것들만 추가하면 우리의 모든 HTML에서 불러오기 가능! 단 플롯용 CSS는 따로 선언 가능)

<!-- 챗봇 플롯용 css -->
<link rel="stylesheet" href="../Ai/Aichatbot.css">

   <!-- 챗봇 용버튼 및 챗봇 컨텐츠 불러오는 코드 -->
    <button id="floating-chat-btn" onclick="toggleChatIframe()">💬</button>
    <div id="chat-frame-container">
        <iframe src="../Ai/AiChatbot.html" style="width:100%; height:100%; border:none;" scrolling="no"></iframe>
    </div>

<!-- 챗봇 버튼 토글 작동용 소스 -->
<script src="../Ai/Ai.js"></script>   