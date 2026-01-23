/**
 * [전역 설정]
 * Lucide 아이콘 초기화 및 전역 변수 설정
 */
if (typeof lucide !== "undefined") {
  lucide.createIcons();
}
let activeFilters = new Set(); // 선택된 필터를 저장하는 집합
let visibleCount = 9; // 처음에 보여줄 카드 개수 (3x3)
let isInfiniteScroll = false; // 더보기 버튼 클릭 후 무한스크롤 전환 여부
let searchQuery = ''; // [중요] 검색어 저장 변수
/**
 * --- 1. 네비게이션 & 스크롤 UI ---
 */
const nav = document.getElementById("navbar");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuClose = document.getElementById("mobile-menu-close");
window.addEventListener("scroll", () => {
  // 네비게이션 배경 처리
  if (nav) {
    if (window.scrollY > 20) {
      nav.classList.add("scrolled");
    } else if (document.body.id === "page-home") {
      nav.classList.remove("scrolled");
    }
  }
  // 무한 스크롤 로직
  if (isInfiniteScroll) {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 500
    ) {
      handleInfiniteLoad();
    }
  }
  // 플로팅 배너 노출 제어
  const floBan = document.getElementById("floating-banner");
  if (floBan) {
    if (window.scrollY > 400) {
      floBan.style.display = "block";
    } else {
      floBan.style.display = "none";
    }
  }
});
// 모바일 메뉴 열기/닫기
if (mobileMenuBtn)
  mobileMenuBtn.onclick = () => mobileMenu.classList.add("open");
if (mobileMenuClose)
  mobileMenuClose.onclick = () => mobileMenu.classList.remove("open");
/**
 * --- 2. 로그인 및 최근 본 상품 관리 ---
 */
function checkLoginStatus() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const loginBtn = document.getElementById("nav-login-btn");
  const userAvatar = document.getElementById("nav-user-avatar");
  if (loginBtn && userAvatar) {
    if (isLoggedIn) {
      loginBtn.style.display = "none";
      userAvatar.style.display = "block";
    } else {
      loginBtn.style.display = "inline-flex";
      userAvatar.style.display = "none";
    }
  }
  const otherTriggers = document.querySelectorAll(".btn-login-trigger");
  otherTriggers.forEach((btn) => {
    btn.style.display = isLoggedIn ? "none" : "block";
  });
}
function addToRecent(articleId) {
  let recent = JSON.parse(localStorage.getItem("recentArticles") || "[]");
  recent = recent.filter((id) => id !== articleId);
  recent.unshift(articleId);
  if (recent.length > 5) recent.pop();
  localStorage.setItem("recentArticles", JSON.stringify(recent));
}
function renderFloatingBanner() {
  const floBanContent = document.getElementById("floban-content");
  if (!floBanContent || typeof ARTICLES === "undefined") return;
  const recent = JSON.parse(localStorage.getItem("recentArticles") || "[]");
  const article =
    recent.length > 0 ? ARTICLES.find((a) => a.id === recent[0]) : ARTICLES[0];
  if (article) {
    floBanContent.innerHTML = `
      <div class="flex items-center gap-3 cursor-pointer" onclick="location.href='article.html?id=${article.id}'" style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${article.imageUrl}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;">
          <div>
              <p style="font-size: 10px; color: var(--accent); font-weight: bold; margin-bottom: 2px;">최근 본 상품</p>
              <p style="font-size: 14px; font-weight: bold; color: var(--gray-900); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${article.title}</p>
          </div>
      </div>`;
  }
}
/**
 * --- 3. 카드 렌더링 (검색 + 필터 통합) ---
 */
function toggleFilter(filterId) {
  const btn = document.querySelector(`.filter-btn[data-id="${filterId}"]`);
  if (!btn) return;
  if (filterId === "all") {
    activeFilters.clear();
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  } else {
    document
      .querySelector('.filter-btn[data-id="all"]')
      .classList.remove("active");
    activeFilters.has(filterId)
      ? activeFilters.delete(filterId)
      : activeFilters.add(filterId);
    btn.classList.toggle("active");
    if (activeFilters.size === 0)
      document
        .querySelector('.filter-btn[data-id="all"]')
        .classList.add("active");
  }
  visibleCount = 9;
  renderArticles();
}
function handleLoadMore() {
  isInfiniteScroll = true;
  const loadMoreBtn = document.querySelector(".load-more-container");
  if (loadMoreBtn) loadMoreBtn.style.display = "none";
  visibleCount = 21;
  renderArticles();
}
function handleInfiniteLoad() {
  if (typeof ARTICLES !== "undefined" && visibleCount < ARTICLES.length) {
    visibleCount += 3;
    renderArticles();
  }
}
// [핵심] 검색 로직이 포함된 렌더링 함수
function renderArticles() {
  const grid = document.getElementById("article-grid");
  if (!grid || typeof ARTICLES === "undefined") return;
  grid.innerHTML = "";
  // 1. 필터링 및 검색 로직
  const filtered = ARTICLES.filter((article) => {
    // [A] 상단 버튼 필터 (국내/해외 등)
    let matchesFilter = true;
    if (activeFilters.size > 0) {
      matchesFilter = Array.from(activeFilters).some((filterId) => {
        if (filterId === "domestic") {
          const domesticKeywords = ["국내", "한국", "제주", "서울", "부산", "강원", "경주", "여수"];
          return article.tags.some((tag) => domesticKeywords.includes(tag));
        }
        if (filterId === "overseas") {
          const overseasKeywords = ["해외", "태국", "일본", "베트남", "방콕", "다낭", "오사카", "도쿄", "유럽"];
          return article.tags.some((tag) => overseasKeywords.includes(tag));
        }
        if (filterId === "nature") {
          const natureKeywords = ["자연", "힐링", "바다", "숲", "캠핑", "산", "안유진"];
          return article.tags.some((tag) => natureKeywords.includes(tag));
        }
        if (filterId === "city") {
          const cityKeywords = ["도시", "야경", "도심", "시티", "핫플", "트렌디"];
          return article.tags.some((tag) => cityKeywords.includes(tag));
        }
        return false;
      });
    }
    // [B] 검색어 체크 (data.js의 tags 포함 여부 확인)
    let matchesSearch = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase(); // 검색어 소문자 변환
      
      const inTitle = article.title.toLowerCase().includes(query);
      const inSubtitle = article.subtitle?.toLowerCase().includes(query);
      
      // data.js의 tags 배열 안에 검색어가 포함되어 있는지 확인
      const inTags = article.tags.some((tag) => tag.toLowerCase().includes(query));
      
      // mainTags 배열 안에 검색어가 포함되어 있는지 확인
      const inMainTags = article.mainTags?.some((tag) => tag.toLowerCase().includes(query));
      
      matchesSearch = inTitle || inSubtitle || inTags || inMainTags;
    }
    return matchesFilter && matchesSearch;
  });
  // 2. 결과 없음 처리
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-result" style="grid-column: 1/-1; text-align: center; padding: 100px 0; color: #999;">검색 결과가 없습니다.</div>`;
    return;
  }
  // 3. 카드 HTML 생성
  filtered.slice(0, visibleCount).forEach((article) => {
    const card = document.createElement("div");
    card.className = "article-card";
    card.innerHTML = `
        <div class="card-img-wrap">
            <img src="${article.imageUrl}" alt="${article.title}" class="card-img">
            <div class="card-overlay"></div>
        </div>
        <div class="card-like-btn-wrap">
            <button class="nav-icon-btn btn-like" data-id="${article.id}" onclick="event.stopPropagation(); toggleFavorite('${article.id}')">
                <i data-lucide="heart" width="20"></i>
            </button>
        </div>
        <div class="card-content">
            <div class="card-badge-area">
                ${article.mainTags.map((tag) => `<span class="card-badge">#${tag}</span>`).join("")}
            </div>
            <h3 class="card-title">${article.title}</h3>
            <div class="card-subtitle-wrapper">
                <p class="card-subtitle">${article.subtitle || "자세히 보기"}</p>
            </div>
        </div>`;
    card.onclick = () => {
      addToRecent(article.id);
      location.href = `article.html?id=${article.id}`;
    };
    grid.appendChild(card);
  });
  if (typeof lucide !== "undefined") lucide.createIcons();
  updateFavoriteUI();
}
/**
 * --- 4. 좋아요 기능 ---
 */
function toggleFavorite(id) {
  if (localStorage.getItem("isLoggedIn") !== "true") {
    if (confirm("로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?")) {
      location.href = "login.html";
    }
    return;
  }
  let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  const index = favorites.indexOf(id);
  index === -1 ? favorites.push(id) : favorites.splice(index, 1);
  localStorage.setItem("favorites", JSON.stringify(favorites));
  updateFavoriteUI();
}
function updateFavoriteUI() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const favorites = isLoggedIn
    ? JSON.parse(localStorage.getItem("favorites") || "[]")
    : [];
  const countEl = document.getElementById("favorite-count");
  if (countEl) {
    if (isLoggedIn && favorites.length > 0) {
      countEl.textContent = favorites.length;
      countEl.style.display = "flex";
    } else {
      countEl.style.display = "none";
    }
  }
  document.querySelectorAll(".btn-like").forEach((btn) => {
    const id = btn.dataset.id;
    const isFav = favorites.includes(id);
    const icon = btn.querySelector("svg");
    if (isFav) {
      btn.style.background = "white";
      btn.style.color = "#ef4444";
      if (icon) {
        icon.style.fill = "#ef4444";
        icon.style.stroke = "#ef4444";
      }
    } else {
      btn.style.background = "rgba(255,255,255,0.2)";
      btn.style.color = "white";
      if (icon) {
        icon.style.fill = "none";
        icon.style.stroke = "currentColor";
      }
    }
  });
}
/**
 * --- 5. 검색 및 이벤트 핸들링 (수정된 부분) ---
 */
const mainSearchInput = document.getElementById("main-search-input");
const searchDropdown = document.getElementById("search-dropdown");
const clearBtn = document.getElementById("search-clear-btn");
// 검색 실행 함수
function handleSearch() {
    if(mainSearchInput) {
        // 검색어 가져오기
        searchQuery = mainSearchInput.value.trim().toLowerCase();
        
        // 검색 후 드롭다운 닫기
        if(searchDropdown) searchDropdown.classList.add("hidden");
        
        // 화면 갱신
        renderArticles(); 
    }
}
if (mainSearchInput) {
    // 포커스 시 드롭다운 열기
    mainSearchInput.addEventListener("focus", () => {
        if(searchDropdown) searchDropdown.classList.remove("hidden");
    });
    
    // 입력 시 X 버튼 제어
    mainSearchInput.addEventListener("input", (e) => {
        if(clearBtn) {
            e.target.value.length > 0 ? clearBtn.classList.remove("hidden") : clearBtn.classList.add("hidden");
        }
    });
    // 엔터키 입력 시 검색
    mainSearchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    });
}
// "검색" 버튼 클릭 이벤트 (.search-btn-inside)
const searchBtnInside = document.querySelector(".search-btn-inside");
if (searchBtnInside) {
    searchBtnInside.addEventListener("click", handleSearch);
}
// 돋보기 아이콘 클릭 이벤트 (혹시 있을 경우)
const searchIconBtn = document.querySelector(".search-container .lucide-search");
if (searchIconBtn) {
    searchIconBtn.style.cursor = "pointer";
    searchIconBtn.onclick = handleSearch;
}
// [중요] 드롭다운 태그(.search-tag) 클릭 시 검색창에 입력 및 검색 실행
document.querySelectorAll(".search-tag").forEach(tagElement => {
    tagElement.addEventListener("click", () => {
        // 태그 텍스트에서 # 제거 (예: #제주도 -> 제주도)
        const tagName = tagElement.textContent.replace('#', '').trim();
        
        if(mainSearchInput) {
            mainSearchInput.value = tagName; // 검색창에 값 넣기
            if(clearBtn) clearBtn.classList.remove("hidden"); // X 버튼 보이게 하기
            handleSearch(); // 검색 실행
        }
    });
});
// 외부 클릭 시 드롭다운 닫기
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-container")) {
    if(searchDropdown) searchDropdown.classList.add("hidden");
  }
});
// X 버튼 클릭 시 초기화
if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        mainSearchInput.value = "";
        clearBtn.classList.add("hidden");
        mainSearchInput.focus();
        handleSearch(); // 전체 목록 다시 보여주기
    });
}
/**
 * --- 6. 초기 실행 ---
 */
window.addEventListener("DOMContentLoaded", () => {
  checkLoginStatus();
  renderFloatingBanner();
  if (document.getElementById("article-grid")) renderArticles();
  updateFavoriteUI();
});
function scrollToContent() {
  const contentSection = document.getElementById("content");
  if (contentSection) {
    contentSection.scrollIntoView({ behavior: "smooth" });
  }
}
// 전역 노출
window.toggleFilter = toggleFilter;
window.toggleFavorite = toggleFavorite;
window.handleLoadMore = handleLoadMore;
window.scrollToContent = scrollToContent;