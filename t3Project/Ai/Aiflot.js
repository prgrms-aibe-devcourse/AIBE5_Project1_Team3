// ---  AI Chat Iframe Toggle ---
function toggleChatIframe() {
    const chatContainer = document.getElementById('chat-frame-container');
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

    if (!isLoggedIn) {
    // 1. 로그인이 안 되어 있으면 즉시 경고창을 띄웁니다.
    showLoginModalgemini()
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
function showLoginModalgemini() {
  if (document.getElementById("login-confirm-modal")) return;
  const modalHtml = `
    <div id="login-confirm-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000;">
        <div style="background:#fff; padding:30px; border-radius:15px; text-align:center; width:90%; max-width:320px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
            <div style="font-size:40px; margin-bottom:15px;">🔒</div>
            <h3 style="margin-bottom:10px; font-size:18px;">로그인이 필요합니다</h3>
            <p style="color:#666; font-size:14px; margin-bottom:25px; line-height:1.5;">쪼꼬마이와 대화하려면 <br>로그인을 해주세요</p>
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('login-confirm-modal').remove()" style="flex:1; padding:12px; border:none; border-radius:8px; background:#eee; cursor:pointer;">나중에</button>
                <button onclick="location.href='login.html'" style="flex:1; padding:12px; border:none; border-radius:8px; background:#000; background:#3b82f6; cursor:pointer; font-weight:bold; color:#ffffff;">로그인하기</button>
            </div>
        </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}



// 마이페이지로 저장 완료 알림 이밴트 핸들링 함수 
window.emitUI = function(type, msg) {
  if (type === "toast") showToast(msg);
};

// 마이페이지로 저장 완료 알림창 선언 함수 
window.showToast = function(msg) {
    const toast = document.createElement("div");

    toast.style.position = "fixed";
    toast.style.bottom = "640px";
    toast.style.right = "40px";
    toast.style.background = "#2563EB";
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
    btn.style.background = "#FFD850";
    btn.style.color = "#000";

    btn.onclick = () => toast.remove();

    toast.appendChild(text);
    toast.appendChild(btn);

    document.body.appendChild(toast);
};

