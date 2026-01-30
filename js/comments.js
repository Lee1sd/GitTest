class CommentManager {
    constructor() {}

    getCurrentUser() {
        // Reuse logic from ReviewManager or AuthGuard
        // Ideally AuthGuard should be the source of truth, but reviews.js had complex logic fallback.
        // Let's rely on AuthGuard primarily, and Firebase as backup
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

        try {
            const localUser = window.AuthGuard?.getUser?.();
            if (localUser && localUser.isLoggedIn) {
                const email = localUser.email || '';
                const name = email || localUser.name || '사용자'; 
                return {
                    userId: email || name || 'user',
                    userName: name,
                    email: localUser.email
                };
            }
        } catch (e) {}

        return null;
    }

    formatDate(isoString) {
        if (!isoString) return '방금 전';
        const date = new Date(isoString);
        return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
    }

    async toggleComments(reviewId) {
        const section = document.getElementById(`comments-${reviewId}`);
        if (!section) return;

        // Toggle visibility
        const isVisible = section.style.display === 'block';
        section.style.display = isVisible ? 'none' : 'block';

        // Toggle button active state
        const btn = document.querySelector(`.review-item[data-id="${reviewId}"] .btn-toggle-comments`);
        if (btn) btn.classList.toggle('active', !isVisible);

        if (!isVisible) {
            // If opening, load comments
            await this.loadComments(reviewId);
        }
    }

    async loadComments(reviewId) {
        const section = document.getElementById(`comments-${reviewId}`);
        if (!section) return;

        try {
            if (!window.db) throw new Error('DB not initialized');

            const snap = await window.db
                .collection('reviews')
                .doc(reviewId)
                .collection('comments')
                .orderBy('createdAt', 'asc')
                .get();

            const comments = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
                };
            });

            this.renderCommentsSection(reviewId, comments);
        } catch (e) {
            console.error('Load comments error:', e);
            section.innerHTML = '<div style="color:red; font-size: 0.8rem; padding:10px;">댓글을 불러오는데 실패했습니다.</div>';
        }
    }

    renderCommentsSection(reviewId, comments) {
        const section = document.getElementById(`comments-${reviewId}`);
        if (!section) return;

        const currentUser = this.getCurrentUser();
        const isLoggedIn = !!currentUser;

        let html = '';

        // 1. Comment List
        html += '<div class="comment-list">';
        if (comments.length === 0) {
            html += '<div style="color: #666; font-size: 0.85rem; padding: 10px 0;">작성된 댓글이 없습니다.</div>';
        } else {
            comments.forEach(c => {
                const isMyComment = currentUser && (c.userId === currentUser.userId);
                const initial = c.userName ? c.userName.charAt(0).toUpperCase() : '?';
                
                // Note: Using commentManager global instance
                html += `
                <div class="comment-item" id="comment-${c.id}">
                    <div class="comment-avatar">${initial}</div>
                    <div class="comment-content-wrapper">
                        <div class="comment-header">
                            <span class="comment-author">${c.userName || '익명'}</span>
                            <div class="comment-meta">
                                <span class="comment-date">${this.formatDate(c.createdAt)}</span>
                                ${isMyComment ? `
                                <div class="comment-actions">
                                    <button class="btn-comment-action" onclick="commentManager.editComment('${reviewId}', '${c.id}')">수정</button>
                                    <button class="btn-comment-action delete" onclick="commentManager.deleteComment('${reviewId}', '${c.id}')">삭제</button>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="comment-text" id="comment-text-${c.id}">${c.text}</div>
                        <div id="comment-edit-${c.id}" style="display: none;"></div>
                    </div>
                </div>
                `;
            });
        }
        html += '</div>';

        // 2. Write Form (Only if logged in)
        if (isLoggedIn) {
            html += `
            <div class="comment-form">
                <textarea id="comment-input-${reviewId}" class="comment-input" placeholder="댓글을 작성해보세요..."></textarea>
                <button class="btn-submit-comment" onclick="commentManager.addComment('${reviewId}')">등록</button>
            </div>
            `;
        } else {
            html += `
            <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 6px; text-align: center; font-size: 0.85rem; color: #888;">
                <a href="login.html" style="color: var(--color-accent); text-decoration: underline;">로그인</a> 후 댓글을 작성할 수 있습니다.
            </div>
            `;
        }

        section.innerHTML = html;
    }

    async addComment(reviewId) {
        const input = document.getElementById(`comment-input-${reviewId}`);
        if (!input) return;

        const text = input.value.trim();
        if (!text) return alert('댓글 내용을 입력해주세요.');

        const currentUser = this.getCurrentUser();
        if (!currentUser) return alert('로그인이 필요합니다.');

        try {
            // Add comment to Firestore
            await window.db.collection('reviews').doc(reviewId).collection('comments').add({
                text,
                userId: currentUser.userId,
                userName: currentUser.userName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Create notification for review author
            try {
                // Fetch review to get author info
                console.log('[DEBUG] Fetching review document:', reviewId);
                const reviewDoc = await window.db.collection('reviews').doc(reviewId).get();
                if (reviewDoc.exists) {
                    const reviewData = reviewDoc.data();
                    const reviewAuthorId = reviewData.userId;
                    
                    console.log('[DEBUG] Review data:', reviewData);
                    console.log('[DEBUG] Review author ID:', reviewAuthorId);
                    console.log('[DEBUG] Current user ID:', currentUser.userId);
                    
                    // Only create notification if commenter is not theauthor
                    if (reviewAuthorId && reviewAuthorId !== currentUser.userId) {
                        // Truncate comment text for preview
                        const commentPreview = text.length > 50 ? text.substring(0, 50) + '...' : text;
                        
                        // Create notification document
                        await window.db.collection('notifications').add({
                            recipientId: reviewAuthorId,
                            reviewId: reviewId,
                            placeId: reviewData.placeId || '',
                            commenterName: currentUser.userName,
                            commentText: commentPreview,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            read: false
                        });
                        
                        console.log('[DEBUG] ✅ Notification created successfully!');
                    } else {
                        console.log('[DEBUG] ⚠️ Notification NOT created - self-comment detected');
                    }
                }
            } catch (notifError) {
                console.error('Error creating notification:', notifError);
                // Don't show error to user - notification creation is not critical
            }

            // Reload comments
            await this.loadComments(reviewId);
        } catch (e) {
            console.error('Add comment error:', e);
            alert('댓글 등록 실패');
        }
    }

    async deleteComment(reviewId, commentId) {
        if (!confirm('댓글을 삭제하시겠습니까?')) return;
        try {
            await window.db.collection('reviews').doc(reviewId).collection('comments').doc(commentId).delete();
            await this.loadComments(reviewId);
        } catch (e) {
            console.error('Delete comment error', e);
            alert('삭제 실패');
        }
    }

    editComment(reviewId, commentId) {
        const textEl = document.getElementById(`comment-text-${commentId}`);
        const editContainer = document.getElementById(`comment-edit-${commentId}`);
        
        if (!textEl) return;
        const currentText = textEl.innerText; 

        if (textEl) textEl.style.display = 'none';
        if (editContainer) {
            editContainer.style.display = 'block';
            editContainer.innerHTML = `
                <div class="comment-edit-form">
                    <textarea class="comment-edit-input" id="edit-input-${commentId}">${currentText}</textarea>
                    <div class="comment-edit-actions">
                        <button class="btn-comment-cancel" onclick="commentManager.cancelEditComment('${reviewId}', '${commentId}')">취소</button>
                        <button class="btn-comment-save" onclick="commentManager.saveEditComment('${reviewId}', '${commentId}')">저장</button>
                    </div>
                </div>
            `;
        }
    }

    cancelEditComment(reviewId, commentId) {
        const textEl = document.getElementById(`comment-text-${commentId}`);
        const editContainer = document.getElementById(`comment-edit-${commentId}`);
        
        if (textEl) textEl.style.display = 'block';
        if (editContainer) {
            editContainer.innerHTML = '';
            editContainer.style.display = 'none';
        }
    }

    async saveEditComment(reviewId, commentId) {
        const input = document.getElementById(`edit-input-${commentId}`);
        if (!input) return;
        const newText = input.value.trim();
        if (!newText) return alert('내용을 입력해주세요.');

        try {
            await window.db.collection('reviews').doc(reviewId).collection('comments').doc(commentId).update({
                text: newText,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await this.loadComments(reviewId);
        } catch (e) {
            console.error('Update comment error:', e);
            alert('수정 실패');
        }
    }
}

// Instantiate Global manager
const commentManager = new CommentManager();
