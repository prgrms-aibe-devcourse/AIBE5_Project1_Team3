// 전역 설정
if (typeof lucide !== 'undefined') {
  lucide.createIcons();
}

// --- 1. 네비게이션 & 모바일 메뉴 ---
const nav = document.getElementById('navbar');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileMenuClose = document.getElementById('mobile-menu-close');

// 스크롤 효과
window.addEventListener('scroll', () => {
  const navTexts = document.querySelectorAll('.nav-link');
  const logos = document.querySelectorAll('.logo-text');
  
  if (nav) {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      // 메인 페이지(index.html)에서만 투명 배경 적용
      if (document.body.id === 'page-home') {
        nav.classList.remove('scrolled');
      }
    }
  }
  
  // 플로팅 배너 표시 (메인 페이지 전용)
  const floBan = document.getElementById('floating-banner');
  if (floBan) {
    if (window.scrollY > 400) {
      floBan.classList.remove('hidden');
      floBan.classList.add('block');
    } else {
      floBan.classList.add('hidden');
      floBan.classList.remove('block');
    }
  }
});

// 모바일 메뉴 토글
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.add('open');
  });
}
if (mobileMenuClose) {
  mobileMenuClose.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
  });
}


// --- 2. 로그인 상태 관리 (Simulated) ---
function checkLoginStatus() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const loginBtns = document.querySelectorAll('.btn-login-trigger');
  const userAvatars = document.querySelectorAll('.user-avatar-display');

  if (isLoggedIn) {
    loginBtns.forEach(btn => btn.classList.add('hidden'));
    userAvatars.forEach(avt => {
       avt.classList.remove('hidden');
       avt.style.display = 'block'; // Ensure it shows
    });
  } else {
    loginBtns.forEach(btn => btn.classList.remove('hidden'));
    userAvatars.forEach(avt => {
        avt.classList.add('hidden');
        avt.style.display = 'none';
    });
  }
}

// --- 3. 최근 본 상품 (LocalStorage) ---
function addToRecent(articleId) {
  let recent = JSON.parse(localStorage.getItem('recentArticles') || '[]');
  recent = recent.filter(id => id !== articleId);
  recent.unshift(articleId);
  if (recent.length > 5) recent.pop();
  localStorage.setItem('recentArticles', JSON.stringify(recent));
}

function renderFloatingBanner() {
  const floBanContent = document.getElementById('floban-content');
  if (!floBanContent) return;

  const recent = JSON.parse(localStorage.getItem('recentArticles') || '[]');
  
  // Helper to create banner HTML
  const createBannerHTML = (title, article) => `
    <div class="flex items-center gap-3 cursor-pointer" onclick="location.href='article.html?id=${article.id}'" style="display: flex; align-items: center; gap: 0.75rem;">
      <img src="${article.imageUrl}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;">
      <div>
        <p style="font-size: 10px; color: var(--accent); font-weight: bold; margin-bottom: 2px;">${title}</p>
        <p style="font-size: 14px; font-weight: bold; color: var(--gray-900); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${article.title}</p>
      </div>
    </div>
  `;

  if (recent.length === 0) {
    if (typeof ARTICLES !== 'undefined' && ARTICLES.length > 0) {
      floBanContent.innerHTML = createBannerHTML('추천 여행지', ARTICLES[0]);
    }
  } else {
    if (typeof ARTICLES !== 'undefined') {
      const article = ARTICLES.find(a => a.id === recent[0]);
      if (article) {
        floBanContent.innerHTML = createBannerHTML('최근 본 상품', article);
      }
    }
  }
}

// --- 4. 필터링 로직 (index.html 전용) ---
let activeFilters = new Set();

function toggleFilter(filterId) {
  const btn = document.querySelector(`.filter-btn[data-id="${filterId}"]`);
  if (!btn) return;
  
  if (filterId === 'all') {
    activeFilters.clear();
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    const allBtn = document.querySelector('.filter-btn[data-id="all"]');
    if(allBtn) allBtn.classList.remove('active');
    
    if (activeFilters.has(filterId)) {
      activeFilters.delete(filterId);
      btn.classList.remove('active');
    } else {
      activeFilters.add(filterId);
      btn.classList.add('active');
    }

    if (activeFilters.size === 0) {
      const allBtn = document.querySelector('.filter-btn[data-id="all"]');
      if(allBtn) allBtn.classList.add('active');
    }
  }
  renderArticles();
}

function renderArticles() {
  const grid = document.getElementById('article-grid');
  if (!grid) return;
  if (typeof ARTICLES === 'undefined') return;

  grid.innerHTML = '';
  
  let filtered = ARTICLES;

  const urlParams = new URLSearchParams(window.location.search);
  const tagParam = urlParams.get('tag');
  if (tagParam) {
    filtered = filtered.filter(a => a.tags.includes(tagParam));
  }

  if (activeFilters.size > 0) {
    filtered = filtered.filter(article => {
      return Array.from(activeFilters).every(filterId => {
        if (filterId === 'all') return true;
        if (filterId === 'domestic') return article.category === '국내여행';
        if (filterId === 'overseas') return article.category === '해외여행';
        if (filterId === 'nature') return article.tags.some(t => ['자연', '힐링'].includes(t));
        if (filterId === 'city') return article.tags.some(t => ['도시', '야경'].includes(t));
        if (filterId === 'activity') return article.tags.includes('액티비티');
        return true;
      });
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 5rem; color: var(--gray-500);">조건에 맞는 여행지가 없습니다.</div>`;
    return;
  }

  filtered.forEach(article => {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.onclick = () => location.href = `article.html?id=${article.id}`;
    
    // Updated HTML structure with standard classes
    card.innerHTML = `
        <div class="card-img-wrap">
            <img src="${article.imageUrl}" alt="${article.title}" class="card-img">
            <div class="card-overlay"></div>
        </div>
        
        <div class="card-like-btn-wrap">
            <button class="nav-icon-btn btn-like" data-id="${article.id}" onclick="event.stopPropagation(); toggleFavorite('${article.id}')" style="background: rgba(255,255,255,0.2); backdrop-filter: blur(4px);">
                <i data-lucide="heart" width="20"></i>
            </button>
        </div>
        
        <div class="card-content">
            <div style="margin-bottom: 0.5rem;">
                <span class="card-badge">${article.category}</span>
            </div>
            <h3 class="card-title">${article.title}</h3>
            <p class="card-subtitle">${article.subtitle || ''}</p>
            <div class="card-meta">
               <span>${article.price}</span>
               <span class="flex items-center gap-1"><i data-lucide="star" width="10"></i> ${article.rating}</span>
            </div>
        </div>
    `;
    grid.appendChild(card);
  });
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  updateFavoriteUI();
}

// --- 공통 좋아요 기능 ---
function getFavorites() {
  return JSON.parse(localStorage.getItem('favorites') || '[]');
}

function toggleFavorite(id) {
  if (localStorage.getItem('isLoggedIn') !== 'true') {
    if(confirm('로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?')) {
      location.href = 'login.html';
    }
    return;
  }

  const favorites = getFavorites();
  const index = favorites.indexOf(id);
  
  if (index === -1) {
    favorites.push(id);
  } else {
    favorites.splice(index, 1);
  }
  
  localStorage.setItem('favorites', JSON.stringify(favorites));
  updateFavoriteUI();
}

function updateFavoriteUI() {
  const favorites = getFavorites();
  
  // 헤더 카운트 업데이트
  const countEl = document.getElementById('favorite-count');
  if (countEl) {
    if (favorites.length > 0) {
      countEl.textContent = favorites.length;
      countEl.classList.remove('hidden');
      countEl.style.display = 'flex';
    } else {
      countEl.classList.add('hidden');
      countEl.style.display = 'none';
    }
  }

  // 카드 하트 아이콘 업데이트
  document.querySelectorAll('.btn-like').forEach(btn => {
    const id = btn.dataset.id;
    const icon = btn.querySelector('i');
    if(!icon) return;

    if (favorites.includes(id)) {
      icon.setAttribute('fill', 'currentColor');
      icon.style.color = '#ef4444'; // red-500
      btn.style.background = 'white';
      btn.style.color = '#ef4444';
    } else {
      icon.setAttribute('fill', 'none');
      icon.style.color = 'white';
      btn.style.background = 'rgba(255,255,255,0.2)';
      btn.style.color = 'white';
    }
  });
}

// --- Global Export ---
window.toggleFilter = toggleFilter;
window.toggleFavorite = toggleFavorite;
window.addToRecent = addToRecent;
window.checkLoginStatus = checkLoginStatus;

// 초기화
window.addEventListener('DOMContentLoaded', () => {
  checkLoginStatus();
  renderFloatingBanner();
  
  if (document.getElementById('article-grid')) {
    renderArticles();
  }
  
  updateFavoriteUI();
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

