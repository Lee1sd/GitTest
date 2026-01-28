// Firebase Configuration (CDN 방식 호환)
// 이 프로젝트는 Firebase v12 CDN(compat)로 동작합니다.
// explore.html / planner.html에서 firebase-app-compat / firestore-compat / storage-compat 를 로드해야 합니다.
const firebaseConfig = {
  apiKey: "AIzaSyAl9RTdHgd64mOeEQkHqTLTwb-yhd2kmmg",
  authDomain: "teumsae-df60c.firebaseapp.com",
  projectId: "teumsae-df60c",
  // 버킷은 콘솔에 보이는 값(teumsae-df60c.firebasestorage.app)로도 동작하지만,
  // 일부 환경에서 appspot.com 버킷이 요구되는 경우가 있어 안전하게 두 버킷을 모두 준비합니다.
  storageBucket: "teumsae-df60c.firebasestorage.app",
  messagingSenderId: "594958280787",
  appId: "1:594958280787:web:708186e44abfa5337ffea6"
};

// Initialize Firebase (HTML에서 로드한 firebase 객체 사용)
// v9 모듈 방식 코드를 붙여넣으셨지만, 현재 CDN 방식에 맞게 제가 살짝 수정했습니다.

if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);

  // 1. Auth Initializtion (for login.html)
  if (firebase.auth) {
    window.auth = firebase.auth();
  }

  // 2. Firestore Initialization (for reviews & data)
  if (firebase.firestore) {
    window.db = firebase.firestore();
  }

  // 3. Storage Initializtion (for review image upload)
  var storage = null;
  if (firebase.storage) {
    try {
      storage = firebase.storage();
    } catch (e) {
      console.warn("Firebase Storage SDK not loaded or failed:", e);
    }
  }
  window.storage = storage;

  // Global Config Exposure
  window.firebaseConfig = firebaseConfig;

  console.log("Firebase initialized successfully", {
    auth: !!window.auth,
    db: !!window.db,
    storage: !!window.storage,
    projectId: firebaseConfig.projectId
  });
} else {
  console.error("Firebase SDK not loaded");
}

// ===== 지도 기능을 위한 헬퍼 함수들 =====

// Firestore에서 places 데이터 가져오기
async function fetchPlacesFromFirestore() {
  if (!window.db) {
    console.error('Firestore가 초기화되지 않았습니다.');
    return [];
  }

  try {
    const placesSnapshot = await window.db.collection('places').get();
    const places = [];

    placesSnapshot.forEach(doc => {
      const data = doc.data();
      places.push({
        id: doc.id,
        name: data.name,
        category: data.category,
        description: data.description,
        shortDesc: data.shortDesc,
        address: data.location?.address || '',
        district: data.location?.district || '',
        lat: data.location?.lat || 0,
        lng: data.location?.lng || 0,
        congestion: data.congestion?.level || 'unknown', // quiet, normal, crowded, unknown
        congestionMsg: data.congestion?.msg || '',
        congestionLastUpdated: data.congestion?.lastUpdated || '',
        ppltnMin: data.congestion?.ppltnMin || '',
        ppltnMax: data.congestion?.ppltnMax || '',
        tags: data.features || [],
        features: data.features || [],
        hours: data.details?.hours || '',
        admission: data.details?.fee || '',
        images: data.images || [],
        rating: data.stats?.rating || 0,
        originalName: data.originalName || data.name,
        recommendTime: data.recommendTime || ''
      });
    });

    console.log(`Firestore에서 ${places.length}개의 장소 데이터를 가져왔습니다.`);
    return places;
  } catch (error) {
    console.error('Firestore 데이터 가져오기 실패:', error);
    return [];
  }
}

// 혼잡도 레벨에 따른 색상 반환
function getCongestionColor(level) {
  const colors = {
    'quiet': '#4CAF50',      // 초록색 - 한산함
    'normal': '#FFC107',     // 노란색 - 보통
    'crowded': '#F44336',    // 빨간색 - 혼잡
    'very_crowded': '#B71C1C', // 진한 빨간색 - 매우 혼잡
    'unknown': '#9E9E9E'     // 회색 - 알 수 없음
  };

  return colors[level] || colors['unknown'];
}

// 혼잡도 레벨에 따른 한글 텍스트 반환
function getCongestionText(level) {
  const texts = {
    'quiet': '한산함',
    'normal': '보통',
    'crowded': '혼잡',
    'very_crowded': '매우 혼잡',
    'unknown': '정보 없음'
  };

  return texts[level] || texts['unknown'];
}

// 전역으로 노출
window.fetchPlacesFromFirestore = fetchPlacesFromFirestore;
window.getCongestionColor = getCongestionColor;
window.getCongestionText = getCongestionText;


// 전역 노출 (planner.js에서 사용)
window.firebase = firebase;
window.auth = firebase.auth();
window.db = firebase.firestore();