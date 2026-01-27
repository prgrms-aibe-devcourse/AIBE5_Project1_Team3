// =================================================================
// 1. Supabase 클라이언트 초기화 (모든 페이지 공통)
// =================================================================
const SUPABASE_URL = "https://ozhieovgrmnehaimuyni.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96aGllb3Zncm1uZWhhaW11eW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NzgwODksImV4cCI6MjA4NDU1NDA4OX0.haULDDCnJXw4zwFeJSQKhS1Jun4CRFCziGgKQKVwmyY";

// window 객체에 할당하여 어디서든 접근 가능하게 함
if (typeof supabase !== "undefined") {
  window.supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
} else {
  console.error(
    "Supabase SDK가 로드되지 않았습니다. HTML <head>를 확인하세요."
  );
}




// =================================================================
// [전역 설정] Lucide 아이콘 및 변수 설정
// =================================================================
if (typeof lucide !== "undefined") {
  lucide.createIcons();
}

let activeFilters = new Set(); // 선택된 필터를 저장하는 집합
let visibleCount = 9; // 처음에 보여줄 카드 개수 (3x3)
let isInfiniteScroll = false; // 더보기 버튼 클릭 후 무한스크롤 전환 여부
let searchQuery = ""; // [중요] 검색어 저장 변수
let shuffledArticles = []; // 랜덤 노출을 위한 데이터 저장
const selectedTags = new Set(); // 선택된 태그 관리

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

// =================================================================
// 2. 네비게이션 & 스크롤 UI
// =================================================================
const nav = document.getElementById("navbar");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuClose = document.getElementById("mobile-menu-close");

window.addEventListener("scroll", () => {
  // 네비게이션 바 스타일 변경
  if (nav) {
    if (window.scrollY > 20) {
      nav.classList.add("scrolled");
    } else if (document.body.id === "page-home") {
      nav.classList.remove("scrolled");
    }
  }

  // 무한 스크롤
  if (isInfiniteScroll) {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 500
    ) {
      handleInfiniteLoad();
    }
  }

  // 플로팅 배너 표시/숨김
  const floBan = document.getElementById("floating-banner");
  if (floBan) {
    if (window.scrollY > 400) {
      floBan.style.display = "block";
    } else {
      floBan.style.display = "none";
    }
  }
});

if (mobileMenuBtn)
  mobileMenuBtn.onclick = () => mobileMenu.classList.add("open");
if (mobileMenuClose)
  mobileMenuClose.onclick = () => mobileMenu.classList.remove("open");

// =================================================================
// 3. 로그인 및 Auth 관리
// =================================================================

// UI 업데이트 로직
function updateAuthUI(session) {
  const isLoggedIn = !!session;
  const loginBtn = document.getElementById("nav-login-btn");
  const userAvatar = document.getElementById("nav-user-avatar");
  const otherTriggers = document.querySelectorAll(".btn-login-trigger");
  const mobileUserLink = document.querySelector(
    ".mobile-menu-link.user-avatar-display"
  );

  if (isLoggedIn) {
    if (loginBtn) loginBtn.style.display = "none";
    if (userAvatar) {
      userAvatar.style.display = "block";
      const img = userAvatar.querySelector("img");
      const avatarUrl =
        session.user.user_metadata?.avatar_url ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`;
      if (img) img.src = avatarUrl;
    }
    if (mobileUserLink) mobileUserLink.classList.remove("hidden");
    otherTriggers.forEach((btn) => (btn.style.display = "none"));
    localStorage.setItem("isLoggedIn", "true");
  } else {
    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (userAvatar) {
      userAvatar.style.display = "none";
      const img = userAvatar.querySelector("img");
      if (img) img.src = "";
    }
    if (mobileUserLink) mobileUserLink.classList.add("hidden");
    otherTriggers.forEach((btn) => (btn.style.display = "block"));
    localStorage.setItem("isLoggedIn", "false");
  }
}

// 로그인 상태 체크 (초기 + 실시간)
async function checkLoginStatus() {
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("Supabase 클라이언트를 찾을 수 없습니다.");
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  updateAuthUI(session);

  supabase.auth.onAuthStateChange((event, session) => {
    console.log("인증 이벤트:", event);
    updateAuthUI(session);
    if (event === "SIGNED_OUT") {
      localStorage.removeItem("userProfile");
      updateFavoriteUI();
    }
  });
}

// 로그아웃 처리
async function handleLogout() {
  const supabase = window.supabaseClient;
  if (!supabase) return;

  if (!confirm("정말 로그아웃 하시겠습니까?")) return;

  const { error } = await supabase.auth.signOut();
  if (error) {
    alert("로그아웃 중 오류: " + error.message);
  } else {
    localStorage.setItem("isLoggedIn", "false");
    localStorage.removeItem("userProfile");
    alert("로그아웃 되었습니다.");
    location.href = "index.html";
  }
}
window.handleLogout = handleLogout;

// 최근 본 상품 추가
// function addToRecent(articleId) {
//   let recent = JSON.parse(localStorage.getItem("recentArticles") || "[]");
//   recent = recent.filter((id) => id !== articleId);
//   recent.unshift(articleId);
//   if (recent.length > 5) recent.pop();
//   localStorage.setItem("recentArticles", JSON.stringify(recent));
// }

// 플로팅 배너 렌더링
// function renderFloatingBanner() {
//   const floBanContent = document.getElementById("floban-content");
//   if (!floBanContent || typeof ARTICLES === "undefined") return;
//   const recent = JSON.parse(localStorage.getItem("recentArticles") || "[]");
//   const article =
//     recent.length > 0 ? ARTICLES.find((a) => a.id === recent[0]) : ARTICLES[0];
//   if (article) {
//     floBanContent.innerHTML = `
//       <div class="flex items-center gap-3 cursor-pointer" onclick="location.href='article.html?id=${article.id}'" style="display: flex; align-items: center; gap: 0.75rem;">
//           <img src="${article.imageUrl}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;">
//           <div>
//             <p style="font-size: 10px; color: var(--accent); font-weight: bold; margin-bottom: 2px;">최근 본 상품</p>
//             <p style="font-size: 14px; font-weight: bold; color: var(--gray-900); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${article.title}</p>
//           </div>
//       </div>`;
//   }
// }

// =================================================================
// 4. 카드 렌더링 (필터 + 검색 + 셔플 통합)
// =================================================================

function toggleFilter(filterId) {
  const btn = document.querySelector(`.filter-btn[data-id="${filterId}"]`);
  if (!btn) return;
  
  if (filterId === "all") {
    activeFilters.clear();
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  } else {
    document.querySelector('.filter-btn[data-id="all"]').classList.remove("active");
    activeFilters.has(filterId)
      ? activeFilters.delete(filterId)
      : activeFilters.add(filterId);
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

// [핵심 수정] 렌더링 함수 내부에 검색 로직 통합
function renderArticles() {
  const grid = document.getElementById("article-grid");
  if (!grid || typeof ARTICLES === "undefined") return;

  // 처음 로드 시에만 무작위로 섞음
  if (shuffledArticles.length === 0) {
    shuffledArticles = shuffleArray(ARTICLES);
  }

  grid.innerHTML = "";

  const filtered = shuffledArticles.filter((article) => {
    // 1. 카테고리 필터 로직
    let matchesFilter = true;
    if (activeFilters.size > 0) {
      matchesFilter = Array.from(activeFilters).some((filterId) => {
        const categories = {
          domestic: ["국내", "한국", "제주", "강릉", "부산", "가평", "경주", "여수", "속초", "양양", "전주", "포항", "남해", "거제", "통영", "대구", "대전", "광주", "울산", "인천", "수원", "성남", "고양", "용인", "부천", "안산", "청주", "천안", "창원", "김해", "구미", "제주도"],
          overseas: ["해외", "일본", "태국", "베트남", "미국", "유럽", "프랑스", "이탈리아", "스페인", "영국", "독일", "스위스", "호주", "뉴질랜드", "캐나다", "중국", "대만", "홍콩", "싱가포르", "말레이시아", "인도네시아", "필리핀", "괌", "사이판", "하와이", "발리", "다낭", "나트랑", "푸꾸옥", "방콕", "치앙마이", "도쿄", "오사카", "후쿠오카", "삿포로", "오키나와"],
          nature: ["자연", "힐링", "바다", "산", "숲", "계곡", "캠핑", "글램핑", "불멍", "물멍", "별멍", "촌캉스", "한옥", "템플스테이", "트레킹", "등산", "서핑", "다이빙", "스노쿨링", "스키", "보드", "빠지", "수상레저", "낚시", "골프", "승마", "요가", "명상", "산책", "드라이브", "일몰", "일출", "야경", "별", "꽃구경", "단풍", "눈꽃"],
          city: ["도시", "도심", "시티", "호캉스", "쇼핑", "백화점", "아울렛", "면세점", "시장", "야시장", "플리마켓", "팝업스토어", "전시회", "박물관", "미술관", "공연", "콘서트", "뮤지컬", "연극", "영화", "축제", "테마파크", "놀이공원", "동물원", "수족관", "아쿠아리움", "식물원", "수목원", "카페", "맛집", "빵지순례", "핫플", "데이트"],
          food: ["맛집", "먹방", "미식", "카페", "디저트", "베이커리", "빵", "커피", "차", "술", "와인", "맥주", "소주", "막걸리", "칵테일", "위스키", "전통주", "안주", "야식", "브런치", "다이닝", "오마카세", "뷔페", "레스토랑", "식당", "노포", "길거리음식", "푸드트럭", "쿠킹클래스"]
        };
        const keys = categories[filterId] || [];
        return article.tags.some((tag) => keys.some(key => tag.includes(key)));
      });
    }

    // 2. 검색 로직
    let matchesSearch = true;
    if (searchQuery) {
      const queries = searchQuery.split(' ').filter(q => q.trim() !== '').map(q => q.replace('#', ''));
      const articleText = (article.title + (article.subtitle || "") + article.tags.join('') + (article.mainTags || []).join('')).toLowerCase();
      matchesSearch = queries.some(q => articleText.includes(q));
    }

    return (activeFilters.size > 0 || searchQuery !== "") ? (matchesFilter && matchesSearch) : true;
  });

  // 결과 없음 처리
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-result" style="grid-column: 1/-1; text-align: center; padding: 100px 0; color: #999;">검색 결과가 없습니다.</div>`;
    return;
  }

  // 카드 생성
  filtered.slice(0, visibleCount).forEach((article) => {
    const card = document.createElement("div");
    card.className = "article-card";
    
    // 버튼 클릭 시 handleLikeClick이 호출되도록 수정
    card.innerHTML = `
        <div class="card-img-wrap">
            <img src="${article.imageUrl}" alt="${article.title}" class="card-img">
            <div class="card-overlay"></div>
        </div>
        <div class="card-like-btn-wrap">
            <button class="nav-icon-btn btn-like" data-id="${article.id}" 
                onclick="handleLikeClick(event, '${article.id}')">
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
    
    // 카드 클릭 시 상세 페이지 이동 (전파 방지 적용됨)
    card.onclick = () => {
      if (typeof addToRecent === "function") {
        addToRecent(article.id);
      }
      location.href = `article.html?id=${article.id}`;
    };
    grid.appendChild(card);
  });

  // 아이콘 및 UI 업데이트
  if (typeof lucide !== "undefined") lucide.createIcons();
  updateFavoriteUI();
}

// =================================================================
// 5. 좋아요(Favorite) 기능
// =================================================================

function toggleFavorite(id) {
    // 1. 로그인 체크 로직 (변수 중복 에러 방지)
    const isUserLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    
    if (!isUserLoggedIn) {
        showLoginModal();
        return; // 로그인 안됐으면 여기서 중단!
    }

    // 2. 찜 목록 가져오기 및 업데이트
    let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    const index = favorites.indexOf(id);
    
    index === -1 ? favorites.push(id) : favorites.splice(index, 1);
    
    localStorage.setItem("favorites", JSON.stringify(favorites));
    updateFavoriteUI();
    
    // 상세페이지가 있다면 아이콘 갱신
    if (typeof updateDetailLikeUI === "function") {
        updateDetailLikeUI(id);
    }
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

function handleFavoriteClick() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  
  if (!isLoggedIn) {
    // 1. alert 대신 커스텀 모달을 띄웁니다.
    showLoginModal(); 
  } else {
    // 2. 로그인 상태라면 바로 마이페이지로 보냅니다.
    location.href = "mypage.html";
  }
}
window.handleFavoriteClick = handleFavoriteClick;

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

// =================================================================
// 6. 검색 및 이벤트 핸들링 (태그 + 검색창)
// =================================================================

const mainSearchInput = document.getElementById("main-search-input");
const searchDropdown = document.getElementById("search-dropdown");
const clearBtn = document.getElementById("search-clear-btn");
const container = document.getElementById('selected-tags-inner');
container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });

function handleSearch() {
  if (mainSearchInput) {
    searchQuery = mainSearchInput.value.trim().toLowerCase();
    if (searchDropdown) searchDropdown.classList.add("hidden");
    renderArticles();
  }
}

// 검색창 이벤트
if (mainSearchInput) {
  mainSearchInput.addEventListener("focus", () => {
    if (searchDropdown) searchDropdown.classList.remove("hidden");
  });
  mainSearchInput.addEventListener("input", (e) => {
    if (clearBtn) {
      e.target.value.length > 0
        ? clearBtn.classList.remove("hidden")
        : clearBtn.classList.add("hidden");
    }
  });
  mainSearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch();
  });
}

// 검색 버튼 이벤트
const searchBtnInside = document.querySelector(".search-btn-inside");
if (searchBtnInside) searchBtnInside.addEventListener("click", handleSearch);

// [수정] 태그 클릭 이벤트 (이벤트 위임 사용으로 에러 방지)
document.addEventListener("click", (e) => {
  const container = e.target.closest(".search-container");
  const isTag = e.target.classList.contains("search-tag");

  // 1. 태그를 클릭한 경우
  if (isTag) {
    const tagElement = e.target;
    const tagName = tagElement.textContent.trim();

    // 선택/해제 로직
    if (selectedTags.has(tagName)) {
      selectedTags.delete(tagName);
      tagElement.classList.remove("active-tag");
    } else {
      selectedTags.add(tagName);
      tagElement.classList.add("active-tag");
    }

    updateTagBoxes(); // 검색창 안의 태그 박스 갱신
    renderArticles(); // 검색 결과 갱신
    
    // 🔥 중요: 태그 클릭 시에는 함수를 여기서 끝내서 드롭다운이 안 닫히게 함
    return;
  }

  // 2. 검색창(인풋 포함) 영역 안을 클릭한 경우
  if (container) {
    if (searchDropdown) searchDropdown.classList.remove("hidden");
  } 
  // 3. 그 외 영역(바깥)을 클릭한 경우
  else {
    if (searchDropdown) searchDropdown.classList.add("hidden");
  }
});
if (mainSearchInput) {
  mainSearchInput.addEventListener("input", (e) => {
    const typedText = e.target.value.trim();
    const tagsText = Array.from(selectedTags).join(' ');
    
    // 태그 + 입력 글자 모두 포함해서 검색
    searchQuery = (typedText + " " + tagsText).trim().toLowerCase();
    renderArticles();
  });
}

// [새로 추가] 태그 박스를 화면에 그려주는 함수
function updateTagBoxes() {
  const container = document.getElementById('selected-tags-inner');
  const input = document.getElementById('main-search-input');
  
  if (!container) return;
  container.innerHTML = '';

  selectedTags.forEach(tagName => {
    const span = document.createElement('span');
    span.className = 'search-tag active-tag';
    span.style.cssText = "background:#3b82f6; color:white; white-space:nowrap; flex-shrink:0; padding:6px 12px; border-radius:20px; cursor:pointer;";
    span.innerText = tagName;
    
    span.onclick = (e) => {
      e.stopPropagation();
      selectedTags.delete(tagName);
      // 드롭다운 내 태그 불 끄기
      document.querySelectorAll('.search-tag').forEach(t => {
        if(t.textContent.trim() === tagName) t.classList.remove("active-tag");
      });
      updateTagBoxes();
      handleCombinedSearch(); // 삭제 후 즉시 재검색
    };
    container.appendChild(span);
  });


// 새 태그 생성
const newTag = document.createElement('div');
newTag.className = 'search-tag';
newTag.innerText = '#새태그';

// input "앞에" 태그를 삽입 (이렇게 해야 input이 보존됨)
tagInner.insertBefore(newTag, input);

  // 스크롤 및 포커스 유지
  container.scrollLeft = container.scrollWidth;
  
  if (input) {
    input.placeholder = selectedTags.size > 0 ? "" : "어디로 떠나고 싶으신가요?";
  }
}

// 통합 검색 함수 수정
function handleCombinedSearch() {
  const typedText = mainSearchInput.value.trim().toLowerCase();
  
  // 1. 선택된 태그가 있다면 태그 기반 검색, 없다면 입력창 기반 검색
  // (태그와 텍스트를 너무 빡빡하게 합치면 검색 결과가 안 나올 수 있음)
  if (selectedTags.size > 0) {
    // 태그가 있을 때는 태그 문자열을 검색어로 활용
    searchQuery = Array.from(selectedTags).join(' ').toLowerCase();
  } else {
    // 태그가 없을 때는 직접 입력한 텍스트로 검색
    searchQuery = typedText;
  }

  // 2. 검색 실행 (renderArticles 내부 로직이 searchQuery를 참조함)
  if (typeof renderArticles === 'function') {
    renderArticles();
  }
}

// 초기화 버튼 클릭 시 태그도 싹 지우기
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    selectedTags.clear(); // Set 비우기
    document.querySelectorAll('.search-tag').forEach(t => t.classList.remove("active-tag"));
    updateTagBoxes(); // 박스 지우기
    mainSearchInput.value = "";
    clearBtn.classList.add("hidden");
    mainSearchInput.focus();
    renderArticles(); // 전체 목록으로 복구
  });
}

// =================================================================
// 7. 초기 실행 및 기타 유틸리티
// =================================================================

window.addEventListener("DOMContentLoaded", async () => {
  await checkLoginStatus(); 
  if (document.getElementById("article-grid")) renderArticles();
  updateFavoriteUI();
  if (window.currentArticle) {
    updateDetailLikeUI(window.currentArticle.id);
  }
  // 탭 전환 처리
  const urlParams = new URLSearchParams(window.location.search);
  const tabName = urlParams.get("tab");
  if (tabName === "favorites") {
    switchTab("favorites");
  }
});

function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
  const btns = document.querySelectorAll(".tab-btn");
  if (tabId === "favorites" && btns.length > 1) {
    btns[1].classList.add("active");
  } else if (btns.length > 0) {
    btns[0].classList.add("active");
  }
}

function scrollToContent() {
  const contentSection = document.getElementById("content");
  if (contentSection) {
    contentSection.scrollIntoView({ behavior: "smooth" });
  }
}
// 추천 태그 클릭 시 검색창 안에 '박스' 형태로 추가하는 함수
function selectTag(tagName) {
    const tagContainer = document.getElementById('selected-tags-inner');
    const input = document.getElementById('main-search-input');

    // 중복 추가 방지
    if ([...tagContainer.children].some(tag => tag.innerText === tagName)) return;

    // 1. 태그 박스(span) 만들기
    const tagElement = document.createElement('span');
    tagElement.className = 'search-tag'; // CSS에서 정의한 디자인 적용
    tagElement.innerText = tagName;
    
    // 2. 클릭하면 삭제되는 기능
    tagElement.onclick = function() {
        tagElement.remove();
    };

    // 3. 검색창 안의 컨테이너에 넣기
    tagContainer.appendChild(tagElement);

    // 4. 입력창 비우고 포커스 주기
    input.value = '';
    input.focus();
}

// 예시: 드롭다운의 태그들에 이벤트 연결
document.querySelectorAll('#recommended-tags .search-tag').forEach(tag => {
    tag.addEventListener('click', function() {
        selectTag(this.innerText);
    });
});


function handleLikeClick(event, articleId) {
    
    event.stopPropagation();

    const rawValue = localStorage.getItem('isLoggedIn');
    const isLoggedIn = (rawValue === "true"); // 불리언으로 변환

    if (!isLoggedIn) {
        console.log("로그인 안 됨 -> 모달 띄움");
        showLoginModal();
    } else {
        console.log("로그인 확인됨 -> 찜 실행");
        toggleFavorite(articleId);
    }
}


function showLoginModal() {
    // 이미 모달이 떠있으면 중복 생성 방지
    if (document.getElementById('login-confirm-modal')) return;

    const modalHtml = `
        <div id="login-confirm-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000;">
            <div style="background:#fff; padding:30px; border-radius:15px; text-align:center; width:90%; max-width:320px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <div style="font-size:40px; margin-bottom:15px;">🔒</div>
                <h3 style="margin-bottom:10px; font-size:18px;">로그인이 필요합니다</h3>
                <p style="color:#666; font-size:14px; margin-bottom:25px; line-height:1.5;">찜하기 기능은 로그인 후<br>이용하실 수 있습니다.</p>
                <div style="display:flex; gap:10px;">
                    <button onclick="document.getElementById('login-confirm-modal').remove()" style="flex:1; padding:12px; border:none; border-radius:8px; background:#eee; cursor:pointer;">나중에</button>
                    <button onclick="location.href='login.html'" style="flex:1; padding:12px; border:none; border-radius:8px; background:#000; color:#fff; cursor:pointer; font-weight:bold;">로그인하기</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}


function closeModal() {
    const modal = document.getElementById('login-modal');
    if(modal) modal.remove();
}


// 전역 노출 (HTML onclick 등에서 사용하기 위해)
window.toggleFilter = toggleFilter;
window.toggleFavorite = toggleFavorite;
window.handleLoadMore = handleLoadMore;
window.scrollToContent = scrollToContent;
window.switchTab = switchTab;
window.handleLikeClick = handleLikeClick;
window.showLoginModal = showLoginModal;