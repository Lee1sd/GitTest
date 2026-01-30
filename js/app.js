// 틈새 - 메인 애플리케이션 로직
// TeumsaeApp: 메인 페이지의 기능(장소 필터링, 검색, 모달 등)을 담당하는 클래스
class TeumsaeApp {
    constructor() {
        this.places = []; // 초기값 빈 배열
        this.filteredPlaces = [];
        this.savedPlaces = this.loadSavedPlaces();

        // Filter States
        this.currentCategory = "전체";
        this.currentDistrict = "전체";
        this.currentCongestion = "all";
        this.currentSort = "recommended"; // Default Sort
        this.searchQuery = "";

        // Pagination State
        this.itemsPerPage = 12; // 3 rows * 4 columns (desktop)
        this.currentPage = 1;
        this.isPaginationMode = false; // false: Load More mode, true: Pagination mode

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
            // 실패 시 기존 data.js의 placesData 사용 (Fallback)
            if (typeof placesData !== 'undefined') {
                this.places = placesData;
                this.filteredPlaces = [...this.places];
                this.renderCategoryFilters();
                this.renderMoodFilters();
                this.renderPlaces();
            }
        }

        this.initScrollEffects();
        this.initIntroAnimation();
        this.checkHash();
        this.checkUrlParams(); // Check for ?id=...

        // ✅ 다른 탭/페이지(예: 여행계획)에서 즐겨찾기 변경 시 UI 즉시 동기화
        window.addEventListener('storage', (e) => {
            if (e.key === 'teumsae_saved') {
                this.savedPlaces = this.loadSavedPlaces();
                this.updateBookmarkButtons();
            }
        });
    }

    // Load modal HTML from component files (Dual Modal System)
    async loadModalComponent() {
        const modalContainer = document.getElementById('modal-container');

        // ✅ planner 페이지에서는 모달이 없으므로 그냥 종료
        if (!modalContainer) {
            console.log('[TeumsaeApp] modal-container not found, skipping modal load');
            return;
        }
        try {
            // Fetch both components in parallel
            const [placeRes, compRes] = await Promise.all([
                fetch('components/place-modal.html'),
                fetch('components/comparison-page.html')
            ]);

            if (!placeRes.ok || !compRes.ok) throw new Error('Failed to load modal components');

            const placeHtmlRaw = await placeRes.text();
            const compHtmlRaw = await compRes.text();

            const parser = new DOMParser();
            const placeDoc = parser.parseFromString(placeHtmlRaw, 'text/html');
            const compDoc = parser.parseFromString(compHtmlRaw, 'text/html');

            const placeContent = placeDoc.querySelector('.place-modal').outerHTML;
            const compContent = compDoc.querySelector('.comparison-modal').outerHTML;

            // Debug: Check if review elements are in the extracted HTML
            console.log('[loadModalComponent] placeContent includes review-list:', placeContent.includes('review-list'));
            console.log('[loadModalComponent] placeContent includes btn-write-review:', placeContent.includes('btn-write-review'));
            console.log('[loadModalComponent] placeContent length:', placeContent.length);

            const dualLayout = `
                <div class="dual-backdrop" id="dual-backdrop">
                    <div class="dual-layout">
                        <section class="dual-left">
                            ${placeContent}
                        </section>
                        <section class="dual-right">
                            ${compContent}
                        </section>
                    </div>
                </div>
            `;

            document.getElementById('modal-container').innerHTML = dualLayout;

            // Debug: Check if elements exist in DOM after injection
            console.log('[loadModalComponent] After injection - review-list exists:', !!document.getElementById('review-list'));
            console.log('[loadModalComponent] After injection - btn-write-review exists:', !!document.getElementById('btn-write-review'));

            // Re-bind sub-components
            if (this.modalPlanner) this.modalPlanner.rebind();
            else if (window.modalPlanner) window.modalPlanner.rebind();

            if (window.reviewManager) window.reviewManager.rebind();


        } catch (error) {
            console.error('Error loading modal components:', error);
        }
    }

    // Cache modal-specific DOM elements
    cacheModalElements() {
        this.modalBackdrop = document.getElementById('dual-backdrop');
        this.placeCloseBtn = document.getElementById('place-modal-close');
        this.compCloseBtn = document.getElementById('comparison-modal-close');
        this.compBottomCloseBtn = document.getElementById('comparison-close-bottom');

        // Comparison Elements (Recommendations only)
        this.compRecommendList = document.getElementById('comp-recommend-list');
    }


    // Check URL parameters for direct place access or notification-triggered review access
    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const id = parseInt(params.get('id'));
        const placeId = parseInt(params.get('placeId'));
        const reviewId = params.get('reviewId');

        if (placeId && reviewId) {
            // Notification click: open modal and scroll to specific review
            setTimeout(() => {
                this.openPlaceModal(placeId);
                // Wait for modal to open and reviews to load, then scroll to review
                setTimeout(() => {
                    const reviewElement = document.getElementById(`review-${reviewId}`);
                    if (reviewElement) {
                        reviewElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Highlight the review briefly
                        reviewElement.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
                        reviewElement.style.border = '2px solid rgba(212, 175, 55, 0.5)';
                        setTimeout(() => {
                            reviewElement.style.backgroundColor = '';
                            reviewElement.style.border = '';
                        }, 3000);
                    }
                }, 1500);
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 500);
        } else if (id) {
            // Direct place access: open modal normally
            setTimeout(() => {
                this.openPlaceModal(id);
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
            const place = {
                ...data,
                id: parseInt(data.id) || data.id
            };
            this.places.push(place);
        });

        // 리뷰 통계 로드 및 장소 데이터에 추가
        await this.loadReviewStats();

        // Debugging Data
        if (this.places.length > 0) {
            console.log("First place data sample:", this.places[0]);
            console.log("Checking district field on sample:", this.places[0].district);
            console.log("Checking address field on sample:", this.places[0].address);
            console.log("Review stats sample:", this.places[0].reviewStats);
        }

        this.filteredPlaces = [...this.places];
        this.renderCategoryFilters();
        this.renderDistrictFilters();
        this.renderPlaces();
        console.log(`Loaded ${this.places.length} places from Firestore.`);
        this.checkUrlParams();
        // [추가] 지도(SeoulMap)에 데이터 전달 (지도 화면이 있는 경우)
        if (window.SeoulMap && typeof window.SeoulMap.updatePlaceData === 'function') {
            window.SeoulMap.updatePlaceData(this.places);
        }
    }

    // Firestore에서 리뷰 통계 로드
    async loadReviewStats() {
        try {
            // 모든 리뷰를 한 번에 가져와서 장소별로 집계
            const reviewsSnapshot = await db.collection('reviews').get();

            // 장소별 리뷰 통계 계산
            const statsMap = new Map(); // placeId -> { totalRating, count }

            reviewsSnapshot.forEach(doc => {
                const review = doc.data();
                const placeId = review.placeId;
                const rating = review.rating || 0;

                if (!statsMap.has(placeId)) {
                    statsMap.set(placeId, { totalRating: 0, count: 0 });
                }

                const stat = statsMap.get(placeId);
                stat.totalRating += rating;
                stat.count += 1;
            });

            // 각 장소에 리뷰 통계 추가
            this.places.forEach(place => {
                // placeId가 숫자 또는 문자열일 수 있으므로 둘 다 확인
                const numericId = Number(place.id);
                const stringId = String(place.id);

                let stat = statsMap.get(numericId) || statsMap.get(stringId);

                if (stat && stat.count > 0) {
                    const avgRating = (stat.totalRating / stat.count).toFixed(1);
                    place.reviewStats = {
                        rating: parseFloat(avgRating),
                        reviewCount: stat.count
                    };
                    // 기존 stats 객체가 있으면 병합, 없으면 생성
                    if (!place.stats) place.stats = {};
                    place.stats.rating = parseFloat(avgRating);
                    place.stats.reviewCount = stat.count;
                } else {
                    place.reviewStats = { rating: 0, reviewCount: 0 };
                    if (!place.stats) place.stats = {};
                    place.stats.rating = place.stats.rating || 0;
                    place.stats.reviewCount = 0;
                }
            });

            console.log(`[loadReviewStats] Processed ${reviewsSnapshot.size} reviews for ${statsMap.size} places`);

        } catch (error) {
            console.error('[loadReviewStats] Error loading review stats:', error);
        }
    }

    // 자주 사용하는 DOM 요소를 변수에 저장하여 성능 최적화
    cacheDOMElements() {
        // 메인 섹션 요소
        this.main = document.querySelector('.main');
        this.searchInput = document.querySelector('.search-box__input'); // 검색 입력창
        this.placesGrid = document.querySelector('.places-grid'); // 장소 목록 그리드 컨테이너

        // Filter Elements (Updated Selectors for New Design)
        this.categoryContainer = document.getElementById('category-filters');

        // District Dropdown
        this.districtSelect = document.getElementById('district-select');
        this.districtTrigger = document.getElementById('district-trigger');
        this.districtOptions = document.getElementById('district-options');

        this.congestionBtns = document.querySelectorAll('#congestion-filters .segment-btn');
        this.sortBtns = document.querySelectorAll('#sort-filters .sort-btn');

        // 헤더
        this.header = document.querySelector('.header');
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

        // --- New Filter Events ---

        // 1. Region Dropdown Toggle
        if (this.districtTrigger) {
            this.districtTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.districtSelect.classList.toggle('active');
            });
        }

        // Close dropdown when clicking outside
        window.addEventListener('click', (e) => {
            if (this.districtSelect && !this.districtSelect.contains(e.target)) {
                this.districtSelect.classList.remove('active');
            }
        });

        // 2. Congestion Filter (Segment Control)
        if (this.congestionBtns) {
            this.congestionBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.congestionBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentCongestion = btn.dataset.congestion;
                    this.filterPlaces();
                });
            });
        }

        // 3. Sort Filter (Text Buttons)
        if (this.sortBtns) {
            this.sortBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.sortBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentSort = btn.dataset.sort;
                    this.filterPlaces();
                });
            });
        }

        // 스크롤 이벤트 (헤더 스타일 변경 및 요소 등장 효과)
        window.addEventListener('scroll', () => this.handleScroll());

        // 모달 닫기 이벤트
        const closeModals = () => this.closePlaceModal();

        if (this.modalCloseBtn) this.modalCloseBtn.addEventListener('click', closeModals); // Place close
        if (this.placeCloseBtn) this.placeCloseBtn.addEventListener('click', closeModals); // Alias for place close
        if (this.compCloseBtn) this.compCloseBtn.addEventListener('click', closeModals);   // Comp close
        if (this.compBottomCloseBtn) this.compBottomCloseBtn.addEventListener('click', closeModals); // Bottom close

        if (this.modalBackdrop) {
            this.modalBackdrop.addEventListener('click', (e) => {
                // 배경 클릭 시 닫기 (배경 자체 or backdrop wrapper)
                if (e.target === this.modalBackdrop || e.target.id === 'dual-backdrop') {
                    closeModals();
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
            const revealPoint = 50; // 요소가 화면 하단에서 50px 올라왔을 때 (150px -> 50px로 완화하여 초기 노출 증대)

            if (elementTop < windowHeight - revealPoint) {
                el.classList.add('revealed');
            }
        });
    }

    // 장소 필터링 로직
    filterPlaces() {
        const query = this.searchQuery.replace('#', '').trim(); // 검색어

        this.filteredPlaces = this.places.filter(place => {
            // 1. 카테고리 일치 여부
            const categoryMatch = this.currentCategory === "전체" ||
                place.category === this.currentCategory;

            // 2. 지역 일치 여부
            const placeDistrict = this.extractDistrict(place);
            const districtMatch = this.currentDistrict === "전체" ||
                placeDistrict === this.currentDistrict;

            // 3. 혼잡도 일치 여부
            const placeLevel = place.congestion ? (place.congestion.level || place.congestion) : 'normal';
            // Simple mapping if needed, assuming direct value match for now
            const congestionMatch = this.currentCongestion === "all" ||
                placeLevel === this.currentCongestion;

            // 4. 검색어 포함 여부 (이름, 설명, 태그, 주소[Deep Search])
            const address = this.extractAddress(place);
            const searchMatch = !query ||
                (place.name && place.name.toLowerCase().includes(query)) ||
                (place.description && place.description.toLowerCase().includes(query)) ||
                (address && address.toLowerCase().includes(query)) ||
                (place.tags && place.tags.some(tag => tag.toLowerCase().includes(query)));

            return categoryMatch && districtMatch && congestionMatch && searchMatch;
        });

        // 필터링 적용 시 페이지 1로 리셋
        this.currentPage = 1;

        // 5. 정렬 Logic
        this.sortPlaces();

        this.renderPlaces(); // 필터링 결과 렌더링
    }

    // 정렬 함수
    sortPlaces() {
        if (this.currentSort === 'recommended') {
            // Custom Recommendation Score
            // Priority: High Rating > Quiet > Normal > Crowded
            this.filteredPlaces.sort((a, b) => {
                const getScore = (p) => {
                    let score = 0;
                    const rating = p.stats ? p.stats.rating : (p.rating || 0);
                    score += rating * 20; // 5.0 -> 100

                    const lvl = p.congestion ? (p.congestion.level || p.congestion) : 'normal';
                    if (lvl === 'quiet') score += 15;
                    else if (lvl === 'normal') score += 5;
                    // crowded = 0

                    return score;
                };
                return getScore(b) - getScore(a);
            });
        } else if (this.currentSort === 'rating') {
            this.filteredPlaces.sort((a, b) => {
                const ratingA = a.stats ? a.stats.rating : (a.rating || 0);
                const ratingB = b.stats ? b.stats.rating : (b.rating || 0);
                return ratingB - ratingA; // Descending
            });
        } else if (this.currentSort === 'reviews') {
            this.filteredPlaces.sort((a, b) => {
                const reviewsA = a.stats ? a.stats.reviewCount : 0;
                const reviewsB = b.stats ? b.stats.reviewCount : 0;
                return reviewsB - reviewsA; // Descending
            });
        }
    }

    // [New] 주소 추출 Helper (검색 및 구 추출용)
    extractAddress(place) {
        if (place.address) return place.address;

        let addressVal = null;

        // Check nested by ID
        const idKey = place.id;
        const nestedById = place[idKey] || place[String(idKey)];
        if (nestedById && nestedById.address) {
            return nestedById.address;
        }

        // Check nested by Name
        if (place.name && place[place.name] && place[place.name].address) {
            return place[place.name].address;
        }

        // Fallback: Scan all properties
        for (const key in place) {
            if (place[key] && typeof place[key] === 'object' && place[key].address) {
                return place[key].address;
            }
        }

        return "";
    }

    // 주소에서 구 추출 Helper
    extractDistrict(place) {
        // 1. Try to find the district directly first
        if (place.district) return place.district;

        // 2. Use helper to find address
        const addressVal = this.extractAddress(place);

        if (!addressVal) {
            return "기타";
        }

        // '서울 종로구 ...', '경기도 ...', '강남구 ...'
        const match = addressVal.match(/([가-힣]+구)/);

        if (match) {
            return match[1];
        }

        return "기타";
    }

    // 카테고리 필터 버튼 동적 생성 (New Chips Style)
    renderCategoryFilters() {
        const filterContainer = document.getElementById('category-filters');
        if (!filterContainer) return;

        // 1. 카테고리 추출
        const uniqueCategories = new Set(['전체']);
        this.places.forEach(place => {
            if (place.category) uniqueCategories.add(place.category);
        });

        // 2. HTML 생성 (Using .category-chip)
        filterContainer.innerHTML = Array.from(uniqueCategories).map(category => {
            const isActive = category === this.currentCategory;
            return `<button class="category-chip ${isActive ? 'active' : ''}" data-category="${category}">${category}</button>`;
        }).join('');

        // 3. 이번트 리스너
        const chips = filterContainer.querySelectorAll('.category-chip');
        chips.forEach(btn => {
            btn.addEventListener('click', () => {
                chips.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.currentCategory = btn.dataset.category;
                this.filterPlaces();
            });
        });
    }

    // 지역(구) 필터 (Custom Select Options)
    renderDistrictFilters() {
        const optionsContainer = document.getElementById('district-options');
        if (!optionsContainer) return;

        // 1. 데이터 추출
        const districts = new Set(['전체']); // Use '전체' as value, trigger displays '전체 지역'
        this.places.forEach(place => {
            const gu = this.extractDistrict(place);
            if (gu && gu !== "기타") districts.add(gu);
        });

        const sortedDistricts = Array.from(districts).filter(d => d !== "전체").sort();
        const displayList = ["전체", ...sortedDistricts];

        // 2. HTML 생성
        optionsContainer.innerHTML = displayList.map(district => {
            const label = district === "전체" ? "전체 지역" : district;
            return `<div class="select-option" data-value="${district}">${label}</div>`;
        }).join('');

        // 3. 이벤트 리스너
        optionsContainer.querySelectorAll('.select-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent closing immediately if needed, but here we want to close
                const value = opt.dataset.value;
                const label = opt.textContent;

                // Update Trigger Text
                if (this.districtTrigger) this.districtTrigger.textContent = label;

                // Update State
                this.currentDistrict = value;

                // Close Dropdown
                this.districtSelect.classList.remove('active');

                // Filter
                this.filterPlaces();
            });
        });
    }

    // renderMoodFilters Removed

    // 장소 카드 렌더링 (Pagination / Load More Logic)
    renderPlaces() {
        if (!this.placesGrid) return;

        // 검색 결과가 없을 때
        if (this.filteredPlaces.length === 0) {
            this.placesGrid.innerHTML = `
        <div class="places-empty" style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
          <p style="font-size: 1.25rem; color: var(--color-gray);">검색 결과가 없습니다.</p>
          <p style="color: var(--color-gray-light); margin-top: 0.5rem;">다른 키워드나 필터를 선택해보세요.</p>
        </div>
      `;
            this.renderPaginationControls(0); // Hide controls
            return;
        }

        // Calculate items to show
        // Calculate items to show
        let displayItems = [];
        // Always use Pagination Mode logic as requested
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        displayItems = this.filteredPlaces.slice(start, end);

        // 카드 HTML 생성
        this.placesGrid.innerHTML = displayItems.map((place, index) => `
      <article class="card place-card reveal" style="animation-delay: ${index * 0.05}s" data-id="${place.id}">
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

        // Render Pagination Controls
        this.renderPaginationControls(this.filteredPlaces.length);
    }

    // 페이지네이션 컨트롤 렌더링
    renderPaginationControls(totalItems) {
        let paginationContainer = document.getElementById('pagination-controls');

        // 없으면 생성
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'pagination-controls';
            paginationContainer.className = 'pagination';
            // placesGrid 다음에 삽입 (grid가 끝난 후)
            this.placesGrid.parentNode.insertBefore(paginationContainer, this.placesGrid.nextSibling);
        }

        if (totalItems <= this.itemsPerPage) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);

        // 페이지 버튼 생성 로직
        let html = '';

        // Prev Button
        if (this.currentPage > 1) {
            html += `<button class="page-btn prev" onclick="window.app.changePage(${this.currentPage - 1})">이전</button>`;
        }

        // Page Numbers (Simple range for now)
        for (let i = 1; i <= totalPages; i++) {
            if (i === this.currentPage) {
                html += `<button class="page-btn active">${i}</button>`;
            } else {
                html += `<button class="page-btn" onclick="window.app.changePage(${i})">${i}</button>`;
            }
        }

        // Next Button
        if (this.currentPage < totalPages) {
            html += `<button class="page-btn next" onclick="window.app.changePage(${this.currentPage + 1})">다음</button>`;
        }

        paginationContainer.innerHTML = html;
    }

    changePage(page) {
        this.currentPage = page;
        this.renderPlaces();
        // 스크롤을 목록 상단으로 이동
        const offset = this.placesGrid.offsetTop - 120;
        window.scrollTo({ top: offset, behavior: 'smooth' });
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

    toggleSave(id, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const numericId = Number(id);
        const index = this.savedPlaces.findIndex(sId => Number(sId) === numericId);
        const isNowSaving = index === -1;

        if (!isNowSaving) {
            this.savedPlaces.splice(index, 1); // 저장 취소
        } else {
            this.savedPlaces.push(numericId); // 저장
        }

        this.savePlaces(); // 로컬 스토리지 업데이트

        // UI 즉시 업데이트
        this.updateBookmarkButtons(numericId);

        // 토스트 알림 표시
        this.showToast(isNowSaving ? '저장 목록에 추가했습니다.' : '저장 목록에서 제거했습니다.');
    }

    /**
     * 화면상의 모든 북마크 버튼 상태를 현재 savedPlaces 데이터에 맞춰 동기화
     * @param {number} targetId 특정 ID만 업데이트하고 싶을 때 사용 (선택 사항)
     */
    updateBookmarkButtons(targetId = null) {
        const buttons = document.querySelectorAll('.place-card__save');
        const modalBtn = document.getElementById('btn-bookmark');

        const updateBtn = (btn, id) => {
            const isSaved = this.isSaved(id);
            const svg = btn.querySelector('svg');

            if (isSaved) {
                btn.classList.add('saved');
                if (svg) svg.setAttribute('fill', 'currentColor');
            } else {
                btn.classList.remove('saved');
                if (svg) svg.setAttribute('fill', 'none');
            }
        };

        // 리스트 카드 버튼들 업데이트
        buttons.forEach(btn => {
            const card = btn.closest('.place-card');
            const id = card ? Number(card.dataset.id) : Number(btn.dataset.id);
            if (id && (!targetId || id === targetId)) {
                updateBtn(btn, id);
            }
        });

        // 상세 모달 버튼 업데이트
        if (modalBtn) {
            const id = Number(modalBtn.dataset.id);
            if (id && (!targetId || id === targetId)) {
                updateBtn(modalBtn, id);
            }
        }
    }

    // 저장 여부 확인
    isSaved(id) {
        return this.savedPlaces.some(sId => Number(sId) === Number(id));
    }

    // 로컬 스토리지에서 저장된 장소 불러오기
    loadSavedPlaces() {
        try {
            const saved = JSON.parse(localStorage.getItem('teumsae_saved')) || [];
            return saved.map(id => Number(id)); // 숫자로 정규화하여 로드
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
        // [변경] 타입 유연성 확보 (== 사용)
        const place = this.places.find(p => p.id == id);
        if (!place) return;

        // 모달 데이터 채우기
        document.getElementById('modal-hero-image').src = place.images[0];
        document.getElementById('modal-category').textContent = place.category;
        document.getElementById('modal-title').textContent = place.name;

        // 주소 데이터 확보를 위한 다각도 탐색
        let addressVal = place.address;

        if (!addressVal) {
            // 1. ID를 키로 하는 하위 객체 확인 (사용자 힌트 반영)
            const idKey = place.id;
            const nested = place[idKey] || place[String(idKey)];
            if (nested && nested.address) {
                addressVal = nested.address;
            }
            // 2. 장소 이름을 키로 하는 하위 객체 확인
            else if (place[place.name] && place[place.name].address) {
                addressVal = place[place.name].address;
            }
            // 3. 모든 속성을 순회하며 address 필드를 가진 하위 객체 찾기
            else {
                for (const key in place) {
                    if (place[key] && typeof place[key] === 'object' && place[key].address) {
                        addressVal = place[key].address;
                        break;
                    }
                }
            }
        }

        document.getElementById('modal-address').textContent = addressVal || '주소 정보 없음';

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

        // 비교 페이지 업데이트 Logic
        this.updateComparison(place);

        // 모달 표시
        if (this.modalBackdrop) {
            this.modalBackdrop.classList.add('active');
            document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
            document.documentElement.style.overflow = 'hidden';
            // 모달 내부 스크롤 시 배경 스크롤 전파 방지
            this.modalBackdrop.addEventListener('wheel', this.preventScroll, { passive: false });
            this.modalBackdrop.addEventListener('touchmove', this.preventScroll, { passive: false });
        }

        // 리뷰 데이터 로드
        if (this.reviewManager) {
            this.reviewManager.loadForPlace(id);
        }

        // 플래너 사이드바 업데이트
        if (this.modalPlanner) {
            this.modalPlanner.updateForPlace(place);
        }

        // 즐겨찾기(save) 버튼 연동 - 최하단에서 클래스만 제어 (안정성 최우선)
        const bookmarkBtn = document.getElementById('btn-bookmark');
        if (bookmarkBtn) {
            bookmarkBtn.dataset.id = place.id;
            const isSaved = this.isSaved(place.id);

            // SVG 조작 없이 클래스만 교체 (CSS에서 배경 이미지 제어)
            if (isSaved) {
                bookmarkBtn.classList.add('saved');
            } else {
                bookmarkBtn.classList.remove('saved');
            }

            bookmarkBtn.onclick = (e) => {
                this.toggleSave(place.id, e);
                // toggleSave가 전역적으로 .saved 클래스를 업데이트하므로 별도 처리 최소화
            };
        }

        // 지도로 보기 버튼 연동
        const viewMapBtn = document.getElementById('btn-view-map');
        if (viewMapBtn) {
            viewMapBtn.onclick = () => {
                this.closePlaceModal(); // 모달 닫기
                if (typeof toggleMap === 'function') {
                    // [수정됨] place.id를 전달하여 해당 장소로 자동 이동
                    toggleMap(place.id);
                } else {
                    alert('지도가 이미 열려있습니다.');
                }
            };
        }
    }

    // 비교 데이터 업데이트
    updateComparison(place) {
        if (!this.compRecommendList) return;

        // Find Recommendations
        // Filter: Same category, not same ID
        const candidates = this.places.filter(p => p.category === place.category && p.id !== place.id);

        // Sort by "Better" criteria: Higher Rating, then Lower Congestion
        // Congestion Priority: Quiet > Normal > Crowded
        const congestionScore = (c) => {
            const lvl = c.congestion ? (c.congestion.level || c.congestion) : 'normal';
            if (lvl === 'quiet') return 3;
            if (lvl === 'normal') return 2;
            return 1;
        }

        candidates.sort((a, b) => {
            const scoreA = congestionScore(a);
            const scoreB = congestionScore(b);
            if (scoreA !== scoreB) return scoreB - scoreA; // Valid descending

            const ratingA = a.stats ? a.stats.rating : (a.rating || 0);
            const ratingB = b.stats ? b.stats.rating : (b.rating || 0);
            return ratingB - ratingA;
        });

        const recommendations = candidates.slice(0, 5); // Top 5

        // Render List
        if (recommendations.length === 0) {
            this.compRecommendList.innerHTML = `<div class="comp-loading"><p>비슷한 조건의 추천 장소가 없습니다.</p></div>`;
        } else {
            this.compRecommendList.innerHTML = recommendations.map(rec => {
                const recLevel = rec.congestion ? (rec.congestion.level || rec.congestion) : 'normal';

                // Determine chips
                const chips = [];
                if (recLevel === 'quiet') chips.push('<span class="comp-chip better">쾌적함</span>');
                const recRating = rec.stats ? rec.stats.rating : (rec.rating || 0);
                const currentRating = place.stats ? place.stats.rating : (place.rating || 0);
                if (recRating > currentRating) chips.push('<span class="comp-chip better">평점 높음</span>');

                const recReviewCount = rec.stats ? rec.stats.reviewCount : (rec.reviewCount || 0);

                return `
                <div class="comp-item" onclick="window.app.openPlaceModal(${rec.id})">
                    <img src="${rec.images[0]}" class="comp-item__thumb" alt="${rec.name}">
                    <div class="comp-item__info">
                        <div class="comp-item__header">
                            <div class="comp-item__name">${rec.name}</div>
                            <div class="comp-item__chips">${chips.join('')}</div>
                        </div>
                        <div class="comp-item__meta">
                            <span>★ ${recRating}</span>
                            <span class="divider">|</span>
                            <span>리뷰 ${recReviewCount}개</span>
                            <span class="divider">|</span>
                            <span>${this.getCongestionText(recLevel)}</span>
                        </div>
                        <p class="comp-item__desc">${rec.shortDesc || ''}</p>
                    </div>
                </div>
            `}).join('');
        }
    }

    // 스크롤 이벤트 전파 방지 핸들러
    preventScroll(e) {
        // 모달 콘텐츠 내부가 아니면 스크롤 차단
        // Allow scroll in both modals
        const scrollable = e.target.closest('.place-modal__content, .comparison-body');
        if (!scrollable) {
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
