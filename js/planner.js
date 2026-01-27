// 틈새 - 여행 일정 관리 로직
// PlannerPage: 나만의 여행 일정을 생성하고 관리하는 기능을 담당하는 클래스

// Firebase (CDN + compat)
const auth = window.auth;
const db = window.db;
const firebase = window.firebase;

class PlannerPage {
     constructor(user) {
  this.user = user;

  if (!user) {
    this.savedPlaces = [];
    this.timeline = [];
  } else {
    this.savedPlaces = this.loadSavedPlaces();//저장된 장소 목록 코드
    this.timeline = this.loadTimeline();//타임라인(일정)로드
  }

  this.places = placesData; //장소 데이터 참조
  this.currentDay = 1; //날짜 기억

  this.currentPlanMeta = {
    id: null,
    name: '',
    createdAt: null
  };

  this.savedPlans = [];
  this.init();
}

    // 초기화 메서드
  async init() {
  this.cacheDOMElements();

  if (!this.dateInput || !this.endDateInput) return;


 // 게스트면 여기서 완전히 끝
  if (!this.user) {
    this.timeline = [];
    this.savedPlaces = [];
    this.savedPlans = [];

    // 중요: 날짜도 비워버리기
    this.dateInput.value = '';
    this.endDateInput.value = '';

    this.renderSavedPlaces();
    this.renderTimeline();
    this.disableGuestUI();
    return;
  }


  await this.restorePlan();//여행일정 복구
  this.renderSavedPlaces(); //저장된 장소 목록 렌더링
  this.renderTimeline(); //타임라인 렌더링
  this.bindEvents(); // 이벤트 바인딩
  this.initRevealAnimations(); //애니메이션 초기화
  await this.fetchMyPlans(); // 여행일정 firebase에서 가져와서 슬라이드에 저장
}


    // DOM 요소 캐싱
    cacheDOMElements() {
        this.savedList = document.getElementById('saved-list'); // 저장된 장소 리스트 컨테이너
        this.emptySaved = document.getElementById('empty-saved'); // 저장된 장소가 없을 때 표시할 요소
        this.timelineItems = document.getElementById('timeline-items'); // 타임라인 아이템 컨테이너
        this.timelineEmpty = document.getElementById('timeline-empty'); // 타임라인이 비었을 때 표시할 요소
        this.timelineActions = document.getElementById('timeline-actions'); // 타임라인 하단 액션 버튼 그룹
        this.dateInput = document.getElementById('travel-date'); // 여행 날짜 입력 필드
         this.endDateInput = document.getElementById('end-date');// 여행 마지막 날짜 입력
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
        this.savePlanBtn.addEventListener('click', () => {
      document
        .getElementById('plan-name-modal')
        .classList.add('is-open');
    });

        // 모달 저장
    document
      .getElementById('confirm-plan-name')
      .addEventListener('click', () => {
        this.handleConfirmPlanName();
      });

        // 모달 취소
    document
      .getElementById('cancel-plan-name')
      .addEventListener('click', () => {
        document
          .getElementById('plan-name-modal')
          .classList.remove('is-open');
      });

        // 일정 공유 버튼 이벤트
        this.sharePlanBtn.addEventListener('click', () => this.sharePlan());

        // 일정 초기화 버튼 이벤트
        this.clearPlanBtn.addEventListener('click', () => this.clearPlan());
    }

      handleConfirmPlanName() {
    const input = document.getElementById('plan-name-input');
    const name = input.value.trim();

    if (!this.dateInput.value || !this.endDateInput.value) {
      alert('여행 날짜를 먼저 선택해주세요');
      return;
    }

    if (!name) {
      alert('일정 이름을 입력해주세요');
      return;
    }

    this.currentPlanMeta.name = name;
    this.savePlan();

    document
      .getElementById('plan-name-modal')
      .classList.remove('is-open');

    input.value = '';
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

 async restorePlan() {
     if (!this.dateInput || !this.endDateInput) return;

     // 로그아웃 상태면 일정 복원 안 함
  if (!this.user) {
    this.setDefaultDate();
    renderDays();
    this.timeline = [];
    this.renderTimeline();
    return;
  }

  const userId = this.user.uid;

    const snap = await db
      .collection('users')
      .doc(userId)
      .collection('plans')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snap.empty) {
      this.setDefaultDate();
      return;
    }

    const docSnap = snap.docs[0];
    const plan = docSnap.data();

    this.currentPlanMeta = {
      id: docSnap.id,
      name: plan.name,
      createdAt: plan.createdAt
    };

    this.dateInput.value = plan.date;
    this.endDateInput.value = plan.endDate;
    this.timeline = plan.timeline || [];

    renderDays();
    this.renderTimeline();
    this.restoreTodos(plan.todos);
  }
     resetCurrentPlanMeta() {
    this.currentPlanMeta = {
      id: null,
      name: '',
      createdAt: null
    };
  }

restoreTodos(todos = []) {
    const todoList = document.querySelector('.todo-list');
    if (!todoList) return;

    todoList.innerHTML = '';

    todos.forEach(todo => {
      const div = document.createElement('div');
      div.className = 'todo-item';

      div.innerHTML = `
      <input type="checkbox" ${todo.checked ? 'checked' : ''}>
      <input type="text" value="${todo.text}" placeholder="할 일을 입력하세요">
      <button class="todo-delete">×</button>
    `;

      div.querySelector('.todo-delete').addEventListener('click', () => {
        div.remove();
        this.savePlan();
      });

      todoList.appendChild(div);
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
        const days = this.timelineItems.querySelectorAll('.planner__day');
        // 타임라인이 비어있을 경우
        if ((days.length === 0 && this.timeline.length === 0)) {
            this.timelineItems.innerHTML = '';
            this.timelineEmpty.style.display = 'block';
            this.timelineActions.style.display = 'none';
            return;
        }

        this.timelineEmpty.style.display = 'none';
        this.timelineActions.style.display = 'flex';

       // 모든 day 안의 장소 비우기
days.forEach(dayEl => {
  const placesContainer = dayEl.querySelector('.planner__day-places');
  const addBtn = dayEl.querySelector('.add-place-btn');

  placesContainer.innerHTML = '';

  // 해당 Day에 일정이 하나라도 있으면 안내 버튼 숨김
  const dayNumber = parseInt(dayEl.dataset.day);
  const hasItemInThisDay = this.timeline.some(item => item.day === dayNumber);

  if (hasItemInThisDay) {
    addBtn.style.display = 'none';
  } else {
    addBtn.style.display = 'inline-block';
  }
});

  // 시간순 정렬 (같은 day 안에서만 의미 있음)
  this.timeline.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.time.localeCompare(b.time);
  });

  // 핵심: item.day 기준으로 해당 Day에 넣기
this.timeline.forEach((item, index) => {
  const place = this.places.find(p => p.id === item.placeId);
  if (!place) return;

  const dayEl = this.timelineItems.querySelector(
    `.planner__day[data-day="${item.day}"]`
  );
  if (!dayEl) return;

  const placesContainer = dayEl.querySelector('.planner__day-places');

  const html = `
    <div class="planner__timeline-item" data-index="${index}">
      <div class="planner__timeline-time">
        <input type="time" value="${item.time}" 
          onchange="planner.updateTime(${index}, this.value)">
      </div>

      <div class="planner__timeline-place">
        <img src="${place.images[0]}" alt="${place.name}">
        <div class="planner__timeline-info">
          <h4>${place.name}</h4>
          <p>${place.shortDesc}</p>
        </div>

        <button class="btn-icon"
          onclick="planner.removeFromTimeline(${index})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path
                                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
        </button>
      </div>
    </div>
  `;

  placesContainer.insertAdjacentHTML('beforeend', html);
});
   }


    // 타임라인에 장소 추가
    addToTimeline(placeId) {
         const hasDay = this.timelineItems.querySelector('.planner__day');
         if (!hasDay) {
         this.showToast('먼저 여행 날짜를 선택해주세요.');
         return;
        }
        // 이미 추가된 장소인지 확인
        if (this.timeline.some(item => item.placeId === placeId)) {
            this.showToast('이미 일정에 추가된 장소입니다.');
            return;
        }
        // 현재 Day의 DOM 찾기
    const dayEl = this.timelineItems.querySelector(
      `.planner__day[data-day="${this.currentDay}"]`
    );

    // 그 Day의 실제 날짜
    const date = dayEl.dataset.date;


        // 다음 일정 시간 자동 계산 (마지막 일정 + 2시간)
        const lastTime = this.timeline.length > 0
            ? this.timeline[this.timeline.length - 1].time
            : '09:00'; // 기본 시작 시간

        const [hours, minutes] = lastTime.split(':').map(Number);
        const nextHours = (hours + 2) % 24;
        const nextTime = `${String(nextHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        this.timeline.push({
            placeId,
            time: this.timeline.length === 0 ? '10:00' : nextTime,
            day: this.currentDay
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
    async savePlan() {
        const user = auth.currentUser;

     if (!user) {
    this.showToast('로그인 후에만 일정 저장이 가능해요');
    return;
    }

     const userId = user.uid;

     const todos = [...document.querySelectorAll('.todo-item')].map(item => ({
      text: item.querySelector('input[type="text"]')?.value || '',
      checked: item.querySelector('input[type="checkbox"]')?.checked || false
    }));
        const planData = {
            userId,
            name: this.currentPlanMeta.name || '이름 없는 일정',
            date: this.dateInput.value,
            endDate: this.endDateInput.value,
            timeline: this.timeline,todos,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        // 새 일정 (문서 ID 자동 생성)
    if (!this.currentPlanMeta.id) {
      const docRef = await db
        .collection('users')
        .doc(userId)
        .collection('plans')
        .add(planData);

      this.currentPlanMeta.id = docRef.id;

    }

        //  기존 일정 수정
    else {
      await db
        .collection('users')
        .doc(userId)
        .collection('plans')
        .doc(this.currentPlanMeta.id)
        .set(planData, { merge: true });
    }

        localStorage.setItem('teumsae_plan', JSON.stringify(planData));
        this.showToast('일정이 저장되었습니다!');
    }

    // 일정 공유 기능
    sharePlan() {
        if (this.timeline.length === 0) {
            this.showToast('공유할 일정이 없습니다.');
            return;
        }

        // 날짜별로 묶기
    const grouped = {};

    this.timeline.forEach(item => {
      if (!grouped[item.date]) {
        grouped[item.date] = [];
      }
      grouped[item.date].push(item);
    });

        // 날짜 오름차순 정렬
    const sortedDates = Object.keys(grouped).sort();

    // 날짜별 출력
    sortedDates.forEach(date => {
      shareText += `📅 ${date}\n`;

      grouped[date]
        .sort((a, b) => a.time.localeCompare(b.time))
        .forEach(item => {
          const place = this.places.find(p => p.id === item.placeId);
          if (!place) return;

          shareText += `${item.time} - ${place.name}\n`;
        });

      shareText += '\n';
    });

    shareText += '틈새에서 만든 나만의 서울 여행 코스입니다.';

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

    //저장된 여러 여행 일정을 슬라이드 패널에 렌더링하는 역할
  renderMyPlans() {
    const list = document.querySelector('.myplans-list');

    if (!list) return;

    list.innerHTML = '';

    if (this.savedPlans.length === 0) {
      // 선택 사항: 빈 상태 UX
      list.innerHTML = `
      <p class="empty-myplans">저장된 일정이 없습니다</p>
    `;
      return;
    }

    this.savedPlans.forEach(plan => {
      const item = document.createElement('div');
      item.className = 'myplans-item';
      item.dataset.id = plan.id;

      item.innerHTML = `
      <div class="myplans-thumb"></div>
      <div class="myplans-info">
        <strong>${plan.name}</strong>
        <p>${plan.date} ~ ${plan.endDate}</p>
      </div>

      <button class="myplans-delete-btn" title="삭제">✕</button>
    `;
      list.appendChild(item);
    });
  }

    async deletePlanById(planId) {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest';

    await db
      .collection('users')
      .doc(userId)
      .collection('plans')
      .doc(planId)
      .delete();


    if (this.currentPlanMeta.id === planId) {
      this.clearPlan({ silent: true });
      this.currentPlanMeta = { id: null, name: '' };
    }

    await this.fetchMyPlans();
    this.showToast('일정이 삭제되었습니다');
  }

    async fetchMyPlans() {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest';


    const snap = await db
      .collection('users')
      .doc(userId)
      .collection('plans')
      .orderBy('createdAt', 'desc')
      .get();

    this.savedPlans = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    this.renderMyPlans();
  }

    // 일정 초기화
  clearPlan() {
  if (confirm('정말 일정을 초기화하시겠습니까?')) {
    this.timeline = [];
    this.currentDay = 1;

    // Day DOM 삭제
    this.timelineItems.innerHTML = '';

    // 날짜 초기화
    this.endDateInput.value = '';
    this.currentDay = 1;

    // 투두 초기화
    const todoList = document.querySelector('.todo-list');
    if (todoList) {
      todoList.innerHTML = '';
    }
      if (!silent) {
      this.endDateInput.value = '';
    }

    // localStorage 삭제
    localStorage.removeItem('teumsae_plan');

    this.timelineEmpty.style.display = 'block';
    this.timelineActions.style.display = 'none';

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
        const existing = JSON.parse(localStorage.getItem('teumsae_plan')) || {};
        
        const planData = {
            ...existing, // 기존 date, endDate, todos 유지
            date: this.dateInput.value,
            endDate: this.endDateInput.value,
            timeline: this.timeline,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('teumsae_plan', JSON.stringify(planData));
    }

    async loadPlanById(planId) {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest';

    const snap = await db
      .collection('users')
      .doc(userId)
      .collection('plans')
      .doc(planId)
      .get();

    if (!snap.exists) return;

    const plan = snap.data();

    // change 이벤트 잠금
    this.isLoadingPlan = true;

    // 1️메타
    this.currentPlanMeta = {
      id: snap.id,
      name: plan.name,
      createdAt: plan.createdAt
    };

    // 날짜 세팅 (change 이벤트는 막혀 있음)
    this.dateInput.value = plan.date;
    this.endDateInput.value = plan.endDate;


    //  Day DOM 생성
    renderDays();

    //  timeline 교체
    this.timeline = plan.timeline || [];

    //  렌더
    this.renderTimeline();
    this.restoreTodos(plan.todos);

    // change 이벤트 다시 허용
    this.isLoadingPlan = false;

    document.getElementById('myplans-panel').classList.remove('is-open');
    this.showToast(`"${plan.name}" 일정을 불러왔어요`);
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
    auth.onAuthStateChanged(async (user) => {
    if (!user) {
      localStorage.removeItem('teumsae_plan');
      localStorage.removeItem('teumsae_saved');
    }
        
  planner = new PlannerPage();
  window.planner = planner;

    const startInput = document.getElementById('travel-date');
    const endInput = document.getElementById('end-date');
        
   if (!startInput) {
    console.error('start date input not found');
    return;
  }   

        //  날짜 변경 이벤트
  startInput.addEventListener('change', () => {
    if (planner.isLoadingPlan) return;
    renderDays();
    planner.renderTimeline();
  });

  // 날짜가 이미 복원돼 있으면 여기서 Day 생성 + 일정 렌더
  if (planner.dateInput.value && planner.endDateInput.value) {
    renderDays();              // Day DOM 생성
    planner.renderTimeline(); // Day 안에 일정 뿌리기
  }
        
if (endInput) {
    endInput.addEventListener('change', () => {
      if (planner.isLoadingPlan) return;
      planner.timeline = [];
      renderDays();
      planner.renderTimeline();
    });
  }

        //  내 일정 리스트 클릭
  const myPlansList = document.querySelector('.myplans-list');
  if (myPlansList) {
    myPlansList.addEventListener('click', (e) => {
      // 삭제
      if (e.target.classList.contains('myplans-delete-btn')) {
        e.stopPropagation();
        const item = e.target.closest('.myplans-item');
        if (!item) return;

        if (confirm('이 일정을 삭제할까요?')) {
          planner.deletePlanById(item.dataset.id);
        }
        return;
      }

      // 불러오기
      const item = e.target.closest('.myplans-item');
      if (!item) return;

      planner.loadPlanById(item.dataset.id);
    });
  }

       // 새 일정 만들기
  const newBtn = document.querySelector('.myplans-new-btn');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      planner.clearPlan({ silent: true });
      planner.resetCurrentPlanMeta();

      planner.timelineItems.innerHTML = '';
      planner.timelineEmpty.style.display = 'block';
      planner.timelineActions.style.display = 'none';

      planner.dateInput.value = '';
      if (planner.endDateInput) planner.endDateInput.value = '';

      document.getElementById('myplans-panel').classList.remove('is-open');
      planner.showToast('새 일정 작성을 시작했어요!');
    });
  } 

// 이미 날짜가 있으면 복원
  if (planner.user && planner.dateInput.value) {
  renderDays();
  planner.renderTimeline();
}
 });
});
        

function renderDays() {
  const startInput = document.getElementById('travel-date');
  const endInput = document.getElementById('end-date');

  if (!startInput.value) return;

   const start = new Date(startInput.value);
  const end = endInput.value
    ? new Date(endInput.value)
    : new Date(startInput.value); 
  
 start.setHours(0,0,0,0);
  end.setHours(0,0,0,0);

if (start > end) return;
  const timelineItems = document.getElementById('timeline-items');

  // 기존 Day 전부 제거
  timelineItems.innerHTML = '';

  let current = new Date(start);
  let day = 1;

  while (current <= end) {
    const dayItem = document.createElement('div');
    dayItem.className = 'planner__day';
    dayItem.dataset.day = day;

    dayItem.innerHTML = `
     <h2 class="planner-day-title">
        <span class="day-number">Day ${day}</span>
        <span class="day-date">${yyyy}.${mm}.${dd}</span>
      </h2>
      <button class="add-place-btn">장소를 드래그 하세요</button>
      <div class="planner__day-places"></div>
    `;


    dayItem.addEventListener('dragover', (e) => {
  e.preventDefault();
  dayItem.classList.add('drag-over');
});

dayItem.addEventListener('dragleave', () => {
  dayItem.classList.remove('drag-over');
});      

dayItem.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();

  planner.timelineItems.style.background = ''; 
  dayItem.classList.remove('drag-over');

  const id = parseInt(e.dataTransfer.getData('text/plain'));
  if (!id) return;

  // 드롭된 Day를 현재 Day로 설정
  planner.currentDay = Number(dayItem.dataset.day);
  planner.addToTimeline(id);
});

timelineItems.appendChild(dayItem);

    current.setDate(current.getDate() + 1);
    day++;
  }


  //  DAY 생겼으니 empty 숨김
  planner.timelineEmpty.style.display = 'none';
  planner.timelineActions.style.display = 'flex';

}



