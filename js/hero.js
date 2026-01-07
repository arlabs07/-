
document.addEventListener('DOMContentLoaded', () => {
    
    // PERFORMANCE OPTIMIZATION:
    // Check for reduced motion preference or low concurrency (indicative of low-end device)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    
    // 1. Parallax Background Effect
    const stars = document.querySelector('.stars');
    const grid = document.querySelector('.grid-overlay');

    // Only enable scroll listeners if device is capable and user hasn't requested reduced motion
    if (!prefersReducedMotion && !isLowEndDevice && (stars || grid)) {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrolled = window.scrollY;
                    
                    // Stars move at half speed (depth effect: further away)
                    if (stars) {
                        stars.style.transform = `translateY(${scrolled * 0.5}px)`;
                    }
                    
                    // Grid moves slightly faster than stars
                    if (grid) {
                        grid.style.transform = `translateY(${scrolled * 0.3}px)`;
                    }

                    ticking = false;
                });

                ticking = true;
            }
        }, { passive: true });
    }

    // 2. 3D Tilt Effect for Code Card
    // Only enabled on DESKTOP and HIGH-END devices to save battery
    const card = document.querySelector('.glass-code-card');
    const container = document.querySelector('.hero-section');
    
    // Strict check: Desktop width AND not low-end AND not reduced motion
    const canTilt = window.matchMedia("(min-width: 1024px)").matches && !isLowEndDevice && !prefersReducedMotion;

    if (canTilt && card && container) {
        let tiltTicking = false;

        container.addEventListener('mousemove', (e) => {
            if (!tiltTicking) {
                window.requestAnimationFrame(() => {
                    const xAxis = (window.innerWidth / 2 - e.pageX) / 30;
                    const yAxis = (window.innerHeight / 2 - e.pageY) / 30;
                    // Limit rotation to be subtle
                    card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
                    tiltTicking = false;
                });
                tiltTicking = true;
            }
        }, { passive: true });

        // Reset when mouse leaves
        container.addEventListener('mouseleave', () => {
            card.style.transform = 'rotateY(0deg) rotateX(10deg)'; // Return to default
        });
    } else {
        // Fallback for low-end devices: Static pleasing angle
        if (card) card.style.transform = 'rotateY(0deg) rotateX(0deg)'; 
    }

});
