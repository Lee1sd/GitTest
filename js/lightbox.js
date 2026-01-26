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
        img.src = '';
        img.alt = 'Enlarged view';

        const closeBtn = document.createElement('button');
        closeBtn.id = 'lightbox-close';
        closeBtn.className = 'lightbox-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.ariaLabel = 'Close lightbox';

        overlay.appendChild(closeBtn);
        overlay.appendChild(img);
        document.body.appendChild(overlay);
    }

    bindEvents() {
        // Event delegation for opening images
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Check if the clicked element is an image that should be enlargeable
            // We targeting images in:
            // 1. .review-media (Review images)
            // 2. #modal-gallery (Place detail gallery)
            // 3. Any other specific areas if needed
            
            if (target.tagName === 'IMG') {
                const parent = target.parentElement;
                
                // Check if it's a gallery image or review image
                if (parent.classList.contains('review-media') || 
                    parent.id === 'modal-gallery' || 
                    target.closest('.review-media') ||
                    target.closest('#modal-gallery')) {
                    
                    this.open(target.src);
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

    open(src) {
        this.img.src = src;
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    close() {
        this.overlay.classList.remove('active');
        setTimeout(() => {
            this.img.src = '';
        }, 300); // Wait for transition
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.lightbox = new Lightbox();
});
