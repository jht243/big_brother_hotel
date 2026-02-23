document.addEventListener('DOMContentLoaded', () => {

    // 1. Page View Tracking
    const urlParams = new URLSearchParams(window.location.search);
    fetch('/api/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            referrer: document.referrer || '',
            utm_source: urlParams.get('utm_source') || '',
            utm_medium: urlParams.get('utm_medium') || '',
            utm_campaign: urlParams.get('utm_campaign') || '',
            page_url: window.location.href
        })
    }).catch(() => { }); // Silent fail

    // 2. Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 3. Scroll Animations (Intersection Observer)
    const observerOptions = {
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.scroll-fade-up, .scroll-slide-left, .scroll-slide-right');
    animatedElements.forEach(el => observer.observe(el));

    // 4. A/B Testing Logic for Hero Headline
    const heroHeadline = document.getElementById('ab-hero-headline');
    const hiddenHeadlineInput = document.getElementById('abHeadlineAssigned');

    const headlineVariations = [
        "Stay for Free. Let Them Watch.",        // Pain point: cost of travel / accommodation
        "Build Your Brand. Pay Nothing.",         // Pain point: creator growth with no budget
        "The Big Brother Hotel. Zero Rent.",     // Pain point: novelty / cultural hook
        "Become Famous. One Stay at a Time."      // Pain point: I want recognition but don't know how
    ];

    if (heroHeadline && hiddenHeadlineInput) {
        let assignedHeadline = localStorage.getItem('abTestHeadline');
        if (!assignedHeadline || !headlineVariations.includes(assignedHeadline)) {
            const randomIndex = Math.floor(Math.random() * headlineVariations.length);
            assignedHeadline = headlineVariations[randomIndex];
            localStorage.setItem('abTestHeadline', assignedHeadline);
        }
        heroHeadline.textContent = assignedHeadline;
        hiddenHeadlineInput.value = assignedHeadline;
    }

    // 5. Form Submission
    const waitlistForm = document.getElementById('waitlistForm');
    const submitBtn = document.getElementById('submitBtn');
    const formSuccess = document.getElementById('formSuccess');

    if (waitlistForm) {
        waitlistForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            const formData = new FormData(waitlistForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/waitlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    waitlistForm.reset();
                    // Keep the assigned A/B tracking value intact
                    hiddenHeadlineInput.value = localStorage.getItem('abTestHeadline') || '';

                    formSuccess.classList.remove('hidden');
                    setTimeout(() => {
                        formSuccess.classList.add('hidden');
                    }, 5000);
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('An error occurred. Please try again.');
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

});
