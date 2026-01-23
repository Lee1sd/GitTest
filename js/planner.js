// 틈새 - 여행 일정 관리 로직
// PlannerPage: 나만의 여행 일정을 생성하고 관리하는 기능을 담당하는 클래스
class PlannerPage {
    constructor() {
        this.savedPlaces = this.loadSavedPlaces(); // 저장된 장소 목록 로드
        this.timeline = this.loadTimeline(); // 타임라인(일정) 로드
        this.places = placesData; // 전체 장소 데이터 참조

        this.init();
    }

    // 초기화 메서드
    init() {
        this.cacheDOMElements(); // DOM 요소 캐싱
        this.setDefaultDate(); // 여행 날짜 기본값 설정 (오늘)
        this.renderSavedPlaces(); // 저장된 장소 목록 렌더링
        this.renderTimeline(); // 타임라인 렌더링
        this.bindEvents(); // 이벤트 바인딩
        this.initRevealAnimations(); // 애니메이션 초기화
    }

    // DOM 요소 캐싱
    cacheDOMElements() {
        this.savedList = document.getElementById('saved-list'); // 저장된 장소 리스트 컨테이너
        this.emptySaved = document.getElementById('empty-saved'); // 저장된 장소가 없을 때 표시할 요소
        this.timelineItems = document.getElementById('timeline-items'); // 타임라인 아이템 컨테이너
        this.timelineEmpty = document.getElementById('timeline-empty'); // 타임라인이 비었을 때 표시할 요소
        this.timelineActions = document.getElementById('timeline-actions'); // 타임라인 하단 액션 버튼 그룹
        this.dateInput = document.getElementById('travel-date'); // 여행 날짜 입력 필드
        this.savePlanBtn = document.getElementById('save-plan'); // 일정 저장 버튼
        this.sharePlanBtn = document.getElementById('share-plan'); // 일정 공유 버튼
        this.clearPlanBtn = document.getElementById('clear-plan'); // 일정 초기화 버튼
    }

    // 여행 날짜 기본값을 오늘로 설정
    setDefaultDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        this.dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // 이벤트 리스너 설정
    bindEvents() {
        // 저장된 장소 클릭 시 타임라인에 추가
        this.savedList.addEventListener('click', (e) => {
            const item = e.target.closest('.planner__saved-item');
            if (item) {
                const id = parseInt(item.dataset.id);
                this.addToTimeline(id);
            }
        });

        // 드래그 앤 드롭 기능 초기화
        this.initDragAndDrop();

        // 일정 저장 버튼 이벤트
        this.savePlanBtn.addEventListener('click', () => this.savePlan());

        // 일정 공유 버튼 이벤트
        this.sharePlanBtn.addEventListener('click', () => this.sharePlan());

        // 일정 초기화 버튼 이벤트
        this.clearPlanBtn.addEventListener('click', () => this.clearPlan());
    }

    // 드래그 앤 드롭 기능 초기화
    initDragAndDrop() {
        // 저장된 아이템을 드래그 시작할 때
        this.savedList.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.planner__saved-item');
            if (item) {
                e.dataTransfer.setData('text/plain', item.dataset.id);
                item.classList.add('dragging'); // 스타일 변경
            }
        });

        // 드래그 종료 시
        this.savedList.addEventListener('dragend', (e) => {
            const item = e.target.closest('.planner__saved-item');
            if (item) {
                item.classList.remove('dragging');
            }
        });

        // 타임라인 영역 위로 드래그 중일 때 (드롭 허용)
        this.timelineItems.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.timelineItems.style.background = 'var(--color-secondary-light)'; // 시각적 피드백
        });

        // 타임라인 영역을 벗어났을 때
        this.timelineItems.addEventListener('dragleave', () => {
            this.timelineItems.style.background = '';
        });

        // 타임라인에 드롭했을 때
        this.timelineItems.addEventListener('drop', (e) => {
            e.preventDefault();
            this.timelineItems.style.background = '';
            const id = parseInt(e.dataTransfer.getData('text/plain'));
            if (id) {
                this.addToTimeline(id);
            }
        });
    }

    // 저장된 장소 목록 렌더링 (사이드바)
    renderSavedPlaces() {
        // 저장된 장소가 없을 경우
        if (this.savedPlaces.length === 0) {
            this.savedList.style.display = 'none';
            this.emptySaved.style.display = 'block';
            return;
        }

        this.savedList.style.display = 'flex';
        this.emptySaved.style.display = 'none';

        // 저장된 ID로 장소 데이터 찾기
        const savedPlacesData = this.savedPlaces
            .map(id => this.places.find(p => p.id === id))
            .filter(Boolean); // 유효한 데이터만 필터링

        this.savedList.innerHTML = savedPlacesData.map(place => `
      <div class="planner__saved-item" data-id="${place.id}" draggable="true">
        <img src="${place.images[0]}" alt="${place.name}" class="planner__saved-image">
        <div class="planner__saved-info">
          <p class="planner__saved-name">${place.name}</p>
          <p class="planner__saved-category">${place.category}</p>
        </div>
        <button class="btn-icon" style="width: 32px; height: 32px; flex-shrink: 0;" 
                onclick="planner.removeFromSaved(${place.id}, event)" 
                title="저장 목록에서 제거">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `).join('');
    }

    // 타임라인 렌더링 (메인 영역)
    renderTimeline() {
        // 타임라인이 비어있을 경우
        if (this.timeline.length === 0) {
            this.timelineItems.innerHTML = '';
            this.timelineEmpty.style.display = 'block';
            this.timelineActions.style.display = 'none';
            return;
        }

        this.timelineEmpty.style.display = 'none';
        this.timelineActions.style.display = 'flex';

        // 시간순 정렬
        this.timeline.sort((a, b) => a.time.localeCompare(b.time));

        this.timelineItems.innerHTML = this.timeline.map((item, index) => {
            const place = this.places.find(p => p.id === item.placeId);
            if (!place) return '';

            return `
        <div class="planner__timeline-item" data-index="${index}">
          <div class="planner__timeline-time">
            <input type="time" value="${item.time}" 
                   onchange="planner.updateTime(${index}, this.value)"
                   style="border: none; background: none; font-weight: 600; color: var(--accent-color); font-size: inherit;">
          </div>
          <div class="planner__timeline-place">
            <img src="${place.images[0]}" alt="${place.name}" class="planner__timeline-image">
            <div class="planner__timeline-info">
              <h4>${place.name}</h4>
              <p>${place.shortDesc}</p>
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

    // 타임라인에 장소 추가
    addToTimeline(placeId) {
        // 이미 추가된 장소인지 확인
        if (this.timeline.some(item => item.placeId === placeId)) {
            this.showToast('이미 일정에 추가된 장소입니다.');
            return;
        }

        // 다음 일정 시간 자동 계산 (마지막 일정 + 2시간)
        const lastTime = this.timeline.length > 0
            ? this.timeline[this.timeline.length - 1].time
            : '09:00'; // 기본 시작 시간

        const [hours, minutes] = lastTime.split(':').map(Number);
        const nextHours = (hours + 2) % 24;
        const nextTime = `${String(nextHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        this.timeline.push({
            placeId,
            time: this.timeline.length === 0 ? '10:00' : nextTime
        });

        this.saveTimeline();
        this.renderTimeline();
        this.showToast('일정에 추가했습니다!');
    }

    // 타임라인에서 장소 제거
    removeFromTimeline(index) {
        this.timeline.splice(index, 1);
        this.saveTimeline();
        this.renderTimeline();
        this.showToast('일정에서 제거했습니다.');
    }

    // 일정 시간 업데이트
    updateTime(index, time) {
        this.timeline[index].time = time;
        this.saveTimeline();
        this.renderTimeline();
    }

    // 저장된 목록에서 장소 제거
    removeFromSaved(id, event) {
        event.stopPropagation();

        const index = this.savedPlaces.indexOf(id);
        if (index > -1) {
            this.savedPlaces.splice(index, 1);
            localStorage.setItem('teumsae_saved', JSON.stringify(this.savedPlaces));
            this.renderSavedPlaces();
            this.showToast('저장 목록에서 제거했습니다.');
        }
    }

    // 일정 저장 (로컬 스토리지)
    savePlan() {
        const planData = {
            date: this.dateInput.value,
            timeline: this.timeline,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem('teumsae_plan', JSON.stringify(planData));
        this.showToast('일정이 저장되었습니다!');
    }

    // 일정 공유 기능
    sharePlan() {
        if (this.timeline.length === 0) {
            this.showToast('공유할 일정이 없습니다.');
            return;
        }

        const date = this.dateInput.value;
        const places = this.timeline.map(item => {
            const place = this.places.find(p => p.id === item.placeId);
            return place ? `${item.time} - ${place.name}` : '';
        }).filter(Boolean).join('\n');

        const shareText = `🌿 틈새 여행 일정\n📅 ${date}\n\n${places}\n\n틈새에서 만든 나만의 서울 여행 코스입니다.`;

        // Web Share API 지원 확인
        if (navigator.share) {
            navigator.share({
                title: '틈새 여행 일정',
                text: shareText
            }).catch(() => {
                this.copyToClipboard(shareText); // 실패 시 클립보드 복사
            });
        } else {
            this.copyToClipboard(shareText);
        }
    }

    // 클립보드 복사
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('일정이 클립보드에 복사되었습니다!');
        }).catch(() => {
            this.showToast('복사에 실패했습니다.');
        });
    }

    // 일정 초기화
    clearPlan() {
        if (this.timeline.length === 0) return;

        if (confirm('정말 일정을 초기화하시겠습니까?')) {
            this.timeline = [];
            this.saveTimeline();
            this.renderTimeline();
            this.showToast('일정이 초기화되었습니다.');
        }
    }

    // 저장된 장소 불러오기
    loadSavedPlaces() {
        try {
            return JSON.parse(localStorage.getItem('teumsae_saved')) || [];
        } catch {
            return [];
        }
    }

    // 타임라인 불러오기
    loadTimeline() {
        try {
            const plan = JSON.parse(localStorage.getItem('teumsae_plan'));
            return plan?.timeline || [];
        } catch {
            return [];
        }
    }

    // 타임라인 저장
    saveTimeline() {
        const planData = {
            date: this.dateInput.value,
            timeline: this.timeline,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('teumsae_plan', JSON.stringify(planData));
    }

    // 토스트 알림 표시
    showToast(message) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

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

        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // 스크롤 애니메이션 초기화
    initRevealAnimations() {
        const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, { threshold: 0.1 });

        reveals.forEach(el => observer.observe(el));

        // 이미 화면에 보이는 요소는 즉시 표시
        setTimeout(() => {
            reveals.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight) {
                    el.classList.add('revealed');
                }
            });
        }, 100);
    }
}

// 초기화
let planner;
document.addEventListener('DOMContentLoaded', () => {
    planner = new PlannerPage();
});
