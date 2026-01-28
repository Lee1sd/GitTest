// Notification Manager Class
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unsubscribe = null;
        this.currentUser = null;
    }

    // Initialize notification system
    async init() {
        // Load notification panel component first
        await this.loadComponent();
        
        this.currentUser = this.getCurrentUser();
        
        if (!this.currentUser) {
            // User not logged in, hide notification UI
            this.hideNotificationUI();
            return;
        }

        // Show notification UI
        this.showNotificationUI();
        
        // Start listening for notifications
        this.startListening();
        
        // Bind events
        this.bindEvents();
    }

    // Load the notification panel component
    async loadComponent() {
        try {
            // Find the container (or create it if needed)
            let container = document.getElementById('notification-panel-container');
            
            // If no dedicated container, look for existing notification-container
            if (!container) {
                const existing = document.querySelector('.notification-container');
                if (existing) {
                    // Component already loaded manually, no need to load again
                    return;
                }
            }
            
            const response = await fetch('components/notification-panel.html');
            if (!response.ok) {
                console.warn('[Notification] Failed to load component, using existing HTML');
                return;
            }
            
            const html = await response.text();
            
            if (container) {
                container.innerHTML = html;
            } else {
                // If no container found, append to header controls
                const headerControls = document.querySelector('.header__controls');
                if (headerControls) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    headerControls.appendChild(tempDiv.firstElementChild);
                }
            }
            
            console.log('[Notification] Component loaded successfully');
        } catch (error) {
            console.error('[Notification] Error loading component:', error);
        }
    }

    getCurrentUser() {
        // Try Firebase Auth first
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

        // Fallback to AuthGuard
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

    showNotificationUI() {
        const container = document.querySelector('.notification-container');
        if (container) {
            container.classList.add('visible');
        }
    }

    hideNotificationUI() {
        const container = document.querySelector('.notification-container');
        if (container) {
            container.classList.remove('visible');
        }
    }

    bindEvents() {
        const btn = document.querySelector('.notification-btn');
        const dropdown = document.querySelector('.notification-dropdown');
        
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    toggleDropdown() {
        const dropdown = document.querySelector('.notification-dropdown');
        const btn = document.querySelector('.notification-btn');
        
        if (dropdown && btn) {
            const isActive = dropdown.classList.contains('active');
            
            if (isActive) {
                this.closeDropdown();
            } else {
                this.openDropdown();
            }
        }
    }

    openDropdown() {
        const dropdown = document.querySelector('.notification-dropdown');
        const btn = document.querySelector('.notification-btn');
        
        if (dropdown && btn) {
            dropdown.classList.add('active');
            btn.classList.add('active');
        }
    }

    closeDropdown() {
        const dropdown = document.querySelector('.notification-dropdown');
        const btn = document.querySelector('.notification-btn');
        
        if (dropdown && btn) {
            dropdown.classList.remove('active');
            btn.classList.remove('active');
        }
    }

    startListening() {
        if (!window.db || !this.currentUser) return;

        try {
            // Listen for notifications in real-time
            this.unsubscribe = window.db
                .collection('notifications')
                .where('recipientId', '==', this.currentUser.userId)
                .where('read', '==', false)
                .orderBy('createdAt', 'desc')
                .onSnapshot((snapshot) => {
                    this.notifications = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    this.render();
                }, (error) => {
                    console.error('Error listening to notifications:', error);
                });
        } catch (error) {
            console.error('Error starting notification listener:', error);
        }
    }

    stopListening() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    render() {
        this.renderBadge();
        this.renderDropdown();
    }

    renderBadge() {
        const btn = document.querySelector('.notification-btn');
        if (!btn) return;

        // Remove existing badge
        const existingBadge = btn.querySelector('.notification-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Add new badge if there are notifications
        if (this.notifications.length > 0) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.textContent = this.notifications.length > 99 ? '99+' : this.notifications.length;
            btn.appendChild(badge);
        }
    }

    renderDropdown() {
        const list = document.querySelector('.notification-list');
        if (!list) return;

        const countEl = document.querySelector('.notification-count');
        if (countEl) {
            countEl.textContent = `${this.notifications.length}개`;
        }

        if (this.notifications.length === 0) {
            list.innerHTML = `
                <div class="notification-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <p>새로운 알림이 없습니다</p>
                </div>
            `;
            return;
        }

        list.innerHTML = this.notifications.map(notif => this.renderNotificationItem(notif)).join('');
    }

    renderNotificationItem(notif) {
        const timeAgo = this.getTimeAgo(notif.createdAt);
        const commentPreview = notif.commentText || '';
        
        return `
            <div class="notification-item" onclick="notificationManager.handleNotificationClick('${notif.id}', '${notif.reviewId}', '${notif.placeId}')">
                <div class="notification-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                </div>
                <div class="notification-content">
                    <div class="notification-text">
                        <strong>${this.escapeHtml(notif.commenterName)}</strong>님이 회원님의 리뷰에 댓글을 남겼습니다
                    </div>
                    ${commentPreview ? `<div class="notification-preview">"${this.escapeHtml(commentPreview)}"</div>` : ''}
                    <div class="notification-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getTimeAgo(timestamp) {
        if (!timestamp) return '방금 전';
        
        let date;
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            date = timestamp.toDate();
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            date = new Date(timestamp);
        }

        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays < 7) return `${diffDays}일 전`;
        
        return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    }

    async handleNotificationClick(notificationId, reviewId, placeId) {
        try {
            // Delete notification first
            await this.deleteNotification(notificationId);
            
            // Close dropdown
            this.closeDropdown();
            
            // Navigate to explore.html with parameters
            const currentPage = window.location.pathname;
            const targetUrl = `explore.html?reviewId=${reviewId}&placeId=${placeId}`;
            
            if (currentPage.includes('explore.html')) {
                // Already on explore page, just update URL and trigger modal
                window.location.href = targetUrl;
                window.location.reload();
            } else {
                // Navigate to explore page
                window.location.href = targetUrl;
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
            alert('알림을 처리하는 중 오류가 발생했습니다.');
        }
    }

    async deleteNotification(notificationId) {
        if (!window.db) return;

        try {
            await window.db.collection('notifications').doc(notificationId).delete();
            console.log('Notification deleted:', notificationId);
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }

    destroy() {
        this.stopListening();
    }
}

// Global instance
const notificationManager = new NotificationManager();

// Initialize when DOM is ready and Firebase is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be ready
    const initNotifications = () => {
        if (window.db) {
            notificationManager.init();
        } else {
            // Retry after a short delay
            setTimeout(initNotifications, 500);
        }
    };
    
    initNotifications();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    notificationManager.destroy();
});
