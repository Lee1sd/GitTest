// Firebase Configuration (CDN 방식 호환)
const firebaseConfig = {
  apiKey: "AIzaSyAl9RTdHgd64mOeEQkHqTLTwb-yhd2kmmg",
  authDomain: "teumsae-df60c.firebaseapp.com",
  projectId: "teumsae-df60c",
  storageBucket: "teumsae-df60c.firebasestorage.app",
  messagingSenderId: "594958280787",
  appId: "1:594958280787:web:708186e44abfa5337ffea6"
};

// Initialize Firebase (HTML에서 로드한 firebase 객체 사용)
// v9 모듈 방식 코드를 붙여넣으셨지만, 현재 CDN 방식에 맞게 제가 살짝 수정했습니다.

if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);

  // Auth & Firestore
  window.auth = firebase.auth();
  window.db = firebase.firestore();

  // Storage (if available)
  if (firebase.storage) {
    window.storage = firebase.storage();
  }

  console.log("Firebase initialized (Auth enabled)");
} else {
  console.error("Firebase SDK not loaded");
}