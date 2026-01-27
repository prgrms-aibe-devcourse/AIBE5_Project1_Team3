
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

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    
    // Default 2 inputs for custom mode
    renderInputFields(2);
    
    document.getElementById('spinBtn').addEventListener('click', spinWheel);
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
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
    
    // Reset State
    isSpinning = false;
    currentAngle = 0;
    cancelAnimationFrame(animationFrameId);
    
    // Reset Inputs to default if needed, but keeping them might be better UX
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
    const modal = document.getElementById('winnerModal');
    const modalContent = document.getElementById('modalContent');
    const img = document.getElementById('winnerImage');
    const iconPlaceholder = document.getElementById('winnerIconPlaceholder');
    const title = document.getElementById('winnerTitle');
    const desc = document.getElementById('winnerDesc');
    const linkBtn = document.getElementById('winnerLink');

    title.textContent = item.title;

    if (item.isCustom) {
        // Custom Mode Layout
        img.classList.add('hidden');
        iconPlaceholder.classList.remove('hidden');
        desc.textContent = "직접 입력하신 선택지 중 당첨된 결과입니다!";
        linkBtn.classList.add('hidden'); // No link for custom input
    } else {
        // Preset Mode Layout
        img.src = item.imageUrl;
        img.classList.remove('hidden');
        iconPlaceholder.classList.add('hidden');
        desc.textContent = item.subtitle || item.description;
        linkBtn.href = `article.html?id=${item.id}`;
        linkBtn.classList.remove('hidden');
    }

    modal.classList.remove('hidden');
    // Animation delay
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-90');
        modalContent.classList.add('scale-100');
    }, 10);
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
