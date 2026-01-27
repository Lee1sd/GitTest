// 틈새 - 서울 한적한 장소 데이터 관리
// 각 장소는 ID, 이름, 카테고리, 설명, 태그 등의 정보를 포함합니다.
const placesData = [
  {
    id: 1,
    name: "북서울 꿈의숲",
    category: "자연",
    description: "도심 속 숨겨진 대형 공원. 넓은 잔디밭과 호수, 전망대까지 있어 여유로운 산책을 즐길 수 있습니다.",
    shortDesc: "도심 속 숨겨진 대형 공원으로 여유로운 산책 코스",
    address: "서울 강북구 월계로 173",
    congestion: "quiet", // 혼잡도: quiet(한산), normal(보통), crowded(혼잡)
    tags: ["산책", "자연", "전망대", "피크닉"],
    features: ["넓은 잔디밭", "호수", "전망대", "무료입장"],
    hours: "05:00 - 22:00",
    admission: "무료",
    images: [
      "https://images.unsplash.com/photo-1548115184-bc6544d06a58?w=800",
      "https://images.unsplash.com/photo-1541582263897-1e7a9beb2b73?w=400",
      "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=400"
    ],
    rating: 4.7
  },
  {
    id: 2,
    name: "서울숲 야외도서관",
    category: "문화",
    description: "서울숲 안에 위치한 야외 도서관. 자연 속에서 책을 읽으며 힐링할 수 있는 특별한 공간입니다.",
    shortDesc: "자연 속에서 책을 읽는 특별한 경험",
    address: "서울 성동구 뚝섬로 273",
    congestion: "quiet",
    tags: ["독서", "힐링", "조용함", "감성"],
    features: ["야외 좌석", "무료 도서 대여", "자연 속", "조용함"],
    hours: "10:00 - 18:00",
    admission: "무료",
    images: [
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800",
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400"
    ],
    rating: 4.8
  },
  {
    id: 3,
    name: "낙산공원 한양도성길",
    category: "산책",
    description: "서울의 야경을 한눈에 볼 수 있는 숨은 명소. 해질녘과 밤에 특히 아름답습니다.",
    shortDesc: "서울 야경의 숨은 명소, 고즈넉한 도성길",
    address: "서울 종로구 낙산길 41",
    congestion: "normal",
    tags: ["야경", "산책", "역사", "뷰맛집"],
    features: ["서울 전경", "한양도성", "일몰 명소", "야간 개방"],
    hours: "24시간",
    admission: "무료",
    images: [
      "https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=800",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400"
    ],
    rating: 4.6
  },
  {
    id: 4,
    name: "문래예술창작촌",
    category: "문화",
    description: "오래된 철공소 골목이 예술가들의 작업실로 변신. 독특한 분위기의 벽화와 갤러리를 만날 수 있습니다.",
    shortDesc: "철공소와 예술이 만난 독특한 문화 골목",
    address: "서울 영등포구 문래동 3가",
    congestion: "quiet",
    tags: ["예술", "감성", "사진", "갤러리"],
    features: ["벽화 거리", "작가 갤러리", "카페", "철공소 분위기"],
    hours: "상시 개방",
    admission: "무료",
    images: [
      "https://images.unsplash.com/photo-1548115184-bc6544d06a58?w=800",
      "https://images.unsplash.com/photo-1541582263897-1e7a9beb2b73?w=400",
      "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=400"
    ],
    rating: 4.5
  },
  {
    id: 5,
    name: "창덕궁 후원",
    category: "역사",
    description: "조선 왕실의 비밀 정원. 자연과 건축이 조화롭게 어우러진 유네스코 세계문화유산입니다.",
    shortDesc: "조선 왕실의 아름다운 비밀 정원",
    address: "서울 종로구 율곡로 99",
    congestion: "normal",
    tags: ["역사", "정원", "고궁", "유네스코"],
    features: ["가이드 투어", "사계절 아름다움", "전통 건축", "연못 정원"],
    hours: "09:00 - 17:00 (계절별 상이)",
    admission: "5,000원",
    images: [
      "https://images.unsplash.com/photo-1548115184-bc6544d06a58?w=800",
      "https://images.unsplash.com/photo-1541582263897-1e7a9beb2b73?w=400",
      "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=400"
    ],
    rating: 4.9
  },
  {
    id: 6,
    name: "성수동 뚝방길",
    category: "산책",
    description: "한강을 따라 이어지는 한적한 산책로. 자전거를 타거나 천천히 걸으며 힐링하기 좋습니다.",
    shortDesc: "한강변의 조용한 힐링 산책로",
    address: "서울 성동구 뚝섬로",
    congestion: "quiet",
    tags: ["한강", "산책", "자전거", "힐링"],
    features: ["한강 뷰", "자전거 도로", "조용함", "일출 명소"],
    hours: "24시간",
    admission: "무료",
    images: [
      "https://images.unsplash.com/photo-1543794327-59a91fb815d1?w=800",
      "https://images.unsplash.com/photo-1476673160081-cf065f1da091?w=400",
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400"
    ],
    rating: 4.4
  },
  {
    id: 7,
    name: "이화마을",
    category: "감성",
    description: "아기자기한 벽화와 계단이 예쁜 마을. 조용한 오후에 천천히 둘러보기 좋습니다.",
    shortDesc: "예술 벽화로 가득한 아기자기한 마을",
    address: "서울 종로구 이화동",
    congestion: "normal",
    tags: ["벽화", "감성", "사진", "마을"],
    features: ["벽화 거리", "계단 아트", "전망 좋은 카페", "포토존"],
    hours: "상시 (주민 배려 필요)",
    admission: "무료",
    images: [
      "https://images.unsplash.com/photo-1548115184-bc6544d06a58?w=800",
      "https://images.unsplash.com/photo-1541582263897-1e7a9beb2b73?w=400",
      "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=400"
    ],
    rating: 4.3
  },
  {
    id: 8,
    name: "일자산 생태공원",
    category: "자연",
    description: "도심에서 만나는 습지 생태계. 철새와 다양한 동식물을 관찰할 수 있는 자연 그대로의 공간입니다.",
    shortDesc: "도심 속 자연 그대로의 습지 생태공원",
    address: "서울 강동구 고덕동",
    congestion: "quiet",
    tags: ["생태", "자연", "조류관찰", "조용함"],
    features: ["습지 탐방로", "조류 관찰대", "생태 학습", "한적함"],
    hours: "09:00 - 18:00",
    admission: "무료",
    images: [
      "https://images.unsplash.com/photo-1548115184-bc6544d06a58?w=800",
      "https://images.unsplash.com/photo-1541582263897-1e7a9beb2b73?w=400",
      "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=400"
    ],
    rating: 4.6
  },
  {
    id: 9,
    name: "석촌호수 둘레길",
    category: "산책",
    description: "롯데월드 옆 조용한 호수 공원. 벚꽃 시즌 외에는 한산하게 산책을 즐길 수 있습니다.",
    shortDesc: "롯데월드 옆 조용한 호수 산책로",
    address: "서울 송파구 잠실로 148",
    congestion: "normal",
    tags: ["호수", "산책", "벚꽃", "야경"],
    features: ["호수 둘레길", "벤치", "카페 거리", "야간 조명"],
    hours: "24시간",
    admission: "무료",
    images: [
      "https://images.unsplash.com/photo-1548115184-bc6544d06a58?w=800",
      "https://images.unsplash.com/photo-1541582263897-1e7a9beb2b73?w=400",
      "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=400"
    ],
    rating: 4.5
  },
  {
    id: 10,
    name: "선유도공원",
    category: "자연",
    description: "옛 정수장이 생태공원으로 재탄생한 곳. 독특한 폐허 미학과 자연이 어우러진 이색 공간입니다.",
    shortDesc: "정수장이 된 독특한 생태 공원",
    address: "서울 영등포구 선유로 343",
    congestion: "quiet",
    tags: ["생태", "감성", "사진", "한강"],
    features: ["폐정수장 건축", "수생식물원", "한강 뷰", "산책로"],
    hours: "06:00 - 24:00",
    admission: "무료",
    images: [
      "https://images.unsplash.com/photo-1548115184-bc6544d06a58?w=800",
      "https://images.unsplash.com/photo-1541582263897-1e7a9beb2b73?w=400",
      "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=400"
    ],
    rating: 4.7
  },
  {
    id: 11,
    name: "응봉산 팔각정",
    category: "야경",
    description: "서울 야경 비밀 명소. 한강과 서울 전경을 360도로 감상할 수 있는 전망대입니다.",
    shortDesc: "서울 야경을 360도로 감상하는 숨은 명소",
    address: "서울 성동구 응봉동",
    congestion: "quiet",
    tags: ["야경", "전망대", "일몰", "한강뷰"],
    features: ["360도 전망", "일몰 명소", "야간 등산", "한강 뷰"],
    hours: "24시간",
    admission: "무료",
    images: [
      "https://images.unsplash.com/photo-1548115184-bc6544d06a58?w=800",
      "https://images.unsplash.com/photo-1541582263897-1e7a9beb2b73?w=400",
      "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=400"
    ],
    rating: 4.8
  },
  {
    id: 12,
    name: "경의선숲길 연남동",
    category: "카페",
    description: "폐선된 철길이 공원으로 변신. 양옆으로 감성 카페와 맛집이 즐비하지만 평일엔 한적합니다.",
    shortDesc: "폐선 철길 위 감성 넘치는 도심 숲길",
    address: "서울 마포구 연남동",
    congestion: "normal",
    tags: ["카페", "감성", "산책", "데이트"],
    features: ["숲길 산책", "카페 거리", "포토존", "벤치"],
    hours: "24시간",
    admission: "무료",
    images: [
      "https://images.unsplash.com/photo-1548115184-bc6544d06a58?w=800",
      "https://images.unsplash.com/photo-1541582263897-1e7a9beb2b73?w=400",
      "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=400"
    ],
    rating: 4.4
  }
];

// 필터링에 사용되는 카테고리 목록 정의
const categories = ["전체", "자연", "문화", "산책", "역사", "감성", "야경", "카페"];

// 필터링에 사용되는 분위기 태그 정의
const moodTags = ["조용한", "감성적인", "힐링", "숨은명소", "사진맛집", "야경", "자연"];

// 다른 파일에서 사용할 수 있도록 데이터 내보내기 (CommonJS 환경 대응)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { placesData, categories, moodTags };
}
