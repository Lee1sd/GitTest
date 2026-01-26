// Review Manager Class
// Review Manager Class
class ReviewManager {
    constructor() {
        this.currentPlaceId = null;
        this.reviews = [];
        // 업로드 대기 파일 목록: { type: 'image'|'video', file: File, previewUrl: string }
        this.mediaFiles = [];
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
        if (this.elements.list) {
        this.elements.list.addEventListener('click', (e) => {
        const img = e.target.closest('.review-media img');
        const vid = e.target.closest('.review-media video');
        if (img) this.openLightbox({ type: 'image', src: img.src });
        if (vid) this.openLightbox({ type: 'video', src: vid.currentSrc || vid.src });
      });
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
            this.elements.btnWrite.style.display = show ? 'none' : 'block';
        }
    }

    resetForm() {
        // 기존 previewUrl 정리
        try {
            this.mediaFiles.forEach(m => m?.previewUrl && URL.revokeObjectURL(m.previewUrl));
        } catch (e) {}
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
            const removed = this.mediaFiles.splice(index, 1)[0];
            if (removed?.previewUrl) {
                try { URL.revokeObjectURL(removed.previewUrl); } catch (e) {}
            }
            item.remove();
            // 남은 항목들의 remove 버튼 index 재정렬
            const items = Array.from(this.elements.preview.querySelectorAll('.preview-item'));
            items.forEach((it, i) => {
                const btn = it.querySelector('.preview-remove');
                if (btn) btn.onclick = () => {
                    const rem = this.mediaFiles.splice(i, 1)[0];
                    if (rem?.previewUrl) {
                        try { URL.revokeObjectURL(rem.previewUrl); } catch (e) {}
                    }
                    it.remove();
                };
            });
        };

        item.appendChild(mediaEl);
        item.appendChild(removeBtn);
        this.elements.preview.appendChild(item);
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
                this.elements.btnSubmit.textContent = '등록 중...';
            }

            // 1) Firestore에 리뷰 문서 생성
            const baseReview = {
                placeId: this.currentPlaceId,
                userId: 'guest',
                userName: '게스트',
                title,
                rating,
                content: text,
                media: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await window.db.collection('reviews').add(baseReview);

            // 2) Storage에 파일 업로드(있다면)
            const uploaded = [];
            const storage = window.storage || (firebase.storage ? firebase.storage() : null);
            if (storage && this.mediaFiles.length > 0) {
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

            // 3) 업로드 결과를 Firestore 문서에 반영
            if (uploaded.length > 0) {
                await docRef.update({ media: uploaded });
            }

            alert('리뷰가 등록되었습니다!');
            await this.loadForPlace(this.currentPlaceId);
        } catch (error) {
            console.error('Error saving review:', error);
            alert('리뷰 등록 실패: ' + (error?.message || error));
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
                        ${review.media.map(m => {
                            const url = (typeof m === 'string') ? m : (m?.url || '');
                            const type = (typeof m === 'string') ? 'image' : (m?.type || 'image');
                            const isVid = type === 'video' || /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
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



    ensureLightbox() {
    if (document.getElementById('review-lightbox')) return;

    const wrap = document.createElement('div');
    wrap.id = 'review-lightbox';
    wrap.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0,0,0,.75);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 24px;
    `;

    wrap.innerHTML = `
      <div id="review-lightbox-inner" style="
        max-width: min(1000px, 95vw);
        max-height: 90vh;
        width: 100%;
        display:flex;
        align-items:center;
        justify-content:center;
        position: relative;
      ">
        <button id="review-lightbox-close" style="
          position:absolute; top:-10px; right:-10px;
          width:40px; height:40px; border:none; border-radius:20px;
          background:#fff; cursor:pointer; font-size:22px; line-height:40px;
        ">×</button>
        <div id="review-lightbox-content" style="
          width:100%;
          display:flex;
          align-items:center;
          justify-content:center;
        "></div>
      </div>
    `;

    document.body.appendChild(wrap);

    // 닫기 동작들
    const close = () => this.closeLightbox();
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    wrap.querySelector('#review-lightbox-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  openLightbox({ type, src }) {
    this.ensureLightbox();

    const wrap = document.getElementById('review-lightbox');
    const content = document.getElementById('review-lightbox-content');

    // 내용 교체
    content.innerHTML = '';

    if (type === 'video') {
      const v = document.createElement('video');
      v.src = src;
      v.controls = true;
      v.autoplay = true;
      v.style.cssText = 'max-width:100%; max-height:90vh; border-radius:12px; background:#000;';
      content.appendChild(v);
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.style.cssText = 'max-width:100%; max-height:90vh; border-radius:12px; object-fit:contain;';
      content.appendChild(img);
    }

    wrap.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // 뒤 스크롤 방지
  }

  closeLightbox() {
    const wrap = document.getElementById('review-lightbox');
    if (!wrap) return;
    wrap.style.display = 'none';
    const content = document.getElementById('review-lightbox-content');
    if (content) content.innerHTML = '';
    document.body.style.overflow = '';
  }
}

// Global Loading Animation (Helper)
if (!document.getElementById('loading-spinner')) {
    // ...
}
