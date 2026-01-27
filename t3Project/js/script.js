// [script.js 최상단에 추가]
// 1. Supabase 클라이언트 초기화 (모든 페이지 공통)
const SUPABASE_URL = 'https://ozhieovgrmnehaimuyni.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96aGllb3Zncm1uZWhhaW11eW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NzgwODksImV4cCI6MjA4NDU1NDA4OX0.haULDDCnJXw4zwFeJSQKhS1Jun4CRFCziGgKQKVwmyY';

// window 객체에 할당하여 어디서든 접근 가능하게 함
if (typeof supabase !== 'undefined') {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("Supabase SDK가 로드되지 않았습니다. HTML <head>를 확인하세요.");
}
/***********************************************
 * [전역 설정]
 * Lucide 아이콘 초기화 및 전역 변수 설정
 ***********************************************/
if (typeof lucide !== "undefined") {
  lucide.createIcons();
}

let activeFilters = new Set(); // 선택된 필터를 저장하는 집합
let visibleCount = 9; // 처음에 보여줄 카드 개수 (3x3)
let isInfiniteScroll = false; // 더보기 버튼 클릭 후 무한스크롤 전환 여부
let searchQuery = ''; // [중요] 검색어 저장 변수

// [추가] 새로고침 시 무작위 노출을 위한 셔플 데이터 저장 변수
let shuffledArticles = [];

/**
 * --- 셔플 함수 ---
 */
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * --- 1. 네비게이션 & 스크롤 UI ---
 */
const nav = document.getElementById("navbar");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuClose = document.getElementById("mobile-menu-close");

window.addEventListener("scroll", () => {
  if (nav) {
    if (window.scrollY > 20) {
      nav.classList.add("scrolled");
    } else if (document.body.id === "page-home") {
      nav.classList.remove("scrolled");
    }
  }

  if (isInfiniteScroll) {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 500
    ) {
      handleInfiniteLoad();
    }
  }

  const floBan = document.getElementById("floating-banner");
  if (floBan) {
    if (window.scrollY > 400) {
      floBan.style.display = "block";
    } else {
      floBan.style.display = "none";
    }
  }
});

if (mobileMenuBtn) mobileMenuBtn.onclick = () => mobileMenu.classList.add("open");
if (mobileMenuClose) mobileMenuClose.onclick = () => mobileMenu.classList.remove("open");

/**
 * --- 2. 로그인 및 실제 Supabase 세션 관리 ---
 */

// [수정] UI 업데이트 로직을 별도 함수로 분리하여 재사용성 높임
function updateAuthUI(session) {
  const isLoggedIn = !!session;
  const loginBtn = document.getElementById("nav-login-btn");
  const userAvatar = document.getElementById("nav-user-avatar");
  const otherTriggers = document.querySelectorAll(".btn-login-trigger");
  const mobileUserLink = document.querySelector('.mobile-menu-link.user-avatar-display');

  if (isLoggedIn) {
    if (loginBtn) loginBtn.style.display = "none";
    if (userAvatar) {
      userAvatar.style.display = "block";
      const img = userAvatar.querySelector('img');
      // 구글 등 소셜 로그인 메타데이터 우선 참조
      const avatarUrl = session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`;
      if (img) img.src = avatarUrl;
    }
    if (mobileUserLink) mobileUserLink.classList.remove('hidden');
    otherTriggers.forEach((btn) => btn.style.display = "none");
    localStorage.setItem("isLoggedIn", "true");
  } else {
    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (userAvatar) {
      userAvatar.style.display = "none";
      const img = userAvatar.querySelector('img');
      if (img) img.src = ""; 
    }
    if (mobileUserLink) mobileUserLink.classList.add('hidden');
    otherTriggers.forEach((btn) => btn.style.display = "block");
    localStorage.setItem("isLoggedIn", "false");
  }
}

function showAuthModal(title, message, icon = '🔔') {
    // 기존 모달이 있으면 제거
    const oldModal = document.getElementById('auth-custom-modal');
    if (oldModal) oldModal.remove();

    const modalHtml = `
        <div id="auth-custom-modal" 
             onclick="if(event.target === this) this.remove()" 
             style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000;">
            <div style="background:#fff; padding:30px; border-radius:24px; text-align:center; width:90%; max-width:320px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                <div style="font-size:48px; margin-bottom:15px;">${icon}</div>
                <h3 style="margin-bottom:10px; font-size:18px; font-weight:bold;">${title}</h3>
                <p style="color:#666; font-size:14px; margin-bottom:25px; line-height:1.6;">${message}</p>
                <button onclick="document.getElementById('auth-custom-modal').remove()" 
                        style="width:100%; padding:14px; border:none; border-radius:12px; background:#000; color:#fff; cursor:pointer; font-size:14px; font-weight:bold;">확인</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function showConfirmModal(title, message, onConfirm, icon = '❓') {
    const oldModal = document.getElementById('auth-confirm-modal');
    if (oldModal) oldModal.remove();

    const modalHtml = `
        <div id="auth-confirm-modal" 
             style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000;">
            <div style="background:#fff; padding:30px; border-radius:24px; text-align:center; width:90%; max-width:320px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                <div style="font-size:48px; margin-bottom:15px;">${icon}</div>
                <h3 style="margin-bottom:10px; font-size:18px; font-weight:bold;">${title}</h3>
                <p style="color:#666; font-size:14px; margin-bottom:25px; line-height:1.6;">${message}</p>
                <div style="display:flex; gap:12px;">
                    <button onclick="document.getElementById('auth-confirm-modal').remove()" 
                            style="flex:1; padding:14px; border:none; border-radius:12px; background:#f3f4f6; color:#4b5563; cursor:pointer; font-weight:600;">취소</button>
                    <button id="modal-confirm-btn" 
                            style="flex:1; padding:14px; border:none; border-radius:12px; background:#000; color:#fff; cursor:pointer; font-weight:bold;">확인</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 확인 버튼 클릭 시 실행할 로직 연결
    document.getElementById('modal-confirm-btn').onclick = () => {
        document.getElementById('auth-confirm-modal').remove();
        onConfirm(); // 전달받은 함수 실행
    };
}

// [수정] 실시간 감시(onAuthStateChange)를 포함한 상태 체크
async function checkLoginStatus() {
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("Supabase 클라이언트를 찾을 수 없습니다.");
    return;
  }

  // 1. 초기 세션 확인
  const { data: { session } } = await supabase.auth.getSession();
  updateAuthUI(session);

  // 2. [중요] 상태 변경 실시간 감지 (로그인/로그아웃 즉시 반응)
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("인증 이벤트:", event);
    updateAuthUI(session);
    if (event === 'SIGNED_OUT') {
      localStorage.removeItem('userProfile');
      updateFavoriteUI();
    }
  });
}

// [수정] 로그아웃 함수를 전역에서 사용 가능하도록 window 객체에 할당
async function handleLogout() {
  const supabase = window.supabaseClient;
  if (!supabase) return;

  showConfirmModal(
        "로그아웃", 
        "떠나신다니 아쉬워요...", 
        async () => {
            // 이 부분이 '확인'을 눌렀을 때 실행될 내용입니다.
            const { error } = await supabase.auth.signOut();
            if (error) {
                showAuthModal("오류", error.message, "⚠️");
            } else {
                localStorage.setItem('isLoggedIn', 'false');
                localStorage.removeItem('userProfile');
                
                // 알림 모달을 보여주고 1.5초 뒤에 페이지 이동
                showAuthModal("로그아웃 완료", "안전하게 로그아웃 되었습니다.", "👋");
                setTimeout(() => {
                    location.href = 'index.html';
                }, 1500);
            }
        },
        "😟" // 로그아웃에 어울리는 아이콘
    );
}
// 전역 함수로 등록 (mypage.html 등에서 호출 가능하게)
window.handleLogout = handleLogout;

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
 * --- 3. 카드 렌더링 (검색 + 필터 통합 + 랜덤 셔플 적용) ---
 */
function toggleFilter(filterId) {
  const btn = document.querySelector(`.filter-btn[data-id="${filterId}"]`);
  if (!btn) return;
  if (filterId === "all") {
    activeFilters.clear();
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  } else {
    document.querySelector('.filter-btn[data-id="all"]').classList.remove("active");
    activeFilters.has(filterId) ? activeFilters.delete(filterId) : activeFilters.add(filterId);
    btn.classList.toggle("active");
    if (activeFilters.size === 0)
      document.querySelector('.filter-btn[data-id="all"]').classList.add("active");
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

function renderArticles() {
  const grid = document.getElementById("article-grid");
  if (!grid || typeof ARTICLES === "undefined") return;

  // [중요] 처음 로드 시에만 무작위로 섞음
  if (shuffledArticles.length === 0) {
    shuffledArticles = shuffleArray(ARTICLES);
  }

  grid.innerHTML = "";

  // 1. 필터링 및 검색 로직 (섞인 데이터인 shuffledArticles 사용)
  const filtered = shuffledArticles.filter((article) => {
    let matchesFilter = true;
    if (activeFilters.size > 0) {
  matchesFilter = Array.from(activeFilters).some((filterId) => {
    // 1. 국내 여행 (태극기 아이콘)
    if (filterId === "domestic") {
      const domesticKeywords = [
        "국내", "한국", "대한민국", "제주", "서울", "부산", "강릉", "경주", "가평", "춘천", 
        "여수", "강원도", "경기도", "경포대", "주문진", "초당", "황리단길", "대릉원", "불국사",
        "첨성대", "보문단지", "설악면", "상면", "아침고요수목원", "양떼목장", "전통한식"
      ];
      // 태그에 위 키워드가 '포함'되어 있는지 검사 (ex: "강릉여행"도 걸리게 함)
      return article.tags.some((tag) => domesticKeywords.some(key => tag.includes(key)));
    }

    // 2. 해외 여행
    if (filterId === "overseas") {
      const overseasKeywords = [
        "해외", "태국", "일본", "베트남", "방콕", "오사카", "교토", "고베", "나랏마사", "도톤보리", 
        "난바", "우메다", "신사이바시", "코사무이", "괌", "GUAM", "유럽", "스페인", "방콕사원", 
        "짜뚜짝", "카오산", "실롬", "와불상", "천수각", "도요토미", "간사이", "투몬", "하갓냐"
      ];
      return article.tags.some((tag) => overseasKeywords.some(key => tag.includes(key)));
    }

    // 3. 자연 & 힐링 (지락실 멤버 및 숙소 테마)
    if (filterId === "nature") {
      const natureKeywords = [
        "자연", "힐링", "바다", "숲", "산", "계곡", "호수", "섬", "해변", "산책", "목장", 
        "휴양", "온천", "정글", "트리하우스", "안유진", "이영지", "미미", "이은지", "지락실",
        "지구오락실", "나영석", "촌캉스", "감성숙소", "독채", "펜션", "글램핑", "캠핑", "노을", "석양"
      ];
      return article.tags.some((tag) => natureKeywords.some(key => tag.includes(key)));
    }

    // 4. 도시 & 핫플 (쇼핑 및 야경)
    if (filterId === "city") {
      const cityKeywords = [
        "도시", "도심", "시티", "야경", "핫플", "트렌디", "쇼핑", "백화점", "편집숍", 
        "인스타감성", "랜드마크", "복합문화공간", "야시장", "번화가", "MZ세대", "SNS핫플",
        "비즈니스", "역세권", "가성비호텔", "5성급", "호캉스", "면세점", "기념품"
      ];
      return article.tags.some((tag) => cityKeywords.some(key => tag.includes(key)));
    }

    // 5. 음식 & 맛집 (미식 키워드)
    if (filterId === "food") {
      const foodKeywords = [
        "맛집", "카페", "음식", "디저트", "브런치", "레스토랑", "베이커리", "먹방", 
        "미식", "로컬맛집", "커피", "스테이크", "라멘", "타코야키", "순두부", "호떡",
        "팟타이", "푸팟퐁커리", "오코노미야키", "돈카츠", "간식", "야식", "디너", "조식"
      ];
      return article.tags.some((tag) => foodKeywords.some(key => tag.includes(key)));
    }

    return false;
  });
}

    let matchesSearch = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const inTitle = article.title.toLowerCase().includes(query);
      const inSubtitle = article.subtitle?.toLowerCase().includes(query);
      const inTags = article.tags.some((tag) => tag.toLowerCase().includes(query));
      const inMainTags = article.mainTags?.some((tag) => tag.toLowerCase().includes(query));
      matchesSearch = inTitle || inSubtitle || inTags || inMainTags;
    }

    return (activeFilters.size > 0 || searchQuery !== '') ? (matchesFilter && matchesSearch) : true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-result" style="grid-column: 1/-1; text-align: center; padding: 100px 0; color: #999;">검색 결과가 없습니다.</div>`;
    return;
  }

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
  updateDetailLikeUI(id);
}

function updateFavoriteUI() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const favorites = isLoggedIn ? JSON.parse(localStorage.getItem("favorites") || "[]") : [];
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
 * 헤더 '찜' 버튼 클릭 핸들러
 */
function handleFavoriteClick() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  if (!isLoggedIn) {
    // 1. 로그인이 안 되어 있으면 즉시 경고창을 띄웁니다.
    alert("로그인이 필요한 서비스입니다.");
    // 2. 필요하다면 여기서 바로 로그인 페이지로 보낼 수도 있습니다.
    location.href = "login.html"; 
  } else {
    // 3. 로그인 상태라면 마이페이지의 좋아요 목록으로 이동합니다.
    location.href = "mypage.html?tab=favorites";
  }
}

// 전역에서 사용할 수 있게 등록
window.handleFavoriteClick = handleFavoriteClick;
/* 상세 페이지 전용 좋아요 UI 업데이트 */
function updateDetailLikeUI(articleId) {
  const likeBtn = document.getElementById("detail-like-btn");
  if (!likeBtn) return;

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const favorites = isLoggedIn
    ? JSON.parse(localStorage.getItem("favorites") || "[]")
    : [];

  const isFav = favorites.includes(articleId);
  const icon = likeBtn.querySelector("svg");


  

  if (isFav) {
    likeBtn.style.backgroundColor = "var(--red-500)";
    likeBtn.style.borderColor = "var(--red-500)";
    if (icon) {
      icon.style.fill = "white";
      icon.style.stroke = "white";
    }
  } else {
    likeBtn.style.backgroundColor = "";
    likeBtn.style.borderColor = "";
    if (icon) {
      icon.style.fill = "none";
      icon.style.stroke = "currentColor";
    }
  }
}
/**
 * --- 5. 검색 및 이벤트 핸들링 ---
 */
const mainSearchInput = document.getElementById("main-search-input");
const searchDropdown = document.getElementById("search-dropdown");
const clearBtn = document.getElementById("search-clear-btn");

function handleSearch() {
    if(mainSearchInput) {
        searchQuery = mainSearchInput.value.trim().toLowerCase();
        if(searchDropdown) searchDropdown.classList.add("hidden");
        renderArticles(); 
    }
}

if (mainSearchInput) {
    mainSearchInput.addEventListener("focus", () => {
        if(searchDropdown) searchDropdown.classList.remove("hidden");
    });
    mainSearchInput.addEventListener("input", (e) => {
        if(clearBtn) {
            e.target.value.length > 0 ? clearBtn.classList.remove("hidden") : clearBtn.classList.add("hidden");
        }
    });
    mainSearchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSearch();
    });
}

const searchBtnInside = document.querySelector(".search-btn-inside");
if (searchBtnInside) searchBtnInside.addEventListener("click", handleSearch);

document.querySelectorAll(".search-tag").forEach(tagElement => {
    tagElement.addEventListener("click", () => {
        const tagName = tagElement.textContent.replace('#', '').trim();
        if(mainSearchInput) {
            mainSearchInput.value = tagName;
            if(clearBtn) clearBtn.classList.remove("hidden");
            handleSearch();
        }
    });
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-container")) {
    if(searchDropdown) searchDropdown.classList.add("hidden");
  }
});

if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        mainSearchInput.value = "";
        clearBtn.classList.add("hidden");
        mainSearchInput.focus();
        handleSearch();
    });
}

/**
 * --- 6. 초기 실행 및 탭 전환 ---
 */
// [수정] 비동기 함수로 감싸서 실행 순서 보장
window.addEventListener("DOMContentLoaded", async () => {
  await checkLoginStatus(); // 로그인 상태 확인 먼저!
  if (document.getElementById("article-grid")) renderArticles();
  updateFavoriteUI();
   if (window.currentArticle) {
    updateDetailLikeUI(window.currentArticle.id);
  }
  // URL 파라미터 체크 (탭 전환)
  const urlParams = new URLSearchParams(window.location.search);
  const tabName = urlParams.get('tab');
  if (tabName === 'favorites') {
      switchTab('favorites');
  }
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    // 탭 전환 시 시각적 활성화 (두 번째 버튼이 좋아요 목록이라고 가정)
    const btns = document.querySelectorAll('.tab-btn');
    if (tabId === 'favorites' && btns.length > 1) {
        btns[1].classList.add('active');
    } else if (btns.length > 0) {
        btns[0].classList.add('active');
    }
    console.log(tabId + " 탭으로 전환됨");
}

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
window.switchTab = switchTab;
