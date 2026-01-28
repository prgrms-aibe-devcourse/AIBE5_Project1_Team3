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
const selectedTags = new Set();

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

function showAuthModal(title, message, icon = "🔔") {
  const oldModal = document.getElementById("auth-custom-modal");
  if (oldModal) oldModal.remove();
  const modalHtml = `
    <div id="auth-custom-modal" onclick="if(event.target === this) this.remove()" 
         style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000;">
        <div style="background:#fff; padding:30px; border-radius:24px; text-align:center; width:90%; max-width:320px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
            <div style="font-size:48px; margin-bottom:15px;">${icon}</div>
            <h3 style="margin-bottom:10px; font-size:18px; font-weight:bold;">${title}</h3>
            <p style="color:#666; font-size:14px; margin-bottom:25px; line-height:1.6;">${message}</p>
            <button onclick="document.getElementById('auth-custom-modal').remove()" 
                    style="width:100%; padding:14px; border:none; border-radius:12px; background:#000; color:#fff; cursor:pointer; font-size:14px; font-weight:bold;">확인</button>
        </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function showConfirmModal(title, message, onConfirm, icon = "❓") {
  const oldModal = document.getElementById("auth-confirm-modal");
  if (oldModal) oldModal.remove();
  const modalHtml = `
    <div id="auth-confirm-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000;">
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
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("modal-confirm-btn").onclick = () => {
    document.getElementById("auth-confirm-modal").remove();
    onConfirm();
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
                <button onclick="location.href='login.html'" style="flex:1; padding:12px; border:none; border-radius:8px; background:#3b82f6; color:#fff; cursor:pointer; font-weight:bold;">로그인하기</button>
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
// 4. 찜하기 & 상세 페이지 UI 연동 + 토스트
// =================================================================
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
    let matchesFilter = true;
    if (activeFilters.size > 0) {
      matchesFilter = Array.from(activeFilters).some((fId) => {
        const targetKeys = categories[fId] || [];
        return article.tags.some((tag) =>
          targetKeys.some((key) => tag.includes(key)),
        );
      });
    }

    let matchesSearch = true;
    const combinedQuery = (
      searchQuery +
      " " +
      Array.from(selectedTags).join(" ")
    )
      .trim()
      .toLowerCase();
    if (combinedQuery) {
      const queries = combinedQuery
        .split(" ")
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
// 6. 검색창 태그 관리 (핵심 수정)
// =================================================================
const mainSearchInput = document.getElementById("main-search-input");
const searchDropdown = document.getElementById("search-dropdown");
const clearBtn = document.getElementById("search-clear-btn");
const tagContainer = document.getElementById("selected-tags-inner");

function handleCombinedSearch() {
  if (!mainSearchInput) return;
  searchQuery = mainSearchInput.value.trim();
  renderArticles();
}

function updateTagBoxes() {
  if (!tagContainer || !mainSearchInput) return;

  const oldTags = tagContainer.querySelectorAll(".search-tag.active-tag");
  oldTags.forEach((tag) => tag.remove());

  selectedTags.forEach((tagName) => {
    const span = document.createElement("span");
    span.className = "search-tag active-tag";
    span.innerHTML = `${tagName} <span style="font-size:10px; opacity:0.8;">✕</span>`;

    span.onclick = (e) => {
      e.stopPropagation();
      selectedTags.delete(tagName);
      // 드롭다운 내 태그 상태 업데이트
      document.querySelectorAll("#search-dropdown .search-tag").forEach((t) => {
        if (t.textContent.trim() === tagName) t.classList.remove("active-tag");
      });
      updateTagBoxes();
      handleCombinedSearch();
    };
    tagContainer.insertBefore(span, mainSearchInput);
  });

  mainSearchInput.placeholder =
    selectedTags.size > 0 ? "" : "어디로 떠나고 싶으신가요?";
  requestAnimationFrame(() => {
    tagContainer.scrollLeft = tagContainer.scrollWidth;
  });
}

// 전역 태그 추가 함수 (HTML 내 onclick 대응)
window.addSearchTag = function (tagName) {
  if (!tagName) return;
  if (selectedTags.has(tagName)) {
    selectedTags.delete(tagName);
  } else {
    selectedTags.add(tagName);
  }

  // 드롭다운 내 UI 상태 연동
  document.querySelectorAll("#search-dropdown .search-tag").forEach((t) => {
    if (t.textContent.trim() === tagName) {
      t.classList.toggle("active-tag", selectedTags.has(tagName));
    }
  });

  updateTagBoxes();
  handleCombinedSearch();
};

if (mainSearchInput) {
  mainSearchInput.addEventListener("input", handleCombinedSearch);
  mainSearchInput.addEventListener("focus", () =>
    searchDropdown?.classList.remove("hidden"),
  );
  mainSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      searchDropdown?.classList.add("hidden");
      handleCombinedSearch();
    }
    // 백스페이스로 태그 삭제 기능
    if (
      e.key === "Backspace" &&
      mainSearchInput.value === "" &&
      selectedTags.size > 0
    ) {
      const lastTag = Array.from(selectedTags).pop();
      selectedTags.delete(lastTag);
      updateTagBoxes();
      handleCombinedSearch();
    }
  });
}

// 클릭 이벤트 통합 관리
document.addEventListener("click", (e) => {
  const isSearchContainer = e.target.closest(".search-container");
  const tagItem = e.target.closest(".search-tag");

  if (tagItem && searchDropdown?.contains(tagItem)) {
    window.addSearchTag(tagItem.textContent.trim());
    return;
  }

  if (!isSearchContainer) {
    searchDropdown?.classList.add("hidden");
  } else {
    searchDropdown?.classList.remove("hidden");
  }
});

if (clearBtn) {
  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    selectedTags.clear();
    if (mainSearchInput) mainSearchInput.value = "";
    document
      .querySelectorAll(".search-tag")
      .forEach((t) => t.classList.remove("active-tag"));
    updateTagBoxes();
    handleCombinedSearch();
  });
}

// =================================================================
// 7. 기타 기능 및 초기화
// =================================================================
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

window.toggleFilter = (id) => {
  const btn = document.querySelector(`.filter-btn[data-id="${id}"]`);
  if (!btn) return;
  if (id === "all") {
    activeFilters.clear();
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  } else {
    const allBtn = document.querySelector('.filter-btn[data-id="all"]');
    if (allBtn) allBtn.classList.remove("active");
    activeFilters.has(id) ? activeFilters.delete(id) : activeFilters.add(id);
    btn.classList.toggle("active");
    if (activeFilters.size === 0 && allBtn) allBtn.classList.add("active");
  }
  visibleCount = 9;
  renderArticles();
};

window.scrollToContent = () => {
  const el = document.getElementById("content");
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

window.handleFavoriteClick = () => {
  if (localStorage.getItem("isLoggedIn") === "true")
    location.href = "mypage.html";
  else showLoginModal();
};

// 최종 초기화
window.addEventListener("DOMContentLoaded", async () => {
  await checkLoginStatus();
  if (document.getElementById("article-grid")) renderArticles();
  updateTagBoxes();

  // 추천 태그들에 클릭 이벤트 연결
  document.querySelectorAll("#recommended-tags .search-tag").forEach((tag) => {
    tag.style.cursor = "pointer";
    tag.onclick = (e) => {
      e.preventDefault();
      window.addSearchTag(tag.innerText.trim());
    };
  });
});
