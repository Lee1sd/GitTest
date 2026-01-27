class Lightbox {
    constructor() {
        this.init();
    }

    init() {
        // Create Lightbox DOM elements if not exist
        if (!document.getElementById('lightbox-overlay')) {
            this.createDOM();
        }

        this.overlay = document.getElementById('lightbox-overlay');
        this.img = document.getElementById('lightbox-img');
        this.video = document.getElementById('lightbox-video'); // New video element
        this.closeBtn = document.getElementById('lightbox-close');

        this.bindEvents();
    }

    createDOM() {
        const overlay = document.createElement('div');
        overlay.id = 'lightbox-overlay';
        overlay.className = 'lightbox-overlay';

        const img = document.createElement('img');
        img.id = 'lightbox-img';
        img.className = 'lightbox-content';
        img.style.display = 'none'; // Initially hidden
        img.alt = 'Enlarged view';

        const video = document.createElement('video'); // Create video element
        video.id = 'lightbox-video';
        video.className = 'lightbox-content';
        video.controls = true;
        video.style.display = 'none'; // Initially hidden
        
        const closeBtn = document.createElement('button');
        closeBtn.id = 'lightbox-close';
        closeBtn.className = 'lightbox-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.ariaLabel = 'Close lightbox';

        overlay.appendChild(closeBtn);
        overlay.appendChild(img);
        overlay.appendChild(video);
        document.body.appendChild(overlay);
    }

    bindEvents() {
        // Event delegation for opening media
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // 1. Image Click
            if (target.tagName === 'IMG') {
                const parent = target.parentElement;
                
                // Check if it's a gallery image or review image
                // Also check if it's inside .place-modal__gallery (added this check)
                if (parent.classList.contains('review-media') || 
                    parent.id === 'modal-gallery' || 
                    parent.classList.contains('place-modal__gallery') ||
                    target.closest('.review-media') ||
                    target.closest('#modal-gallery')) {
                    
                    this.open(target.src, 'image');
                }
            } 
            // 2. Video Click (might be clicking the video element itself or a wrapper)
            else if (target.tagName === 'VIDEO') {
                 const parent = target.parentElement;
                 if (parent.classList.contains('review-media') || 
                     target.closest('.review-media')) {
                     
                     e.preventDefault(); // Prevent default play behavior if we want to open in lightbox
                     // But usually users expect inline play or lightbox? 
                     // Requirement: "동영상도 누르면 재생되도록" -> implies lightbox play if it's for enlargement
                     this.open(target.src || target.currentSrc, 'video');
                 }
            }
        });

        // Close events
        this.closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                this.close();
            }
        });
    }

    open(src, type = 'image') {
        // Reset valid displays
        this.img.style.display = 'none';
        this.video.style.display = 'none';
        this.video.pause(); // Ensure video stops
        this.video.src = '';

        if (type === 'video') {
            this.video.src = src;
            this.video.style.display = 'block';
            // Optional: Auto play
            try {
                this.video.play(); 
            } catch(e) {
                console.log("Auto-play blocked or failed", e);
            }
        } else {
            this.img.src = src;
            this.img.style.display = 'block';
        }

        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    close() {
        this.overlay.classList.remove('active');
        this.video.pause(); // Stop video
        
        setTimeout(() => {
            this.img.src = '';
            this.video.src = '';
        }, 300); // Wait for transition
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.lightbox = new Lightbox();
});
