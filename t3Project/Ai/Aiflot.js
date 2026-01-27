// ---  AI Chat Iframe Toggle ---
function toggleChatIframe() {
    const chatContainer = document.getElementById('chat-frame-container');
    
    // [의도] 현재 보이면 숨기고, 안 보이면 보이게 함
    if (chatContainer.style.display === 'none' || chatContainer.style.display === '') {
        chatContainer.style.display = 'block';
    } else {
        chatContainer.style.display = 'none';
    }
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