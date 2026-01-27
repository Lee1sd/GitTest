// 틈새 - 여행 일정 관리 로직
class PlannerPage {
    constructor() {
        this.savedPlaces = this.loadSavedIds(); // Load IDs from Storage
        this.timeline = this.loadTimeline();
        this.places = []; // Will be populated from Firestore or Fallback

        // DOM needs to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        this.cacheDOMElements();
        this.setDefaultDate();

        // 초기 수동 렌더링 (데이터 로딩 전이라도 빈 화면이나 로컬 ID 기반 틀 표시)
        this.renderSavedPlaces();
        this.renderTimeline();

        // Load Data asynchronously
        await this.fetchAllPlaces();

        // 데이터 로딩 완료 후 실제 내용으로 다시 렌더링
        this.renderSavedPlaces();
        this.renderTimeline();

        this.bindEvents();
        this.initRevealAnimations();
    }

    // Fetch places from Firestore
    async fetchAllPlaces() {
        if (typeof db !== 'undefined') {
            try {
                const snapshot = await db.collection('places').get();
                if (!snapshot.empty) {
                    this.places = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            ...data,
                            // Firestore 내부의 id 필드(숫자)를 실제 ID로 사용 (다른 페이지와 통일)
                            id: parseInt(data.id) || data.id
                        };
                    });
                    console.log('Planner loaded places from Firestore:', this.places.length);
                    return;
                }
            } catch (error) {
                console.error('Planner Firestore Error:', error);
            }
        }

        console.error('Planner failing: Database not available or empty');
        this.places = [];
    }

    // DOM 요소 캐싱 (Updated ID selectors if needed, currently reusing existing)
    cacheDOMElements() {
        this.savedList = document.getElementById('saved-list');
        this.emptySaved = document.getElementById('empty-saved');
        this.timelineItems = document.getElementById('timeline-items');
        this.timelineEmpty = document.getElementById('timeline-empty');
        this.timelineActions = document.getElementById('timeline-actions');
        this.dateInput = document.getElementById('travel-date');
        this.savePlanBtn = document.getElementById('save-plan');
        this.sharePlanBtn = document.getElementById('share-plan');
        this.clearPlanBtn = document.getElementById('clear-plan');
    }

    setDefaultDate() {
        // If we have a saved date in the plan, use it. Otherwise today.
        // But logic here was forcing today. Let's check plan first.
        const planDate = this.loadPlanData().date;
        if (planDate) {
            this.dateInput.value = planDate;
            return;
        }

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        this.dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    bindEvents() {
        // 저장된 장소 클릭/드래그
        if (this.savedList) {
            this.savedList.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-icon');
                if (btn) return; // Ignore delete button clicks here

                const item = e.target.closest('.planner__saved-item');
                if (item) {
                    const id = item.dataset.id; // String ID
                    this.addToTimeline(id);
                }
            });

            // Drag & Drop
            this.savedList.addEventListener('dragstart', (e) => {
                const item = e.target.closest('.planner__saved-item');
                if (item) {
                    e.dataTransfer.setData('text/plain', item.dataset.id);
                    item.classList.add('dragging');
                }
            });
            this.savedList.addEventListener('dragend', (e) => {
                const item = e.target.closest('.planner__saved-item');
                if (item) item.classList.remove('dragging');
            });
        }

        // Timeline Drag Over/Drop
        if (this.timelineItems) {
            this.timelineItems.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.timelineItems.style.background = 'rgba(255,255,255,0.05)';
            });
            this.timelineItems.addEventListener('dragleave', () => {
                this.timelineItems.style.background = '';
            });
            this.timelineItems.addEventListener('drop', (e) => {
                e.preventDefault();
                this.timelineItems.style.background = '';
                const id = e.dataTransfer.getData('text/plain');
                if (id) this.addToTimeline(id);
            });
        }

        if (this.savePlanBtn) this.savePlanBtn.addEventListener('click', () => this.savePlan());
        if (this.sharePlanBtn) this.sharePlanBtn.addEventListener('click', () => this.sharePlan());
        if (this.clearPlanBtn) this.clearPlanBtn.addEventListener('click', () => this.clearPlan());
        if (this.dateInput) this.dateInput.addEventListener('change', () => this.savePlan()); // Auto-save on date change
    }

    // --- Rendering ---

    renderSavedPlaces() {
        if (!this.savedList) return;

        // 1. 매칭된 데이터 준비
        const savedPlacesData = this.savedPlaces
            .map(id => this.places.find(p => String(p.id) === String(id)))
            .filter(Boolean);

        // 2. 상태 결정 로직
        const isLoading = this.places.length === 0 && this.savedPlaces.length > 0;
        const hasNoValidData = savedPlacesData.length === 0;

        // 3. UI 가시성 조절
        if (isLoading) {
            // 데이터 로딩 중
            this.savedList.style.display = 'block';
            this.savedList.innerHTML = '<div style="padding: 2rem; color: var(--color-gray); text-align: center;">장소 정보를 불러오는 중...</div>';
            if (this.emptySaved) this.emptySaved.style.display = 'none';
            return;
        }

        if (hasNoValidData) {
            // 저장된 장소가 아예 없거나, ID는 있지만 매칭되는 데이터가 없는 경우 (Stale ID 등)
            this.savedList.style.display = 'none';
            if (this.emptySaved) this.emptySaved.style.display = 'block';
            return;
        }

        // 4. 리스트 렌더링
        this.savedList.style.display = 'flex';
        if (this.emptySaved) this.emptySaved.style.display = 'none';

        this.savedList.innerHTML = savedPlacesData.map(place => `
          <div class="planner__saved-item" data-id="${place.id}" draggable="true">
            <img src="${place.images ? place.images[0] : ''}" alt="${place.name}" class="planner__saved-image">
            <div class="planner__saved-info">
              <p class="planner__saved-name">${place.name}</p>
              <p class="planner__saved-category">${place.category}</p>
            </div>
            <button class="btn-icon" style="width: 32px; height: 32px; flex-shrink: 0;" 
                    onclick="planner.removeFromSaved('${place.id}', event)" 
                    title="저장 목록에서 제거">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        `).join('');
    }

    renderTimeline() {
        if (!this.timelineItems) return;

        if (this.timeline.length === 0) {
            this.timelineItems.innerHTML = '';
            if (this.timelineEmpty) this.timelineEmpty.style.display = 'block';
            if (this.timelineActions) this.timelineActions.style.display = 'none';
            return;
        }

        if (this.timelineEmpty) this.timelineEmpty.style.display = 'none';
        if (this.timelineActions) this.timelineActions.style.display = 'flex';

        this.timeline.sort((a, b) => a.time.localeCompare(b.time));

        this.timelineItems.innerHTML = this.timeline.map((item, index) => {
            const place = this.places.find(p => String(p.id) === String(item.placeId));
            if (!place) return '';

            return `
            <div class="planner__timeline-item" data-index="${index}">
              <div class="planner__timeline-time">
                <input type="time" value="${item.time}" 
                       onchange="planner.updateTime(${index}, this.value)"
                       style="border: none; background: transparent; font-weight: 600; color: var(--color-accent); font-size: inherit; font-family: inherit; cursor: pointer;">
              </div>
              <div class="planner__timeline-place">
                <img src="${place.images ? place.images[0] : ''}" alt="${place.name}" class="planner__timeline-image">
                <div class="planner__timeline-info">
                  <h4>${place.name}</h4>
                  <p>${place.shortDesc || place.category}</p>
                </div>
                <button class="btn-icon" style="width: 36px; height: 36px; flex-shrink: 0; margin-left: auto;" 
                        onclick="planner.removeFromTimeline(${index})" 
                        title="일정에서 제거">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          `;
        }).join('');
    }

    // --- Actions ---

    addToTimeline(id) {
        if (this.timeline.some(item => String(item.placeId) === String(id))) {
            this.showToast('이미 일정에 추가된 장소입니다.');
            return;
        }

        const lastTime = this.timeline.length > 0
            ? this.timeline[this.timeline.length - 1].time
            : '09:00';

        let [hh, mm] = lastTime.split(':').map(Number);
        hh = (hh + 2) % 24;
        const nextTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

        this.timeline.push({
            placeId: String(id), // Ensure string
            time: this.timeline.length === 0 ? '10:00' : nextTime
        });

        this.savePlan(); // Auto-save on add
        this.renderTimeline();
        this.showToast('일정에 추가했습니다!');
    }

    removeFromTimeline(index) {
        this.timeline.splice(index, 1);
        this.savePlan(); // Auto-save on remove
        this.renderTimeline();
        this.showToast('일정에서 제거했습니다.');
    }

    updateTime(index, time) {
        this.timeline[index].time = time;
        this.savePlan();
        // this.renderTimeline(); // Re-render might lose focus, so maybe just update data
        // But re-sorting requires re-render.
        this.showToast('시간이 변경되었습니다.');
    }

    removeFromSaved(id, event) {
        if (event) event.stopPropagation();

        const index = this.savedPlaces.findIndex(sid => String(sid) === String(id));
        if (index > -1) {
            this.savedPlaces.splice(index, 1);
            localStorage.setItem('teumsae_saved', JSON.stringify(this.savedPlaces));
            this.renderSavedPlaces();
            this.showToast('저장 목록에서 제거했습니다.');
        }
    }

    // --- Data Management ---

    savePlan() {
        const planData = {
            date: this.dateInput ? this.dateInput.value : new Date().toISOString().split('T')[0],
            timeline: this.timeline,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('teumsae_plan', JSON.stringify(planData));
        // console.log('Plan saved:', planData);
    }

    clearPlan() {
        if (this.timeline.length === 0) return;
        if (confirm('정말 일정을 초기화하시겠습니까?')) {
            this.timeline = [];
            this.savePlan();
            this.renderTimeline();
            this.showToast('일정이 초기화되었습니다.');
        }
    }

    sharePlan() {
        if (this.timeline.length === 0) {
            this.showToast('공유할 일정이 없습니다.');
            return;
        }

        const date = this.dateInput.value;
        const placesText = this.timeline.map(item => {
            const place = this.places.find(p => String(p.id) === String(item.placeId));
            return place ? `${item.time} - ${place.name}` : '';
        }).filter(Boolean).join('\n');

        const shareText = `🌿 틈새 여행 일정\n📅 ${date}\n\n${placesText}\n\n틈새에서 만든 나만의 서울 여행 코스입니다.`;

        if (navigator.share) {
            navigator.share({
                title: '틈새 여행 일정',
                text: shareText
            }).catch(() => this.copyToClipboard(shareText));
        } else {
            this.copyToClipboard(shareText);
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('일정이 클립보드에 복사되었습니다!');
        }).catch(() => {
            this.showToast('복사 실패');
        });
    }

    // Helpers
    loadSavedIds() {
        try { return JSON.parse(localStorage.getItem('teumsae_saved')) || []; }
        catch { return []; }
    }

    loadPlanData() {
        try { return JSON.parse(localStorage.getItem('teumsae_plan')) || {}; }
        catch { return {}; }
    }

    loadTimeline() {
        const data = this.loadPlanData();
        return data.timeline || [];
    }

    showToast(message) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = message;
        toast.style.cssText = `
          position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(100px);
          background: var(--color-dark); color: white; padding: 1rem 2rem; border-radius: 50px;
          font-size: 0.875rem; z-index: 1000; transition: transform 0.3s ease; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.style.transform = 'translateX(-50%) translateY(0)', 10);
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    initRevealAnimations() {
        // Simple shim if animations.css handles classes, just triggering intersection observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('revealed');
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => observer.observe(el));
    }

    initDragAndDrop() { /* ... kept simple in bindEvents for now ... */ }
}

// Global Init
let planner;
document.addEventListener('DOMContentLoaded', () => {
    planner = new PlannerPage();
});
