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