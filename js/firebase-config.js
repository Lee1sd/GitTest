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
  var db = firebase.firestore();
  // Storage 초기화(리뷰 이미지 업로드/로드용)
  var storage = null;
  try {
    storage = firebase.storage();
  } catch (e) {
    console.warn("Firebase Storage SDK not loaded yet:", e);
  }

  // 전역 노출(기존 코드 호환)
  window.firebaseConfig = firebaseConfig;
  window.db = db;
  window.storage = storage;
  console.log("Firebase initialized successfully", {
    projectId: firebaseConfig.projectId,
    bucket: firebaseConfig.storageBucket
  });
} else {
  console.error("Firebase SDK not loaded in HTML");
}