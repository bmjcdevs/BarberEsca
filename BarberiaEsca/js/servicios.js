// Mobile hamburger toggle animation
const srvToggler = document.querySelector('.navbar-toggler');
const srvHamburger = document.getElementById('srv-mobile-menu');

if (srvToggler && srvHamburger) {
    srvToggler.addEventListener('click', () => {
        srvHamburger.classList.toggle('active');
    });
}

// Close on nav link click
document.querySelectorAll('.srv-nav-link').forEach(link => {
    link.addEventListener('click', () => {
        const collapse = document.getElementById('srvNavbar');
        if (collapse && collapse.classList.contains('show')) {
            bootstrap.Collapse.getInstance(collapse)?.hide();
            if (srvHamburger) {
                srvHamburger.classList.remove('active');
            }
        }
    });
});

function selectServiceCard(card) {
    if (!card) return;

    document.querySelectorAll('.srv-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    const titleEl = card.querySelector('.srv-card-title');
    if (titleEl) {
        const serviceText = titleEl.textContent.trim().replace(/\s+/g, ' ');
        localStorage.setItem('selected_service_name', serviceText.toUpperCase());
    }

    if (card.dataset.price) {
        localStorage.setItem('selected_service_price', card.dataset.price);
    }
}

document.querySelectorAll('.srv-card').forEach(card => {
    card.addEventListener('click', () => selectServiceCard(card));
});

document.addEventListener('DOMContentLoaded', () => {
    const defaultCard = document.getElementById('corte-degradado') || document.querySelector('.srv-card');
    selectServiceCard(defaultCard);
});
