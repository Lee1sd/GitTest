// 틈새 - 인증 가드 및 네비게이션 처리
// 로그인 상태를 체크하고, 보호된 라우트 접근 시 로그인 페이지로 리다이렉트합니다.

const AuthGuard = {
    // 현재 유저 가져오기
    // 현재 유저 가져오기
    getUser() {
        const local = localStorage.getItem('teumsae_user');
        const session = sessionStorage.getItem('teumsae_user');

        let userResult = null;

        // Check Local Storage
        if (local) {
            try {
                const parsed = JSON.parse(local);
                if (parsed && parsed.isLoggedIn) return parsed;
                userResult = parsed; // Keep as fallback if needed (though usually we want active)
            } catch (e) {
                console.error('Local storage parse error', e);
            }
        }

        // Check Session Storage (Priority if Local didn't return active user)
        if (session) {
            try {
                const parsed = JSON.parse(session);
                if (parsed && parsed.isLoggedIn) return parsed;
            } catch (e) {
                console.error('Session storage parse error', e);
            }
        }

        // If neither is logged in, return null (or the inactive user object if we want to preserve email etc, but generally null is safer for AuthGuard)
        return null;
    },

    // 로그인 체크 (Boolean)
    isLoggedIn() {
        const user = this.getUser();
        return user && user.isLoggedIn;
    },

    // 보호된 링크 처리 핸들러
    handleProtectedLink(event, url) {
        event.preventDefault();

        if (this.isLoggedIn()) {
            window.location.href = url;
        } else {
            const confirmLogin = confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?');
            if (confirmLogin) {
                window.location.href = 'login.html';
            }
        }
    },

    // 페이지 진입 시 인증 체크 (옵션)
    checkPageAuth() {
        if (!this.isLoggedIn()) {
            alert('로그인이 필요한 서비스입니다.');
            window.location.href = 'login.html';
        }
    },

    // 헤더 UI 업데이트 (로그인 버튼 vs 유저 메뉴)
    updateHeaderUI() {
        const user = this.getUser();

        // 요소 찾기
        const loginBtn = document.getElementById('login-btn');
        const userMenu = document.getElementById('user-menu');

        // 존재하지 않으면 리턴 (일부 페이지 헤더 구조 다를 수 있음)
        if (!loginBtn || !userMenu) return;

        if (user && user.isLoggedIn) {
            // 로그인 상태: 로그인 버튼 숨김, 유저 메뉴 표시
            loginBtn.style.display = 'none';
            userMenu.style.display = 'block';

            // 유저 정보 업데이트
            const avatar = document.getElementById('user-avatar');
            const name = document.getElementById('user-name');
            const email = document.getElementById('user-email');

            if (avatar) {
                if (user.photoURL) {
                    avatar.style.backgroundImage = `url('${user.photoURL}')`;
                    avatar.textContent = '';
                    avatar.style.backgroundColor = 'transparent';
                } else if (user.email) {
                    avatar.style.backgroundImage = 'none';
                    avatar.style.backgroundColor = '#D4AF37';
                    avatar.textContent = user.email.charAt(0).toUpperCase();
                }
            }
            if (name) name.textContent = user.name || (user.email ? user.email.split('@')[0] : 'User');
            if (email) email.textContent = user.email;

            // greeting 업데이트
            const greeting = document.querySelector('.user-greeting');
            const userName = user.name || (user.email ? user.email.split('@')[0] : 'User');
            if (greeting) greeting.textContent = `${userName}님 환영합니다!`;

        } else {
            // 비로그인 상태: 로그인 버튼 표시, 유저 메뉴 숨김
            loginBtn.style.display = 'inline-flex'; // flex 레이아웃 유지
            userMenu.style.display = 'none';
        }
    }
};

// 전역 스코프에 노출
window.AuthGuard = AuthGuard;

// DOM 로드 시 헤더 UI 자동 업데이트
document.addEventListener('DOMContentLoaded', () => {
    AuthGuard.updateHeaderUI();
});
