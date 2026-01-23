// 로그아웃 기능 처리
function logout() {
    // 로컬 스토리지 및 세션 스토리지에서 사용자 정보 제거
    localStorage.removeItem('teumsae_user');
    sessionStorage.removeItem('teumsae_user');

    // 로그인 페이지로 리다이렉트
    window.location.href = 'login.html';
}
