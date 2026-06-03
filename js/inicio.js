// Configuración para sincronizar animaciones con el botón de hamburguesa de Bootstrap
const navbarToggler = document.querySelector('.navbar-toggler');
const menuToggle = document.getElementById('mobile-menu');

if (navbarToggler && menuToggle) {
    navbarToggler.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
    });
}

// Cerrar el menú al hacer clic en un enlace en móviles
const navLinks = document.querySelectorAll('.nav-link');
const navbarCollapse = document.getElementById('navbarNav');

if (navLinks && navbarCollapse) {
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbarCollapse.classList.contains('show')) {
                const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                if (bsCollapse) {
                    bsCollapse.hide();
                }
                if (menuToggle) {
                    menuToggle.classList.remove('active');
                }
            }
        });
    });
}
    // Galería: abrir imagen completa en modal al hacer clic
    const galleryModal = document.getElementById('galleryModal');
    const galleryModalImage = document.getElementById('galleryModalImage');
    const galleryImages = document.querySelectorAll('.gallery .gallery-item img');

    if (galleryModal && galleryModalImage && galleryImages.length > 0) {
        galleryImages.forEach(image => {
            image.addEventListener('click', () => {
                galleryModalImage.src = image.src;
                galleryModalImage.alt = image.alt || 'Corte completo';
                const bsGalleryModal = new bootstrap.Modal(galleryModal);
                bsGalleryModal.show();
            });
        });
    }