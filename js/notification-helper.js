// Notification Helper Functions
// Utility functions for creating and managing notifications

/**
 * Creates a notification for a review author when someone comments
 * @param {string} reviewId - The ID of the review
 * @param {string} commentText - The comment text
 * @param {Object} currentUser - Current user object with userId and userName
 * @returns {Promise<void>}
 */
async function createCommentNotification(reviewId, commentText, currentUser) {
    try {
        if (!window.db) {
            console.warn('[Notification Helper] Firestore not initialized');
            return;
        }

        console.log('[DEBUG] Fetching review document:', reviewId);
        const reviewDoc = await window.db.collection('reviews').doc(reviewId).get();
        
        if (!reviewDoc.exists) {
            console.warn('[Notification Helper] Review not found:', reviewId);
            return;
        }

        const reviewData = reviewDoc.data();
        const reviewAuthorId = reviewData.userId;
        
        console.log('[DEBUG] Review author:', reviewAuthorId, 'Commenter:', currentUser.userId);
        
        // Only create notification if commenter is not the review author
        if (!reviewAuthorId || reviewAuthorId === currentUser.userId) {
            console.log('[DEBUG] ⚠️ Skipping notification - self-comment');
            return;
        }

        // Truncate comment text for preview
        const commentPreview = commentText.length > 50 
            ? commentText.substring(0, 50) + '...' 
            : commentText;
        
        const notifData = {
            recipientId: reviewAuthorId,
            reviewId: reviewId,
            placeId: reviewData.placeId || '',
            commenterName: currentUser.userName,
            commentText: commentPreview,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        };
        
        console.log('[DEBUG] Creating notification:', notifData);
        await window.db.collection('notifications').add(notifData);
        console.log('[DEBUG] ✅ Notification created!');
        
    } catch (error) {
        console.error('[Notification Helper] Error creating notification:', error);
        // Don't throw error - notification creation is not critical
    }
}

/**
 * Loads the notification panel component into a container
 * @param {string} containerId - ID of the container element
 * @returns {Promise<void>}
 */
async function loadNotificationPanel(containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[Notification Helper] Container not found:', containerId);
            return;
        }

        const response = await fetch('components/notification-panel.html');
        if (!response.ok) {
            throw new Error('Failed to load notification panel component');
        }
        
        const html = await response.text();
        container.innerHTML = html;
        
        console.log('[Notification Helper] Panel loaded successfully');
        
    } catch (error) {
        console.error('[Notification Helper] Error loading notification panel:', error);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createCommentNotification,
        loadNotificationPanel
    };
}
