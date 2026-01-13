// ReLoop Navigation & Interactions

document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initAnimations();
    initInteractions();
});

// Navigation state management
function initNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
}

// Smooth page transitions
function navigateTo(page) {
    const container = document.querySelector('.app-container');
    container.style.opacity = '0';
    container.style.transform = 'translateX(-10px)';

    setTimeout(() => {
        window.location.href = page;
    }, 150);
}

// Micro-animations
function initAnimations() {
    // Fade in elements on load
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        setTimeout(() => {
            el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 50);
    });

    // Stagger animations for lists
    const staggerItems = document.querySelectorAll('.stagger-item');
    staggerItems.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        setTimeout(() => {
            el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 100 + (index * 80));
    });
}

// Interactive elements
function initInteractions() {
    // Button ripple effect
    const buttons = document.querySelectorAll('.btn, .icon-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);

            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
            ripple.style.top = e.clientY - rect.top - size / 2 + 'px';

            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Product card hover effects
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-4px)';
        });
        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0)';
        });
    });

    // Category pill selection
    const categoryPills = document.querySelectorAll('.category-pill');
    categoryPills.forEach(pill => {
        pill.addEventListener('click', function () {
            categoryPills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Coin counter animation
function animateCounter(element, target, duration = 1000) {
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined icon">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span>
        <span class="message">${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Modal handling
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// Image upload preview
function handleImageUpload(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Countdown timer for expiring items
function startCountdown(elementId, endDate) {
    const element = document.getElementById(elementId);

    function update() {
        const now = new Date().getTime();
        const distance = endDate - now;

        if (distance < 0) {
            element.textContent = 'Expired';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        element.textContent = `${days}d ${hours}h left`;
    }

    update();
    setInterval(update, 60000);
}

// Local storage helpers for coins and user data
const Storage = {
    get(key, defaultValue = null) {
        const item = localStorage.getItem(`reloop_${key}`);
        return item ? JSON.parse(item) : defaultValue;
    },

    set(key, value) {
        localStorage.setItem(`reloop_${key}`, JSON.stringify(value));
    },

    getCoins() {
        return this.get('coins', 850);
    },

    setCoins(amount) {
        this.set('coins', amount);
    },

    addCoins(amount) {
        const current = this.getCoins();
        this.setCoins(current + amount);
        return current + amount;
    }
};

// Update coin display across pages
function updateCoinDisplay() {
    const coinElements = document.querySelectorAll('.coin-value');
    const coins = Storage.getCoins();
    coinElements.forEach(el => {
        el.textContent = coins;
    });
}

// Initialize coin display on page load
document.addEventListener('DOMContentLoaded', updateCoinDisplay);
