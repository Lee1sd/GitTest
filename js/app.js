// 틈새 - 메인 애플리케이션 로직
// TeumsaeApp: 메인 페이지의 기능(장소 필터링, 검색, 모달 등)을 담당하는 클래스
class TeumsaeApp {
    constructor() {
        this.places = placesData; // 전체 장소 데이터
        this.filteredPlaces = [...placesData]; // 필터링된 장소 데이터 (초기값은 전체)
        this.savedPlaces = this.loadSavedPlaces(); // 로컬 스토리지에서 저장된 장소 로드
        this.currentCategory = "전체"; // 현재 선택된 카테고리
        this.searchQuery = ""; // 검색어
        this.currentReviewPlaceId = null; // 현재 리뷰 작성 중인 장소 ID
        this.reviewRating = 0; // 현재 리뷰 평점

        this.init(); // 앱 초기화
    }

    // 초기화 메서드
    init() {
        this.cacheDOMElements(); // DOM 요소 캐싱
        this.bindEvents(); // 이벤트 리스너 바인딩
        this.renderPlaces(); // 장소 목록 렌더링
        this.initScrollEffects(); // 스크롤 효과 초기화
        this.initIntroAnimation(); // 인트로 애니메이션 초기화 (CSS 기반)
        this.checkHash(); // URL 해시 확인 (특정 섹션으로 이동)
    }

    // 자주 사용하는 DOM 요소를 변수에 저장하여 성능 최적화
    cacheDOMElements() {
        // 메인 섹션 요소
        this.main = document.querySelector('.main');
        this.searchInput = document.querySelector('.search-box__input'); // 검색 입력창
        this.categoryBtns = document.querySelectorAll('.filter-btn[data-category]'); // 카테고리 버튼들
        this.moodTags = document.querySelectorAll('.filter-btn[data-mood]'); // 분위기 태그 버튼들
        this.placesGrid = document.querySelector('.places-grid'); // 장소 목록 그리드 컨테이너

        // 헤더
        this.header = document.querySelector('.header');

        // 모달 (팝업)
        this.modalBackdrop = document.getElementById('place-modal-backdrop'); // 모달 배경
        this.modalCloseBtn = document.getElementById('place-modal-close'); // 닫기 버튼
        this.modalAddBtn = document.getElementById('modal-add-btn'); // 모달 내 추가 버튼
        
        // 리뷰 모달
        this.reviewModalBackdrop = document.getElementById('review-modal-backdrop');
        this.reviewModalCloseBtn = document.getElementById('review-modal-close');
        this.reviewSubmitBtn = document.getElementById('review-submit-btn');
        this.reviewForm = document.getElementById('review-form');
        this.stars = document.querySelectorAll('.star');
        this.reviewStarsContainer = document.getElementById('star-rating');

        // 이미지 모달
        this.imageModalBackdrop = document.getElementById('image-modal-backdrop');
        this.imageModalImg = document.getElementById('image-modal-img');
        this.imageModalCloseBtn = document.getElementById('image-modal-close');
    }

    // 이벤트 리스너 설정
    bindEvents() {
        // 탐색하기 링크 (검색 영역으로 부드럽게 스크롤)
        const exploreLink = document.getElementById('nav-explore');
        if (exploreLink) {
            exploreLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.scrollToSearch();
            });
        }

        // 검색어 입력 감지
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.filterPlaces(); // 실시간 필터링
            });
        }

        // 카테고리 필터 클릭 이벤트
        this.categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // 카테고리는 하나만 선택 가능
                this.categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category;
                this.filterPlaces();
            });
        });

        // 분위기 태그 클릭 이벤트 (다중 선택 가능)
        this.moodTags.forEach(tag => {
            tag.addEventListener('click', () => {
                tag.classList.toggle('active');
                this.filterPlaces();
            });
        });

        // 스크롤 이벤트 (헤더 스타일 변경 및 요소 등장 효과)
        window.addEventListener('scroll', () => this.handleScroll());

        // 모달 닫기 이벤트
        if (this.modalCloseBtn) {
            this.modalCloseBtn.addEventListener('click', () => this.closePlaceModal());
        }
        if (this.modalBackdrop) {
            this.modalBackdrop.addEventListener('click', (e) => {
                // 배경 클릭 시 닫기
                if (e.target === this.modalBackdrop) {
                    this.closePlaceModal();
                }
            });
        }


        // 리뷰 달기 버튼 클릭 이벤트
        const reviewBtn = document.getElementById('modal-review-btn');
        if (reviewBtn) {
            reviewBtn.addEventListener('click', () => {
                // 현재 열린 장소 ID 가져오기 (openPlaceModal에서 저장하거나 현재 상태에서 추론)
                // 하지만 this.currentPlaceId 같은 상태가 없으므로, 
                // openPlaceModal에서 currentPlaceId를 설정하도록 수정 필요.
                // 일단 여기서는 openReviewModal을 호출.
                if (this.currentPlaceId) {
                    this.openReviewModal(this.currentPlaceId);
                }
            });
        }

        // 리뷰 모달 닫기 이벤트
        if (this.reviewModalCloseBtn) {
            this.reviewModalCloseBtn.addEventListener('click', () => this.closeReviewModal());
        }
        if (this.reviewModalBackdrop) {
            this.reviewModalBackdrop.addEventListener('click', (e) => {
                if (e.target === this.reviewModalBackdrop) {
                    this.closeReviewModal();
                }
            });
        }

        // 별점 클릭 이벤트
        if (this.reviewStarsContainer) {
            this.stars.forEach(star => {
                star.addEventListener('click', (e) => {
                    const value = parseInt(star.dataset.value);
                    this.setRating(value);
                });
            });
        }

        // 파일 업로드 미리보기 텍스트 변경
        const fileInput = document.getElementById('review-image');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const fileName = e.target.files[0]?.name || '클릭하여 이미지를 업로드하세요';
                document.getElementById('file-name').textContent = fileName;
            });
        }

        // 리뷰 제출 이벤트
        if (this.reviewSubmitBtn) {
            this.reviewSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submitReview();
            });
        }

        // 이미지 모달 닫기
        if (this.imageModalCloseBtn) {
            this.imageModalCloseBtn.addEventListener('click', () => this.closeImageModal());
        }
        if (this.imageModalBackdrop) {
            this.imageModalBackdrop.addEventListener('click', (e) => {
                if (e.target === this.imageModalBackdrop) {
                    this.closeImageModal();
                }
            });
        }
    }

    // 메인 섹션으로 스크롤
    scrollToMain() {
        if (this.main) {
            this.main.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // 페이지 로드 시 해시(#) 확인
    checkHash() {
        if (window.location.hash === '#places') {
            // 레이아웃이 안정화된 후 스크롤 이동
            setTimeout(() => {
                this.scrollToSearch();
            }, 100);
        }
    }

    // 검색 영역으로 스크롤 이동
    scrollToSearch() {
        const searchContainer = document.getElementById('places-search-container');
        if (searchContainer) {
            // 헤더 높이를 고려한 오프셋 조정 (약 90px)
            const headerHeight = 90;
            const elementPosition = searchContainer.getBoundingClientRect().top + window.scrollY;
            const offsetPosition = elementPosition - headerHeight;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    // 스크롤 핸들러 (헤더 투명도 조절 및 스크롤 감지 애니메이션)
    handleScroll() {
        const scrollY = window.scrollY;

        // 헤더 배경 스타일 변경 (스크롤 시 어둡게)
        if (this.header) {
            if (scrollY > 100) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }
        }

        // '둘러보기' 네비게이션 활성화 상태 처리
        const exploreLink = document.getElementById('nav-explore');
        const searchContainer = document.getElementById('places-search-container');

        if (exploreLink && searchContainer) {
            const rect = searchContainer.getBoundingClientRect();

            // 검색 영역이 화면 상단에 가까워지면 활성화
            if (rect.top <= 150) {
                exploreLink.classList.add('active');
            } else {
                exploreLink.classList.remove('active');
            }
        }

        // 스크롤에 따른 요소 등장 애니메이션 (Reveal)
        this.revealOnScroll();
    }

    // 스크롤 시 요소가 화면에 나타날 때 애니메이션 클래스 추가
    revealOnScroll() {
        const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
        const windowHeight = window.innerHeight;

        reveals.forEach(el => {
            const elementTop = el.getBoundingClientRect().top;
            const revealPoint = 150; // 요소가 화면 하단에서 150px 올라왔을 때

            if (elementTop < windowHeight - revealPoint) {
                el.classList.add('revealed');
            }
        });
    }

    // 장소 필터링 로직 (카테고리, 검색어, 태그 조합)
    filterPlaces() {
        // 활성화된 분위기 태그 목록 수집
        const activeMoods = [...document.querySelectorAll('.filter-btn[data-mood].active')]
            .map(tag => tag.dataset.mood);

        this.filteredPlaces = this.places.filter(place => {
            // 1. 카테고리 일치 여부
            const categoryMatch = this.currentCategory === "전체" ||
                place.category === this.currentCategory;

            // 2. 검색어 포함 여부 (이름, 설명, 태그)
            const searchMatch = !this.searchQuery ||
                place.name.toLowerCase().includes(this.searchQuery) ||
                place.description.toLowerCase().includes(this.searchQuery) ||
                place.tags.some(tag => tag.includes(this.searchQuery));

            // 3. 분위기 태그 일치 여부 (선택된 태그 중 하나라도 포함되면 통과)
            const moodMatch = activeMoods.length === 0 ||
                activeMoods.some(mood =>
                    place.tags.some(tag => tag.includes(mood)) ||
                    place.description.includes(mood)
                );

            return categoryMatch && searchMatch && moodMatch;
        });

        this.renderPlaces(); // 필터링 결과 렌더링
    }

    // 장소 카드 렌더링
    renderPlaces() {
        if (!this.placesGrid) return;

        // 검색 결과가 없을 때
        if (this.filteredPlaces.length === 0) {
            this.placesGrid.innerHTML = `
        <div class="places-empty" style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
          <p style="font-size: 1.25rem; color: var(--color-gray);">검색 결과가 없습니다.</p>
          <p style="color: var(--color-gray-light); margin-top: 0.5rem;">다른 키워드로 검색해보세요.</p>
        </div>
      `;
            return;
        }

        // 카드 HTML 생성
        this.placesGrid.innerHTML = this.filteredPlaces.map((place, index) => `
      <article class="card place-card reveal" style="animation-delay: ${index * 0.1}s" data-id="${place.id}">
        <div class="place-card__image">
          <img src="${place.images[0]}" alt="${place.name}" loading="lazy">
          <button class="place-card__save ${this.isSaved(place.id) ? 'saved' : ''}" 
                  onclick="app.toggleSave(${place.id}, event)"
                  aria-label="저장하기">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${this.isSaved(place.id) ? 'currentColor' : 'none'}" 
                 stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
        <div class="place-card__content">
          <span class="place-card__badge ${this.getCongestionClass(place.congestion)}">
            ${this.getCongestionText(place.congestion)}
          </span>
          <span class="place-card__category">${place.category}</span>
          <h3 class="place-card__title">${place.name}</h3>
          <p class="place-card__desc">${place.shortDesc}</p>
          <div class="place-card__tags">
            ${place.tags.slice(0, 3).map(tag => `<span class="tag">#${tag}</span>`).join('')}
          </div>
        </div>
      </article>
    `).join('');

        // 카드 클릭 시 모달 열기 이벤트 추가
        this.placesGrid.querySelectorAll('.place-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // 저장 버튼 클릭 시에는 모달을 열지 않음
                if (!e.target.closest('.place-card__save')) {
                    const id = parseInt(card.dataset.id);
                    this.openPlaceModal(id);
                }
            });
        });

        // 렌더링 직후 애니메이션 적용
        setTimeout(() => this.revealOnScroll(), 100);
    }

    // 혼잡도에 따른 CSS 클래스 반환
    getCongestionClass(congestion) {
        const classes = {
            quiet: '',
            normal: 'place-card__badge--normal',
            crowded: 'place-card__badge--crowded'
        };
        return classes[congestion] || '';
    }

    // 혼잡도 텍스트 반환 (영문 -> 한글)
    getCongestionText(congestion) {
        const texts = {
            quiet: '한산',
            normal: '보통',
            crowded: '혼잡'
        };
        return texts[congestion] || '보통';
    }

    // 장소 저장/삭제 토글
    toggleSave(id, event) {
        event.preventDefault();
        event.stopPropagation(); // 부모 요소 클릭 이벤트 전파 방지

        const index = this.savedPlaces.indexOf(id);
        const isNowSaved = index === -1;

        if (index > -1) {
            this.savedPlaces.splice(index, 1); // 저장 취소
        } else {
            this.savedPlaces.push(id); // 저장
        }

        this.savePlaces(); // 로컬 스토리지 업데이트

        // UI 즉시 업데이트 (깜빡임 방지)
        const btn = event.currentTarget;
        if (btn) {
            if (isNowSaved) {
                btn.classList.add('saved');
                const svg = btn.querySelector('svg');
                if (svg) svg.setAttribute('fill', 'currentColor');
            } else {
                btn.classList.remove('saved');
                const svg = btn.querySelector('svg');
                if (svg) svg.setAttribute('fill', 'none');
            }
        }

        // 토스트 알림 표시
        this.showToast(index > -1 ? '저장 목록에서 제거했습니다.' : '저장 목록에 추가했습니다.');
    }

    // 저장 여부 확인
    isSaved(id) {
        return this.savedPlaces.includes(id);
    }

    // 로컬 스토리지에서 저장된 장소 불러오기
    loadSavedPlaces() {
        try {
            return JSON.parse(localStorage.getItem('teumsae_saved')) || [];
        } catch {
            return [];
        }
    }

    // 로컬 스토리지에 저장된 장소 저장
    savePlaces() {
        localStorage.setItem('teumsae_saved', JSON.stringify(this.savedPlaces));
    }

    // 토스트 알림 표시 함수
    showToast(message) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove(); // 기존 토스트 제거

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = message;
        toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--color-dark);
      color: var(--color-white);
      padding: 1rem 2rem;
      border-radius: 50px;
      font-size: 0.875rem;
      z-index: 1000;
      transition: transform 0.3s ease;
    `;

        document.body.appendChild(toast);

        // 표시 애니메이션
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

        // 사라짐 애니메이션
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // 스크롤 효과 초기화
    initScrollEffects() {
        setTimeout(() => this.revealOnScroll(), 100);
    }

    initIntroAnimation() {
        // 인트로는 CSS 애니메이션으로 처리됨
    }

    // 장소 상세 모달 열기
    openPlaceModal(id) {
        this.currentPlaceId = id; // 현재 보고 있는 장소 ID 저장
        const place = this.places.find(p => p.id === id);
        if (!place) return;

        // 모달 데이터 채우기
        document.getElementById('modal-hero-image').src = place.images[0];
        document.getElementById('modal-category').textContent = place.category;
        document.getElementById('modal-title').textContent = place.name;
        document.getElementById('modal-address').textContent = place.address;

        // 혼잡도 표시
        const congestionText = document.getElementById('modal-congestion-text');
        const congestionSpan = document.getElementById('modal-congestion');
        // 클래스 초기화
        congestionSpan.className = 'place-modal__congestion';

        congestionText.textContent = this.getCongestionText(place.congestion);

        // 혼잡도별 색상 클래스 적용
        if (place.congestion === 'normal') congestionSpan.classList.add('place-card__badge--normal');
        if (place.congestion === 'crowded') congestionSpan.classList.add('place-card__badge--crowded');

        // 텍스트 색상 클래스 (기존 로직 유지)
        if (place.congestion === 'normal') congestionSpan.classList.add('text-accent');
        if (place.congestion === 'crowded') congestionSpan.classList.add('text-primary');

        document.getElementById('modal-description').textContent = place.description;

        // 태그 목록
        const tagsContainer = document.getElementById('modal-tags');
        tagsContainer.innerHTML = place.tags.map(tag => `<span class="place-tag">#${tag}</span>`).join('');

        // 상세 정보
        document.getElementById('modal-hours').textContent = place.hours;
        document.getElementById('modal-admission').textContent = place.admission;
        document.getElementById('modal-rating').textContent = place.rating;

        // 갤러리 이미지
        const galleryContainer = document.getElementById('modal-gallery');
        galleryContainer.innerHTML = place.images.slice(0, 4).map(img =>
            `<img src="${img}" alt="${place.name} Gallery">`
        ).join('');

        // 모달 표시
        this.modalBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
        document.documentElement.style.overflow = 'hidden';

        // 모달 내부 스크롤 시 배경 스크롤 전파 방지
        this.modalBackdrop.addEventListener('wheel', this.preventScroll, { passive: false });
        this.modalBackdrop.addEventListener('touchmove', this.preventScroll, { passive: false });

        // 리뷰 목록 렌더링
        this.renderReviews(id);
    }

    // 스크롤 이벤트 전파 방지 핸들러
    preventScroll(e) {
        // 모달 콘텐츠 내부가 아니면 스크롤 차단
        const modalContent = e.target.closest('.place-modal__content');
        if (!modalContent) {
            e.preventDefault();
        }
    }

    // 장소 상세 모달 닫기
    closePlaceModal() {
        if (this.modalBackdrop) {
            this.modalBackdrop.classList.remove('active');
            document.body.style.overflow = ''; // 스크롤 복구
            document.documentElement.style.overflow = '';

            this.modalBackdrop.removeEventListener('wheel', this.preventScroll);
            this.modalBackdrop.removeEventListener('touchmove', this.preventScroll);
            
            this.currentPlaceId = null; // ID 초기화
        }
    }

    // --- 리뷰 관련 메서드 ---

    openReviewModal(placeId) {
        this.currentReviewPlaceId = placeId;
        this.closePlaceModal(); // 기존 상세 모달 닫기
        
        // 모달 열기
        if (this.reviewModalBackdrop) {
            this.reviewModalBackdrop.classList.add('active');
            this.reviewModalBackdrop.style.display = 'flex'; // backdrop이 보이도록
        }
    }

    closeReviewModal() {
        if (this.reviewModalBackdrop) {
            this.reviewModalBackdrop.classList.remove('active');
            this.reviewModalBackdrop.style.display = 'none';
        }
        
        // 폼 초기화
        if (this.reviewForm) this.reviewForm.reset();
        this.setRating(0);
        document.getElementById('file-name').textContent = '클릭하여 이미지를 업로드하세요';
        this.currentReviewPlaceId = null;
    }

    setRating(value) {
        this.reviewRating = value;
        document.getElementById('review-rating').value = value;
        
        this.stars.forEach(star => {
            const starValue = parseInt(star.dataset.value);
            if (starValue <= value) {
                star.setAttribute('fill', '#D4AF37'); // 채워진 별 색상
                star.setAttribute('stroke', '#D4AF37');
            } else {
                star.setAttribute('fill', 'none');
                star.setAttribute('stroke', '#D4AF37'); // 빈 별 색상
            }
        });
    }

    submitReview() {
        const title = document.getElementById('review-title').value;
        const content = document.getElementById('review-content').value;
        const rating = this.reviewRating;
        const imageFile = document.getElementById('review-image').files[0];

        if (!title || !content || rating === 0) {
            this.showToast('제목, 내용, 별점을 모두 입력해주세요.');
            return;
        }

        const saveAndReload = (imageData) => {
            const review = {
                id: Date.now(),
                placeId: this.currentReviewPlaceId,
                title,
                content,
                rating,
                imageName: imageFile ? imageFile.name : null,
                imageData: imageData, // Base64 이미지 데이터
                date: new Date().toLocaleDateString(),
                author: 'Guest'
            };

            const reviews = JSON.parse(localStorage.getItem('teumsae_reviews') || '[]');
            reviews.push(review);
            localStorage.setItem('teumsae_reviews', JSON.stringify(reviews));

            this.showToast('리뷰가 성공적으로 등록되었습니다!');
            
            const savedPlaceId = this.currentReviewPlaceId;
            this.closeReviewModal();

            setTimeout(() => {
                this.openPlaceModal(savedPlaceId);
            }, 300);
        };

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                saveAndReload(e.target.result);
            };
            reader.readAsDataURL(imageFile);
        } else {
            saveAndReload(null);
        }
    }

    renderReviews(placeId) {
        const reviews = JSON.parse(localStorage.getItem('teumsae_reviews') || '[]');
        const placeReviews = reviews.filter(r => r.placeId === placeId);
        const listContainer = document.getElementById('modal-reviews-list');
        
        if (!listContainer) return;

        if (placeReviews.length === 0) {
            listContainer.innerHTML = '<p style="color: rgba(255,255,255,0.5); padding: 20px; text-align: center;">아직 등록된 리뷰가 없습니다.</p>';
            return;
        }

        listContainer.innerHTML = placeReviews.map(review => `
            <div class="review-item" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div>
                        <span style="font-weight: bold; color: var(--text-color); margin-right: 10px;">${review.author || 'Guest'}</span>
                        <span style="font-size: 0.85rem; color: rgba(255,255,255,0.4);">${review.date}</span>
                    </div>
                    <div style="color: #D4AF37;">
                        ${this.generateStars(review.rating)}
                    </div>
                </div>
                <h4 style="color: white; margin-bottom: 8px; font-size: 1.1rem;">${review.title}</h4>
                <p style="color: rgba(255,255,255,0.8); line-height: 1.6; font-size: 0.95rem;">${review.content}</p>
                ${review.imageData ? 
                    `<div style="margin-top: 15px;">
                        <img src="${review.imageData}" alt="Review Image" 
                             style="max-width: 100%; max-height: 300px; border-radius: 8px; object-fit: cover; cursor: pointer;"
                             onclick="app.openImageModal('${review.imageData}')">
                    </div>` : 
                    (review.imageName ? `<div style="margin-top: 15px; margin-bottom: 5px; font-size: 0.85rem; color: var(--accent-color);">📷 사진 첨부됨: ${review.imageName}</div>` : '')}
            </div>
        `).join('');
    }

    generateStars(rating) {
        return '★'.repeat(rating) + '☆'.repeat(5 - rating);
    }

    // --- 이미지 확대 모달 메서드 ---
    openImageModal(src) {
        if (this.imageModalBackdrop && this.imageModalImg) {
            this.imageModalImg.src = src;
            this.imageModalBackdrop.classList.add('active');
        }
    }

    closeImageModal() {
        if (this.imageModalBackdrop) {
            this.imageModalBackdrop.classList.remove('active');
        }
    }
}

// 앱 초기화: DOM이 로드되면 인스턴스 생성
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TeumsaeApp();
});
