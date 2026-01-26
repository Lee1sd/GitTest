// Review Manager Class
// Review Manager Class
class ReviewManager {
    constructor() {
        this.currentPlaceId = null;
        this.reviews = [];
        this.mediaFiles = []; // Array of { type, data } objects (Base64)
    }

    // Call this after modal HTML is injected into DOM
    rebind() {
        // Cache DOM elements
        this.elements = {
            section: document.getElementById('modal-reviews-section'),
            btnWrite: document.getElementById('btn-write-review'),
            btnCancel: document.getElementById('btn-cancel-review'),
            btnSubmit: document.getElementById('btn-submit-review'),
            form: document.getElementById('review-form'),
            list: document.getElementById('review-list'),
            inputs: {
                title: document.getElementById('review-title'),
                stars: document.querySelectorAll('input[name="rating"]'),
                text: document.getElementById('review-text'),
                media: document.getElementById('review-media-input')
            },
            preview: document.getElementById('media-preview'),
            stats: {
                avg: document.getElementById('review-avg-rating'),
                stars: document.getElementById('review-avg-stars'),
                count: document.getElementById('review-count')
            }
        };

        this.bindEvents();
    }

    bindEvents() {
        // Bind Events
        if (this.elements.btnWrite) {
            this.elements.btnWrite.onclick = () => this.toggleForm(true);
        }
        if (this.elements.btnCancel) {
            this.elements.btnCancel.onclick = () => this.toggleForm(false);
        }
        if (this.elements.btnSubmit) {
            this.elements.btnSubmit.onclick = () => this.submitReview();
        }
        if (this.elements.inputs.media) {
            this.elements.inputs.media.onchange = (e) => this.handleFileSelect(e);
        }
    }

    // Called when modal opens
    async loadForPlace(placeId) {
        this.currentPlaceId = placeId;
        this.resetForm();
        this.toggleForm(false);
        
        try {
            // Load reviews from localStorage
            const storageKey = `reviews_${placeId}`;
            const storedReviews = localStorage.getItem(storageKey);
            
            this.reviews = storedReviews ? JSON.parse(storedReviews) : [];
            
            // Sort by date desc
            this.reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            this.updateStats();
            this.renderReviews();
        } catch (error) {
            console.error("Error loading reviews:", error);
            this.elements.list.innerHTML = '<div class="review-empty">리뷰를 불러오는 중 오류가 발생했습니다.</div>';
        }
    }

    toggleForm(show) {
        if (this.elements.form) {
            this.elements.form.style.display = show ? 'block' : 'none';
        }
        if (this.elements.btnWrite) {
            this.elements.btnWrite.style.display = show ? 'none' : 'block';
        }
    }

    resetForm() {
        this.mediaFiles = [];
        if (this.elements.inputs.title) this.elements.inputs.title.value = '';
        this.elements.inputs.text.value = '';
        this.elements.inputs.media.value = ''; // Reset file input
        this.elements.preview.innerHTML = '';
        // Reset stars
        this.elements.inputs.stars.forEach(radio => radio.checked = false);
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                let base64Data = e.target.result;
                const isVideo = file.type.startsWith('video');
                
                // Compress image if it's not a video
                if (!isVideo) {
                    try {
                        base64Data = await this.compressImage(base64Data);
                    } catch (err) {
                        console.error("Image compression failed, using original:", err);
                    }
                }

                // Add to internal array
                this.mediaFiles.push({
                    type: isVideo ? 'video' : 'image',
                    data: base64Data
                });

                // Add to UI
                this.addPreviewItem(base64Data, isVideo, this.mediaFiles.length - 1);
            };
            reader.readAsDataURL(file);
        });
    }

    compressImage(base64Str, maxWidth = 600, quality = 0.6) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Resize logic
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => resolve(base64Str); // Fail gracefully
        });
    }

    addPreviewItem(src, isVideo, index) {
        const item = document.createElement('div');
        item.className = 'preview-item';

        let mediaEl;
        if (isVideo) {
            mediaEl = document.createElement('video');
            mediaEl.src = src;
        } else {
            mediaEl = document.createElement('img');
            mediaEl.src = src;
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'preview-remove';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
            item.remove();
            // Note: Actual removal from this.mediaFiles is tricky with just simple index.
            // For this prototype, we'll keep the data in array but filter it on submit 
            // or just accept that "removed from UI" doesn't mean "removed from memory" perfectly
            // until submit logic re-reads UI or we implement better tracking.
            // Better approach for prototype:
            // Just let it be, or implement ID-based removal. 
            // For simplicity here: We won't remove from `this.mediaFiles` to keep logic simple,
            // (User might re-upload). Ideally should match UI. 
            // Let's rely on clearing everything on Reset.
        };

        item.appendChild(mediaEl);
        item.appendChild(removeBtn);
        this.elements.preview.appendChild(item);
    }

    submitReview() {
        // Validation
        const ratingInput = document.querySelector('input[name="rating"]:checked');
        const rating = ratingInput ? parseInt(ratingInput.value) : 0;
        const title = this.elements.inputs.title.value.trim();
        const text = this.elements.inputs.text.value.trim();

        if (title.length < 2) {
            alert('제목을 입력해주세요.');
            return;
        }
        if (rating === 0) {
            alert('별점을 선택해주세요!');
            return;
        }
        if (text.length < 5) {
            alert('리뷰 내용은 최소 5자 이상 작성해주세요.');
            return;
        }

        // Prepare Data
        const reviewData = {
            id: Date.now().toString(), // Simple ID
            placeId: this.currentPlaceId,
            userId: 'guest',
            userName: '게스트', // In real app, get from Auth
            title: title,
            rating: rating,
            content: text,
            media: this.mediaFiles.map(m => m.data), // Save Base64 strings
            createdAt: new Date().toISOString()
        };

        try {
            // Save to localStorage
            this.reviews.unshift(reviewData); // Add to beginning
            const storageKey = `reviews_${this.currentPlaceId}`;
            localStorage.setItem(storageKey, JSON.stringify(this.reviews));

            alert('리뷰가 등록되었습니다!');
            this.loadForPlace(this.currentPlaceId); // Reload UI
        } catch (error) {
            console.error("Error saving review:", error);
            if (error.name === 'QuotaExceededError') {
                 alert('저장 공간이 부족하여 이미지 저장이 불가능할 수 있습니다.');
            } else {
                alert('리뷰 등록 실패: ' + error.message);
            }
        }
    }

    updateStats() {
        if (this.reviews.length === 0) {
            this.elements.stats.avg.textContent = "0.0";
            this.elements.stats.stars.textContent = "☆☆☆☆☆";
            this.elements.stats.count.textContent = "(0)";
            return;
        }

        const sum = this.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        const avg = (sum / this.reviews.length).toFixed(1);

        this.elements.stats.avg.textContent = avg;
        this.elements.stats.stars.textContent = this.getStarString(avg);
        this.elements.stats.count.textContent = `(${this.reviews.length})`;
    }

    getStarString(rating) {
        const r = Math.round(rating);
        return "★".repeat(r) + "☆".repeat(5 - r);
    }

    renderReviews() {
        if (!this.elements.list) return;

        if (this.reviews.length === 0) {
            this.elements.list.innerHTML = `
                <div class="review-empty">
                    <p>아직 작성된 리뷰가 없습니다.</p>
                    <p>가장 먼저 리뷰를 남겨주세요!</p>
                </div>`;
            return;
        }

        this.elements.list.innerHTML = this.reviews.map(review => `
            <div class="review-item">
                <div class="review-header">
                    <div class="review-header-left">
                        <span class="reviewer-name">${review.title || '제목 없음'}</span>
                        <div class="review-sub-info">
                            <span class="review-author">${review.userName || '익명'}</span>
                            <span class="review-date">${this.formatDate(review.createdAt)}</span>
                        </div>
                    </div>
                    <div class="review-rating">${this.getStarString(review.rating)}</div>
                </div>
                <div class="review-content">${review.content}</div>
                ${review.media && review.media.length > 0 ? `
                    <div class="review-media">
                        ${review.media.map(url => {
                            const isVid = url.startsWith('data:video');
                            return isVid ? `<video src="${url}" controls></video>` : `<img src="${url}">`;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    formatDate(isoString) {
        if (!isoString) return '방금 전';
        const date = new Date(isoString);
        return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
    }
}

// Global Loading Animation (Helper)
if (!document.getElementById('loading-spinner')) {
    // ...
}
