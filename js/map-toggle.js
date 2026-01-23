/**
 * 틈새 지도 오버레이 토글 기능
 * Map Overlay Toggle Functionality
 */

function toggleMap() {
    const overlay = document.getElementById('map-overlay');
    const mapBtn = document.querySelector('.header__map-btn');

    if (overlay) {
        // iframe 로딩 최적화: 처음 열 때만 src 설정
        const iframe = overlay.querySelector('iframe');
        if (iframe && !iframe.getAttribute('src')) {
            iframe.setAttribute('src', 'map.html?embed=true');
        }

        const isOpen = overlay.classList.toggle('open');

        if (mapBtn) {
            const chevron = mapBtn.querySelector('.chevron');
            if (isOpen) {
                mapBtn.classList.add('active');
                if (chevron) {
                    chevron.style.transform = 'rotate(180deg)';
                }
            } else {
                mapBtn.classList.remove('active');
                if (chevron) {
                    chevron.style.transform = 'rotate(0deg)';
                }
            }
        }

        // 지도 메뉴 활성화 상태 토글 (기호에 따라 유지 또는 삭제)
        const mapBtns = document.querySelectorAll('.header__map-btn');
        mapBtns.forEach(btn => {
            if (btn !== mapBtn) { // 메인 버튼 외 다른 버튼들 처리
                if (isOpen) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });

        // 오버레이가 열릴 때 body 스크롤 방지 및 헤더 스타일 변경
        const header = document.querySelector('.header');
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (header) header.classList.add('map-open');
        } else {
            document.body.style.overflow = '';
            if (header) header.classList.remove('map-open');
        }
    }
}
