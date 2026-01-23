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