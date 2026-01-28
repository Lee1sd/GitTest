/**
 * Teumsae UI Components Loader
 * 공통 UI 요소(헤더, 푸터 등)를 동적으로 로드하고 관리합니다.
 */
class ComponentLoader {
    constructor() {
        this.headerPlaceholder = document.getElementById('header-placeholder');
        this.footerPlaceholder = document.getElementById('footer-placeholder');
    }

    /**
     * 초기화: 헤더와 푸터를 로드합니다.
     */
    async init() {
        await this.loadHeader();
        await this.loadFooter();
        this.loadMapOverlay();
        this.initScrollAnimations();
    }

    /**
     * 공통 헤더 로드
     */
    async loadHeader() {
        if (!this.headerPlaceholder) return;

        // 임베드 모드 확인 (map.html 등에서 사용)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('embed') === 'true') {
            this.headerPlaceholder.style.display = 'none';
            return;
        }

        // 현재 페이지 경로 확인 (Active 메뉴 하이라이팅용)
        const currentPath = window.location.pathname;
        const pageRelativePath = currentPath.split('/').pop() || 'index.html';

        this.headerPlaceholder.innerHTML = `
        <header class="header">
            <div class="container">
                <div class="header__inner">
                    <a href="index.html" class="header__logo">
                        <img src="images/logo.png" alt="틈새 Teumsae" class="logo-img">
                    </a>
                    <nav class="header__nav">
                        <a href="explore.html" class="header__link hover-underline ${pageRelativePath === 'explore.html' ? 'active' : ''}">장소 탐색</a>
                        <a href="recommend.html" class="header__link hover-underline ${pageRelativePath === 'recommend.html' ? 'active' : ''}"
                            onclick="AuthGuard.handleProtectedLink(event, 'recommend.html')">AI 추천</a>
                        <a href="planner.html" class="header__link hover-underline ${pageRelativePath === 'planner.html' ? 'active' : ''}"
                            onclick="AuthGuard.handleProtectedLink(event, 'planner.html')">여행 계획</a>
                    </nav>
                    <div class="header__controls">
                        <button class="header__map-btn" onclick="toggleMap()" aria-label="지도 보기/닫기">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                                <line x1="8" y1="2" x2="8" y2="18"></line>
                                <line x1="16" y1="6" x2="16" y2="22"></line>
                            </svg>
                            <span>지도</span>
                            <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>

                        <!-- 로그인 버튼 (로그아웃 상태) -->
                        <a href="login.html" id="login-btn" class="btn btn-primary btn-sm" style="display: none;">로그인</a>

                        <!-- 사용자 메뉴 (로그인 상태) -->
                        <div class="user-menu" id="user-menu" style="display: none;">
                            <button class="user-btn">
                                <span class="user-avatar" id="user-avatar">U</span>
                                <span id="user-name">User</span>
                            </button>
                            <div class="user-dropdown">
                                <div class="user-dropdown-header">
                                    <div class="user-greeting">환영합니다!</div>
                                    <div class="user-email" id="user-email">guest@teumsae.kr</div>
                                </div>
                                <a href="planner.html" class="user-dropdown-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    내 여행 계획
                                </a>
                                <a href="#" class="user-dropdown-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                    저장한 장소
                                </a>
                                <a href="recommend.html" class="user-dropdown-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                    AI 추천받기
                                </a>
                                <div class="user-dropdown-divider"></div>
                                <a href="#" class="user-dropdown-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                    </svg>
                                    설정
                                </a>
                                <a href="#" class="user-dropdown-item logout" onclick="logout()">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                    로그아웃
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
        `;

        // 헤더 로드 후 바로 AuthGuard 업데이트 호출 (중요)
        if (window.AuthGuard) {
            window.AuthGuard.updateHeaderUI();
        }
    }

    /**
     * 공통 푸터 로드
     */
    async loadFooter() {
        if (!this.footerPlaceholder) return;

        this.footerPlaceholder.innerHTML = `
        <footer class="footer">
            <div class="container">
                <div class="footer__content">
                    <a href="index.html" class="footer__logo">
                        <img src="images/logo.png" alt="틈새 Teumsae" class="logo-img" style="height: 40px;">
                    </a>
                    <p class="footer__desc">서울의 숨은 여유를 디자인하다</p>
                    <div class="footer__links">
                        <a href="explore.html">장소 탐색</a>
                        <a href="recommend.html">AI 추천</a>
                        <a href="planner.html">여행 계획</a>
                    </div>
                    <p class="footer__copy">&copy; 2024 Teumsae. All rights reserved.</p>
                </div>
            </div>
        </footer>
        `;
    }

    /**
     * 지도 오버레이 주입
     * 이미 페이지에 존재하면 추가하지 않음 (중복 방지)
     */
    loadMapOverlay() {
        // 이미 존재하는 경우 아무것도 하지 않음
        if (document.getElementById('map-overlay')) {
            return;
        }

        // 존재하지 않을 때만 새로 생성
        const overlay = document.createElement('div');
        overlay.id = 'map-overlay';
        overlay.className = 'map-overlay';
        overlay.innerHTML = '<iframe src="" frameborder="0" loading="lazy"></iframe>';
        document.body.appendChild(overlay);
    }

    /**
     * 스크롤 애니메이션 초기화 (헤더 변색 등)
     */
    initScrollAnimations() {
        // 헤더 스크롤 효과
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.header');
            if (header) {
                if (window.scrollY > 50) header.classList.add('scrolled');
                else header.classList.remove('scrolled');
            }
        });

        // 요소 등장 애니메이션 (Reveal 효과)
        const observerOptions = {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px"
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
            observer.observe(el);
        });
    }
}

// 스크립트 로드 시 자동 실행 또는 수동 실행 가능하도록 인스턴스 노출
window.ComponentLoader = ComponentLoader;

// DOM 로드 시 자동 실행 (플레이스홀더가 있는 경우)
document.addEventListener('DOMContentLoaded', () => {
    const loader = new ComponentLoader();
    loader.init();
});
