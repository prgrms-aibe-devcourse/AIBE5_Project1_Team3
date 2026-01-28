

// --- 상태 관리 (STATE) ---
let state = {
    query: '', // 검색어
    activeFilters: [], // 활성화된 메인 필터 ID 목록
    activeSubTags: [], // 활성화된 서브 태그(키워드) 목록
    selectedId: null, // 현재 선택된 아티클 ID
    isSidebarOpen: true, // 사이드바 열림 상태
    filteredArticles: typeof ARTICLES !== 'undefined' ? [...ARTICLES] : [], // 필터링된 결과
    // 플래너(계획) 모드 상태
    isPlanMode: false,
    itinerary: [], // 계획에 담긴 아티클 ID 목록
    // 임베드 모드 여부
    isEmbed: false,
    // 필터 확장 상태
    isFilterExpanded: false
};

let map = null;
let markers = {};
let routeLayerGroup = null; 
let routingControl = null;

// --- 필터 정의 (FILTER DEFINITIONS) ---

const FILTER_DEFINITIONS = {
    domestic: {
        id: 'domestic',
        label: '국내여행',
        keywords: [
            "국내", "대한민국", "제주", "서울", "부산", "강릉", "경주", "가평", "춘천",
            "여수", "강원도", "경기도", "경포대", "주문진", "초당", "황리단길", "대릉원", "불국사",
            "첨성대", "보문단지", "설악면", "상면", "아침고요수목원", "양떼목장"
        ]
    },
    overseas: {
        id: 'overseas',
        label: '해외여행',
        keywords: [
            "태국", "일본", "베트남", "방콕", "오사카", "교토", "고베", "나랏마사", "도톤보리",
            "난바", "우메다", "신사이바시", "코사무이", "괌", "GUAM", "유럽", "스페인", "방콕사원",
            "짜뚜짝", "카오산", "실롬", "와불상", "천수각", "도요토미", "간사이", "투몬", "하갓냐"
        ]
    },
    nature: {
        id: 'nature',
        label: '자연/힐링',
        keywords: [
            "자연", "힐링", "바다", "숲", "산", "계곡", "호수", "섬", "해변", "산책", "목장",
            "휴양", "온천", "정글", "트리하우스", "안유진", "이영지", "미미", "이은지", "지락실",
            "지구오락실", "나영석", "촌캉스", "감성숙소", "독채", "펜션", "글램핑", "캠핑", "노을", "석양"
        ]
    },
    city: {
        id: 'city',
        label: '도시/야경',
        keywords: [
            "도시", "도심", "시티", "야경", "핫플", "트렌디", "쇼핑", "백화점", "편집숍",
            "인스타감성", "랜드마크", "복합문화공간", "야시장", "번화가", "MZ세대", "SNS핫플",
            "비즈니스", "역세권", "가성비호텔", "5성급", "호캉스", "면세점", "기념품"
        ]
    },
    food: {
        id: 'food',
        label: '맛집/카페',
        keywords: [
            "맛집", "카페", "음식", "디저트", "브런치", "레스토랑", "베이커리", "먹방",
            "미식", "로컬맛집", "커피", "스테이크", "라멘", "타코야키", "순두부", "호떡",
            "팟타이", "푸팟퐁커리", "오코노미야키", "돈카츠", "간식", "야식", "디너", "조식"
        ]
    }
};

const FILTER_BUTTONS = [
    { id: 'all', label: '전체' },
    ...Object.values(FILTER_DEFINITIONS)
];

// --- 초기화 (INITIALIZATION) ---
document.addEventListener('DOMContentLoaded', () => {
    // 독도 데이터 추가 (data.js 수정 불가 시 주입)
    injectDokdoData();
    injectToastUI(); // 토스트 UI 주입

    // 임베드 모드 확인
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'embed') {
        state.isEmbed = true;
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        if (sidebar) sidebar.style.display = 'none';
        if (mobileMenuBtn) mobileMenuBtn.style.display = 'none';
    }

    initMap();
    render();
    
    // URL에서 초기 아티클 선택 처리
    const id = params.get('id');
    if (id) {
        // 맵 사이즈 초기화를 위한 약간의 지연
        setTimeout(() => selectArticle(id), 100);
    }
    
    // 아이콘 라이브러리 로드 확인
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

/**
 * 독도 데이터 주입 함수
 */
function injectDokdoData() {
    if (typeof ARTICLES === 'undefined') return;

    // 이미 존재하는지 확인
    if (ARTICLES.some(a => a.title === '대한민국 가장 동쪽에 위치한 섬, 독도')) return;

    ARTICLES.push(dokdo);
    // state.filteredArticles 업데이트
    state.filteredArticles = [...ARTICLES];
}

// HTML onclick 핸들러를 위해 함수를 window 객체에 노출
window.resetApp = resetApp;
window.toggleFilter = toggleFilter;
window.toggleSubTag = toggleSubTag;
window.toggleFilterExpand = toggleFilterExpand;
window.selectArticle = selectArticle;
window.toggleSidebar = toggleSidebar;
window.closeModal = closeModal;
window.togglePlanMode = togglePlanMode;
window.clearItinerary = clearItinerary;
window.toggleItineraryItem = toggleItineraryItem;
window.toggleFavoriteInMap = toggleFavoriteInMap; // 찜하기 기능 추가
window.savePlanToMyPage = savePlanToMyPage; // 마이페이지 계획 추가
window.showLoginModal = showLoginModal; // 모달 함수 노출
window.showAlertModal = showAlertModal; // 알림 모달 함수 노출
window.showLikeToast = showLikeToast; // 토스트 함수 노출

// --- 로직 (LOGIC) ---

/**
 * 맵 초기화 함수
 */
function initMap() {
    map = L.map('map', {
        center: [36.5, 127.5], // 한국 중심으로 변경 (독도 추가로 인해)
        zoom: 6,
        minZoom: 2,
        zoomControl: false
    });
    
    L.control.zoom({ position: 'topright' }).addTo(map);

    // 구글 맵 레이어 사용 (한국어 설정 hl=ko, 지역 설정 gl=KR - 동해 표기)
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&hl=ko&gl=KR&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        maxZoom: 20
    }).addTo(map);

    routeLayerGroup = L.layerGroup().addTo(map);
}


/**
 * 메인 필터 토글 함수
 */
function toggleFilter(filterId) {
    if (filterId === 'all') {
        state.activeFilters = [];
        state.activeSubTags = []; // 서브 태그 초기화
    } else {
        if (state.activeFilters.includes(filterId)) {
             state.activeFilters = state.activeFilters.filter(id => id !== filterId);
        } else {
             state.activeFilters = [filterId];
        }
        
        state.activeSubTags = [];
        state.isFilterExpanded = false; // 필터 변경 시 접힘 상태로 리셋
    }
    updateFilteredArticles();
}

/**
 * 서브 태그(키워드) 토글 함수
 */
function toggleSubTag(keyword) {
    if (state.activeSubTags.includes(keyword)) {
        state.activeSubTags = state.activeSubTags.filter(k => k !== keyword);
    } else {
        state.activeSubTags.push(keyword);
    }
    updateFilteredArticles();
}

/**
 * 서브 태그 영역 펼치기/접기 토글
 */
function toggleFilterExpand() {
    state.isFilterExpanded = !state.isFilterExpanded;
    renderFilters(); // UI 다시 그리기
}

/**
 * 아티클이 특정 필터 조건을 만족하는지 확인
 */
function checkArticleMatchesFilter(article, filterId) {
    const definition = FILTER_DEFINITIONS[filterId];
    if (!definition) return false;
    
    // 태그에 키워드가 포함되어 있는지 검사
    return article.tags.some(tag => definition.keywords.some(key => tag.includes(key)));
}

/**
 * 필터링된 아티클 업데이트
 */
function updateFilteredArticles() {
    state.filteredArticles = ARTICLES.filter(article => {
        // 1. 메인 필터 체크
        let mainFilterMatch = true;
        if (state.activeFilters.length > 0) {
            mainFilterMatch = state.activeFilters.some(filterId => checkArticleMatchesFilter(article, filterId));
        }

        // 2. 서브 태그(키워드) 체크
        let subTagMatch = true;
        if (state.activeSubTags.length > 0) {
            subTagMatch = state.activeSubTags.some(keyword => {
                return article.tags.some(t => t.includes(keyword));
            });
        }
        
        // 3. 교차 오염 방지 (중요!)
        // '해외여행' 필터가 켜져있을 때, 국내 태그(서울, 제주 등)를 가진 항목은 제외
        // 예: '일본' 키워드 선택 시 '일본식 가옥(국내)' 같은 항목이 나오는 것을 방지
        if (state.activeFilters.includes('overseas')) {
             const isDomestic = checkArticleMatchesFilter(article, 'domestic');
             if (isDomestic) return false;
        }

        // 반대의 경우: '국내여행' 필터 켜져있을 때 해외 태그 가진 항목 제외
        if (state.activeFilters.includes('domestic')) {
             const isOverseas = checkArticleMatchesFilter(article, 'overseas');
             if (isOverseas) return false;
        }

        return mainFilterMatch && subTagMatch;
    });
    
    render();

    // 필터링된 항목에 맞춰 지도 줌/이동
    if (map && state.filteredArticles.length > 0 && !state.isEmbed) {
        const bounds = L.latLngBounds(state.filteredArticles.map(a => [a.lat, a.lng]));
        map.flyToBounds(bounds, { 
            padding: [50, 50], 
            maxZoom: 12,
            duration: 1.5 
        });
    }
}

// --- 플래너(계획) 로직 (PLANNER LOGIC) ---

/**
 * 계획 모드 토글
 */
function togglePlanMode() {
    state.isPlanMode = !state.isPlanMode;
    closeModal();
    state.selectedId = null; 
    
    if (routeLayerGroup) {
        routeLayerGroup.clearLayers();
    }
    
    // 라우팅 컨트롤 제거
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    
    if (state.isPlanMode) {
        updateItineraryRoute();
    }
    
    render();
}

/**
 * 마이페이지로 계획 저장 및 이동 함수
 */
function savePlanToMyPage() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        // 기존 alert 대신 커스텀 모달 호출
        showLoginModal('여행 계획을 저장하려면<br>로그인이 필요합니다.');
        return;
    }

    if (state.itinerary.length === 0) {
        showAlertModal('선택된 여행지가 없습니다.<br>지도에서 여행지를 선택해주세요.');
        return;
    }

    const selectedArticles = state.itinerary.map(id => ARTICLES.find(a => a.id === id)).filter(Boolean);
    const mainLocation = selectedArticles[0].tags.find(t => ['태국', '방콕', '가평', '춘천', '강릉', '오사카', '경주', '괌', '독도', '울릉도'].includes(t)) || '여행';
    
    const newTrip = {
        id: Date.now().toString(),
        title: `나의 ${mainLocation} 여행 계획`,
        location: mainLocation,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        selectedPlaces: selectedArticles.map(item => ({
            id: item.id,
            title: item.title,
            imageUrl: item.imageUrl,
            category: item.category,
            address: item.address
        })),
        isAI: false,
        memo: '지도에서 생성된 계획입니다.'
    };

    const currentTrips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    currentTrips.push(newTrip);
    localStorage.setItem('myTrips', JSON.stringify(currentTrips));

    // 기존 native alert 대신 커스텀 모달 사용 (콜백으로 페이지 이동)
    // 2번째 인자: 확인 버튼 콜백 (페이지 이동)
    // 3번째 인자: 취소/지도보기 버튼 텍스트
    showAlertModal('마이페이지에 계획이 추가되었습니다.', () => {
        window.location.href = 'mypage.html';
    }, '계속 지도 보기');
}

/**
 * 일정 초기화
 */
function clearItinerary() {
    state.itinerary = [];
    if (routeLayerGroup) routeLayerGroup.clearLayers();
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    render();
}

/**
 * 일정 항목 토글 (추가/삭제)
 */
function toggleItineraryItem(id) {
    const index = state.itinerary.indexOf(id);
    if (index === -1) {
        state.itinerary.push(id);
    } else {
        state.itinerary.splice(index, 1);
    }
    
    updateItineraryRoute();
    render();
}

/**
 * 지도상에 경로 업데이트
 */
function updateItineraryRoute() {
    if (routeLayerGroup) routeLayerGroup.clearLayers();
    
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    if (state.itinerary.length === 0) return;

    let allStops = [];

    state.itinerary.forEach((id, index) => {
        const article = ARTICLES.find(a => a.id === id);
        if (article) {
            allStops.push({
                lat: article.lat,
                lng: article.lng,
                name: article.title,
                globalIndex: index + 1,
                articleId: id
            });
        }
    });

    // 모든 경유지에 번호 마커 표시
    allStops.forEach(stop => {
        const icon = createCoursePinIcon(stop.globalIndex, stop.name);
        const marker = L.marker([stop.lat, stop.lng], { 
            icon: icon,
            zIndexOffset: 2000 
        }).addTo(routeLayerGroup);
    });

    // 2개 이상의 경유지가 있을 때 경로 그리기
    if (allStops.length > 1) {
        const waypoints = allStops.map(s => L.latLng(s.lat, s.lng));
        
        if (typeof L.Routing !== 'undefined') {
            routingControl = L.Routing.control({
                waypoints: waypoints,
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1'
                }),
                lineOptions: {
                    styles: [{color: '#2563eb', opacity: 0.8, weight: 6}]
                },
                plan: L.Routing.plan(waypoints, {
                    createMarker: function() { return null; }, 
                    addWaypoints: false,
                    draggableWaypoints: false
                }),
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: false,
                show: false, 
                containerClassName: 'hidden-routing-container'
            }).addTo(map);
            
            if (routingControl.getContainer()) {
                routingControl.getContainer().style.display = 'none';
            }
        } else {
            console.warn("Leaflet Routing Machine 라이브러리가 로드되지 않았습니다.");
        }

        const bounds = L.latLngBounds(waypoints);
        map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
    } else if (allStops.length === 1) {
        map.flyTo([allStops[0].lat, allStops[0].lng], 13);
    }
}

// --- 탐색기 로직 (EXPLORER LOGIC) ---

/**
 * 아티클 선택 처리
 */
function selectArticle(id) {
    if (state.isPlanMode) {
        toggleItineraryItem(id);
        return;
    }

    state.selectedId = id;
    render(); 
    
    const article = ARTICLES.find(a => a.id === id);
    if (article && map) {
        if (routeLayerGroup) routeLayerGroup.clearLayers();
        if (routingControl) {
             map.removeControl(routingControl);
             routingControl = null;
        }

        map.flyTo([article.lat, article.lng], 15, {
            duration: 1.5,
            easeLinearity: 0.25
        });
        
        if (!state.isEmbed) {
            openModal(article);
        }
    } else {
        closeModal();
    }
}

/**
 * 앱 상태 초기화
 */
function resetApp() {
    state.query = '';
    state.activeFilters = [];
    state.activeSubTags = [];
    state.selectedId = null;
    state.isPlanMode = false;
    state.itinerary = [];
    
    state.filteredArticles = [...ARTICLES];
    
    if (routeLayerGroup) {
        routeLayerGroup.clearLayers();
    }
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    
    if (map) map.flyTo([36.5, 127.5], 6); // 독도 포함 한국 전체 뷰로 리셋
    closeModal();
    render();
}

/**
 * 사이드바 토글
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    state.isSidebarOpen = !state.isSidebarOpen;
    
    if (state.isSidebarOpen) {
        sidebar.classList.remove('-translate-x-full');
        mobileMenuBtn.classList.add('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        mobileMenuBtn.classList.remove('hidden');
    }
}

/**
 * 토스트 UI 요소 주입
 */
function injectToastUI() {
    if (document.getElementById('like-toast')) return;
    
    const toastHtml = `
        <div id="like-toast" class="hidden fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-white text-blue-600 px-6 py-3 rounded-full shadow-2xl z-[9999] transition-all duration-500 opacity-0 translate-y-10 flex items-center gap-3 backdrop-blur-md border border-white/10 pointer-events-none">
            <div class="bg-green-500 rounded-full p-1 shadow-lg shadow-green-500/30">
                <i data-lucide="check" class="w-3 h-3 text-white stroke-[4]"></i>
            </div>
            <span id="like-toast-message" class="text-sm font-bold tracking-wide"></span>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', toastHtml);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * 토스트 알림 표시 함수
 * @param {string} message - 표시할 메시지
 */
function showLikeToast(message) {
    const toast = document.getElementById('like-toast');
    const msgBox = document.getElementById('like-toast-message');
    
    if (!toast || !msgBox) return;

    msgBox.textContent = message;
    
    toast.classList.remove('hidden', 'opacity-0', 'translate-y-10');
    toast.classList.add('opacity-100', 'translate-y-0');

    if (window.toastTimer) {
        clearTimeout(window.toastTimer);
    }

    window.toastTimer = setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-10');
        
        // 트랜지션 완료 후 hidden 처리
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 500); 
    }, 3000);
}

/**
 * 모달 내 찜하기(하트) 토글 기능
 */
function toggleFavoriteInMap(id) {
    // 1. 로그인 체크
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        // 기존 confirm 대신 커스텀 모달 호출
        showLoginModal();
        return;
    }

    let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    const index = favorites.indexOf(id);
    
    if (index === -1) {
        // 찜 추가
        favorites.push(id);
        showLikeToast("📂 마이페이지에 저장됐습니다!");
    } else {
        // 찜 삭제
        favorites.splice(index, 1);
        showLikeToast("🗑️ 마이페이지에서 삭제됐습니다!");
    }
    
    localStorage.setItem("favorites", JSON.stringify(favorites));
    
    // 버튼 및 아이콘 UI 즉시 업데이트
    const btn = document.getElementById(`modal-heart-btn-${id}`);
    const icon = document.getElementById(`modal-heart-icon-${id}`);

    if (btn && icon) {
        if (index === -1) { 
            // 찜 추가됨 (활성 상태: 흰 배경 + 빨간 하트)
            // 기존 비활성 스타일 제거
            btn.classList.remove('bg-black/20', 'hover:bg-black/40', 'text-white');
            // 활성 스타일 추가 (흰 배경)
            btn.classList.add('bg-white', 'hover:bg-white/90');
            
            // 아이콘 활성 스타일 (빨간색)
            icon.classList.remove('text-white');
            icon.classList.add('fill-red-500', 'text-red-500', 'heart-active');
            
            setTimeout(() => icon.classList.remove('heart-active'), 300);

        } else { 
            // 찜 삭제됨 (비활성 상태: 투명 검정 배경 + 흰 테두리 하트)
            // 활성 스타일 제거
            btn.classList.remove('bg-white', 'hover:bg-white/90');
            // 비활성 스타일 복구
            btn.classList.add('bg-black/20', 'hover:bg-black/40', 'text-white');
            
            // 아이콘 비활성 스타일 (흰색)
            icon.classList.remove('fill-red-500', 'text-red-500');
            icon.classList.add('text-white');
        }
    }
}

// --- DRAG AND DROP LOGIC (드래그 앤 드롭) ---
let draggedItem = null;

function addDragListeners() {
    const list = document.getElementById('itinerary-list');
    const items = list.querySelectorAll('.draggable-item');

    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const list = document.getElementById('itinerary-list');
    const afterElement = getDragAfterElement(list, e.clientY);
    
    if (afterElement == null) {
        list.appendChild(draggedItem);
    } else {
        list.insertBefore(draggedItem, afterElement);
    }
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItem = null;
    
    // Update itinerary array based on new DOM order
    const list = document.getElementById('itinerary-list');
    const newItinerary = [];
    list.querySelectorAll('.draggable-item').forEach(item => {
        newItinerary.push(item.dataset.id);
    });
    
    state.itinerary = newItinerary;
    updateItineraryRoute();
    renderHeader(); // Re-render to update index numbers
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function handleDrop(e) {
    e.preventDefault();
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// --- 시각적 자산 (VISUAL ASSETS) ---

/**
 * 코스용 핀 아이콘 생성
 */
function createCoursePinIcon(index, locationName) {
    return L.divIcon({
        className: 'custom-course-pin',
        html: `
            <div class="relative flex flex-col items-center z-50 group hover:z-[60]">
                <div class="absolute bottom-[48px] flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200 transform transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg">
                     <span class="text-blue-600 font-black text-lg font-mono leading-none flex items-center h-full pt-0.5">${index}</span>
                     <div class="w-px h-4 bg-gray-200 mx-0.5"></div>
                     <span class="text-gray-800 font-bold text-xs tracking-wide whitespace-nowrap">${locationName}</span>
                     <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-b border-r border-gray-200"></div>
                </div>
                <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png" 
                     class="w-[25px] h-[41px] drop-shadow-md group-hover:-translate-y-1 transition-transform duration-300" 
                     alt="Location">
            </div>
        `,
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    });
}

/**
 * 일반 아티클 핀 아이콘 생성
 */
function createArticlePinIcon(isSelected, title, planIndex = -1) {
    const pinColor = isSelected ? 'bg-blue-600 border-white text-white' : 'bg-white border-white text-sky-600';
    const stemColor = isSelected ? 'bg-blue-600' : 'bg-white shadow-sm';
    
    // 핀 선택 시 체크 표시 제거 (planIndex가 있을 때만 번호 표시, 그 외엔 뱃지 없음)
    const badge = isSelected && planIndex > -1 ? 
        `<div class="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full text-white flex items-center justify-center text-[10px] border-2 border-white shadow-sm z-50">
            ${planIndex + 1}
        </div>` : ''; 

    return L.divIcon({
        html: `
        <div class="relative flex flex-col items-center justify-end group" style="width: 40px; height: 60px;">
            ${badge}
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 ${pinColor} transition-colors duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 ${isSelected ? 'fill-current' : ''}"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="w-0.5 h-3 ${stemColor}"></div>
            <div class="${isSelected ? 'opacity-0' : 'opacity-0 translate-y-[-120%]'} absolute top-0 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1.5 rounded-lg shadow-xl text-xs font-bold whitespace-nowrap transition-all duration-200 pointer-events-none group-hover:opacity-100 group-hover:translate-y-[-140%] z-50 text-gray-800 border border-gray-100">
                ${title}
                <div class="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-b border-r border-gray-100"></div>
            </div>
        </div>`,
        className: `custom-pin ${isSelected ? 'z-[50]' : 'z-[10]'}`,
        iconSize: [40, 60],
        iconAnchor: [20, 60] 
    });
}

// --- 렌더링 (RENDERING) ---

function render() {
    renderHeader();
    renderFilters();
    renderArticlesList();
    renderMarkers();
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * 헤더 렌더링 (플래너 모드 버튼 변경 및 드래그 앤 드롭 지원)
 */
function renderHeader() {
    if (state.isEmbed) return;

    const plannerHeader = document.getElementById('planner-header');
    const planToggleBtnContainer = document.getElementById('plan-btn-container');
    const itineraryList = document.getElementById('itinerary-list');
    
    if (!planToggleBtnContainer) return;

    if (state.isPlanMode) {
        plannerHeader.classList.remove('hidden');
        
        // 플래너 모드일 때 버튼 변경
        planToggleBtnContainer.innerHTML = `
            <div class="flex flex-col gap-2">
                <button onclick="savePlanToMyPage()" class="w-full py-3 bg-sky-500 border border-transparent text-white rounded-xl text-sm font-bold hover:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-md">
                    <i data-lucide="save" class="w-4 h-4"></i> 마이 페이지 계획 추가
                </button>
                <button onclick="togglePlanMode()" class="w-full py-2 bg-white border border-gray-200 text-black-500 rounded-xl text-sm font-bold hover:bg-gray-100 hover:border-gray-200 transition-all flex items-center justify-center gap-2">
                    <i data-lucide="x" class="w-4 h-4"></i> 계획 종료
                </button>
            </div>
        `;
        
        // X 버튼 왼쪽, 드래그 핸들 오른쪽, 드래그 기능 추가
        if (state.itinerary.length === 0) {
            itineraryList.innerHTML = '<p class="text-xs text-gray-400 italic py-1">지도에서 장소를 선택하여 경로를 만드세요.</p>';
        } else {
            itineraryList.innerHTML = state.itinerary.map((id, index) => {
                const article = ARTICLES.find(a => a.id === id);
                return `<div class="group draggable-item flex items-center gap-2 py-2 border-b border-blue-50 last:border-0 hover:bg-blue-50/30 transition-colors px-1 rounded-lg cursor-grab active:cursor-grabbing" draggable="true" data-id="${article.id}">
                    <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">${index + 1}</span>
                    <span class="truncate text-xs text-gray-700 font-medium flex-1">${article.title}</span>
                    
                    <!-- X Button (Moved to left of action area) -->
                    <button onclick="toggleItineraryItem('${article.id}')" class="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors mr-1">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>

                    <!-- Drag Handle (Replaces Sort Buttons) -->
                    <div class="p-1 text-gray-400 hover:text-gray-600 cursor-grab">
                        <i data-lucide="grip-vertical" class="w-3 h-3"></i>
                    </div>
                </div>`;
            }).join('');
            
            // Drag listeners 연결
            addDragListeners();
        }

    } else {
        plannerHeader.classList.add('hidden');
        planToggleBtnContainer.innerHTML = `
            <button id="plan-toggle-btn" onclick="togglePlanMode()" class="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2 shadow-sm">
                <i data-lucide="map" class="w-4 h-4"></i> 여행 동선 계획
            </button>
        `;
    }
}

/**
 * 필터 렌더링
 */
function renderFilters() {
    if (state.isEmbed) return;

    const container = document.getElementById('filter-container');
    if (!container) return;

    const mainButtonsHTML = FILTER_BUTTONS.map(btn => {
        const isActive = state.activeFilters.length === 0 && btn.id === 'all' 
                         || state.activeFilters.includes(btn.id);
        
        let btnClass = "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border shadow-sm cursor-pointer ";
        if (isActive) {
            btnClass += "bg-sky-500 text-white border-sky-500 hover:bg-sky-600";
        } else {
            btnClass += "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-sky-300 hover:text-sky-600";
        }

        return `<button onclick="toggleFilter('${btn.id}')" class="${btnClass}">${btn.label}</button>`;
    }).join('');

    let subTagsHTML = '';
    let currentKeywords = [];
    
    if (state.activeFilters.length > 0) {
        state.activeFilters.forEach(filterId => {
            if (FILTER_DEFINITIONS[filterId]) {
                currentKeywords = [...currentKeywords, ...FILTER_DEFINITIONS[filterId].keywords];
            }
        });
    }
    
    currentKeywords = [...new Set(currentKeywords)];

    if (currentKeywords.length > 0) {
        const visibleCount = state.isFilterExpanded ? currentKeywords.length : 10;
        const visibleKeywords = currentKeywords.slice(0, visibleCount);
        const hasMore = currentKeywords.length > 10;

        const tags = visibleKeywords.map(keyword => {
            const isActive = state.activeSubTags.includes(keyword);
            const activeClass = isActive ? "active" : "";
            return `<button onclick="toggleSubTag('${keyword}')" class="sub-tag-btn ${activeClass}">${keyword}</button>`;
        }).join('');

        let toggleBtn = '';
        if (hasMore) {
            const icon = state.isFilterExpanded ? 'chevron-up' : 'chevron-down';
            const text = state.isFilterExpanded ? '접기' : '더보기';
            toggleBtn = `
                <div class="filter-expand-btn" onclick="toggleFilterExpand()">
                    <span>${text}</span>
                    <i data-lucide="${icon}" class="w-3 h-3"></i>
                </div>
            `;
        }

        subTagsHTML = `
            <div class="sub-filter-container w-full mt-2">
                <div class="sub-tags-grid">
                    ${tags}
                </div>
                ${toggleBtn}
            </div>
        `;
    }

    container.className = "flex flex-col w-full";
    container.innerHTML = `
        <div class="main-filter-row">
            ${mainButtonsHTML}
        </div>
        ${subTagsHTML}
    `;
}

/**
 * 아티클 리스트 렌더링
 */
function renderArticlesList() {
    if (state.isEmbed) return;

    const list = document.getElementById('articles-list');
    const count = document.getElementById('article-count');
    const emptyState = document.getElementById('empty-state');
    
    if (!list || !count || !emptyState) return;

    count.innerText = state.filteredArticles.length;
    
    if (state.filteredArticles.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-gray-400 text-sm">검색 결과가 없습니다.</div>';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        list.innerHTML = state.filteredArticles.map(article => {
            const isSelected = state.isPlanMode 
                ? state.itinerary.includes(article.id)
                : state.selectedId === article.id;
                
            let activeWrapper = isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200';
            let activeText = isSelected ? 'text-blue-700' : 'text-gray-800';
            
            const badge = state.isPlanMode && isSelected 
                ? `<div class="absolute top-2 right-2 bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm border border-white">${state.itinerary.indexOf(article.id) + 1}</div>`
                : '';

            return `
            <div onclick="selectArticle('${article.id}')" class="relative group flex gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border ${activeWrapper}">
                ${badge}
                <div class="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                    <img src="${article.imageUrl}" alt="${article.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                </div>
                <div class="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 class="font-bold text-sm truncate ${activeText}">${article.title}</h4>
                    <p class="text-xs text-gray-500 truncate mt-1">${article.subtitle}</p>
                    <div class="flex items-center gap-3 mt-2">
                        <div class="flex items-center gap-1 text-xs font-medium text-amber-500">
                            <i data-lucide="star" class="w-3 h-3 fill-current"></i>
                            <span>${article.rating}</span>
                        </div>
                        <!-- undefined가 표시되던 카테고리/맵핀 부분 제거됨 -->
                    </div>
                </div>
            </div>`;
        }).join('');
    }
}

/**
 * 맵 마커 렌더링
 */
function renderMarkers() {
    if (!map) return;
    
    for (let id in markers) {
        map.removeLayer(markers[id]);
    }
    markers = {};

    state.filteredArticles.forEach(article => {
        let isSelected;
        let icon;
        
        if (state.isPlanMode) {
            const index = state.itinerary.indexOf(article.id);
            isSelected = index > -1;
            icon = createArticlePinIcon(isSelected, article.title, index);
        } else {
            isSelected = state.selectedId === article.id;
            icon = createArticlePinIcon(isSelected, article.title);
        }

        const marker = L.marker([article.lat, article.lng], {
            icon: icon,
            zIndexOffset: isSelected ? 100 : 0
        }).addTo(map);
        
        marker.on('click', () => selectArticle(article.id));
        markers[article.id] = marker;
    });
}

/**
 * 상세 모달 열기
 */
function openModal(article) {
    if (state.isEmbed) return;

    const modal = document.getElementById('detail-modal');
    if (!modal) return;

    // 현재 찜 상태 확인
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    const isFav = favorites.includes(article.id);
    
    // 버튼 스타일 설정 (찜 여부에 따라 배경색/투명도 변경)
    const btnClass = isFav 
        ? 'bg-white hover:bg-white/90' 
        : 'bg-black/20 hover:bg-black/40 text-white';

    // 아이콘 스타일 설정
    const iconClass = isFav
        ? 'fill-red-500 text-red-500'
        : 'text-white';

    modal.classList.remove('hidden');
    modal.classList.add('slide-in');

    modal.innerHTML = `
    <!-- Hero Image -->
    <div class="relative h-64 shrink-0">
        <img src="${article.imageUrl}" alt="${article.title}" class="w-full h-full object-cover">
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        
        <!-- 하트 아이콘 버튼 -->
        <button id="modal-heart-btn-${article.id}" onclick="toggleFavoriteInMap('${article.id}')" class="absolute top-4 left-4 w-10 h-10 ${btnClass} backdrop-blur-sm rounded-full flex items-center justify-center transition-colors cursor-pointer z-10 group shadow-sm" title="찜하기">
            <i id="modal-heart-icon-${article.id}" data-lucide="heart" class="w-5 h-5 transition-all ${iconClass} group-hover:scale-110 duration-200"></i>
        </button>

        <button onclick="closeModal()" class="absolute top-4 right-4 w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors cursor-pointer z-10">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
        <div class="absolute bottom-4 left-6 right-6 text-white">
            <div class="flex items-center gap-2 mb-2 text-xs font-medium opacity-90">
                <span class="flex items-center gap-1">
                    <i data-lucide="star" class="w-3 h-3 fill-yellow-400 text-yellow-400"></i> ${article.rating}
                </span>
            </div>
            <h2 class="text-2xl font-bold leading-tight shadow-sm">${article.title}</h2>
            <p class="text-sm opacity-90 mt-1 font-light">${article.subtitle}</p>
        </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto custom-scrollbar bg-white">
        <div class="p-6 space-y-8">
             <div class="space-y-4">
                <div class="flex items-start gap-3 text-sm text-gray-700">
                    <i data-lucide="store" class="w-5 h-5 text-gray-400 shrink-0 mt-0.5"></i>
                        ${article.name}
                </div>
                <div class="flex items-start gap-3 text-sm text-gray-700">
                    <i data-lucide="map-pin" class="w-5 h-5 text-gray-400 shrink-0 mt-0.5"></i>
                    <p>${article.address}</p>
                </div>
                 <div class="flex items-start gap-3 text-sm text-gray-700">
                    <i data-lucide="tags" class="w-5 h-5 text-gray-400 shrink-0 mt-0.5"></i>
                    <p class="text-blue-600 font-medium">${article.mainTags.join(', ')}</p>
                </div>
             </div>

            <div class="space-y-4">
                <h3 class="font-bold text-gray-900 flex items-center gap-2 text-lg">
                    <i data-lucide="message-square" class="w-5 h-5 text-gray-400"></i> 후기
                </h3>
                <div class="space-y-3">
                    ${article.reviews.length > 0 ? article.reviews.map(r => `
                        <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div class="flex justify-between items-start mb-2">
                                <span class="font-semibold text-sm text-gray-800">${r.user}</span>
                            </div>
                            <div class="flex mb-2">
                                ${Array(5).fill(0).map((_, i) => `
                                    <i data-lucide="star" class="w-3 h-3 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}"></i>
                                `).join('')}
                            </div>
                            <p class="text-xs text-gray-600 leading-relaxed">${r.comment || r.text}</p>
                        </div>
                    `).join('') : '<p class="text-sm text-gray-400 italic">후기가 없습니다.</p>'}
                </div>
            </div>

        </div>
    </div>

    <!-- 5: 자세히 보기 버튼 우측으로 이동 (justify-end) -->
    <div class="p-4 bg-white border-t border-gray-100 flex items-center justify-end shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onclick="window.location.href='article.html?id=${article.id}'" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2">
            자세히 보기 <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </button>
    </div>
    `;
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * 모달 닫기
 */
function closeModal() {
    const modal = document.getElementById('detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        state.selectedId = null;
        
        if (!state.isPlanMode) {
             if (routeLayerGroup) {
                routeLayerGroup.clearLayers();
            }
        }
        
        render(); 
    }
}

/**
 * 로그인 유도 모달 생성 함수 (요청된 함수)
 */
function showLoginModal(message = '찜하기 기능은 로그인 후<br>이용하실 수 있습니다.') {
    // 이미 모달이 떠있으면 중복 생성 방지
    if (document.getElementById('login-confirm-modal')) return;

    const modalHtml = `
        <div id="login-confirm-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000;">
            <div style="background:#fff; padding:30px; border-radius:15px; text-align:center; width:90%; max-width:320px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <div style="font-size:40px; margin-bottom:15px;">🔒</div>
                <h3 style="margin-bottom:10px; font-size:18px;">로그인이 필요합니다</h3>
                <p style="color:#666; font-size:14px; margin-bottom:25px; line-height:1.5;">${message}</p>
                <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('login-confirm-modal').remove()" style="flex:1; padding:12px; border:none; border-radius:8px; background:#eee; cursor:pointer;">나중에</button>
                <button onclick="location.href='login.html'" style="flex:1; padding:12px; border:none; border-radius:8px; background:#000; background:#3b82f6;; cursor:pointer; font-weight:bold;">로그인하기</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * 알림 모달 생성 함수 (일반 Alert 대체)
 */
function showAlertModal(message, callback = null, cancelText = null, cancelCallback = null) {
    if (document.getElementById('alert-modal')) {
        document.getElementById('alert-modal').remove();
    }

    let buttonsHtml;
    
    if (cancelText) {
         buttonsHtml = `
            <div style="display:flex; gap:10px;">
                <button id="alert-cancel-btn" style="flex:1; padding:12px; border:none; border-radius:8px; background:#eee; color:#333; cursor:pointer; font-weight:bold; font-size:14px;">${cancelText}</button>
                <button id="alert-confirm-btn" style="flex:1; padding:12px; border:none; border-radius:8px; background:#3b82f6; color:#fff; cursor:pointer; font-weight:bold; font-size:14px;">확인</button>
            </div>
        `;
    } else {
         buttonsHtml = `
            <button id="alert-confirm-btn" style="width:100%; padding:12px; border:none; border-radius:8px; background:#3b82f6; color:#fff; cursor:pointer; font-weight:bold; font-size:14px;">확인</button>
        `;
    }

    const modalHtml = `
        <div id="alert-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000;">
            <div style="background:#fff; padding:30px; border-radius:15px; text-align:center; width:90%; max-width:320px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <h3 style="margin-bottom:10px; font-size:18px; font-weight:bold; color:#333;">알림</h3>
                <p style="color:#666; font-size:14px; margin-bottom:25px; line-height:1.5;">${message}</p>
                ${buttonsHtml}
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('alert-confirm-btn').onclick = function() {
        document.getElementById('alert-modal').remove();
        if (callback) callback();
    }
    
    if (cancelText) {
        document.getElementById('alert-cancel-btn').onclick = function() {
            document.getElementById('alert-modal').remove();
            if (cancelCallback) cancelCallback();
        }
    }
}
