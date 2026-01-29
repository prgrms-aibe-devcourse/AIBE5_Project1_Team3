// =================================================================
// 1. 초기화 및 전역 변수 설정
// =================================================================
const SUPABASE_URL = "https://ozhieovgrmnehaimuyni.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96aGllb3Zncm1uZWhhaW11eW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NzgwODksImV4cCI6MjA4NDU1NDA4OX0.haULDDCnJXw4zwFeJSQKhS1Jun4CRFCziGgKQKVwmyY";

if (typeof supabase !== "undefined") {
  window.supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );
}

if (typeof lucide !== "undefined") {
  lucide.createIcons();
}

let activeFilters = new Set();
let visibleCount = 9;
let isInfiniteScroll = false;
let searchQuery = "";
let shuffledArticles = [];
const selectedTags = new Set(); // 선택된 태그 관리

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// =================================================================
// 2. 네비게이션 & UI 인터랙션
// =================================================================
const nav = document.getElementById("navbar");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuClose = document.getElementById("mobile-menu-close");

window.addEventListener("scroll", () => {
  if (nav) {
    if (window.scrollY > 20) nav.classList.add("scrolled");
    else if (document.body.id === "page-home") nav.classList.remove("scrolled");
  }
  if (
    isInfiniteScroll &&
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 500
  ) {
    handleInfiniteLoad();
  }
  const floBan = document.getElementById("floating-banner");
  if (floBan) floBan.style.display = window.scrollY > 400 ? "block" : "none";
});

if (mobileMenuBtn)
  mobileMenuBtn.onclick = () => mobileMenu.classList.add("open");
if (mobileMenuClose)
  mobileMenuClose.onclick = () => mobileMenu.classList.remove("open");

// =================================================================
// 3. 인증(Auth) 및 커스텀 모달 시스템
// =================================================================
async function checkLoginStatus() {
  const supabase = window.supabaseClient;
  if (!supabase) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  updateAuthUI(session);
  supabase.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session);
    if (event === "SIGNED_OUT") {
      localStorage.removeItem("userProfile");
      updateFavoriteUI();
    }
  });
}

function updateAuthUI(session) {
  const isLoggedIn = !!session;
  const loginBtn = document.getElementById("nav-login-btn");
  const userAvatar = document.getElementById("nav-user-avatar");
  const mobileUserLink = document.querySelector(
    ".mobile-menu-link.user-avatar-display",
  );
  const otherTriggers = document.querySelectorAll(".other-auth-trigger") || [];

  if (isLoggedIn) {
    if (loginBtn) loginBtn.style.display = "none";
    if (userAvatar) {
      userAvatar.style.display = "block";
      const img = userAvatar.querySelector("img");
      if (img)
        img.src =
          session.user.user_metadata?.avatar_url ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`;
    }
    if (mobileUserLink) mobileUserLink.classList.remove("hidden");
    otherTriggers.forEach((btn) => (btn.style.display = "none"));
    localStorage.setItem("isLoggedIn", "true");
  } else {
    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (userAvatar) userAvatar.style.display = "none";
    if (mobileUserLink) mobileUserLink.classList.add("hidden");
    otherTriggers.forEach((btn) => (btn.style.display = "block"));
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
             style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000; backdrop-filter: blur(4px);">
            <div style="background:#fff; padding:30px; border-radius:24px; text-align:center; width:90%; max-width:320px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
                <div style="font-size:48px; margin-bottom:15px;">${icon}</div>
                <h3 style="margin-bottom:10px; font-size:18px; font-weight:bold; color:#1a1a1a;">${title}</h3>
                <p style="color:#666; font-size:14px; margin-bottom:25px; line-height:1.6;">${message}</p>
                <button onclick="document.getElementById('auth-custom-modal').remove()" 
                        style="width:100%; padding:14px; border:none; border-radius:12px; background:#3b82f6; color:#fff; cursor:pointer; font-size:14px; font-weight:bold; transition: background 0.2s;"
                        onmouseover="this.style.background='#2563eb'"
                        onmouseout="this.style.background='#3b82f6'"> 확인 </button>
            </div>
        </div>
        <style>
            @keyframes modalPop {
                from { opacity: 0; transform: scale(0.9) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function showConfirmModal(title, message, onConfirm, icon = '❓') {
    const oldModal = document.getElementById('auth-confirm-modal');
    if (oldModal) oldModal.remove();

    const modalHtml = `
        <div id="auth-confirm-modal" 
             style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000; backdrop-filter: blur(4px);">
            <div style="background:#fff; padding:30px; border-radius:24px; text-align:center; width:90%; max-width:320px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
                <div style="font-size:48px; margin-bottom:15px;">${icon}</div>
                <h3 style="margin-bottom:10px; font-size:18px; font-weight:bold; color:#1a1a1a;">${title}</h3>
                <p style="color:#666; font-size:14px; margin-bottom:25px; line-height:1.6;">${message}</p>
                <div style="display:flex; gap:12px;">
                    <button onclick="document.getElementById('auth-confirm-modal').remove()" 
                            style="flex:1; padding:14px; border:none; border-radius:12px; background:#f3f4f6; color:#4b5563; cursor:pointer; font-weight:600; transition: background 0.2s;"
                            onmouseover="this.style.background='#e5e7eb'"
                            onmouseout="this.style.background='#f3f4f6'">취소</button>
                    <button id="modal-confirm-btn" 
                            style="flex:1; padding:14px; border:none; border-radius:12px; background:#3b82f6; color:#fff; cursor:pointer; font-weight:bold; transition: background 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);"
                            onmouseover="this.style.background='#2563eb'"
                            onmouseout="this.style.background='#3b82f6'">확인</button>
                </div>
            </div>
        </div>
        <style>
            @keyframes modalPop {
                from { opacity: 0; transform: scale(0.9) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('modal-confirm-btn').onclick = () => {
        document.getElementById('auth-confirm-modal').remove();
        if (onConfirm) onConfirm();
    };
}

function showLoginModal() {
  if (document.getElementById("login-confirm-modal")) return;
  const modalHtml = `
    <div id="login-confirm-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000;">
        <div style="background:#fff; padding:30px; border-radius:15px; text-align:center; width:90%; max-width:320px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
            <div style="font-size:40px; margin-bottom:15px;">🔒</div>
            <h3 style="margin-bottom:10px; font-size:18px;">로그인이 필요합니다</h3>
            <p style="color:#666; font-size:14px; margin-bottom:25px; line-height:1.5;">찜하기 기능은 로그인 후<br>이용하실 수 있습니다.</p>
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('login-confirm-modal').remove()" style="flex:1; padding:12px; border:none; border-radius:8px; background:#eee; cursor:pointer;">나중에</button>
                <button onclick="location.href='login.html'" style="flex:1; padding:12px; border:none; border-radius:8px; background:#000; background:#3b82f6; cursor:pointer; font-weight:bold; color:#ffffff;">로그인하기</button>
            </div>
        </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

async function handleLogout() {
  const supabase = window.supabaseClient;
  if (!supabase) return;
  showConfirmModal(
    "로그아웃",
    "떠나신다니 아쉬워요...",
    async () => {
      const { error } = await supabase.auth.signOut();
      if (error) showAuthModal("오류", error.message, "⚠️");
      else {
        localStorage.setItem("isLoggedIn", "false");
        localStorage.removeItem("userProfile");
        showAuthModal("로그아웃 완료", "안전하게 로그아웃 되었습니다.", "👋");
        setTimeout(() => {
          location.href = "index.html";
        }, 1500);
      }
    },
    "😟",
  );
}

// =================================================================
// 4. 찜하기(Favorite) & 상세 페이지 UI 연동 + 토스트 알림
// =================================================================

/**
 * 토스트 메시지를 화면에 띄우는 함수
 */
function showLikeToast(message) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText =
      "position:fixed; bottom:30px; left:50%; transform:translateX(-50%); z-index:10001; display:flex; flex-direction:column; gap:10px; pointer-events:none;";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.cssText =
    "background:rgba(0,0,0,0.8); color:#fff; padding:12px 24px; border-radius:50px; font-size:14px; font-weight:bold; box-shadow:0 4px 12px rgba(0,0,0,0.15); transition:all 0.3s ease; opacity:0; transform:translateY(10px);";
  toast.innerText = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  // 2초 후 삭제
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function handleLikeClick(event, articleId) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (!isLoggedIn) {
    showLoginModal();
  } else {
    toggleFavorite(articleId);
  }
}

function toggleFavorite(id) {
  let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  const stringId = String(id);
  const index = favorites.indexOf(stringId);

  if (index === -1) {
    favorites.push(stringId);
    // [수정] 메시지 변경 완료
    showLikeToast("📂 마이페이지에 저장됐습니다!");
  } else {
    favorites.splice(index, 1);
    showLikeToast("🗑️ 마이페이지에서 삭제됐습니다!");
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));
  updateFavoriteUI();
  if (typeof updateDetailLikeUI === "function") updateDetailLikeUI(stringId);
}

function updateFavoriteUI() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const favorites = isLoggedIn
    ? JSON.parse(localStorage.getItem("favorites") || "[]")
    : [];

  const countEl = document.getElementById("favorite-count");
  if (countEl) {
    countEl.textContent = favorites.length;
    countEl.style.display =
      isLoggedIn && favorites.length > 0 ? "flex" : "none";
  }

  document.querySelectorAll(".btn-like").forEach((btn) => {
    const isFav = favorites.includes(String(btn.dataset.id));
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

function updateDetailLikeUI(articleId) {
  const likeBtn = document.getElementById("detail-like-btn");
  if (!likeBtn) return;
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  const isFav = favorites.includes(String(articleId));
  const icon = likeBtn.querySelector("svg");
  if (isFav) {
    likeBtn.style.backgroundColor = "#ef4444";
    if (icon) {
      icon.style.fill = "white";
      icon.style.stroke = "white";
    }
  } else {
    likeBtn.style.backgroundColor = "";
    if (icon) {
      icon.style.fill = "none";
      icon.style.stroke = "currentColor";
    }
  }
}

// [유지] 최근 본 항목 추가 로직
function addToRecent(articleId) {
  let recent = JSON.parse(localStorage.getItem("recentArticles") || "[]");
  recent = recent.filter((id) => id !== articleId);
  recent.unshift(articleId);
  if (recent.length > 5) recent.pop();
  localStorage.setItem("recentArticles", JSON.stringify(recent));
}
// =================================================================
// 5. 카드 렌더링 & 필터/검색 통합 로직
// =================================================================

// 카테고리 데이터 (함수 밖으로 빼서 관리)
const categories = {
  domestic: [
    "국내",
    "한국",
    "제주",
    "강릉",
    "부산",
    "가평",
    "경주",
    "여수",
    "속초",
    "양양",
    "전주",
    "포항",
    "남해",
    "거제",
    "통영",
    "대구",
    "대전",
    "광주",
    "울산",
    "인천",
    "수원",
    "성남",
    "고양",
    "용인",
    "부천",
    "안산",
    "청주",
    "천안",
    "창원",
    "김해",
    "구미",
    "제주도",
  ],
  overseas: [
    "해외",
    "일본",
    "태국",
    "베트남",
    "미국",
    "유럽",
    "프랑스",
    "이탈리아",
    "스페인",
    "영국",
    "독일",
    "스위스",
    "호주",
    "뉴질랜드",
    "캐나다",
    "중국",
    "대만",
    "홍콩",
    "싱가포르",
    "말레이시아",
    "인도네시아",
    "필리핀",
    "괌",
    "사이판",
    "하와이",
    "발리",
    "다낭",
    "나트랑",
    "푸꾸옥",
    "방콕",
    "치앙마이",
    "도쿄",
    "오사카",
    "후쿠오카",
    "삿포로",
    "오키나와",
  ],
  nature: [
    "자연",
    "힐링",
    "바다",
    "산",
    "숲",
    "계곡",
    "캠핑",
    "글램핑",
    "불멍",
    "물멍",
    "별멍",
    "촌캉스",
    "한옥",
    "템플스테이",
    "트레킹",
    "등산",
    "서핑",
    "다이빙",
    "스노쿨링",
    "스키",
    "보드",
    "빠지",
    "수상레저",
    "낚시",
    "골프",
    "승마",
    "요가",
    "명상",
    "산책",
    "드라이브",
    "일몰",
    "일출",
    "야경",
    "별",
    "꽃구경",
    "단풍",
    "눈꽃",
  ],
  city: [
    "도시",
    "도심",
    "시티",
    "호캉스",
    "쇼핑",
    "백화점",
    "아울렛",
    "면세점",
    "시장",
    "야시장",
    "플리마켓",
    "팝업스토어",
    "전시회",
    "박물관",
    "미술관",
    "공연",
    "콘서트",
    "뮤지컬",
    "연극",
    "영화",
    "축제",
    "테마파크",
    "놀이공원",
    "동물원",
    "수족관",
    "아쿠아리움",
    "식물원",
    "수목원",
    "카페",
    "맛집",
    "빵지순례",
    "핫플",
    "데이트",
  ],
  food: [
    "맛집",
    "먹방",
    "미식",
    "카페",
    "디저트",
    "베이커리",
    "빵",
    "커피",
    "차",
    "술",
    "와인",
    "맥주",
    "소주",
    "막걸리",
    "칵테일",
    "위스키",
    "전통주",
    "안주",
    "야식",
    "브런치",
    "다이닝",
    "오마카세",
    "뷔페",
    "레스토랑",
    "식당",
    "노포",
    "길거리음식",
    "푸드트럭",
    "쿠킹클래스",
  ],
};

function renderArticles() {
  const grid = document.getElementById("article-grid");
  if (!grid || typeof ARTICLES === "undefined") return;

  if (shuffledArticles.length === 0) shuffledArticles = shuffleArray(ARTICLES);

  const filtered = shuffledArticles.filter((article) => {
    // --- [수정 구간: 카테고리 필터 체크] ---
    let matchesFilter = true;

    // 'all'이 아니거나 activeFilterId가 설정되어 있을 때
    if (window.activeFilterId && window.activeFilterId !== "all") {
      const targetKeys = categories[window.activeFilterId] || [];
      // article.tags 중에 카테고리 키워드가 하나라도 포함되어 있는지 확인
      matchesFilter = article.tags.some((tag) =>
        targetKeys.some((key) => tag.includes(key)),
      );
    }
    // --------------------------------------

    // 2. 검색어 + 태그 필터 체크 (기존 로직 유지)
    let matchesSearch = true;
    const typedText = (
      document.getElementById("main-search-input")?.value || ""
    )
      .trim()
      .toLowerCase();
    const tagsText = Array.from(window.selectedTags || [])
      .join(" ")
      .toLowerCase();
    const fullQuery = (typedText + " " + tagsText).trim();

    if (fullQuery) {
      const queries = fullQuery
        .split(/\s+/)
        .filter((q) => q !== "")
        .map((q) => q.replace("#", ""));
      const articleText = (
        article.title +
        (article.subtitle || "") +
        article.tags.join("") +
        (article.mainTags || []).join("")
      ).toLowerCase();
      matchesSearch = queries.some((q) => articleText.includes(q));
    }

    return matchesFilter && matchesSearch;
  });

  grid.innerHTML = "";
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-result" style="grid-column: 1/-1; text-align: center; padding: 100px 0; color: #999;">검색 결과가 없습니다.</div>`;
    return;
  }

  filtered.slice(0, visibleCount).forEach((article) => {
    const card = document.createElement("div");
    card.className = "article-card";
    card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${article.imageUrl}" class="card-img">
                <div class="card-overlay"></div>
            </div>
            <div class="card-like-btn-wrap">
                <button class="nav-icon-btn btn-like" data-id="${article.id}" onclick="handleLikeClick(event, '${article.id}')">
                    <i data-lucide="heart" width="20"></i>
                </button>
            </div>
            <div class="card-content">
                <div class="card-badge-area">
                    ${(article.mainTags || []).map((t) => `<span class="card-badge">#${t}</span>`).join("")}
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

// =================================================================
// 6. 검색창 태그 관리 & 필터 제어 (통합 수정 버전)
// =================================================================

// 전역 변수 초기화
window.selectedTags = window.selectedTags || new Set();

const mInput = document.getElementById("main-search-input");
const sDropdown = document.getElementById("search-dropdown");
const cBtn = document.getElementById("search-clear-btn");
const tInner = document.getElementById("selected-tags-inner");

function refreshTags() {
  if (!tInner || !mInput) return;
  tInner.querySelectorAll(".search-tag.active-tag").forEach((t) => t.remove());

  window.selectedTags.forEach((tagName) => {
    const span = document.createElement("span");
    span.className = "search-tag active-tag";
    span.style.cssText =
      "background:#3b82f6; color:white; white-space:nowrap; flex-shrink:0; padding:6px 12px; border-radius:20px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; font-size:14px; margin: 2px 4px;";
    span.innerHTML = `${tagName} <span style="font-size:10px; opacity:0.8;">✕</span>`;

    span.onclick = (e) => {
      e.stopPropagation();
      window.selectedTags.delete(tagName);
      document.querySelectorAll("#search-dropdown .search-tag").forEach((t) => {
        if (t.textContent.trim().replace("#", "") === tagName)
          t.classList.remove("active-tag");
      });
      refreshTags();
      renderArticles(); // UI 갱신 후 즉시 검색 실행
    };
    tInner.insertBefore(span, mInput);
  });

  mInput.placeholder =
    window.selectedTags.size > 0 ? "" : "어디로 떠나고 싶으신가요?";
  if (cBtn)
    cBtn.style.display =
      window.selectedTags.size > 0 || mInput.value.length > 0 ? "flex" : "none";

  requestAnimationFrame(() => {
    tInner.scrollLeft = tInner.scrollWidth;
  });
}

window.addSearchTag = function (tagName) {
  if (!tagName) return;
  const clean = tagName.replace("#", "").trim();
  if (!window.selectedTags.has(clean)) {
    window.selectedTags.add(clean);
    document.querySelectorAll("#search-dropdown .search-tag").forEach((t) => {
      if (t.textContent.trim().replace("#", "") === clean)
        t.classList.add("active-tag");
    });
    refreshTags();
    renderArticles();
  }
};

if (mInput) {
  mInput.addEventListener("input", () => {
    refreshTags();
    renderArticles();
  });
  mInput.addEventListener("focus", () => sDropdown?.classList.remove("hidden"));
  mInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sDropdown?.classList.add("hidden");
      renderArticles();
    }
    if (
      e.key === "Backspace" &&
      mInput.value === "" &&
      window.selectedTags.size > 0
    ) {
      const lastTag = Array.from(window.selectedTags).pop();
      window.selectedTags.delete(lastTag);
      refreshTags();
      renderArticles();
    }
  });
}

document.addEventListener("click", (e) => {
  const isSearch = e.target.closest(".search-container");
  const tagItem = e.target.closest(".search-tag");
  if (tagItem && sDropdown?.contains(tagItem)) {
    window.addSearchTag(tagItem.textContent.trim());
  } else if (!isSearch) {
    sDropdown?.classList.add("hidden");
  }
});

if (cBtn) {
  cBtn.onclick = (e) => {
    e.preventDefault();
    window.selectedTags.clear();
    if (mInput) mInput.value = "";
    document
      .querySelectorAll("#search-dropdown .search-tag")
      .forEach((t) => t.classList.remove("active-tag"));
    refreshTags();
    renderArticles();
  };
}

// =================================================================
// 7. 기타 기능 및 초기화
// =================================================================

window.toggleFilter = (id) => {
  // 1. 현재 클릭한 ID 저장
  window.activeFilterId = id;

  // 2. UI 업데이트 (버튼 활성화 상태 변경)
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    if (btn.dataset.id === id) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // 3. 목록 다시 그리기
  visibleCount = 9;
  renderArticles();
};

window.handleLoadMore = function () {
  isInfiniteScroll = true;
  const btn = document.querySelector(".load-more-container");
  if (btn) btn.style.display = "none";
  visibleCount = 21;
  renderArticles();
};

function handleInfiniteLoad() {
  if (typeof ARTICLES !== "undefined" && visibleCount < ARTICLES.length) {
    visibleCount += 3;
    renderArticles();
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await checkLoginStatus();
  if (document.getElementById("article-grid")) renderArticles();
  refreshTags(); // updateTagBoxes 대신 refreshTags 호출

  // 추천 태그 클릭 이벤트
  document.querySelectorAll("#recommended-tags .search-tag").forEach((tag) => {
    tag.style.cursor = "pointer";
    tag.onclick = (e) => {
      e.preventDefault();
      window.addSearchTag(tag.innerText.trim());
    };
  });
});
// =================================================================
// 8. 검색 태그 영역 드래그 스크롤 로직
// =================================================================
if (tInner) {
  let isDown = false;
  let startX;
  let scrollLeft;

  tInner.addEventListener("mousedown", (e) => {
    isDown = true;
    tInner.classList.add("active"); // 커서 스타일 변경용 (필요시 CSS 추가)
    startX = e.pageX - tInner.offsetLeft;
    scrollLeft = tInner.scrollLeft;
  });

  tInner.addEventListener("mouseleave", () => {
    isDown = false;
  });

  tInner.addEventListener("mouseup", () => {
    isDown = false;
  });

  tInner.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - tInner.offsetLeft;
    const walk = (x - startX) * 2; // 스크롤 속도 조절
    tInner.scrollLeft = scrollLeft - walk;
  });

  // 모바일 터치 대응 (선택 사항이지만 추천)
  tInner.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].pageX - tInner.offsetLeft;
      scrollLeft = tInner.scrollLeft;
    },
    { passive: true },
  );

  tInner.addEventListener(
    "touchmove",
    (e) => {
      const x = e.touches[0].pageX - tInner.offsetLeft;
      const walk = (x - startX) * 2;
      tInner.scrollLeft = scrollLeft - walk;
    },
    { passive: true },
  );
}

// 검색 영역(inner) 클릭 시 내부 input에 포커스 주기
if (tInner && mInput) {
  tInner.addEventListener("click", (e) => {
    // 클릭한 대상이 이미 input이라면 무시하고, 배경 영역을 눌렀을 때만 실행
    if (e.target !== mInput) {
      mInput.focus();
    }
  });
}



window.handleLikeClick = handleLikeClick;
window.showLoginModal = showLoginModal;
window.handleLogout = handleLogout;
window.scrollToContent = () => {
  const el = document.getElementById("content");
  if (el) el.scrollIntoView({ behavior: "smooth" });
};
window.handleFavoriteClick = () => {
  if (localStorage.getItem("isLoggedIn") === "true")
    location.href = "mypage.html";
  else showLoginModal();
};
