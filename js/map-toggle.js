/**
 * 틈새 지도 오버레이 토글 기능
 * Map Overlay Toggle Functionality
 */

function toggleMap(placeId = null) {
    const overlay = document.getElementById('map-overlay');
    const mapBtn = document.querySelector('.header__map-btn');

    if (overlay) {
        // iframe 로딩 최적화: 처음 열 때만 src 설정
        const iframe = overlay.querySelector('iframe');
        if (iframe && !iframe.getAttribute('src')) {
            iframe.setAttribute('src', 'map.html?embed=true');
        }

        const isOpen = overlay.classList.toggle('open');

        // [추가] 특정 장소로 이동 요청 (오버레이가 열릴 때만)
        if (isOpen && placeId && iframe) {
            const sendFocusMessage = () => {
                iframe.contentWindow.postMessage({
                    type: 'FOCUS_PLACE',
                    placeId: placeId
                }, '*');
            };

            // 이미 로드되었으면 바로 전송, 아니면 로드 대기
            if (iframe.contentWindow && iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
                // 약간의 지연을 두어 지도 초기화 시간 확보
                setTimeout(sendFocusMessage, 300);
            } else {
                iframe.onload = () => {
                    setTimeout(sendFocusMessage, 500);
                };
            }
        }

        if (mapBtn) {
            // ... (rest of the button toggle logic)
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
            if (header) {
                header.classList.remove('map-open');
                // 지도를 닫을 때 스크롤 위치에 따라 scrolled 클래스도 제거
                if (window.scrollY <= 50) {
                    header.classList.remove('scrolled');
                }
            }
        }
    }
}

// 전역 객체에 할당 (HTML onclick 속성에서 접근 가능하도록)
window.toggleMap = toggleMap;

