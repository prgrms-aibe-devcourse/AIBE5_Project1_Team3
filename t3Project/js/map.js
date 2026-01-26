
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
            "해외", "태국", "일본", "베트남", "방콕", "오사카", "교토", "고베", "나랏마사", "도톤보리",
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
            "팟타이", "푸팟퐁커리", "오코노미야키", "돈카츠", "간식", "야식", "디너", "조식","전통한식"
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
    if (ARTICLES.some(a => a.title === '독도')) return;

    const dokdo = {
        id: 'dokdo-kr',
        title: '독도',
        subtitle: '대한민국의 아름다운 영토',
        description: '독도는 동해의 해저 지형 중 울릉분지의 북쪽 가장자리에 형성된 화산섬입니다. 천연기념물 제336호로 지정되어 있으며, 역사적, 지리적, 국제법적으로 명백한 대한민국의 고유 영토입니다.',
        content: `독도는 동도와 서도를 비롯한 89개의 부속 도서로 이루어져 있습니다. 괭이갈매기, 바다제비 등 다양한 조류의 번식지이며, 독특한 식생을 자랑합니다. 
        
        날씨가 좋을 때는 울릉도에서 육안으로 볼 수 있습니다. 입도하기 위해서는 미리 입도 신청을 해야 하며, 기상 상황에 따라 접안이 어려울 수 있습니다. 대한민국의 아침이 가장 먼저 시작되는 곳입니다.`,
        imageUrl: 'https://images.unsplash.com/photo-1548685913-fe6678b4268c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80', // 바위섬 이미지 대체
        lat: 37.2429, 
        lng: 131.8669,
        category: '자연',
        tags: ['국내', '자연', '관광지', '섬', '역사', '독도'],
        address: '경상북도 울릉군 울릉읍 독도이사부길 55',
        rating: 5.0,
        reviews: [
            { user: '대한민국만세', rating: 5, text: '가슴이 웅장해지는 우리 땅 독도!' },
            { user: '여행자', rating: 5, text: '날씨가 좋아서 접안 성공했습니다. 정말 아름답네요.' }
        ],
        mainTags: ['자연', '역사', '대한민국']
    };

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
window.moveItineraryItem = moveItineraryItem;
window.toggleFavoriteInMap = toggleFavoriteInMap; // 찜하기 기능 추가
window.savePlanToMyPage = savePlanToMyPage; // 마이페이지 계획 추가

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
        // 단일 선택 모드로 변경 (사용자 UX 고려: 탭처럼 동작)
        // 만약 다중 선택을 원하면 로직 변경 필요
        if (state.activeFilters.includes(filterId)) {
             // 이미 선택된 거 누르면 해제
             state.activeFilters = state.activeFilters.filter(id => id !== filterId);
        } else {
             // 새로운 거 누르면 기존 거 지우고 선택 (탭 방식)
             state.activeFilters = [filterId];
        }
        
        // 메인 필터가 바뀌면 서브 태그 선택도 초기화하는게 자연스러움
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
            // 활성화된 메인 필터 중 하나라도 만족하면 됨 (OR 조건이 자연스러움)
            // 하지만 이전 로직은 AND 였음. 여기선 버튼이 라디오처럼 동작하게 바꿨으므로 하나만 체크됨.
            mainFilterMatch = state.activeFilters.some(filterId => checkArticleMatchesFilter(article, filterId));
        }

        // 2. 서브 태그(키워드) 체크
        let subTagMatch = true;
        if (state.activeSubTags.length > 0) {
            // 선택된 서브 태그가 아티클의 태그나 텍스트에 포함되어 있는지
            subTagMatch = state.activeSubTags.some(tag => {
                return article.tags.some(t => t.includes(tag)) || 
                       article.title.includes(tag) || 
                       article.description.includes(tag);
            });
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
 * 1. 로그인 체크 -> 안되어있으면 로그인 페이지 이동
 * 2. 계획 저장
 * 3. 마이페이지 이동
 */
function savePlanToMyPage() {
    // 1. 로그인 여부 확인
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    // 2. 로그인 안되어 있으면 얼럿 후 이동
    if (!isLoggedIn) {
        alert('로그인이 필요한 서비스입니다');
        window.location.href = 'login.html';
        return;
    }

    // 3. 선택된 계획이 없는 경우 처리
    if (state.itinerary.length === 0) {
        alert('선택된 여행지가 없습니다. 지도에서 여행지를 선택해주세요.');
        return;
    }

    // 4. 마이페이지로 넘길 데이터 생성
    // ID 목록을 기반으로 전체 아티클 객체 찾기
    const selectedArticles = state.itinerary.map(id => ARTICLES.find(a => a.id === id)).filter(Boolean);
    
    // 장소를 기반으로 간단한 여행 제목 및 위치 생성
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

    // 5. 로컬 스토리지에 저장 (마이페이지 데이터 연동)
    const currentTrips = JSON.parse(localStorage.getItem('myTrips') || '[]');
    currentTrips.push(newTrip);
    localStorage.setItem('myTrips', JSON.stringify(currentTrips));

    // 6. 마이페이지로 이동
    alert('마이페이지에 계획이 추가되었습니다.');
    window.location.href = 'mypage.html';
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
 * 일정 순서 변경
 */
function moveItineraryItem(id, direction) {
    const index = state.itinerary.indexOf(id);
    if (index === -1) return;
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.itinerary.length) return;
    
    const temp = state.itinerary[index];
    state.itinerary[index] = state.itinerary[newIndex];
    state.itinerary[newIndex] = temp;
    
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
 * 모달 내 찜하기(하트) 토글 기능
 * 1.png 왼쪽 위에 하트 표시를 통해 찜 표시 후 mypage의 찜 목록에 넣기
 */
function toggleFavoriteInMap(id) {
    // 1. 로그인 체크
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        if(confirm('로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?')) {
            window.location.href = 'login.html';
        }
        return;
    }

    let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    const index = favorites.indexOf(id);
    
    if (index === -1) {
        favorites.push(id);
    } else {
        favorites.splice(index, 1);
    }
    
    localStorage.setItem("favorites", JSON.stringify(favorites));
    
    // 버튼 UI 즉시 업데이트 (색상 채우기/비우기)
    const btnIcon = document.getElementById(`modal-heart-${id}`);
    if (btnIcon) {
        if (index === -1) { // 방금 추가됨
            btnIcon.classList.remove('text-white');
            btnIcon.classList.add('fill-red-500', 'text-red-500', 'heart-active');
            setTimeout(() => btnIcon.classList.remove('heart-active'), 300);
        } else { // 방금 삭제됨
            btnIcon.classList.remove('fill-red-500', 'text-red-500');
            btnIcon.classList.add('text-white');
        }
    }
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
 * (수정됨: 핀 선택 시 오른쪽 위 체크 표시 제거)
 * isSelected여도 플래너 모드가 아니면 뱃지(숫자)나 체크표시를 띄우지 않음.
 */
function createArticlePinIcon(isSelected, title, planIndex = -1) {
    const pinColor = isSelected ? 'bg-blue-600 border-white text-white' : 'bg-white border-white text-blue-600';
    const stemColor = isSelected ? 'bg-blue-600' : 'bg-white shadow-sm';
    
    // 요청사항 1번: 맵에서 핑을 선택했을 때 핑 오른쪽 위에 체크 표시 제거
    // planIndex가 -1보다 클 때(계획 모드일 때)만 숫자 뱃지 표시
    const badge = (isSelected && planIndex > -1) ? 
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
 * 헤더 렌더링 (플래너 모드 버튼 변경 포함)
 * 3. 여행 계획하기 버튼을 누르면 '마이 페이지 계획 추가', '계획 종료' 버튼 넣기
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
                <button onclick="savePlanToMyPage()" class="w-full py-3 bg-blue-600 border border-transparent text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md">
                    <i data-lucide="save" class="w-4 h-4"></i> 마이 페이지 계획 추가
                </button>
                <button onclick="togglePlanMode()" class="w-full py-2 bg-white border border-gray-200 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2">
                    <i data-lucide="x" class="w-4 h-4"></i> 계획 종료
                </button>
            </div>
        `;
        
        if (state.itinerary.length === 0) {
            itineraryList.innerHTML = '<p class="text-xs text-gray-400 italic py-1">지도에서 장소를 선택하여 경로를 만드세요.</p>';
        } else {
            itineraryList.innerHTML = state.itinerary.map((id, index) => {
                const article = ARTICLES.find(a => a.id === id);
                return `<div class="group flex items-center gap-2 py-2 border-b border-blue-50 last:border-0 hover:bg-blue-50/30 transition-colors px-1 rounded-lg">
                    <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">${index + 1}</span>
                    <span class="truncate text-xs text-gray-700 font-medium flex-1">${article.title}</span>
                    
                    <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                        <button onclick="moveItineraryItem('${article.id}', -1)" class="p-1 hover:bg-white rounded text-gray-400 hover:text-blue-600 disabled:opacity-20" ${index === 0 ? 'disabled' : ''}>
                            <i data-lucide="chevron-up" class="w-3 h-3"></i>
                        </button>
                        <button onclick="moveItineraryItem('${article.id}', 1)" class="p-1 hover:bg-white rounded text-gray-400 hover:text-blue-600 disabled:opacity-20" ${index === state.itinerary.length - 1 ? 'disabled' : ''}>
                            <i data-lucide="chevron-down" class="w-3 h-3"></i>
                        </button>
                    </div>

                    <button onclick="toggleItineraryItem('${article.id}')" class="ml-1 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><i data-lucide="x" class="w-3 h-3"></i></button>
                </div>`;
            }).join('');
        }

    } else {
        plannerHeader.classList.add('hidden');
        // 기본 '여행 계획하기' 버튼으로 복구
        planToggleBtnContainer.innerHTML = `
            <button id="plan-toggle-btn" onclick="togglePlanMode()" class="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2 shadow-sm">
                <i data-lucide="map" class="w-4 h-4"></i> 여행 계획하기
            </button>
        `;
    }
}

/**
 * 필터 렌더링 (서브 태그 확장 UI 적용)
 * 6. 메인 태그 밑에 키워드를 서브 태그로 넣고 펼치기/줄이기로 조절
 */
function renderFilters() {
    if (state.isEmbed) return;

    const container = document.getElementById('filter-container');
    if (!container) return;

    // 1. 메인 카테고리 버튼 렌더링
    let mainButtonsHTML = FILTER_BUTTONS.map(btn => {
        const isActive = state.activeFilters.length === 0 && btn.id === 'all' 
                         || state.activeFilters.includes(btn.id);
        
        let btnClass = "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border shadow-sm cursor-pointer ";
        if (isActive) {
            btnClass += "bg-blue-600 text-white border-blue-600 hover:bg-blue-700";
        } else {
            btnClass += "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600";
        }

        return `<button onclick="toggleFilter('${btn.id}')" class="${btnClass}">${btn.label}</button>`;
    }).join('');

    // 2. 서브 태그(키워드) 렌더링
    // 현재 활성화된 메인 필터의 키워드들을 가져옴
    let subTagsHTML = '';
    let currentKeywords = [];
    
    if (state.activeFilters.length > 0) {
        // 활성화된 필터들의 키워드 수집
        state.activeFilters.forEach(filterId => {
            if (FILTER_DEFINITIONS[filterId]) {
                currentKeywords = [...currentKeywords, ...FILTER_DEFINITIONS[filterId].keywords];
            }
        });
    }
    
    // 중복 제거
    currentKeywords = [...new Set(currentKeywords)];

    if (currentKeywords.length > 0) {
        // 표시할 키워드 개수 설정 (펼쳐졌으면 전체, 아니면 8개 정도)
        const visibleCount = state.isFilterExpanded ? currentKeywords.length : 10;
        const visibleKeywords = currentKeywords.slice(0, visibleCount);
        const hasMore = currentKeywords.length > 10;

        const tags = visibleKeywords.map(keyword => {
            const isActive = state.activeSubTags.includes(keyword);
            const activeClass = isActive ? "active" : "";
            return `<button onclick="toggleSubTag('${keyword}')" class="sub-tag-btn ${activeClass}">#${keyword}</button>`;
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

    // 컨테이너 클래스 재설정 (grid 대신 flex column 사용)
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
                        <div class="flex items-center gap-1 text-xs text-gray-400">
                            <i data-lucide="map-pin" class="w-3 h-3"></i>
                            <span>${article.category}</span>
                        </div>
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
 * 2. 핑을 선택했을 때 1.png의 왼쪽 위에 하트 표시를 통해 찜 표시 후 mypage의 찜 목록에 넣기
 */
function openModal(article) {
    if (state.isEmbed) return;

    const modal = document.getElementById('detail-modal');
    if (!modal) return;

    // 현재 찜 상태 확인
    const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    const isFav = favorites.includes(article.id);
    const heartClass = isFav ? 'fill-red-500 text-red-500' : 'text-white';

    modal.classList.remove('hidden');
    modal.classList.add('slide-in');

    modal.innerHTML = `
    <!-- Hero Image -->
    <div class="relative h-64 shrink-0">
        <img src="${article.imageUrl}" alt="${article.title}" class="w-full h-full object-cover">
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        
        <!-- 하트 아이콘 버튼 (왼쪽 상단) -->
        <button onclick="toggleFavoriteInMap('${article.id}')" class="absolute top-4 left-4 w-10 h-10 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/40 transition-colors cursor-pointer z-10 group" title="찜하기">
            <i id="modal-heart-${article.id}" data-lucide="heart" class="w-5 h-5 transition-all ${heartClass} group-hover:scale-110 duration-200"></i>
        </button>

        <button onclick="closeModal()" class="absolute top-4 right-4 w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors cursor-pointer z-10">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
        <div class="absolute bottom-4 left-6 right-6 text-white">
            <div class="flex items-center gap-2 mb-2 text-xs font-medium opacity-90">
                <span class="bg-blue-600 px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">${article.category}</span>
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
                    <i data-lucide="map-pin" class="w-5 h-5 text-gray-400 shrink-0 mt-0.5"></i>
                    <p>${article.address}</p>
                </div>
                 <div class="flex items-start gap-3 text-sm text-gray-700">
                    <i data-lucide="tag" class="w-5 h-5 text-gray-400 shrink-0 mt-0.5"></i>
                    <p class="text-blue-600 font-medium">${article.mainTags.join(', ')}</p>
                </div>
             </div>

            <div>
                <h3 class="font-bold text-gray-900 text-lg mb-2">상세 정보</h3>
                <p class="text-gray-600 leading-relaxed text-sm mb-4">${article.description}</p>
                <div class="text-gray-600 leading-relaxed text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                    ${article.content || '상세 내용이 없습니다.'}
                </div>
            </div>

            <div class="space-y-4">
                <h3 class="font-bold text-gray-900 flex items-center gap-2 text-lg">
                    <i data-lucide="message-square" class="w-5 h-5 text-amber-500"></i> 생생 후기
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

    <div class="p-4 bg-white border-t border-gray-100 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
