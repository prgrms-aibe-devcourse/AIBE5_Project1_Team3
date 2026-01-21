
// 여행지 및 공통 데이터

const LOREM_CONTENT = `
  <div class="space-y-6">
    <p class="text-lg leading-relaxed text-gray-700">
      일상에서 벗어나 진정한 휴식을 취할 수 있는 완벽한 장소입니다. 
      아침에는 새들의 지저귐과 함께 눈을 뜨고, 저녁에는 붉게 물드는 노을을 바라보며 하루를 마무리할 수 있습니다.
    </p>
    <div class="bg-gray-50 p-6 rounded-xl border border-gray-100">
      <h3 class="text-xl font-bold mb-4 text-gray-900">✨ 매력 포인트</h3>
      <ul class="space-y-3 text-gray-700">
        <li class="flex items-start gap-2">
          <i data-lucide="check-circle-2" class="w-5 h-5 text-green-500 mt-0.5"></i>
          <span>현지인들이 추천하는 숨겨진 맛집 탐방</span>
        </li>
        <li class="flex items-start gap-2">
          <i data-lucide="check-circle-2" class="w-5 h-5 text-green-500 mt-0.5"></i>
          <span>자연과 하나되는 트레킹 코스</span>
        </li>
        <li class="flex items-start gap-2">
          <i data-lucide="check-circle-2" class="w-5 h-5 text-green-500 mt-0.5"></i>
          <span>인생 사진을 남길 수 있는 포토 스팟</span>
        </li>
      </ul>
    </div>
  </div>
`;

const REVIEWS = [
  { user: "김여행", rating: 5, text: "인생 최고의 여행이었습니다. 가이드님이 너무 친절했어요!", date: "2023.10.15" },
  { user: "Park.S.Y", rating: 4, text: "풍경이 정말 예술이네요. 다만 이동 시간이 조금 길었습니다.", date: "2023.11.02" },
  { user: "Sunny", rating: 5, text: "사진보다 훨씬 아름다워요. 꼭 다시 가고 싶습니다.", date: "2023.12.20" }
];

const ARTICLES = [
  {
    id: 'hero-1',
    title: '발리의 숨겨진 보석, 누사 페니다',
    subtitle: '신들의 섬에서 만나는 태초의 자연',
    description: '에메랄드 빛 바다와 거대한 절벽이 만들어내는 장관. 지금 바로 떠나보세요.',
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=1000',
    category: '해외여행',
    season: '여름/가을',
    host: '트래블러 제이',
    tags: ['휴양지', '자연', '힐링', '발리'],
    rating: 4.8,
    lat: -8.7278,
    lng: 115.5444,
    price: '₩1,500,000~',
    programInfo: '3박 4일 알짜배기 투어',
    courseInfo: '공항 픽업 -> 클링킹 비치 -> 엔젤 빌라봉 -> 숙소',
    content: LOREM_CONTENT,
    reviews: REVIEWS
  },
  {
    id: 'hero-2',
    title: '도심 속 힐링, 서울의 고궁 산책',
    subtitle: '과거와 현재가 공존하는 시간 여행',
    description: '바쁜 일상 속에서 찾는 여유. 고즈넉한 돌담길을 걸으며 가을을 만끽하세요.',
    imageUrl: 'https://images.unsplash.com/photo-1548115184-bc6544d06a58?auto=format&fit=crop&q=80&w=1000',
    category: '국내여행',
    season: '봄/가을',
    host: '문화 해설사 김',
    tags: ['서울', '역사', '산책', '고궁'],
    rating: 4.6,
    lat: 37.5796,
    lng: 126.9770,
    price: '₩50,000~',
    programInfo: '반나절 워킹 투어',
    courseInfo: '경복궁 -> 북촌 한옥마을 -> 삼청동 카페거리',
    content: LOREM_CONTENT,
    reviews: REVIEWS
  },
  {
    id: '1',
    title: '파리의 아침, 몽마르뜨 언덕에서',
    subtitle: '예술과 낭만이 흐르는 도시',
    description: '예술가들의 영감이 살아숨쉬는 곳. 파리에서 가장 낭만적인 일출을 만나보세요.',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=800',
    category: '해외여행',
    season: '사계절',
    host: '파리지앵 리',
    tags: ['프랑스', '낭만', '예술', '파리'],
    rating: 4.9,
    price: '₩1,200,000~',
    lat: 48.8867,
    lng: 2.3431,
    programInfo: '예술가와 함께하는 도보 여행',
    courseInfo: '사크레쾨르 대성당 -> 테르트르 광장 -> 사랑해 벽',
    content: LOREM_CONTENT,
    reviews: REVIEWS
  },
  {
    id: '2',
    title: '교토의 가을, 단풍이 물드는 시간',
    subtitle: '천년의 고도에서 즐기는 붉은 물결',
    description: '천년의 역사를 간직한 교토. 붉게 물든 사찰에서의 차 한 잔의 여유.',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800',
    category: '해외여행',
    season: '가을',
    host: '교토 토박이',
    tags: ['일본', '가을', '전통', '교토'],
    rating: 4.7,
    price: '₩850,000~',
    lat: 35.0116,
    lng: 135.7681,
    programInfo: '2박 3일 단풍 놀이',
    courseInfo: '기요미즈데라 -> 산넨자카 -> 기온 거리',
    content: LOREM_CONTENT,
    reviews: REVIEWS
  },
  {
    id: '3',
    title: '제주도 푸른 밤, 별빛 투어',
    subtitle: '밤하늘을 수놓는 은하수',
    description: '도시의 불빛이 없는 곳에서 쏟아지는 별을 감상하세요. 제주만의 특별한 밤.',
    imageUrl: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?auto=format&fit=crop&q=80&w=800',
    category: '국내여행',
    season: '여름',
    host: '제주지킴이',
    tags: ['제주', '야경', '캠핑', '별'],
    rating: 4.8,
    price: '₩350,000~',
    lat: 33.3846,
    lng: 126.5535,
    programInfo: '야간 오름 투어',
    courseInfo: '용눈이오름 -> 별빛 관측 -> 심야 식당',
    content: LOREM_CONTENT,
    reviews: REVIEWS
  },
  {
    id: '4',
    title: '뉴욕의 스카이라인, 탑 오브 더 락',
    subtitle: '잠들지 않는 도시의 화려함',
    description: '잠들지 않는 도시의 화려함을 한눈에 담다. 맨해튼 최고의 뷰포인트.',
    imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=800',
    category: '해외여행',
    season: '겨울',
    host: '뉴요커 앤',
    tags: ['미국', '도시', '야경', '뉴욕'],
    rating: 4.9,
    price: '₩2,100,000~',
    lat: 40.7587,
    lng: -73.9787,
    programInfo: '맨해튼 야경 투어',
    courseInfo: '타임스퀘어 -> 록펠러 센터 -> 브루클린 브릿지',
    content: LOREM_CONTENT,
    reviews: REVIEWS
  },
  {
    id: '5',
    title: '방콕 스트리트 푸드 완전 정복',
    subtitle: '미식가들의 성지',
    description: '미슐랭이 인정한 길거리 음식부터 현지인 맛집까지. 미식의 천국 방콕.',
    imageUrl: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&q=80&w=800',
    category: '해외여행',
    season: '겨울/봄',
    host: '쉐프 톰',
    tags: ['태국', '미식', '가성비', '방콕'],
    rating: 4.5,
    price: '₩450,000~',
    lat: 13.7563,
    lng: 100.5018,
    programInfo: '올데이 먹방 투어',
    courseInfo: '짜뚜짝 시장 -> 차이나타운 -> 루프탑 바',
    content: LOREM_CONTENT,
    reviews: REVIEWS
  },
  {
    id: '6',
    title: '스위스 알프스, 기차 여행',
    subtitle: '동화 속 풍경으로의 초대',
    description: '창밖으로 펼쳐지는 그림 같은 풍경. 융프라우로 향하는 잊지 못할 여정.',
    imageUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&q=80&w=800',
    category: '해외여행',
    season: '여름/겨울',
    host: '알프스 하이디',
    tags: ['스위스', '자연', '기차', '알프스'],
    rating: 5.0,
    price: '₩2,500,000~',
    lat: 46.5593,
    lng: 7.9620,
    programInfo: '산악 열차 패키지',
    courseInfo: '인터라켄 -> 융프라우요흐 -> 그린델발트',
    content: LOREM_CONTENT,
    reviews: REVIEWS
  },
];

const FILTERS = [
  { id: 'all', name: '전체' },
  { id: 'domestic', name: '국내여행' },
  { id: 'overseas', name: '해외여행' },
  { id: 'nature', name: '자연/힐링' },
  { id: 'city', name: '도시/야경' },
  { id: 'activity', name: '액티비티' },
];
