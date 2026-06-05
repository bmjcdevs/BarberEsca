// ============================================================
//  agenda.js — Lee horarios bloqueados desde Firestore
// ============================================================

// Mobile navbar hamburger toggle
const agdToggler = document.querySelector('.navbar-toggler');
const agdHamburger = document.getElementById('agd-mobile-menu');

if (agdToggler && agdHamburger) {
    agdToggler.addEventListener('click', () => {
        agdHamburger.classList.toggle('active');
    });
}

// Close on nav link click in mobile view
document.querySelectorAll('.agd-nav-link').forEach(link => {
    link.addEventListener('click', () => {
        const collapse = document.getElementById('agdNavbar');
        if (collapse && collapse.classList.contains('show')) {
            bootstrap.Collapse.getInstance(collapse)?.hide();
            if (agdHamburger) {
                agdHamburger.classList.remove('active');
            }
        }
    });
});

// CALENDAR LOGIC
let currentDate = new Date();
let selectedDay = null;
let selectedTime = null;

const monthNames = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

const dayNames = [
    "DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"
];

function getDayScheduleType(year, month, day) {
    const dayOfWeek = new Date(year, month, day).getDay();
    if (dayOfWeek === 0) return 'closed';
    if (dayOfWeek === 6) return 'saturday';
    return 'weekday';
}

function isSlotAllowedForSchedule(btnSchedule, scheduleType) {
    if (scheduleType === 'closed') return false;
    if (btnSchedule === 'both') return true;
    return btnSchedule === scheduleType;
}

function updateScheduleSections(scheduleType) {
    const satMorning = document.getElementById('agd-section-saturday-morning');
    const middayHours = document.getElementById('agd-midday-hours');
    const afternoonHours = document.getElementById('agd-afternoon-hours');
    const eveningHours = document.getElementById('agd-evening-hours');

    if (satMorning) {
        satMorning.style.display = scheduleType === 'saturday' ? '' : 'none';
    }
    if (middayHours) {
        middayHours.textContent = '/ 12:00 - 15:00';
    }
    if (afternoonHours) {
        afternoonHours.textContent = '/ 15:00 - 18:00';
    }
    if (eveningHours) {
        eveningHours.textContent = '/ 19:00 - 21:00';
    }
}

// Cache de citas de Firestore para la sesión
let cachedAppointments = [];
let cachedSobrecupos = [];

// Cargar todas las citas desde Firestore una sola vez al iniciar
async function loadAppointmentsFromFirestore() {
    try {
        const snapshot = await db.collection('citas').get();
        cachedAppointments = snapshot.docs.map(doc => doc.data());

        const sobSnapshot = await db.collection('sobrecupos').get();
        cachedSobrecupos = sobSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error cargando citas desde Firebase:', error);
        cachedAppointments = [];
        cachedSobrecupos = [];
    }
}

function isMonthAllowed(year, month) {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    
    // Diferencia en meses entre la fecha objetivo y hoy
    const monthDiff = (year - todayYear) * 12 + (month - todayMonth);
    
    // No permitir meses pasados
    if (monthDiff < 0) return false;
    
    // El mes actual siempre está permitido
    if (monthDiff === 0) return true;
    
    // El mes siguiente está permitido SOLO si el día de hoy es >= 15
    if (monthDiff === 1) {
        return today.getDate() >= 15;
    }
    
    // Más allá del mes siguiente no está permitido
    return false;
}

function renderCalendar(date) {
    const daysContainer = document.getElementById('calendar-days');
    const monthYearTitle = document.getElementById('calendar-month-year');

    if (!daysContainer || !monthYearTitle) return;

    daysContainer.innerHTML = '';

    const year = date.getFullYear();
    const month = date.getMonth();

    monthYearTitle.textContent = `${monthNames[month]} ${year}`;

    // Habilitar/deshabilitar botones de navegación de mes
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) {
        const prevMonthDate = new Date(year, month - 1, 1);
        if (isMonthAllowed(prevMonthDate.getFullYear(), prevMonthDate.getMonth())) {
            prevBtn.removeAttribute('disabled');
            prevBtn.style.opacity = '1';
            prevBtn.style.pointerEvents = 'auto';
        } else {
            prevBtn.setAttribute('disabled', 'true');
            prevBtn.style.opacity = '0.3';
            prevBtn.style.pointerEvents = 'none';
        }
    }

    if (nextBtn) {
        const nextMonthDate = new Date(year, month + 1, 1);
        if (isMonthAllowed(nextMonthDate.getFullYear(), nextMonthDate.getMonth())) {
            nextBtn.removeAttribute('disabled');
            nextBtn.style.opacity = '1';
            nextBtn.style.pointerEvents = 'auto';
        } else {
            nextBtn.setAttribute('disabled', 'true');
            nextBtn.style.opacity = '0.3';
            nextBtn.style.pointerEvents = 'none';
        }
    }

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();
    const today = new Date();

    // Días del mes anterior (deshabilitados)
    for (let x = firstDayIndex; x > 0; x--) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('agd-day', 'disabled');
        dayDiv.textContent = prevLastDay - x + 1;
        daysContainer.appendChild(dayDiv);
    }

    // Días del mes actual
    for (let i = 1; i <= lastDay; i++) {
        const dayBtn = document.createElement('button');
        dayBtn.classList.add('agd-day');
        dayBtn.textContent = i;

        // Deshabilitar días pasados
        const thisDay = new Date(year, month, i);
        const isToday = thisDay.toDateString() === today.toDateString();
        const isPast = thisDay < today && !isToday;
        const isSunday = thisDay.getDay() === 0;

        if (isPast || isSunday) {
            dayBtn.classList.add('disabled');
            dayBtn.setAttribute('disabled', 'true');
            if (isSunday) {
                dayBtn.title = 'Domingo cerrado';
            }
        } else {
            if (i === selectedDay) {
                dayBtn.classList.add('selected');
            }

            dayBtn.addEventListener('click', () => {
                document.querySelectorAll('.agd-day').forEach(d => {
                    d.classList.remove('selected');
                });

                dayBtn.classList.add('selected');
                selectedDay = i;

                updateSummary();
                initTimeSlots(); // Actualizar horarios bloqueados para el día seleccionado
            });
        }

        daysContainer.appendChild(dayBtn);
    }

    // Días del mes siguiente (deshabilitados)
    const totalRendered = firstDayIndex + lastDay;
    const remainingDays = 42 - totalRendered;

    for (let j = 1; j <= remainingDays; j++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('agd-day', 'disabled');
        dayDiv.textContent = j;
        daysContainer.appendChild(dayDiv);
    }
}

// Navigation entre meses
document.getElementById('prev-month')?.addEventListener('click', () => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    if (isMonthAllowed(targetDate.getFullYear(), targetDate.getMonth())) {
        currentDate.setMonth(currentDate.getMonth() - 1);
        selectedDay = null;
        selectedTime = null;
        renderCalendar(currentDate);
        initTimeSlots();
        updateSummary();
    }
});

document.getElementById('next-month')?.addEventListener('click', () => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (isMonthAllowed(targetDate.getFullYear(), targetDate.getMonth())) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        selectedDay = null;
        selectedTime = null;
        renderCalendar(currentDate);
        initTimeSlots();
        updateSummary();
    }
});

// TIME SLOTS LOGIC — usa caché de Firestore
function initTimeSlots() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const scheduleType = selectedDay !== null
        ? getDayScheduleType(year, month, selectedDay)
        : 'weekday';

    updateScheduleSections(scheduleType);

    const shortMonth = monthNames[month].substring(0, 3).toUpperCase();
    const formattedSelectedDate = selectedDay !== null
        ? `${selectedDay} ${shortMonth}, ${year}`
        : '';

    // 1. Limpiar botones de sobrecupos anteriores
    document.querySelectorAll('.agd-time-btn-overbook').forEach(btn => btn.remove());

    // 2. Obtener sobrecupos para el día seleccionado
    const overbookConfig = formattedSelectedDate
        ? cachedSobrecupos.find(sob => sob.id === formattedSelectedDate)
        : null;
    const overbookSlots = overbookConfig ? Number(overbookConfig.slots) || 0 : 0;

    // 3. Inyectar botones si hay sobrecupos
    const eveningGrid = document.querySelector('#agd-section-evening .agd-time-grid');
    if (eveningGrid && overbookSlots > 0) {
        const startHour = 21;
        for (let s = 0; s < overbookSlots; s++) {
            const hour = startHour + s;
            const timeStr = `${hour}:00`;
            const overbookBtn = document.createElement('button');
            overbookBtn.className = 'agd-time-btn agd-time-btn-overbook';
            overbookBtn.setAttribute('data-time', timeStr);
            overbookBtn.setAttribute('data-schedule', 'both');
            overbookBtn.textContent = timeStr;
            eveningGrid.appendChild(overbookBtn);
        }
    }

    // 4. Actualizar texto de rango de horas de la noche
    const eveningHours = document.getElementById('agd-evening-hours');
    if (eveningHours) {
        eveningHours.textContent = overbookSlots > 0
            ? `/ 19:00 - ${21 + overbookSlots}:00`
            : '/ 19:00 - 21:00';
    }

    // 5. Query de todos los botones de hora (incluyendo los recién inyectados)
    const timeButtons = document.querySelectorAll('.agd-time-btn');

    // Horarios bloqueados para la fecha seleccionada (desde Firestore)
    const bookedTimesForDate = formattedSelectedDate
        ? cachedAppointments
            .filter(app => app.date === formattedSelectedDate && app.status !== 'CANCELADA')
            .map(app => app.time)
        : [];

    // Validar si el día seleccionado es el día de hoy
    const today = new Date();
    const isSelectedDayToday = selectedDay !== null &&
                               year === today.getFullYear() &&
                               month === today.getMonth() &&
                               selectedDay === today.getDate();

    timeButtons.forEach(btn => {
        const btnTime = btn.getAttribute('data-time');
        const btnSchedule = btn.getAttribute('data-schedule') || 'both';

        btn.classList.remove('disabled');
        btn.removeAttribute('disabled');

        // Verificar si la hora del botón ya pasó hoy
        let isPastTime = false;
        if (isSelectedDayToday) {
            const [btnHour, btnMin] = btnTime.split(':').map(Number);
            const currentHour = today.getHours();
            const currentMin = today.getMinutes();
            if (btnHour < currentHour || (btnHour === currentHour && btnMin <= currentMin)) {
                isPastTime = true;
            }
        }

        const outsideHours = selectedDay === null || !isSlotAllowedForSchedule(btnSchedule, scheduleType);
        if (outsideHours || bookedTimesForDate.includes(btnTime) || isPastTime) {
            btn.classList.add('disabled');
            btn.setAttribute('disabled', 'true');
            if (selectedTime === btnTime) {
                selectedTime = null;
                btn.classList.remove('selected');
            }
        } else {
            if (selectedTime && btnTime === selectedTime) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        }

        // Reemplazar el botón para limpiar listeners anteriores
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        if (!newBtn.classList.contains('disabled')) {
            newBtn.addEventListener('click', () => {
                document.querySelectorAll('.agd-time-btn').forEach(b => b.classList.remove('selected'));
                newBtn.classList.add('selected');
                selectedTime = btnTime;
                updateSummary();
            });
        }
    });
}

// UPDATE SUMMARY CARD
function updateSummary() {
    const summaryText = document.getElementById('booking-summary-text');
    if (!summaryText) return;

    if (selectedDay !== null && selectedTime) {
        const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
        const dayName = dayNames[dateObj.getDay()];
        const shortMonth = monthNames[currentDate.getMonth()].substring(0, 3).toLowerCase();

        summaryText.innerHTML = `${dayName} ${selectedDay} ${shortMonth} •<br><span class="text-accent">${selectedTime}</span>`;
    } else {
        summaryText.textContent = "Selecciona día y hora";
    }
}

// CONFIRMACIÓN — guardar selección en localStorage y pasar a step 3
document.getElementById('btn-confirm-appointment')?.addEventListener('click', () => {
    if (selectedDay === null) {
        alert("Por favor seleccione un día para su cita.");
        return;
    }

    const scheduleType = getDayScheduleType(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        selectedDay
    );
    if (scheduleType === 'closed') {
        alert("Los domingos estamos cerrados. Por favor elige otro día.");
        return;
    }

    if (!selectedTime) {
        alert("Por favor seleccione un horario para su cita.");
        return;
    }

    const shortMonth = monthNames[currentDate.getMonth()].substring(0, 3);

    localStorage.setItem('selected_date', `${selectedDay} ${shortMonth.toUpperCase()}, ${currentDate.getFullYear()}`);
    localStorage.setItem('selected_time', selectedTime);

    const storedService = localStorage.getItem('selected_service_name');
    if (!storedService) {
        localStorage.setItem('selected_service_name', 'CORTE DEGRADADO');
        localStorage.setItem('selected_service_price', '10000');
    }
    localStorage.setItem('selected_barber_name', 'BYRON ESCALONA');

    window.location.href = 'confirmacion.html';
});

// INIT — cargar citas de Firestore, luego renderizar calendario
document.addEventListener('DOMContentLoaded', async () => {
    await loadAppointmentsFromFirestore();
    renderCalendar(currentDate);
    initTimeSlots();
    updateSummary();
});
