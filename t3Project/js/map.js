import { ARTICLES } from './data.js';

// --- STATE ---
let state = {
    query: '',
    activeFilters: [], // Changed to empty array by default
    selectedId: null,
    isSidebarOpen: true,
    filteredArticles: [...ARTICLES],
    // State for Planner
    isPlanMode: false,
    itinerary: [], 
    // State for Filters
    isFilterExpanded: false,
    // Embed mode
    isEmbed: false,
};

let map = null;
let markers = {};
let routeLayerGroup = null; 
let routingControls = []; 

// --- FILTER CATEGORIES CONFIGURATION ---
// Based on the visual requirement
const TAG_CATEGORIES = [
    { 
        id: 'style', 
        label: '여행 스타일', 
        tags: ['자연', '도시', '문화', '휴식', '액티비티', '사진', '쇼핑', '맛집', '모험', '웰니스'] 
    },
    { 
        id: 'companion', 
        label: '누구와 함께', 
        tags: ['가족', '친구', '혼자', '커플', '아이', '부모님'] 
    },
    { 
        id: 'region', 
        label: '지역', 
        tags: ['국내', '해외', '태국', '방콕', '가평', '춘천', '코사무이'] 
    },
    { 
        id: 'amenity', 
        label: '편의시설', 
        tags: ['주차', '대중교통', '반려동물', '와이파이', '식당', '카페'] 
    },
    { 
        id: 'theme', 
        label: '테마', 
        tags: ['로맨틱', '힐링', '이색', '로컬', '유명', '숨은 명소', '핫플', '럭셔리'] 
    }
];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Check for embed mode
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
    
    // Handle initial article selection from URL
    const id = params.get('id');
    if (id) {
        // Slight delay to allow map to initialize dimensions
        setTimeout(() => selectArticle(id), 100);
    }
    
    // Event Listeners
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.query = e.target.value;
            updateFilteredArticles();
        });
    }
    
    // Initialize icons if library is loaded
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Expose functions to window for HTML onclick handlers
window.resetApp = resetApp;
window.toggleFilter = toggleFilter;
window.toggleFilterExpand = toggleFilterExpand;
window.selectArticle = selectArticle;
window.toggleSidebar = toggleSidebar;
window.closeModal = closeModal;
window.togglePlanMode = togglePlanMode;
window.clearItinerary = clearItinerary;
window.toggleItineraryItem = toggleItineraryItem;
window.moveItineraryItem = moveItineraryItem;

// --- LOGIC ---
function initMap() {
    map = L.map('map', {
        center: [13.75, 100.5], 
        zoom: 5,
        minZoom: 2,
        zoomControl: false
    });
    
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    routeLayerGroup = L.layerGroup().addTo(map);
}

function clearRoutingControls() {
    if (routingControls.length > 0) {
        routingControls.forEach(control => {
            if (map) map.removeControl(control);
        });
        routingControls = [];
    }
}

function toggleFilter(tagName) {
    if (state.activeFilters.includes(tagName)) {
        state.activeFilters = state.activeFilters.filter(t => t !== tagName);
    } else {
        state.activeFilters.push(tagName);
    }
    updateFilteredArticles();
}

function toggleFilterExpand() {
    state.isFilterExpanded = !state.isFilterExpanded;
    renderFilters();
}

function updateFilteredArticles() {
    const query = state.query.toLowerCase();
    
    state.filteredArticles = ARTICLES.filter(article => {
        // 1. Search Text Match
        const matchesSearch = article.title.toLowerCase().includes(query) || 
                              article.tags.some(tag => tag.toLowerCase().includes(query));
        
        // 2. Filter Tags Match (OR logic within filters: show if it matches ANY selected filter)
        // If no filters selected, show all.
        let matchesFilter = true;
        if (state.activeFilters.length > 0) {
            // Check if article has ANY tag that includes the selected filter keyword (Fuzzy Match)
            // e.g. Selected "가족" should match article tag "가족여행"
            const articleTagsString = article.tags.join(' ') + ' ' + article.category;
            matchesFilter = state.activeFilters.some(filter => articleTagsString.includes(filter));
        }

        return matchesSearch && matchesFilter;
    });
    
    render();

    // Auto-fit bounds based on filtered items
    if (map && state.filteredArticles.length > 0 && !state.isEmbed) {
        const bounds = L.latLngBounds(state.filteredArticles.map(a => [a.lat, a.lng]));
        map.flyToBounds(bounds, { 
            padding: [50, 50], 
            maxZoom: 12,
            duration: 1.5 
        });
    }
}

// --- PLANNER LOGIC ---
function togglePlanMode() {
    state.isPlanMode = !state.isPlanMode;
    closeModal();
    state.selectedId = null; 
    
    clearRoutingControls();
    if (routeLayerGroup) {
        routeLayerGroup.clearLayers();
    }
    
    if (state.isPlanMode) {
        updateItineraryRoute();
    }
    
    render();
}

function clearItinerary() {
    state.itinerary = [];
    clearRoutingControls();
    if (routeLayerGroup) routeLayerGroup.clearLayers();
    render();
}

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

function updateItineraryRoute() {
    clearRoutingControls();
    if (routeLayerGroup) routeLayerGroup.clearLayers();

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

    allStops.forEach(stop => {
        const icon = createCoursePinIcon(stop.globalIndex, stop.name);
        const marker = L.marker([stop.lat, stop.lng], { 
            icon: icon,
            zIndexOffset: 2000 
        }).addTo(routeLayerGroup);
        
        // ... (Popup logic remains same) ...
    });

    if (allStops.length > 1) {
        const waypoints = allStops.map(s => L.latLng(s.lat, s.lng));
        
        const control = L.Routing.control({
            waypoints: waypoints,
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'car' 
            }),
            lineOptions: {
                styles: [{color: '#2563eb', opacity: 0.8, weight: 6, className: 'animate-draw'}]
            },
            createMarker: function() { return null; },
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            show: false
        }).addTo(map);
        
        routingControls.push(control);
        const bounds = L.latLngBounds(waypoints);
        map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
    } else if (allStops.length === 1) {
        map.flyTo([allStops[0].lat, allStops[0].lng], 13);
    }
}

// --- EXPLORER LOGIC ---

function selectArticle(id) {
    if (state.isPlanMode) {
        toggleItineraryItem(id);
        return;
    }

    state.selectedId = id;
    render(); 
    
    const article = ARTICLES.find(a => a.id === id);
    if (article && map) {
        // Ensure no route layers are active in explorer mode
        if (routeLayerGroup) routeLayerGroup.clearLayers();
        clearRoutingControls();

        // Just fly to the location
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

function resetApp() {
    state.query = '';
    state.activeFilters = [];
    state.selectedId = null;
    state.isPlanMode = false;
    state.itinerary = [];
    state.isFilterExpanded = false;
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    state.filteredArticles = [...ARTICLES];
    
    if (routeLayerGroup) {
        routeLayerGroup.clearLayers();
    }
    clearRoutingControls();
    
    if (map) map.flyTo([13.75, 100.5], 5);
    closeModal();
    render();
}

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

// --- VISUAL ASSETS ---
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

function createArticlePinIcon(isSelected, title, planIndex = -1) {
    const pinColor = isSelected ? 'bg-blue-600 border-white text-white' : 'bg-white border-white text-blue-600';
    const stemColor = isSelected ? 'bg-blue-600' : 'bg-white shadow-sm';
    
    const badge = isSelected && planIndex > -1 ? 
        `<div class="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full text-white flex items-center justify-center text-[10px] border-2 border-white shadow-sm z-50">
            ${planIndex + 1}
        </div>` : 
        (isSelected ? `<div class="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full text-white flex items-center justify-center text-[10px] border-2 border-white shadow-sm z-50"><i data-lucide="check" class="w-3 h-3"></i></div>` : '');

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

// --- RENDERING ---
function render() {
    renderHeader();
    renderFilters();
    renderArticlesList();
    renderMarkers();
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function renderHeader() {
    // If in embed mode, header is hidden via sidebar hiding, so no need for complex logic here
    if (state.isEmbed) return;

    const plannerHeader = document.getElementById('planner-header');
    const toggleBtn = document.getElementById('plan-toggle-btn');
    const itineraryList = document.getElementById('itinerary-list');
    
    if (state.isPlanMode) {
        plannerHeader.classList.remove('hidden');
        toggleBtn.classList.add('bg-blue-600', 'text-white', 'border-transparent');
        toggleBtn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
        toggleBtn.innerHTML = '<i data-lucide="x" class="w-4 h-4"></i> Exit Plan';
        
        if (state.itinerary.length === 0) {
            itineraryList.innerHTML = '<p class="text-xs text-gray-400 italic py-1">Select places on the map to build your route.</p>';
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
        toggleBtn.classList.remove('bg-blue-600', 'text-white', 'border-transparent');
        toggleBtn.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
        toggleBtn.innerHTML = '<i data-lucide="map" class="w-4 h-4"></i> Plan Trip';
    }
}

function renderFilters() {
    if (state.isEmbed) return;

    const container = document.getElementById('filter-container');
    if (!container) return;

    // Determine which categories to show
    const visibleCategories = state.isFilterExpanded 
        ? TAG_CATEGORIES 
        : TAG_CATEGORIES.slice(0, 3); // Show first 3 by default

    const rowsHTML = visibleCategories.map(cat => {
        const tagsHTML = cat.tags.map(tag => {
            const isActive = state.activeFilters.includes(tag);
            return `<button onclick="toggleFilter('${tag}')" 
                           class="filter-tag-btn ${isActive ? 'active' : ''}">
                ${tag}
            </button>`;
        }).join('');

        return `
        <div class="filter-row">
            <div class="filter-label">${cat.label}</div>
            <div class="filter-options">
                ${tagsHTML}
            </div>
        </div>
        `;
    }).join('');

    // Add Toggle Button
    const toggleHTML = `
        <div class="filter-toggle-area">
            <button onclick="toggleFilterExpand()" class="filter-toggle-btn">
                ${state.isFilterExpanded ? '접기' : `더 많은 필터 보기 (${TAG_CATEGORIES.length - 3}개)`}
                <i data-lucide="${state.isFilterExpanded ? 'chevron-up' : 'chevron-down'}" class="w-3 h-3"></i>
            </button>
        </div>
    `;

    // Apply specific class for styling instead of grid
    container.className = "filter-grid";
    container.innerHTML = rowsHTML + toggleHTML;
}

function renderArticlesList() {
    if (state.isEmbed) return;

    const list = document.getElementById('articles-list');
    const count = document.getElementById('article-count');
    const emptyState = document.getElementById('empty-state');
    
    if (!list || !count || !emptyState) return;

    count.innerText = state.filteredArticles.length;
    
    if (state.filteredArticles.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-gray-400 text-sm">No articles found.</div>';
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

function renderMarkers() {
    if (!map) return;
    
    for (let id in markers) {
        map.removeLayer(markers[id]);
    }
    markers = {};

    state.filteredArticles.forEach(article => {
        // In embed mode, only show the marker for the selected article, or all markers?
        // Showing all markers is better for context, but highlighting the selected one.
        // If query/filters change (impossible in embed mode as UI is hidden), markers update.
        
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

function openModal(article) {
    if (state.isEmbed) return;

    const modal = document.getElementById('detail-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('slide-in');

    modal.innerHTML = `
    <!-- Hero Image -->
    <div class="relative h-64 shrink-0">
        <img src="${article.imageUrl}" alt="${article.title}" class="w-full h-full object-cover">
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
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
        <div>
            <p class="text-xs text-gray-500">예상 비용</p>
            <p class="text-lg font-bold text-blue-600">${article.price}</p>
        </div>
        <button onclick="window.location.href='article.html?id=${article.id}'" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2">
            자세히 보기 <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </button>
    </div>
    `;
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function closeModal() {
    const modal = document.getElementById('detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        state.selectedId = null;
        
        if (!state.isPlanMode) {
             if (routeLayerGroup) {
                routeLayerGroup.clearLayers();
            }
            clearRoutingControls();
        }
        
        render(); 
    }
}