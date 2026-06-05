// ============================================================
//  citas.js — Panel del Barbero conectado a Firestore
//  Lee, actualiza y elimina citas en tiempo real
// ============================================================

// BARBER PANEL LOGIN PIN LOGIC
const pinForm = document.getElementById('cts-pin-form');
const pinInput = document.getElementById('cts-pin-input');
const lockScreen = document.getElementById('cts-lock-screen');
const dashboardMain = document.getElementById('cts-dashboard-main');

// PIN de acceso del barbero
const SECURITY_PIN = "1234";

function showLockScreen() {
    lockScreen?.classList.remove('d-none');
    dashboardMain?.classList.add('d-none');
    if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
    }
    if (window._citasUnsubscribe) {
        window._citasUnsubscribe();
        window._citasUnsubscribe = null;
    }
    if (window._sobrecuposUnsubscribe) {
        window._sobrecuposUnsubscribe();
        window._sobrecuposUnsubscribe = null;
    }
}

function showDashboard() {
    lockScreen?.classList.add('d-none');
    dashboardMain?.classList.remove('d-none');
    loadDashboardData();
}

function initAuth() {
    showLockScreen();
}

if (pinForm) {
    pinForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (pinInput.value === SECURITY_PIN) {
            showDashboard();
        } else {
            alert("PIN incorrecto. Autenticación denegada.");
            pinInput.value = '';
            pinInput.focus();
        }
    });
}

document.getElementById('btn-logout')?.addEventListener('click', showLockScreen);

document.addEventListener('DOMContentLoaded', initAuth);

function getServicePrice(serviceName, storedPrice) {
    if (storedPrice) return Number(storedPrice) || 0;
    const service = (serviceName || '').toUpperCase();
    if (service.includes('+ BARBA') || service.includes('DEGRADADO + BARBA')) return 13000;
    if (service.includes('DEGRADADO')) return 10000;
    return 0;
}

function formatCOP(amount) {
    return '$' + amount.toLocaleString('es-CO');
}

// Función para convertir fecha y hora del formato del frontend a un objeto Date para ordenar
function parseAppointmentDateTime(dateStr, timeStr) {
    if (!dateStr) return new Date(0);

    const cleanedDate = dateStr.replace(',', '');
    const parts = cleanedDate.split(' ').filter(Boolean); // e.g. ["4", "JUN", "2026"]
    
    if (parts.length < 3) return new Date(0);

    const day = parseInt(parts[0], 10);
    const monthAbbr = parts[1].toUpperCase();
    const year = parseInt(parts[2], 10);

    const spanishMonths = {
        "ENE": 0, "FEB": 1, "MAR": 2, "ABR": 3, "MAY": 4, "JUN": 5,
        "JUL": 6, "AGO": 7, "SEP": 8, "OCT": 9, "NOV": 10, "DIC": 11
    };

    const month = spanishMonths[monthAbbr] !== undefined ? spanishMonths[monthAbbr] : 0;

    let hours = 0;
    let minutes = 0;

    if (timeStr) {
        const timeClean = timeStr.trim().toUpperCase();
        const isPM = timeClean.includes('PM');
        const isAM = timeClean.includes('AM');
        const justTime = timeClean.replace('AM', '').replace('PM', '').trim();
        const timeParts = justTime.split(':').map(Number);
        
        if (timeParts.length >= 2) {
            hours = timeParts[0];
            minutes = timeParts[1];
            
            if (isPM && hours < 12) hours += 12;
            if (isAM && hours === 12) hours = 0;
        }
    }

    return new Date(year, month, day, hours, minutes);
}

// CARGAR DATOS CON LISTENER EN TIEMPO REAL (onSnapshot)
function loadDashboardData() {
    // Si ya hay un listener activo, cancelarlo antes de crear uno nuevo
    if (window._citasUnsubscribe) {
        window._citasUnsubscribe();
    }

    loadSobrecuposData();

    // Escucha en tiempo real: cada vez que se agrega/modifica/elimina una cita, se actualiza automáticamente
    window._citasUnsubscribe = db.collection('citas')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            const appointments = snapshot.docs.map(doc => ({
                docId: doc.id, // ID de Firestore (necesario para editar/borrar)
                ...doc.data()
            }));

            // Ordenar citas: PENDIENTES primero (orden cronológico ascendente, más cercanas primero),
            // luego COMPLETADAS (orden cronológico descendente, completadas recientemente primero).
            appointments.sort((a, b) => {
                if (a.status === 'PENDIENTE' && b.status !== 'PENDIENTE') return -1;
                if (a.status !== 'PENDIENTE' && b.status === 'PENDIENTE') return 1;

                const dateA = parseAppointmentDateTime(a.date, a.time);
                const dateB = parseAppointmentDateTime(b.date, b.time);

                if (a.status === 'PENDIENTE') {
                    return dateA - dateB; // Más cercano primero
                } else {
                    return dateB - dateA; // Más reciente primero
                }
            });

            renderAppointmentsTable(appointments);
            updateStats(appointments);
        }, (error) => {
            console.error('Error al escuchar citas en tiempo real:', error);
        });
}

function renderAppointmentsTable(appointments) {
    const tbody = document.getElementById('appointments-tbody');
    const noRecords = document.getElementById('no-records-alert');
    const counterBadge = document.getElementById('records-counter-badge');

    if (!tbody) return;

    tbody.innerHTML = '';

    if (appointments.length === 0) {
        noRecords?.classList.remove('d-none');
        if (counterBadge) counterBadge.textContent = '0 Registros';
        return;
    }

    noRecords?.classList.add('d-none');
    if (counterBadge) counterBadge.textContent = `${appointments.length} ${appointments.length === 1 ? 'Registro' : 'Registros'}`;

    appointments.forEach(app => {
        const tr = document.createElement('tr');

        const isPending = app.status === 'PENDIENTE';
        const statusClass = isPending ? 'cts-status-pending' : 'cts-status-completed';

        tr.innerHTML = `
            <td>
                <span class="cts-client-id">${app.id || '—'}</span>
            </td>
            <td>
                <span class="cts-client-name">${app.name}</span>
            </td>
            <td>
                <div class="text-white small">${app.phone || '—'}</div>
            </td>
            <td>
                <div class="cts-service-value">${app.service}</div>
                <div class="cts-barber-value">${app.barber}</div>
            </td>
            <td>
                <span class="cts-date-value">${app.date}</span>
                <div class="cts-time-value">${app.time}</div>
            </td>
            <td>
                <span class="cts-badge-status ${statusClass}">${app.status}</span>
            </td>
            <td class="text-end">
                <div class="d-flex justify-content-end gap-2">
                    ${isPending ? `<button class="cts-btn-action-complete" onclick="changeStatus('${app.docId}', 'COMPLETADA')">Completar</button>` : ''}
                    <button class="cts-btn-action-delete" onclick="deleteAppointment('${app.docId}')">Eliminar</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    applyFilters();
}

// UPDATE METRIC CARDS
function updateStats(appointments) {
    const statToday = document.getElementById('stat-today-count');
    const statPending = document.getElementById('stat-pending-count');
    const statCompleted = document.getElementById('stat-completed-count');
    const statIncome = document.getElementById('stat-income-count');

    if (!statToday) return;

    const today = new Date();
    const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    const shortMonth = monthNames[today.getMonth()].substring(0, 3);
    const todayString = `${today.getDate()} ${shortMonth}`;

    const todayCount = appointments.filter(app => app.date && app.date.toUpperCase().includes(todayString)).length;
    const pendingCount = appointments.filter(app => app.status === 'PENDIENTE').length;
    const completedCount = appointments.filter(app => app.status === 'COMPLETADA').length;

    let totalIncome = 0;
    appointments.forEach(app => {
        if (app.status === 'COMPLETADA') {
            totalIncome += getServicePrice(app.service, app.price);
        }
    });

    statToday.textContent = todayCount;
    statPending.textContent = pendingCount;
    statCompleted.textContent = completedCount;
    statIncome.textContent = formatCOP(totalIncome);
}

// CAMBIAR ESTADO EN FIRESTORE
window.changeStatus = async function (docId, newStatus) {
    try {
        await db.collection('citas').doc(docId).update({ status: newStatus });
        // onSnapshot recargará automáticamente la tabla
    } catch (error) {
        console.error('Error al actualizar el estado:', error);
        alert('No se pudo actualizar el estado. Intenta de nuevo.');
    }
};

// ELIMINAR CITA EN FIRESTORE
window.deleteAppointment = async function (docId) {
    if (confirm("¿Está seguro de que desea eliminar permanentemente este registro de cita?")) {
        try {
            await db.collection('citas').doc(docId).delete();
            // onSnapshot actualizará la tabla automáticamente
        } catch (error) {
            console.error('Error al eliminar la cita:', error);
            alert('No se pudo eliminar la cita. Intenta de nuevo.');
        }
    }
};

// BÚSQUEDA Y FILTROS (filtra sobre datos ya cargados en el DOM a través del listener)
let _allAppointments = [];

// Sobreescribir renderAppointmentsTable para guardar referencia global
const _originalRender = renderAppointmentsTable;

document.getElementById('search-input')?.addEventListener('input', () => {
    applyFilters();
});

document.getElementById('status-filter')?.addEventListener('change', () => {
    applyFilters();
});

document.getElementById('date-filter')?.addEventListener('input', () => {
    applyFilters();
});

document.getElementById('btn-clear-date')?.addEventListener('click', () => {
    const dateInput = document.getElementById('date-filter');
    if (dateInput) {
        dateInput.value = '';
        applyFilters();
    }
});

function applyFilters() {
    const query = document.getElementById('search-input')?.value.toLowerCase() || '';
    const status = document.getElementById('status-filter')?.value || 'TODAS';
    const dateFilterVal = document.getElementById('date-filter')?.value || '';

    let formattedFilterDate = '';
    if (dateFilterVal) {
        formattedFilterDate = formatDateToDbString(dateFilterVal).toUpperCase();
    }

    const rows = document.querySelectorAll('#appointments-tbody tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const rowDateElement = row.querySelector('.cts-date-value');
        const rowDate = rowDateElement ? rowDateElement.textContent.trim().toUpperCase() : '';

        const hasStatus = status === 'TODAS' || row.textContent.includes(status);
        const hasQuery = text.includes(query);
        const hasDate = !formattedFilterDate || rowDate === formattedFilterDate;

        if (hasStatus && hasQuery && hasDate) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Actualizar contador y alerta de no registros
    const counterBadge = document.getElementById('records-counter-badge');
    const noRecords = document.getElementById('no-records-alert');

    if (counterBadge) {
        counterBadge.textContent = `${visibleCount} ${visibleCount === 1 ? 'Registro' : 'Registros'}`;
    }

    if (noRecords) {
        if (visibleCount === 0) {
            noRecords.classList.remove('d-none');
        } else {
            noRecords.classList.add('d-none');
        }
    }
}

// BOTÓN DATOS DE SIMULACIÓN (para pruebas)
document.getElementById('btn-seed-data')?.addEventListener('click', async () => {
    const sampleData = [
        {
            id: 'FCS-3849',
            name: 'Andrés Mendoza',
            phone: '+34 611 223 344',
            date: '2 JUN, 2026',
            time: '10:00 AM',
            service: 'CORTE DEGRADADO + BARBA',
            price: 13000,
            barber: 'BYRON ESCALONA',
            status: 'COMPLETADA',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            id: 'FCS-8219',
            name: 'Carlos Villagrán',
            phone: '+34 688 445 566',
            date: '2 JUN, 2026',
            time: '02:45 PM',
            service: 'CORTE DEGRADADO',
            price: 10000,
            barber: 'BYRON ESCALONA',
            status: 'PENDIENTE',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            id: 'FCS-1092',
            name: 'Javier Castillo',
            phone: '+34 655 778 899',
            date: '3 JUN, 2026',
            time: '06:00 PM',
            service: 'CORTE DEGRADADO + BARBA',
            price: 13000,
            barber: 'BYRON ESCALONA',
            status: 'PENDIENTE',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }
    ];

    try {
        const batch = db.batch();
        sampleData.forEach(sample => {
            const docRef = db.collection('citas').doc();
            batch.set(docRef, sample);
        });
        await batch.commit();
        alert("Datos de simulación cargados exitosamente en Firebase.");
    } catch (error) {
        console.error('Error al cargar datos de simulación:', error);
        alert('Error al cargar datos de simulación.');
    }
});

// ============================================================
//  LOGICA DE SOBRECUPOS (OVERBOOKING)
// ============================================================

function loadSobrecuposData() {
    if (window._sobrecuposUnsubscribe) {
        window._sobrecuposUnsubscribe();
    }
    
    window._sobrecuposUnsubscribe = db.collection('sobrecupos')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            const sobrecupos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderSobrecuposList(sobrecupos);
        }, (error) => {
            console.error('Error al escuchar sobrecupos en tiempo real:', error);
        });
}

function renderSobrecuposList(sobrecupos) {
    const listContainer = document.getElementById('overbook-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    if (sobrecupos.length === 0) {
        listContainer.innerHTML = '<p class="text-muted small m-0 text-center py-3">No hay sobrecupos habilitados.</p>';
        return;
    }
    
    sobrecupos.forEach(sob => {
        const div = document.createElement('div');
        div.className = 'cts-overbook-item';
        div.innerHTML = `
            <div>
                <div class="cts-overbook-date">${sob.date}</div>
                <div class="cts-overbook-slots" style="font-size: 0.72rem; color: #e60000; font-family: var(--font-title); font-weight: 700;">${sob.slots} ${sob.slots === 1 ? 'Hora Extra' : 'Horas Extra'}</div>
            </div>
            <button class="cts-btn-action-delete" onclick="deleteSobrecupo('${sob.id}')" style="padding: 4px 10px; font-size: 0.55rem;">Eliminar</button>
        `;
        listContainer.appendChild(div);
    });
}

window.deleteSobrecupo = async function (dateId) {
    if (confirm(`¿Desea eliminar el sobrecupo para el ${dateId}? Las horas volverán al horario normal.`)) {
        try {
            await db.collection('sobrecupos').doc(dateId).delete();
        } catch (error) {
            console.error('Error al eliminar sobrecupo:', error);
            alert('No se pudo eliminar el sobrecupo.');
        }
    }
};

function initOverbookingForm() {
    const form = document.getElementById('cts-overbook-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const dateInput = document.getElementById('overbook-date');
        const slotsInput = document.getElementById('overbook-slots');
        if (!dateInput || !slotsInput) return;
        
        const dateVal = dateInput.value; // YYYY-MM-DD
        const slotsVal = Number(slotsInput.value);
        
        if (!dateVal) {
            alert("Por favor seleccione una fecha.");
            return;
        }
        
        const formattedDate = formatDateToDbString(dateVal);
        
        try {
            await db.collection('sobrecupos').doc(formattedDate).set({
                date: formattedDate,
                slots: slotsVal,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert(`Sobrecupo de ${slotsVal} ${slotsVal === 1 ? 'hora' : 'horas'} habilitado para el ${formattedDate}.`);
            form.reset();
        } catch (error) {
            console.error('Error al guardar sobrecupo:', error);
            alert('No se pudo habilitar el sobrecupo.');
        }
    });
}

function formatDateToDbString(dateVal) {
    const [year, month, day] = dateVal.split('-').map(Number);
    const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    const shortMonth = months[month - 1];
    return `${day} ${shortMonth}, ${year}`;
}

document.addEventListener('DOMContentLoaded', () => {
    initOverbookingForm();
});
