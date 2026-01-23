class ModalPlanner {
    constructor() {
        this.currentPlace = null;
        this.plan = this.loadPlan();

        this.elements = {
            sidebar: document.getElementById('modal-planner-sidebar'),
            date: document.getElementById('mini-plan-date'),
            list: document.getElementById('mini-plan-list'),
            btnAdd: document.getElementById('btn-add-to-plan'),
            status: document.getElementById('planner-status-msg')
        };

        this.init();
    }

    init() {
        if (this.elements.btnAdd) {
            this.elements.btnAdd.addEventListener('click', () => {
                if (this.currentPlace) {
                    if (this.isPlaceInPlan(this.currentPlace.id)) {
                        this.removeFromPlan(this.currentPlace.id);
                    } else {
                        this.addToPlan(this.currentPlace);
                    }
                } else {
                    console.warn('No current place set for ModalPlanner');
                }
            });
        }
    }

    // Called when modal opens
    updateForPlace(place) {
        this.currentPlace = place;
        this.plan = this.loadPlan(); // Reload in case it changed elsewhere
        this.render();
    }

    loadPlan() {
        try {
            return JSON.parse(localStorage.getItem('teumsae_plan')) || { timeline: [] };
        } catch {
            return { timeline: [] };
        }
    }

    savePlan() {
        // Ensure date exists
        if (!this.plan.date) {
            const today = new Date();
            this.plan.date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        }
        this.plan.updatedAt = new Date().toISOString();
        localStorage.setItem('teumsae_plan', JSON.stringify(this.plan));
    }

    isPlaceInPlan(placeId) {
        if (!this.plan || !this.plan.timeline) return false;
        // String/Number comparison safety
        return this.plan.timeline.some(item => String(item.placeId) === String(placeId));
    }

    addToPlan(place) {
        if (!this.plan.timeline) this.plan.timeline = [];

        // Calculate time (Last + 2h or 10:00)
        const lastTime = this.plan.timeline.length > 0
            ? this.plan.timeline[this.plan.timeline.length - 1].time
            : '10:00';

        let [hh, mm] = lastTime.split(':').map(Number);
        if (this.plan.timeline.length > 0) hh = (hh + 2) % 24;

        const nextTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

        this.plan.timeline.push({
            placeId: place.id,
            time: nextTime
        });

        this.savePlan();
        this.render();

        // Show temp message
        if (this.elements.status) {
            this.elements.status.textContent = "일정에 추가되었습니다!";
            setTimeout(() => this.elements.status.textContent = "", 2000);
        }
    }

    removeFromPlan(placeId) {
        if (!this.plan.timeline) return;

        const index = this.plan.timeline.findIndex(item => String(item.placeId) === String(placeId));
        if (index > -1) {
            this.plan.timeline.splice(index, 1);
            this.savePlan();
            this.render();

            if (this.elements.status) {
                this.elements.status.textContent = "일정에서 제거되었습니다.";
                setTimeout(() => this.elements.status.textContent = "", 2000);
            }
        }
    }

    render() {
        if (!this.elements.list) return;

        // 1. Render Date
        if (this.elements.date) this.elements.date.textContent = this.plan.date || "일정 없음";

        // 2. Render List
        const timeline = this.plan.timeline || [];

        if (timeline.length === 0) {
            this.elements.list.innerHTML = `
                <div class="planner-empty">
                    <p style="color:var(--color-gray);">일정이 비어있습니다.</p>
                    <a href="planner.html" class="link">여행 계획하러 가기 &rarr;</a>
                </div>`;
        } else {
            // Sort by time
            timeline.sort((a, b) => a.time.localeCompare(b.time));

            // We need place details. 'app.places' should be available.
            const allPlaces = (window.app && window.app.places) ? window.app.places : placesData; // fallback to placesData global if app.places empty

            this.elements.list.innerHTML = `
                <div class="mini-timeline">
                    <div class="mini-timeline-list">
                        ${timeline.map((item, idx) => {
                const place = allPlaces.find(p => String(p.id) === String(item.placeId));
                const name = place ? place.name : '알 수 없는 장소';
                const isCurrent = this.currentPlace && String(this.currentPlace.id) === String(item.placeId);

                return `
                            <div class="mini-timeline-item ${isCurrent ? 'active' : ''}">
                                <span class="mini-timeline-time">${item.time}</span>
                                <div class="mini-timeline-content">
                                    <span class="mini-timeline-title">${name}</span>
                                    <button class="btn-remove-mini" onclick="app.modalPlanner.removeFromPlan('${item.placeId}')">×</button>
                                </div>
                            </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        }

        // 3. Update Button State
        if (this.currentPlace && this.elements.btnAdd) {
            const btnIcon = this.elements.btnAdd.querySelector('.icon');
            const btnText = this.elements.btnAdd.querySelector('.btn-text');
            const exists = this.isPlaceInPlan(this.currentPlace.id);

            if (exists) {
                if (btnIcon) btnIcon.textContent = '➕'; // Keep Plus, rotate to X
                if (btnText) btnText.textContent = '담기 취소';

                this.elements.btnAdd.classList.add('btn-remove-state');
                this.elements.btnAdd.classList.remove('btn-accent');
            } else {
                if (btnIcon) btnIcon.textContent = '➕';
                if (btnText) btnText.textContent = '일정에 담기';

                this.elements.btnAdd.classList.remove('btn-remove-state');
                this.elements.btnAdd.classList.add('btn-accent');
            }
        }
    }
}
