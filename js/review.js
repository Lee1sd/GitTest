// ReviewManager: 리뷰 작성 및 관리를 담당하는 클래스
class ReviewManager {
    constructor(appInstance) {
        this.app = appInstance; // 메인 앱 인스턴스 참조 (필요 시)
        this.currentReviewPlaceId = null;
        this.reviewRating = 0;
        
        // DOM 요소 캐싱 (없으면 주입 시도)
        if (!document.getElementById('review-modal-backdrop')) {
            this.injectModalHTML();
        }

        this.modalBackdrop = document.getElementById('review-modal-backdrop');
        this.modalCloseBtn = document.getElementById('review-modal-close');
        this.submitBtn = document.getElementById('review-submit-btn');
        this.form = document.getElementById('review-form');
        this.ratingInput = document.getElementById('review-rating');
        this.stars = document.querySelectorAll('#review-modal .star'); // 범위 한정
        this.fileInput = document.getElementById('review-image');
        this.fileNameDisplay = document.getElementById('file-name');

        this.bindEvents();
    }

    injectModalHTML() {
        const modalHTML = `
        <div class="review-modal-backdrop" id="review-modal-backdrop">
            <div class="place-modal review-modal" id="review-modal">
                <button class="place-modal__close" id="review-modal-close" aria-label="닫기">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <div class="place-modal__header" style="padding: 30px 30px 15px;">
                    <h2 class="place-modal__title">리뷰 작성</h2>
                    <p class="place-modal__desc">이 장소에서의 경험을 공유해주세요.</p>
                </div>

                <div class="place-modal__content" style="padding: 0 30px 30px;">
                    <form id="review-form" onsubmit="return false;">
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label for="review-title" style="display: block; color: var(--text-color); margin-bottom: 8px; font-weight: 500;">제목</label>
                            <input type="text" id="review-title" class="search-box__input" style="border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 12px; width: 100%; font-size: 1rem;" placeholder="리뷰 제목을 입력하세요" required>
                        </div>

                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="display: block; color: var(--text-color); margin-bottom: 8px; font-weight: 500;">별점</label>
                            <div class="star-rating" id="star-rating" style="display: flex; gap: 5px;">
                                <svg class="star" data-value="1" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="cursor: pointer; transition: all 0.2s;">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                                <svg class="star" data-value="2" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="cursor: pointer; transition: all 0.2s;">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                                <svg class="star" data-value="3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="cursor: pointer; transition: all 0.2s;">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                                <svg class="star" data-value="4" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="cursor: pointer; transition: all 0.2s;">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                                <svg class="star" data-value="5" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="cursor: pointer; transition: all 0.2s;">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </div>
                            <input type="hidden" id="review-rating" value="0" required>
                        </div>

                        <div class="form-group" style="margin-bottom: 20px;">
                            <label for="review-content" style="display: block; color: var(--text-color); margin-bottom: 8px; font-weight: 500;">내용</label>
                            <textarea id="review-content" class="search-box__input" style="border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 12px; width: 100%; height: 150px; resize: none; font-size: 1rem; line-height: 1.5;" placeholder="내용을 입력하세요" required></textarea>
                        </div>

                        <div class="form-group" style="margin-bottom: 30px;">
                            <label for="review-image" style="display: block; color: var(--text-color); margin-bottom: 8px; font-weight: 500;">사진 첨부</label>
                            <div class="file-upload" style="position: relative; border: 1px dashed rgba(255,255,255,0.3); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s;">
                                <input type="file" id="review-image" accept="image/*" multiple style="position: absolute; inset: 0; opacity: 0; cursor: pointer;">
                                <div class="file-upload__content">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 8px; color: rgba(255,255,255,0.5);">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                        <polyline points="21 15 16 10 5 21"></polyline>
                                    </svg>
                                    <p style="font-size: 0.9rem; color: rgba(255,255,255,0.6);" id="file-name">클릭하여 이미지를 업로드하세요</p>
                                </div>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary btn-full" id="review-submit-btn">
                            리뷰 등록하기
                        </button>
                    </form>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    bindEvents() {
        // 모달 닫기
        if (this.modalCloseBtn) {
            this.modalCloseBtn.addEventListener('click', () => this.close());
        }
        if (this.modalBackdrop) {
            this.modalBackdrop.addEventListener('click', (e) => {
                if (e.target === this.modalBackdrop) this.close();
            });
        }

        // 별점 클릭
        if (this.stars.length > 0) {
            this.stars.forEach(star => {
                star.addEventListener('click', () => {
                    const value = parseInt(star.dataset.value);
                    this.setRating(value);
                });
            });
        }

        // 파일 선택 변경
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                const count = e.target.files.length;
                let text = '클릭하여 이미지를 업로드하세요';
                if (count === 1) text = e.target.files[0].name;
                else if (count > 1) text = `${count}개의 파일이 선택됨`;
                
                if (this.fileNameDisplay) this.fileNameDisplay.textContent = text;
            });
        }

        // 리뷰 제출
        if (this.submitBtn) {
            this.submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submit();
            });
        }
    }

    open(placeId) {
        this.currentReviewPlaceId = placeId;
        
        // 기존 상세 모달 닫기 (앱 인스턴스가 있다면)
        if (this.app && this.app.closePlaceModal) {
            this.app.closePlaceModal();
        }

        if (this.modalBackdrop) {
            this.modalBackdrop.classList.add('active');
            this.modalBackdrop.style.display = 'flex';
        }
    }

    close() {
        if (this.modalBackdrop) {
            this.modalBackdrop.classList.remove('active');
            this.modalBackdrop.style.display = 'none';
        }
        this.resetForm();
    }

    resetForm() {
        if (this.form) this.form.reset();
        this.setRating(0);
        if (this.fileNameDisplay) this.fileNameDisplay.textContent = '클릭하여 이미지를 업로드하세요';
        this.currentReviewPlaceId = null;
    }

    setRating(value) {
        this.reviewRating = value;
        if (this.ratingInput) this.ratingInput.value = value;
        
        this.stars.forEach(star => {
            const starValue = parseInt(star.dataset.value);
            if (starValue <= value) {
                star.setAttribute('fill', '#D4AF37');
                star.setAttribute('stroke', '#D4AF37');
            } else {
                star.setAttribute('fill', 'none');
                star.setAttribute('stroke', '#D4AF37');
            }
        });
    }

    async submit() {
        const titleInput = document.getElementById('review-title');
        const contentInput = document.getElementById('review-content');
        
        const title = titleInput ? titleInput.value : '';
        const content = contentInput ? contentInput.value : '';
        const rating = this.reviewRating;
        const imageFiles = this.fileInput ? this.fileInput.files : [];

        if (!title || !content || rating === 0) {
            this.showToast('제목, 내용, 별점을 모두 입력해주세요.');
            return;
        }

        // 이미지 파일 처리
        const processFiles = Array.from(imageFiles).map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve({
                    name: file.name,
                    data: e.target.result
                });
                reader.readAsDataURL(file);
            });
        });

        const images = await Promise.all(processFiles);

        const review = {
            id: Date.now(),
            placeId: this.currentReviewPlaceId,
            title,
            content,
            rating,
            images: images,
            date: new Date().toLocaleDateString(),
            author: 'Guest' // 나중에 로그인 유저 정보로 대체 가능
        };

        this.saveReview(review);
        this.showToast('리뷰가 성공적으로 등록되었습니다!');
        
        const savedPlaceId = this.currentReviewPlaceId;
        this.close();

        // 앱의 상세 모달 다시 열기 (리뷰 반영을 위해)
        if (this.app && this.app.openPlaceModal) {
            setTimeout(() => {
                this.app.openPlaceModal(savedPlaceId);
            }, 300);
        }
    }

    saveReview(review) {
        const reviews = JSON.parse(localStorage.getItem('teumsae_reviews') || '[]');
        reviews.push(review);
        localStorage.setItem('teumsae_reviews', JSON.stringify(reviews));
    }

    // 특정 장소의 리뷰 목록 렌더링 (Static Helper)
    static renderReviews(placeId, targetElementId, imageModalCallback) {
        const reviews = JSON.parse(localStorage.getItem('teumsae_reviews') || '[]');
        const placeReviews = reviews.filter(r => r.placeId === placeId);
        const listContainer = document.getElementById(targetElementId);
        
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
                        ${ReviewManager.generateStars(review.rating)}
                    </div>
                </div>
                <h4 style="color: white; margin-bottom: 8px; font-size: 1.1rem;">${review.title}</h4>
                <p style="color: rgba(255,255,255,0.8); line-height: 1.6; font-size: 0.95rem;">${review.content}</p>
                ${ReviewManager.renderReviewImages(review)}
            </div>
        `).join('');

        // 이미지 클릭 이벤트 바인딩 (HTML 문자열 내 onclick은 글로벌 함수를 찾으므로, 여기서 다시 바인딩하거나 data 속성 활용 권장)
        // 여기서는 간편함을 위해 onclick 속성을 사용하되, app 인스턴스를 통해 호출되도록 유지하거나
        // 동적으로 이벤트를 붙이는 것이 좋음. 현재 구조상 기존 app.openImageModal을 활용.
    }

    static renderReviewImages(review) {
        if (review.images && review.images.length > 0) {
            return `
                <div style="margin-top: 15px; display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px;">
                    ${review.images.map(img => `
                        <img src="${img.data}" alt="${img.name}" 
                             style="width: 100px; height: 100px; border-radius: 8px; object-fit: cover; cursor: pointer; flex-shrink: 0;"
                             onclick="window.app.openImageModal('${img.data}')">
                    `).join('')}
                </div>
            `;
        }
        // Legacy support
        if (review.imageData) {
             return `
                <div style="margin-top: 15px;">
                    <img src="${review.imageData}" alt="Review Image" 
                         style="max-width: 100%; max-height: 300px; border-radius: 8px; object-fit: cover; cursor: pointer;"
                         onclick="window.app.openImageModal('${review.imageData}')">
                </div>
            `;
        }
        return '';
    }

    static generateStars(rating) {
        return '★'.repeat(rating) + '☆'.repeat(5 - rating);
    }

    showToast(message) {
        // 기존 App 클래스의 showToast 재사용 또는 새로 구현
        if (this.app && this.app.showToast) {
            this.app.showToast(message);
        } else {
            alert(message);
        }
    }
}
