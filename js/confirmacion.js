// ============================================================
//  confirmacion.js — Guarda citas en Firestore (Firebase)
// ============================================================

// CONFIGURACIÓN DE EMAILJS PARA NOTIFICACIONES POR CORREO
// Regístrate gratis en emailjs.com, crea tu servicio y plantilla, y copia los IDs aquí:
const EMAILJS_PUBLIC_KEY = "TU_PUBLIC_KEY_AQUI";
const EMAILJS_SERVICE_ID = "TU_SERVICE_ID_AQUI";
const EMAILJS_TEMPLATE_ID = "TU_TEMPLATE_ID_AQUI";

// Inicializar EmailJS
if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== "TU_PUBLIC_KEY_AQUI") {
    emailjs.init({
        publicKey: EMAILJS_PUBLIC_KEY,
    });
}

// Mobile navbar hamburger toggle
const cfmToggler = document.querySelector('.navbar-toggler');
const cfmHamburger = document.getElementById('cfm-mobile-menu');

if (cfmToggler && cfmHamburger) {
    cfmToggler.addEventListener('click', () => {
        cfmHamburger.classList.toggle('active');
    });
}

// Close on nav link click in mobile view
document.querySelectorAll('.cfm-nav-link').forEach(link => {
    link.addEventListener('click', () => {
        const collapse = document.getElementById('cfmNavbar');
        if (collapse && collapse.classList.contains('show')) {
            bootstrap.Collapse.getInstance(collapse)?.hide();
            if (cfmHamburger) {
                cfmHamburger.classList.remove('active');
            }
        }
    });
});

// Load summary from localStorage (datos temporales de navegación entre páginas)
function loadBookingSummary() {
    const serviceName = localStorage.getItem('selected_service_name') || 'CORTE DEGRADADO';
    const barberName = localStorage.getItem('selected_barber_name') || 'BYRON ESCALONA';
    const dateStr = localStorage.getItem('selected_date') || '24 OCT, 2024';
    const timeStr = localStorage.getItem('selected_time') || '14:30 PM';

    const serviceEl = document.getElementById('cfm-summary-service');
    const barberEl = document.getElementById('cfm-summary-barber');
    const dateEl = document.getElementById('cfm-summary-date');
    const timeEl = document.getElementById('cfm-summary-time');

    if (serviceEl) serviceEl.textContent = serviceName;
    if (barberEl) barberEl.textContent = barberName;
    if (dateEl) dateEl.textContent = dateStr;
    if (timeEl) timeEl.textContent = timeStr;
}

const CHILE_PHONE_REGEX = /^569\d{8}$/;

function validateFullName(value) {
    const normalized = value.trim().replace(/\s+/g, ' ');
    const parts = normalized.split(' ').filter(Boolean);

    if (parts.length < 2) {
        return { valid: false, message: 'Debes ingresar nombre y apellido (mínimo dos palabras).' };
    }

    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ'-]+$/;
    const allValid = parts.every(part => part.length >= 2 && namePattern.test(part));

    if (!allValid) {
        return { valid: false, message: 'Nombre y apellido solo pueden contener letras (mínimo 2 caracteres cada uno).' };
    }

    return { valid: true, value: parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ') };
}

function normalizeChilePhone(value) {
    const digits = value.replace(/\D/g, '');

    if (digits.length === 11 && CHILE_PHONE_REGEX.test(digits)) {
        return digits;
    }

    if (digits.length === 9 && digits.startsWith('9')) {
        const withCountry = '56' + digits;
        return CHILE_PHONE_REGEX.test(withCountry) ? withCountry : null;
    }

    return null;
}

function formatChilePhone(digits) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
}

function setFieldError(inputEl, errorEl, message) {
    if (!inputEl || !errorEl) return;
    if (message) {
        inputEl.classList.add('is-invalid');
        errorEl.textContent = message;
        errorEl.classList.remove('d-none');
    } else {
        inputEl.classList.remove('is-invalid');
        errorEl.textContent = '';
        errorEl.classList.add('d-none');
    }
}

function clearFormErrors() {
    setFieldError(document.getElementById('cfm-name'), document.getElementById('cfm-name-error'), null);
    setFieldError(document.getElementById('cfm-phone'), document.getElementById('cfm-phone-error'), null);
}

// Handle Form Submission → Guardar en Firestore
const bookingForm = document.getElementById('cfm-booking-form');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFormErrors();

        const nameInput = document.getElementById('cfm-name');
        const phoneInput = document.getElementById('cfm-phone');
        const nameError = document.getElementById('cfm-name-error');
        const phoneError = document.getElementById('cfm-phone-error');

        const nameValidation = validateFullName(nameInput.value);
        if (!nameValidation.valid) {
            setFieldError(nameInput, nameError, nameValidation.message);
            nameInput.focus();
            return;
        }

        const phoneDigits = normalizeChilePhone(phoneInput.value);
        if (!phoneDigits) {
            setFieldError(
                phoneInput,
                phoneError,
                'Teléfono inválido. Usa formato chileno: 569 seguido de 8 dígitos (ej: 569 1234 5678).'
            );
            phoneInput.focus();
            return;
        }

        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'GUARDANDO...';
        }

        const name = nameValidation.value;
        const phone = formatChilePhone(phoneDigits);

        const dateStr = localStorage.getItem('selected_date') || '24 OCT, 2024';
        const timeStr = localStorage.getItem('selected_time') || '14:30 PM';
        const serviceName = localStorage.getItem('selected_service_name') || 'CORTE DEGRADADO';
        const servicePrice = localStorage.getItem('selected_service_price');
        const barberName = localStorage.getItem('selected_barber_name') || 'BYRON ESCALONA';

        const appointment = {
            id: 'FCS-' + Math.floor(1000 + Math.random() * 9000),
            name: name,
            phone: phone,
            date: dateStr,
            time: timeStr,
            service: serviceName,
            barber: barberName,
            status: 'PENDIENTE',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (servicePrice) {
            appointment.price = Number(servicePrice);
        }

        try {
            // Verificar si el horario ya está reservado por otra persona
            const querySnapshot = await db.collection('citas')
                .where('date', '==', dateStr)
                .where('time', '==', timeStr)
                .get();

            const activeAppointments = querySnapshot.docs.filter(doc => doc.data().status !== 'CANCELADA');

            if (activeAppointments.length > 0) {
                alert('Lo sentimos, este horario acaba de ser reservado por otro cliente. Por favor, selecciona otro horario.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'CONFIRMAR RESERVA';
                }
                window.location.href = 'agenda.html';
                return;
            }

            // Guardar en Firestore — colección "appointments"
            await db.collection('citas').add(appointment);



            // Enviar notificación automática por correo usando EmailJS
            if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== "TU_PUBLIC_KEY_AQUI") {
                const templateParams = {
                    to_email: "benjamin.moya11@gmail.com",
                    client_name: name,
                    client_phone: phone,
                    service: serviceName,
                    date: dateStr,
                    time: timeStr,
                    barber: barberName,
                    appointment_id: appointment.id
                };

                emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
                    .then(response => {
                        console.log('Correo de confirmación enviado con éxito!', response.status, response.text);
                    })
                    .catch(err => {
                        console.error('Error al enviar correo de confirmación:', err);
                    });
            }

            // Actualizar modal con los detalles del cliente
            const modalText = document.getElementById('modal-success-desc-text');
            if (modalText) {
                modalText.innerHTML = `Gracias <strong class="text-white">${name}</strong>.<br>Tu cita para <strong class="text-white">${serviceName}</strong> ha sido agendada con éxito el <strong class="text-accent">${dateStr}</strong> a las <strong class="text-accent">${timeStr}</strong>.`;
            }

            // Mostrar modal de éxito
            const successModalEl = document.getElementById('finalSuccessModal');
            if (successModalEl) {
                const finalSuccessModal = new bootstrap.Modal(successModalEl);
                finalSuccessModal.show();
            }
        } catch (error) {
            console.error('Error al guardar la cita en Firebase:', error);
            alert('Hubo un error al guardar tu cita. Por favor, inténtalo de nuevo.');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'CONFIRMAR RESERVA';
            }
        }
    });
}

// Redirect back to main page on close
document.getElementById('btn-modal-finish')?.addEventListener('click', () => {
    // Limpiar datos temporales de navegación (NO borramos nada de Firestore)
    localStorage.removeItem('selected_date');
    localStorage.removeItem('selected_time');
    localStorage.removeItem('selected_service_name');
    localStorage.removeItem('selected_service_price');

    // Redirigir al inicio
    window.location.href = 'index.html';
});

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadBookingSummary();
});
