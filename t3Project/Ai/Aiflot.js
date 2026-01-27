// ---  AI Chat Iframe Toggle ---
function toggleChatIframe() {
    const chatContainer = document.getElementById('chat-frame-container');
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

    if (!isLoggedIn) {
    // 1. 로그인이 안 되어 있으면 즉시 경고창을 띄웁니다.
    showLoginModal(
        "로그인이 필요합니다", 
        "쪼꼬마이와 대화하려면<br>로그인을 해주세요", 
        async () => {
            // 이 부분이 '확인'을 눌렀을 때 실행될 내용입니다.
            location.href = 'login.html'
        },
        "🔒" // 땀땀 아이콘
    );
    } else {
        // [의도] 현재 보이면 숨기고, 안 보이면 보이게 함
        if (chatContainer.style.display === 'none' || chatContainer.style.display === '') {
            chatContainer.style.display = 'block';
        } else {
            chatContainer.style.display = 'none';
        }
    }
}

// 모달 창 정의함수
function showLoginModal(title, message, onConfirm, icon = '❓') {
    const oldModal = document.getElementById('auth-confirm-modal');
    if (oldModal) oldModal.remove();

    const modalHtml = `
        <div id="auth-confirm-modal" 
             style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000;">
            <div style="background:#fff; padding:30px; border-radius:24px; text-align:center; width:90%; max-width:320px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                <div style="font-size:48px; margin-bottom:15px;">${icon}</div>
                <h3 style="margin-bottom:10px; font-size:18px; font-weight:bold;">${title}</h3>
                <p style="color:#666; font-size:14px; margin-bottom:25px; line-height:1.6;">${message}</p>
                <div style="display:flex; gap:12px;">
                    <button onclick="document.getElementById('auth-confirm-modal').remove()" 
                            style="flex:1; 
                            padding:14px; 
                            border:none; 
                            border-radius:12px; 
                            background:#f3f4f6; 
                            color:#4b5563; 
                            cursor:pointer; 
                            font-weight:600;">나중에</button>
                    <button id="modal-confirm-btn" 
                            style="flex:1; 
                            padding:14px; 
                            border:none; 
                            border-radius:12px; 
                            background:#000; 
                            color:#fff; 
                            cursor:pointer; 
                            font-weight:bold;">로그인하기</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 확인 버튼 클릭 시 실행할 로직 연결
    document.getElementById('modal-confirm-btn').onclick = () => {
        document.getElementById('auth-confirm-modal').remove();
        onConfirm(); // 전달받은 함수 실행
    };
}



// 마이페이지로 저장 완료 알림
window.emitUI = function(type, msg) {
  if (type === "toast") showToast(msg);
};

window.showToast = function(msg) {
    const toast = document.createElement("div");

    toast.style.position = "fixed";
    toast.style.bottom = "640px";
    toast.style.right = "40px";
    toast.style.background = "#4B9DA9";
    toast.style.color = "white";
    toast.style.padding = "10px 16px";
    toast.style.borderRadius = "12px";
    toast.style.boxShadow = "0 10px 20px rgba(0,0,0,0.3)";
    toast.style.fontSize = "20px";
    toast.style.zIndex = "2147483647";
    toast.style.display = "flex";
    toast.style.gap = "10px";
    toast.style.alignItems = "center";

    const text = document.createElement("span");
    text.innerText = msg;

    const btn = document.createElement("button");
    btn.innerText = "확인";
    btn.style.padding = "4px 10px";
    btn.style.borderRadius = "8px";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.background = "#E37434";
    btn.style.color = "white";

    btn.onclick = () => toast.remove();

    toast.appendChild(text);
    toast.appendChild(btn);

    document.body.appendChild(toast);
};

