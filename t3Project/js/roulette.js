

// --- Configuration ---
const CANVAS_SIZE = 500;
const COLORS = [
    '#8B5CF6', // Purple 500
    '#EC4899', // Pink 500
    '#3B82F6', // Blue 500
    '#10B981', // Emerald 500
    '#F59E0B', // Amber 500
    '#EF4444', // Red 500
];

// --- State ---
let wheelItems = [];
let ctx = null;
let currentAngle = 0;
let isSpinning = false;
let spinVelocity = 0;
let animationFrameId = null;
let currentMode = 'preset'; // 'preset' or 'custom'
let currentWinnerItem = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    
    // Default 2 inputs for custom mode
    renderInputFields(2);
    
    document.getElementById('spinBtn').addEventListener('click', spinWheel);
    
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Check login status for custom mode
    checkLoginState();
});

// --- Mode & Setup Logic ---

window.setMode = function(mode) {
    currentMode = mode;
    const stepMode = document.getElementById('step-mode');
    const stepInput = document.getElementById('step-input');
    
    if (mode === 'preset') {
        initWheelDataPreset();
        switchToGameView();
    } else {
        // Show Input Screen
        stepMode.classList.add('hidden');
        stepInput.classList.remove('hidden');
        // Update Header Text
        const backText = document.getElementById('header-back-text');
        if (backText) backText.textContent = '룰렛 선택으로';
        
        // 찜한 목록 불러오기
        loadFavoritesIntoInputs();
    }
}

window.goBackToMode = function() {
    // Reset Views
    document.getElementById('setup-view').classList.remove('hidden');
    document.getElementById('game-view').classList.add('hidden');
    document.getElementById('game-view').classList.remove('opacity-100');
    
    document.getElementById('step-mode').classList.remove('hidden');
    document.getElementById('step-input').classList.add('hidden');
    
    // Reset Header Text
    const backText = document.getElementById('header-back-text');
    if (backText) backText.textContent = '메인페이지 돌아가기';
    
    // Reset State
    isSpinning = false;
    currentAngle = 0;
    cancelAnimationFrame(animationFrameId);
}

window.handleHeaderBack = function() {
    const gameView = document.getElementById('game-view');
    const stepInput = document.getElementById('step-input');
    
    const isGameActive = !gameView.classList.contains('hidden');
    const isInputActive = !stepInput.classList.contains('hidden');
    
    if (isGameActive || isInputActive) {
        // If in game or input mode, go back to selection
        goBackToMode();
    } else {
        // If in selection mode, go to main page
        window.location.href = 'index.html';
    }
}

window.startGameWithCustom = function() {
    // Gather inputs
    const inputs = document.querySelectorAll('.custom-input-field');
    const values = [];
    inputs.forEach(input => {
        if (input.value.trim() !== '') {
            values.push(input.value.trim());
        }
    });

    if (values.length < 2) {
        alert('최소 2개 이상의 선택지를 입력해주세요!');
        return;
    }

    // Create wheel items from strings
    wheelItems = values.map((val, idx) => ({
        id: `custom-${idx}`,
        title: val,
        isCustom: true
    }));

    switchToGameView();
}

function switchToGameView() {
    const setupView = document.getElementById('setup-view');
    const gameView = document.getElementById('game-view');
    
    setupView.classList.add('hidden');
    gameView.classList.remove('hidden');
    
    // Update Header Text
    const backText = document.getElementById('header-back-text');
    if (backText) backText.textContent = '룰렛 선택으로';
    
    // Small delay for fade-in effect
    setTimeout(() => {
        gameView.classList.add('opacity-100');
        drawWheel(); // Draw only after visible
    }, 50);
}

// --- Input Form Logic ---
let inputCount = 2;

/**
 * 찜한 목록을 입력창에 자동으로 채워넣는 함수
 */
function loadFavoritesIntoInputs() {
    const list = document.getElementById('input-list');
    list.innerHTML = ''; // 기존 입력창 초기화

    // 1. 로컬 스토리지에서 찜 목록 가져오기
    const favoriteIds = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    // 2. ARTICLES 데이터에서 해당 ID에 맞는 항목 찾기
    // ARTICLES가 로드되어 있다고 가정 (data.js)
    const favoriteArticles = favoriteIds.map(id => {
        if (typeof ARTICLES !== 'undefined') {
            return ARTICLES.find(a => a.id === id);
        }
        return null;
    }).filter(Boolean); // 유효한 아티클만 필터링

    inputCount = 0;

    // 3. 찜한 항목이 있으면 입력창 생성
    if (favoriteArticles.length > 0) {
        favoriteArticles.forEach(article => {
            inputCount++;
            list.appendChild(createInputRowHTML(inputCount, article.title));
        });
    }

    // 4. 최소 2개 유지를 위해 부족하면 빈 입력창 추가
    while (inputCount < 2) {
        inputCount++;
        list.appendChild(createInputRowHTML(inputCount));
    }

    updateInputCountDisplay();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.addInputRow = function() {
    if (inputCount >= 20) {
        alert('최대 20개까지만 입력 가능합니다.');
        return;
    }
    inputCount++;
    renderInputFields(inputCount, true); // preserve existing values
}

window.removeInputRow = function(btn) {
    if (inputCount <= 2) {
        alert('최소 2개는 있어야 합니다.');
        return;
    }
    btn.parentElement.remove();
    inputCount--;
    updateInputCountDisplay();
}

function renderInputFields(count, preserveValues = false) {
    const list = document.getElementById('input-list');
    
    if (preserveValues) {
        // Just append one
        const div = createInputRowHTML(count); // Not strictly numbered index, just a row
        list.appendChild(div);
    } else {
        // Reset
        list.innerHTML = '';
        for (let i = 0; i < count; i++) {
            list.appendChild(createInputRowHTML(i + 1));
        }
    }
    updateInputCountDisplay();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function createInputRowHTML(index, value = '') {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 animate-fade-in';
    
    // value 속성에 안전하게 값을 넣기 위해 따옴표 처리
    const safeValue = value.replace(/"/g, '&quot;');
    
    div.innerHTML = `
        <div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-mono shrink-0">
            •
        </div>
        <input type="text" value="${safeValue}" class="custom-input-field flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-400" placeholder="선택지를 입력하세요">
        <button onclick="removeInputRow(this)" class="p-2 text-gray-400 hover:text-red-500 transition-colors">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
    `;
    return div;
}

function updateInputCountDisplay() {
    document.getElementById('input-count').textContent = document.getElementById('input-list').children.length;
}


// --- Wheel Data Logic ---
function initWheelDataPreset() {
    const WHEEL_ITEMS_COUNT = 12;
    // Shuffle and pick 12 random articles from data.js
    const shuffled = [...ARTICLES].sort(() => 0.5 - Math.random());
    wheelItems = shuffled.slice(0, WHEEL_ITEMS_COUNT);
}

function initCanvas() {
    const canvas = document.getElementById('rouletteCanvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
    
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
}

// --- Drawing Logic ---
function drawWheel() {
    if (!ctx || wheelItems.length === 0) return;
    
    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    const radius = CANVAS_SIZE / 2 - 10;
    const arc = (2 * Math.PI) / wheelItems.length;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    wheelItems.forEach((item, i) => {
        const startAngle = currentAngle + i * arc;
        const endAngle = startAngle + arc;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.fill();
        ctx.stroke();
        
        // Draw Text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + arc / 2);
        
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px "Inter", sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        
        // Truncate text logic
        let text = item.title;
        const limit = wheelItems.length > 8 ? 10 : 14;
        if (text.length > limit) text = text.substring(0, limit - 1) + '...';
        
        ctx.fillText(text, radius - 20, 5);
        ctx.restore();
    });
}

// --- Spin Logic ---
function spinWheel() {
    if (isSpinning) return;
    isSpinning = true;
    
    spinVelocity = 0.4 + Math.random() * 0.3; // Initial speed
    const friction = 0.985; // Deceleration
    const stopThreshold = 0.002;

    const animate = () => {
        if (spinVelocity > stopThreshold) {
            currentAngle += spinVelocity;
            currentAngle %= 2 * Math.PI; 
            spinVelocity *= friction; 
            drawWheel();
            animationFrameId = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(animationFrameId);
            isSpinning = false;
            determineWinner();
        }
    };

    animate();
}

function determineWinner() {
    const arc = (2 * Math.PI) / wheelItems.length;
    // Pointer is at Top (3*PI/2)
    const pointerAngle = 3 * Math.PI / 2; 
    
    let normalizedRotation = currentAngle % (2 * Math.PI);
    let relativeAngle = pointerAngle - normalizedRotation;
    if (relativeAngle < 0) relativeAngle += 2 * Math.PI;
    
    const winningIndex = Math.floor(relativeAngle / arc);
    const winner = wheelItems[winningIndex];
    
    showResult(winner);
}

// --- Modal Logic ---
function showResult(item) {
    currentWinnerItem = item;
    const modal = document.getElementById('winnerModal');
    const modalContent = document.getElementById('modalContent');
    const img = document.getElementById('winnerImage');
    const customBg = document.getElementById('winnerCustomBg');
    const customTitle = document.getElementById('winnerCustomTitle');
    
    const titleEl = document.getElementById('winnerTitle');
    const subtitleEl = document.getElementById('winnerSubtitle');
    const tagsEl = document.getElementById('winnerTags');

    if (item.isCustom) {
        // Custom Mode
        img.classList.add('hidden');
        customBg.classList.remove('hidden');
        customTitle.textContent = item.title;
        
        // Hide preset specific elements
        titleEl.textContent = '';
        subtitleEl.textContent = '';
        tagsEl.innerHTML = '';
        
        // Hide detail hint
        const hint = modalContent.querySelector('.view-details-hint');
        if(hint) hint.classList.add('hidden');
        
    } else {
        // Preset Mode
        img.classList.remove('hidden');
        customBg.classList.add('hidden');
        img.src = item.imageUrl;
        
        titleEl.textContent = item.title;
        subtitleEl.textContent = item.subtitle || item.description;
        
        // Render Main Tags
        if (item.mainTags && item.mainTags.length > 0) {
            tagsEl.innerHTML = item.mainTags.map(tag => `
                <span class="px-3 py-1.5 rounded-lg bg-[#6e7662] text-white text-sm font-bold shadow-md backdrop-blur-md tracking-tight">
                    ${tag}
                </span>
            `).join('');
        } else {
            tagsEl.innerHTML = '';
        }

        // Show detail hint
        const hint = modalContent.querySelector('.view-details-hint');
        if(hint) hint.classList.remove('hidden');
    }

    modal.classList.remove('hidden');
    
    // Icon refresh
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Animation delay
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-90');
        modalContent.classList.add('scale-100');
    }, 10);

    // --- Firework Effect on both sides ---
    if (typeof confetti === 'function') {
        // Function to create firework bursts
        function firework(xOrigin) {
            var count = 200;
            var defaults = {
                origin: { y: 0.7, x: xOrigin },
                zIndex: 9999 // Ensure it's above the modal
            };
            
            function fire(particleRatio, opts) {
                confetti(Object.assign({}, defaults, opts, {
                    particleCount: Math.floor(count * particleRatio)
                }));
            }

            fire(0.25, { spread: 26, startVelocity: 55 });
            fire(0.2, { spread: 60 });
            fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
            fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
            fire(0.1, { spread: 120, startVelocity: 45 });
        }

        // Trigger fireworks from left and right side of the screen/modal area
        setTimeout(() => {
            firework(0.15); // Left side
            firework(0.85); // Right side
        }, 100);
    }
}

window.goToArticle = function() {
    if (currentWinnerItem && !currentWinnerItem.isCustom) {
        window.location.href = `article.html?id=${currentWinnerItem.id}`;
    }
}

window.closeModal = function() {
    const modal = document.getElementById('winnerModal');
    const modalContent = document.getElementById('modalContent');
    
    modal.classList.add('opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-90');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

window.resetRoulette = function() {
    closeModal();
    // Do not reset data, just allow spinning again with same items
}

// --- Login Logic (Added) ---
function checkLoginState() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const lockOverlay = document.getElementById('mode-custom-lock');
    const contentDiv = document.getElementById('mode-custom-content');
    const customBtn = document.getElementById('mode-custom-btn');

    if (!isLoggedIn) {
        // Not logged in: Show lock, dim content
        if (lockOverlay) lockOverlay.classList.remove('hidden');
        if (contentDiv) contentDiv.classList.add('opacity-40', 'blur-[1px]');
        
        if (customBtn) {
            // Remove normal hover effects to indicate disabled state visual
            customBtn.classList.remove('hover:-translate-y-2', 'hover:shadow-[0_20px_40px_rgb(236,72,153,0.1)]', 'hover:border-pink-500/30');
            // Change onclick behavior
            customBtn.onclick = function(e) {
                e.preventDefault();
                showLoginModal('찜한 목록을 이용하려면<br>로그인이 필요합니다.');
            };
        }
    } else {
        // Logged in: Ensure normal state
        if (lockOverlay) lockOverlay.classList.add('hidden');
        if (contentDiv) contentDiv.classList.remove('opacity-40', 'blur-[1px]');
        // Restore onclick
        if (customBtn) {
             customBtn.onclick = function() { setMode('custom'); };
        }
    }
}

window.showLoginModal = function(message = '로그인이 필요합니다.') {
    if (document.getElementById('login-confirm-modal')) return;

    const modalHtml = `
        <div id="login-confirm-modal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div class="bg-white rounded-2xl p-8 text-center max-w-sm w-[90%] shadow-2xl transform transition-all scale-100">
                <div class="text-4xl mb-4">🔒</div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">로그인이 필요합니다</h3>
                <p class="text-sm text-gray-500 mb-6 leading-relaxed">${message}</p>
                <div class="flex gap-3">
                    <button onclick="document.getElementById('login-confirm-modal').remove()" class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors text-sm">
                        나중에
                    </button>
                    <button onclick="location.href='login.html'" class="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors text-sm shadow-md">
                        로그인하기
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}