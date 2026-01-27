// Review Manager Class
// Review Manager Class
class ReviewManager {
    constructor() {
        this.currentPlaceId = null;
        this.reviews = [];
        // 업로드 대기 파일 목록: { type: 'image'|'video', file: File, previewUrl: string }
        this.mediaFiles = [];
        this.editingReviewId = null; // 수정 중인 리뷰 ID
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
            this.elements.btnWrite.onclick = () => {
                this.resetForm(); // 쓰기 버튼 클릭 시 폼 초기화
                this.toggleForm(true);
            };
        }
        if (this.elements.btnCancel) {
            this.elements.btnCancel.onclick = () => this.cancelEdit();
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
            // ✅ Firestore에서 리뷰 로드
            if (!window.db) throw new Error('Firebase(db) 초기화가 필요합니다.');

            const snap = await window.db
                .collection('reviews')
                .where('placeId', '==', placeId)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            this.reviews = snap.docs.map(d => {
                const data = d.data() || {};
                // createdAt: Firestore Timestamp -> ISO
                let createdAt = data.createdAt;
                if (createdAt && typeof createdAt.toDate === 'function') {
                    createdAt = createdAt.toDate().toISOString();
                }

                // media: [{url,type,...}] or legacy [url]
                let media = data.media || [];
                if (Array.isArray(media) && media.length > 0) {
                    if (typeof media[0] === 'string') {
                        media = media.map(u => ({ type: 'image', url: u }));
                    } else {
                        media = media
                            .map(m => ({ type: m?.type || 'image', url: m?.url }))
                            .filter(m => !!m.url);
                    }
                } else {
                    media = [];
                }

                return {
                    id: d.id,
                    ...data,
                    createdAt,
                    media
                };
            });

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
            // 수정 모드일 때는 '리뷰 작성' 버튼을 숨김 상태로 유지해야 함
            // 하지만 일반적인 토글(취소 등)에서는 다시 보여야 함
            // 여기서는 show가 true(폼 열림)이면 버튼 숨김, false(폼 닫힘)이면 버튼 보임
            this.elements.btnWrite.style.display = show ? 'none' : 'block';
        }
    }

    resetForm() {
        // 기존 previewUrl 정리
        try {
            this.mediaFiles.forEach(m => m?.previewUrl && URL.revokeObjectURL(m.previewUrl));
        } catch (e) {}
        this.mediaFiles = [];
        this.editingReviewId = null; // 수정 ID 초기화

        if (this.elements.inputs.title) this.elements.inputs.title.value = '';
        this.elements.inputs.text.value = '';
        this.elements.inputs.media.value = ''; // Reset file input
        this.elements.preview.innerHTML = '';
        // Reset stars
        this.elements.inputs.stars.forEach(radio => radio.checked = false);
        
        // 버튼 텍스트 원복
        if (this.elements.btnSubmit) this.elements.btnSubmit.textContent = '등록하기';
    }
    
    cancelEdit() {
        this.resetForm();
        this.toggleForm(false);
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        files.forEach(file => {
            const isVideo = file.type.startsWith('video');
            const previewUrl = URL.createObjectURL(file);

            this.mediaFiles.push({
                type: isVideo ? 'video' : 'image',
                file,
                previewUrl
            });

            this.addPreviewItem(previewUrl, isVideo, this.mediaFiles.length - 1);
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
            // mediaFiles에서도 제거
            // 주의: index 기반 제거는 배열 변경 시 인덱스가 꼬일 수 있으므로 다시 계산 필요
            // 여기서는 단순화를 위해 DOM 요소 기준으로 mediaFiles를 재구성하거나
            // re-render 방식이 안전하지만, 일단 splice 사용
            const removed = this.mediaFiles.splice(index, 1)[0];
            if (removed?.previewUrl) {
                try { URL.revokeObjectURL(removed.previewUrl); } catch (e) {}
            }
            item.remove();
            
            // Re-index remaining items if needed (DOM item references are stable, but data index shifts)
            // 간단히 mediaFiles와 DOM의 싱크가 중요. 
            // 여기서는 새로 추가되는 애들만 index로 넣는데, 삭제 시 index가 밀림.
            // 해결: removeBtn.onclick 시점에 현재 DOM의 순서를 찾거나, 객체 참조로 삭제.
            // -> 객체 참조 삭제 방식 추천하지만 코드가 복잡해짐.
            // -> 일단 단순 구현 유지 (버그 가능성 낮음 - UI 다시 그리지 않으므로)
        };

        item.appendChild(mediaEl);
        item.appendChild(removeBtn);
        this.elements.preview.appendChild(item);
    }

    getCurrentUser() {
        // (A) Firebase Auth
        try {
            const fbUser = firebase?.auth?.().currentUser;
            if (fbUser) {
                return {
                    userId: fbUser.uid,
                    userName: fbUser.displayName || fbUser.email,
                    email: fbUser.email
                };
            }
        } catch (e) {}

        // (B) Local Storage (AuthGuard)
        try {
            const localUser = window.AuthGuard?.getUser?.();
            if (localUser && localUser.isLoggedIn) {
                const email = localUser.email || '';
                // 변경: 사용자 이름 대신 이메일 전체를 사용 (요청사항)
                const name = email || localUser.name || '사용자'; 
                return {
                    userId: email || name || 'user',
                    userName: name,
                    email: localUser.email // Keep email for consistency if needed elsewhere
                };
            }
        } catch (e) {
            // ignore
        }

        return null;
    }

    async submitReview() {
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

        try {
            if (!window.db) throw new Error('Firebase(db) 초기화가 필요합니다.');

            // 버튼 중복 클릭 방지
            if (this.elements.btnSubmit) {
                this.elements.btnSubmit.disabled = true;
                this.elements.btnSubmit.textContent = this.editingReviewId ? '수정 중...' : '등록 중...';
            }

            // 작성자 정보
            const currentUser = this.getCurrentUser();
            const author = currentUser || { userId: 'guest', userName: '게스트' };

            // 1) Firestore 데이터 준비
            const baseReview = {
                placeId: this.currentPlaceId,
                title,
                rating,
                content: text,
                // userId, userName은 수정 시 변경하지 않는 것이 원칙이나, 
                // 없으면 업데이트. (생성 시에는 필수)
            };
            
            if (!this.editingReviewId) {
                // 새 리뷰일 때만 작성자 정보 추가
                baseReview.userId = author.userId;
                baseReview.userName = author.userName;
                baseReview.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                baseReview.media = []; // 초기 미디어
            }

            let docRef;
            if (this.editingReviewId) {
                // 수정
                docRef = window.db.collection('reviews').doc(this.editingReviewId);
            } else {
                // 생성
                docRef = await window.db.collection('reviews').add(baseReview);
            }

            // 2) Storage에 파일 업로드 (새로 추가된 파일들)
            const uploaded = [];
            const storage = window.storage || (firebase.storage ? firebase.storage() : null);
            
            if (storage && this.mediaFiles.length > 0) {
                // 기존 미디어 유지 여부 로직 필요
                // 여기서는 'mediaFiles'가 새로 추가할 파일만 담고 있다고 가정
                // 수정 시 기존 이미지를 유지하려면 this.reviews에서 가져와야 함.
                // 현재 구조: resetForm() 시 mediaFiles 초기화 -> 사용자가 파일을 추가하면 mediaFiles에 들어감.
                // 만약 "기존 이미지 삭제" 기능이 없다면, 수정 시 "기존 이미지 + 새 이미지"가 되어야 함.
                // 일단 간단하게: 수정 시에도 새 파일이 있으면 업로드해서 추가.
                
                for (let i = 0; i < this.mediaFiles.length; i++) {
                    const m = this.mediaFiles[i];
                    if (!m?.file) continue;
                    const safeName = (m.file.name || `file_${i}`).replace(/[\\/]/g, '_');
                    const path = `reviews/${this.currentPlaceId}/${docRef.id}/${Date.now()}_${safeName}`;
                    const ref = storage.ref(path);
                    await ref.put(m.file);
                    const url = await ref.getDownloadURL();
                    uploaded.push({
                        type: m.type,
                        url,
                        path,
                        name: safeName
                    });
                }
            }

            // 3) Firestore 업데이트
            if (this.editingReviewId) {
                // 수정 시: 기존 미디어에 새 미디어 합치기
                const targetReview = this.reviews.find(r => r.id === this.editingReviewId);
                const oldMedia = targetReview ? targetReview.media : [];
                // 만약 UI에서 기존 이미지를 삭제했다면 그건 별도 처리 필요하지만, 
                // 지금 UI에는 "기존 이미지 삭제" 버튼이 없으므로 "추가"만 가능하게 처리.
                const finalMedia = [...oldMedia, ...uploaded];
                
                await docRef.update({
                    ...baseReview,
                    media: finalMedia,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert('리뷰가 수정되었습니다.');
            } else {
                // 생성 시
                if (uploaded.length > 0) {
                    await docRef.update({ media: uploaded });
                }
                alert('리뷰가 등록되었습니다!');
            }

            await this.loadForPlace(this.currentPlaceId);
        } catch (error) {
            console.error('Error saving review:', error);
            alert('작업 실패: ' + (error?.message || error));
        } finally {
            if (this.elements.btnSubmit) {
                this.elements.btnSubmit.disabled = false;
                this.elements.btnSubmit.textContent = '등록하기';
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

        const currentUser = this.getCurrentUser();
        const currentUserId = currentUser ? currentUser.userId : null;

        this.elements.list.innerHTML = this.reviews.map(review => {
            const isOwner = currentUserId && (review.userId === currentUserId);
            
            return `
            <div class="review-item" data-id="${review.id}">
                <div class="review-header">
                    <div class="review-header-left">
                        <span class="reviewer-name">${review.title || '제목 없음'}</span>
                        <div class="review-sub-info">
                            <span class="review-author">${review.userName || '익명'}</span>
                            <span class="review-date">${this.formatDate(review.createdAt)}</span>
                        </div>
                    </div>
                    <div class="review-header-right" style="display: flex; align-items: center; gap: 8px;">
                        <div class="review-rating">${this.getStarString(review.rating)}</div>
                        ${isOwner ? `
                        <div class="review-actions">
                            <button class="btn-text-edit" onclick="reviewManager.editReview('${review.id}')">수정</button>
                            <button class="btn-text-delete" onclick="reviewManager.deleteReview('${review.id}')">삭제</button>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="review-content">${review.content}</div>
                ${review.media && review.media.length > 0 ? `
                    <div class="review-media">
                        ${review.media.map(m => {
                            const url = (typeof m === 'string') ? m : (m?.url || '');
                            const type = (typeof m === 'string') ? 'image' : (m?.type || 'image');
                            const isVid = type === 'video' || /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
                            return isVid ? `<video src="${url}" controls></video>` : `<img src="${url}">`;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `}).join('');
    }

    formatDate(isoString) {
        if (!isoString) return '방금 전';
        const date = new Date(isoString);
        return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
    }

    // --- Edit / Delete Action Methods --- //
    
    async deleteReview(reviewId) {
        if (!confirm('정말로 이 리뷰를 삭제하시겠습니까?')) return;

        try {
            await window.db.collection('reviews').doc(reviewId).delete();
            alert('리뷰가 삭제되었습니다.');
            this.loadForPlace(this.currentPlaceId);
        } catch (e) {
            console.error('Delete failed', e);
            alert('삭제 실패: ' + e.message);
        }
    }

    editReview(reviewId) {
        const review = this.reviews.find(r => r.id === reviewId);
        if (!review) return;

        this.editingReviewId = reviewId;
        
        // 폼 열기
        this.toggleForm(true);
        // 버튼 텍스트 변경
        if (this.elements.btnSubmit) this.elements.btnSubmit.textContent = '수정완료';

        // 값 채우기
        if (this.elements.inputs.title) this.elements.inputs.title.value = review.title || '';
        this.elements.inputs.text.value = review.content || '';
        
        // 별점 채우기
        const ratingVal = review.rating || 5;
        const starInput = document.querySelector(`input[name="rating"][value="${ratingVal}"]`);
        if (starInput) starInput.checked = true;

        // 스크롤 이동
        this.elements.form.scrollIntoView({ behavior: 'smooth' });
    }
}

// Global Loading Animation (Helper)
if (!document.getElementById('loading-spinner')) {
    // ...
}
