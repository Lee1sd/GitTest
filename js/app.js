// 틈새 - 메인 애플리케이션 로직
// TeumsaeApp: 메인 페이지의 기능(장소 필터링, 검색, 모달 등)을 담당하는 클래스
class TeumsaeApp {
    constructor() {
        this.places = []; // 초기값 빈 배열
        this.filteredPlaces = [];
        this.savedPlaces = this.loadSavedPlaces();
        this.currentCategory = "전체";
        this.searchQuery = "";

        this.init();
    }

    async init() {
        this.cacheDOMElements(); // Cache basic elements first

        // Load the modal component dynamically
        await this.loadModalComponent();

        // Re-cache modal elements after loading
        this.cacheModalElements();

        this.bindEvents();

        // Firestore 데이터 로드 시도
        try {
            await this.fetchPlacesFromFirestore();
        } catch (error) {
            console.error("Firestore loading failed:", error);
            this.showToast("데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
        }

        this.initScrollEffects();
        this.initIntroAnimation();
        this.checkHash();
        this.checkUrlParams(); // Check for ?id=...
    }

    // Load modal HTML from component file
    async loadModalComponent() {
        try {
            const response = await fetch('components/place-modal.html');
            if (!response.ok) throw new Error('Failed to load modal component');
            const html = await response.text();
            document.getElementById('modal-container').innerHTML = html;

            // Re-bind ModalPlanner and ReviewManager elements now that DOM exists
            if (this.modalPlanner) {
                this.modalPlanner.rebind();
            } else if (window.modalPlanner) {
                window.modalPlanner.rebind();
            }
            
            if (window.reviewManager) {
                window.reviewManager.rebind();
            }
        } catch (error) {
            console.error('Error loading modal component:', error);
        }
    }

    // Cache modal-specific DOM elements
    cacheModalElements() {
        this.modalBackdrop = document.getElementById('place-modal-backdrop');
        this.modalCloseBtn = document.getElementById('place-modal-close');
        this.modalAddBtn = document.getElementById('modal-add-btn');
    }

    // Check URL parameters for direct place access
    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const id = parseInt(params.get('id'));
        if (id) {
            // Wait slightly for data to be ready
            setTimeout(() => {
                this.openPlaceModal(id);
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 500);
        }
    }

    // Firestore에서 데이터 가져오기
    async fetchPlacesFromFirestore() {
        if (!db) throw new Error("Firestore not initialized");

        const snapshot = await db.collection('places').get();
        if (snapshot.empty) {
            console.warn("No matching documents.");
            return;
        }

        this.places = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // id 필드가 숫자인 경우 처리
            const place = {
                ...data,
                id: parseInt(data.id) || data.id // ID 호환성 유지
            };
            this.places.push(place);
        });

        this.filteredPlaces = [...this.places];
        this.renderCategoryFilters();
        this.renderMoodFilters();
        this.renderPlaces();
        console.log(`Loaded ${this.places.length} places from Firestore.`);

        // Re-check URL params after data load (in case data took longer)
        this.checkUrlParams();
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
        // Other elements cached in cacheModalElements()
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

        // 카테고리 필터 클릭 이벤트 -> renderCategoryFilters()에서 처리됨


        // 분위기 태그 클릭 이벤트 -> renderMoodFilters()에서 처리됨

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

        const query = this.searchQuery.replace('#', '').trim(); // 검색어에서 # 제거 및 공백 제거

        this.filteredPlaces = this.places.filter(place => {
            // 1. 카테고리 일치 여부
            const categoryMatch = this.currentCategory === "전체" ||
                place.category === this.currentCategory;

            // 2. 검색어 포함 여부 (이름, 설명, 태그)
            // 태그 검색 기능 강화: 검색어가 태그 중 하나라도 포함하거나 일치하면 매칭
            const searchMatch = !query ||
                place.name.toLowerCase().includes(query) ||
                place.description.toLowerCase().includes(query) ||
                place.tags.some(tag => tag.toLowerCase().includes(query));

            // 3. 분위기 태그 일치 여부 (선택된 태그를 모두 포함해야 통과 - AND 조건)
            const moodMatch = activeMoods.length === 0 ||
                activeMoods.every(mood =>
                    place.tags.some(tag => tag.includes(mood)) ||
                    place.description.includes(mood)
                );

            return categoryMatch && searchMatch && moodMatch;
        });

        this.renderPlaces(); // 필터링 결과 렌더링
    }


    // 카테고리 필터 버튼 동적 생성
    renderCategoryFilters() {
        const filterContainer = document.getElementById('category-filters');
        if (!filterContainer) return;

        // 1. 현재 데이터에서 사용된 카테고리 추출 (중복 제거)
        const uniqueCategories = new Set(['전체']);
        this.places.forEach(place => {
            if (place.category) uniqueCategories.add(place.category);
        });

        // 2. 버튼 HTML 생성
        filterContainer.innerHTML = Array.from(uniqueCategories).map(category => {
            const isActive = category === this.currentCategory;
            return `<button class="filter-btn ${isActive ? 'active' : ''}" data-category="${category}">${category}</button>`;
        }).join('');

        // 3. 이벤트 리스너 다시 연결
        const newCategoryBtns = filterContainer.querySelectorAll('.filter-btn');
        newCategoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // UI 업데이트
                newCategoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 상태 업데이트 및 필터링
                this.currentCategory = btn.dataset.category;
                this.filterPlaces();
            });
        });
    }

    // 분위기 필터 버튼 동적 생성 (더보기 기능 추가)
    renderMoodFilters() {
        const filterContainer = document.getElementById('mood-filters');
        if (!filterContainer) return;

        // 1. 현재 데이터에서 사용된 태그 추출 확인
        const tagCounts = {};
        this.places.forEach(place => {
            if (place.tags && Array.isArray(place.tags)) {
                place.tags.forEach(tag => {
                    const cleanTag = tag.replace('#', '').trim();
                    if (cleanTag) {
                        tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                    }
                });
            }
        });

        // 2. 많이 사용된 순으로 정렬
        const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);

        // 3. 버튼 렌더링 함수 (내부 함수로 정의하여 상태 유지)
        const renderBtns = (showAll = false) => {
            const initialCount = 10; // 처음에 보여줄 개수
            const displayTags = showAll ? sortedTags : sortedTags.slice(0, initialCount);

            // 태그 버튼 HTML 생성
            let html = displayTags.map(tag => {
                // 이미 활성화된 태그인지 확인 (재렌더링 시 상태 유지)
                const isActive = document.querySelector(`.filter-btn[data-mood="${tag}"].active`);
                return `<button class="filter-btn ${isActive ? 'active' : ''}" data-mood="${tag}">${tag}</button>`;
            }).join('');

            // '더 보기' 또는 '접기' 버튼 추가
            if (sortedTags.length > initialCount) {
                if (showAll) {
                    html += `<button class="filter-btn more-btn" id="filter-show-less" style="color: var(--accent-color); border-color: var(--accent-color);">− 접기</button>`;
                } else {
                    html += `<button class="filter-btn more-btn" id="filter-show-more" style="color: var(--accent-color); border-color: var(--accent-color);">+ 더 보기</button>`;
                }
            }

            filterContainer.innerHTML = html;

            // 이벤트 리스너 연결
            filterContainer.querySelectorAll('.filter-btn[data-mood]').forEach(btn => {
                btn.addEventListener('click', () => {
                    btn.classList.toggle('active');
                    this.filterPlaces();
                });
            });

            // 더 보기 버튼 이벤트
            const moreBtn = document.getElementById('filter-show-more');
            if (moreBtn) {
                moreBtn.addEventListener('click', () => {
                    renderBtns(true); // 전체 보기로 다시 렌더링
                });
            }

            // 접기 버튼 이벤트
            const lessBtn = document.getElementById('filter-show-less');
            if (lessBtn) {
                lessBtn.addEventListener('click', () => {
                    renderBtns(false); // 요약 보기로 다시 렌더링
                });
            }
        };

        // 초기 렌더링
        renderBtns(false);
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
                  onclick="window.app.toggleSave(${place.id}, event)"
                  aria-label="저장하기">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${this.isSaved(place.id) ? 'currentColor' : 'none'}" 
                 stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
        <div class="place-card__content">
          <span class="place-card__badge ${this.getCongestionClass(place.congestion ? (place.congestion.level || place.congestion) : 'normal')}">
            ${this.getCongestionText(place.congestion ? (place.congestion.level || place.congestion) : 'normal')}
          </span>
          <span class="place-card__category">${place.category}</span>
          <h3 class="place-card__title">${place.name}</h3>
          <p class="place-card__desc">${place.shortDesc}</p>
          <div class="place-card__tags">
            ${place.tags.slice(0, 3).map(tag => {
            const cleanTag = tag.replace(/^#+/, ''); // Remove existing hashes
            return `<span class="tag">#${cleanTag}</span>`;
        }).join('')}
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
        const place = this.places.find(p => p.id === id);
        if (!place) return;

        // 모달 데이터 채우기
        document.getElementById('modal-hero-image').src = place.images[0];
        document.getElementById('modal-category').textContent = place.category;
        document.getElementById('modal-title').textContent = place.name;
        document.getElementById('modal-address').textContent = place.address;

        // 혼잡도 표시
        // 혼잡도 표시
        const congestionText = document.getElementById('modal-congestion-text');
        const congestionSpan = document.getElementById('modal-congestion');

        // 클래스 초기화 (기본 클래스 유지)
        congestionSpan.className = 'place-modal__congestion';

        // 텍스트 설정
        if (congestionText) {
            congestionText.textContent = this.getCongestionText(place.congestion ? (place.congestion.level || place.congestion) : 'normal');
        } else {
            // If structure changed and text span is gone, set directly (fallback)
            congestionSpan.textContent = this.getCongestionText(place.congestion ? (place.congestion.level || place.congestion) : 'normal');
        }

        // 혼잡도 레벨 가져오기
        const level = place.congestion ? (place.congestion.level || place.congestion) : 'normal';

        // 혼잡도별 색상 클래스 적용 (Components.css 스타일 재사용)
        // Reset classes first but keep base
        congestionSpan.className = 'place-modal__congestion';

        if (level === 'normal') {
            congestionSpan.classList.add('place-card__badge--normal');
        } else if (level === 'crowded') {
            congestionSpan.classList.add('place-card__badge--crowded');
        } else if (level === 'quiet') {
            congestionSpan.classList.add('place-card__badge--quiet');
        } else {
            congestionSpan.classList.add('place-card__badge--normal'); // Default
        }

        document.getElementById('modal-description').textContent = place.description;

        // 태그 목록
        const tagsContainer = document.getElementById('modal-tags');
        if (tagsContainer) {
            tagsContainer.innerHTML = place.tags.map(tag =>
                `<span class="place-tag">${tag.startsWith('#') ? tag : '#' + tag}</span>`
            ).join('');
        }

        // 주요 특징 (Features)
        const featuresContainer = document.getElementById('modal-features');
        if (featuresContainer) {
            if (place.features && place.features.length > 0) {
                featuresContainer.innerHTML = place.features.map(feature =>
                    `<div class="feature-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        ${feature}
                     </div>`
                ).join('');
                document.getElementById('modal-features-section').style.display = 'block';
            } else {
                const featSection = document.getElementById('modal-features-section');
                if (featSection) featSection.style.display = 'none';
            }
        }

        // 상세 정보 (Visit Info)
        const details = place.details || {};

        document.getElementById('modal-hours').textContent = details.hours || place.hours || '정보 없음';
        document.getElementById('modal-admission').textContent = details.fee || place.fee || '정보 없음';

        const recTimeEl = document.getElementById('modal-recommend-time');
        if (recTimeEl) recTimeEl.textContent = place.recommendTime || '정보 없음';

        const capEl = document.getElementById('modal-capacity');
        if (capEl) {
            capEl.textContent = details.capacity
                ? `최대 ${parseInt(details.capacity).toLocaleString()}명`
                : (place.congestion ? `${parseInt(place.congestion.ppltnMax).toLocaleString()}명 수용 가능` : '정보 없음');
        }

        // 홈페이지 링크
        const homepageLink = document.getElementById('modal-homepage');
        if (homepageLink) {
            if (details.homepage) {
                homepageLink.href = details.homepage;
                homepageLink.textContent = '웹사이트 방문';
                // Find parent .place-modal__info-item and show it
                homepageLink.closest('.place-modal__info-item').style.display = 'flex';
            } else {
                // Find parent .place-modal__info-item and hide it
                homepageLink.closest('.place-modal__info-item').style.display = 'none';
            }
        }

        // 혼잡도 메시지 (현장 상황)
        const msgEl = document.getElementById('modal-congestion-msg');
        if (msgEl) {
            msgEl.textContent = place.congestion ? place.congestion.msg : '실시간 데이터 없음';
        }

        // 평점
        const rating = place.stats ? place.stats.rating : (place.rating || 0);
        document.getElementById('modal-rating').textContent = rating > 0 ? `★ ${rating}` : '0.0';

        // 주변 맛집 (Nearby Restaurants)
        const restaurantsContainer = document.getElementById('modal-restaurants');
        if (restaurantsContainer) {
            if (place.nearbyRestaurants && place.nearbyRestaurants.length > 0) {
                restaurantsContainer.innerHTML = place.nearbyRestaurants.map(rest => `
                    <a href="${rest.url || '#'}" target="_blank" class="restaurant-card">
                        <div class="restaurant-name">${rest.name}</div>
                        <div class="restaurant-meta">
                            <span class="restaurant-category">${rest.category}</span>
                            <span>${rest.distance ? rest.distance + 'm' : ''}</span>
                        </div>
                    </a>
                `).join('');
            } else {
                restaurantsContainer.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 0.9rem;">주변 맛집 정보가 없습니다.</p>';
            }
        }

        // 갤러리 이미지
        const galleryContainer = document.getElementById('modal-gallery');
        galleryContainer.innerHTML = place.images.slice(0, 4).map(img =>
            `<img src="${img}" alt="${place.name} Gallery">`
        ).join('');

        // 갤러리 이미지 클릭 이벤트는 lightbox.js에서 이벤트 위임으로 처리됨

        // 모달 표시
        this.modalBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
        document.documentElement.style.overflow = 'hidden';

        // 모달 내부 스크롤 시 배경 스크롤 전파 방지
        this.modalBackdrop.addEventListener('wheel', this.preventScroll, { passive: false });
        this.modalBackdrop.addEventListener('touchmove', this.preventScroll, { passive: false });

        // 리뷰 데이터 로드
        if (this.reviewManager) {
            this.reviewManager.loadForPlace(id);
        }

        // 플래너 사이드바 업데이트
        if (this.modalPlanner) {
            this.modalPlanner.updateForPlace(place);
        }
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
        }
    }
}

// 앱 초기화: DOM이 로드되면 인스턴스 생성
let app;
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize ReviewManager and ModalPlanner globally first (so they are available)
    if (typeof ReviewManager !== 'undefined') {
        window.reviewManager = new ReviewManager();
    }
    if (typeof ModalPlanner !== 'undefined') {
        window.modalPlanner = new ModalPlanner();
    }

    // 2. Initialize App
    window.app = new TeumsaeApp();

    // Assign to local variable
    let app = window.app;

    // Attach helpers to app instance for convenience
    app.reviewManager = window.reviewManager;
    app.modalPlanner = window.modalPlanner;
});
