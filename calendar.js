// Global variables
let currentDate = new Date();
let currentView = 'week'; // Possible values: 'day', 'week', 'month'
let events = [];
let selectedEventId = null;

// DOM elements
const calendarGrid = document.getElementById('calendarGrid');
const weekdaysHeader = document.getElementById('weekdaysHeader');
const currentMonthElement = document.getElementById('currentMonth');
const dateRangeElement = document.getElementById('dateRange');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const todayBadge = document.getElementById('todayBadge');
const viewBtns = document.querySelectorAll('.view-btn');
const newEventBtn = document.getElementById('newEventBtn');
const eventModal = document.getElementById('eventModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const eventForm = document.getElementById('eventForm');
const cancelBtn = document.getElementById('cancelBtn');
const modalTitle = document.getElementById('modalTitle');

// Helper functions
function formatDate(date) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function formatDay(date) {
    return date.getDate();
}

function formatDayOfWeek(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

function formatDateShort(date) {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours === 0 ? '12 AM' : hours === 12 ? '12 PM' : hours < 12 ? `${hours} AM` : `${hours - 12} PM`;
}

function formatTimeRange(startTime, endTime) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function getTimeFromDate(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getFormattedDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function combineDateAndTime(dateString, timeString) {
    const date = parseDate(dateString);
    const [hours, minutes] = timeString.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function getWeekDates(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const nextDate = new Date(monday);
        nextDate.setDate(monday.getDate() + i);
        weekDates.push(nextDate);
    }
    return weekDates;
}

function getMonthDates(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const firstDateToShow = new Date(firstDay);
    firstDateToShow.setDate(firstDay.getDate() - (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1));
    const totalDays = (firstDayOfWeek === 0 || firstDayOfWeek > 5) ? 42 : 35;
    const monthDates = [];
    const currentDate = new Date(firstDateToShow);
    for (let i = 0; i < totalDays; i++) {
        monthDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return monthDates;
}

function getHoursOfDay() {
    const hours = [];
    for (let i = 8; i <= 17; i++) {
        hours.push(i);
    }
    return hours;
}

function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// Fetch events
async function fetchEvents() {
    try {
        const res = await fetch('calendar.php');
        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }
        events = await res.json();
        console.log('Fetched events:', events);
        renderCalendar();
    } catch (error) {
        console.error('Failed to fetch events:', error);
        alert('Impossible de charger les événements. Veuillez réessayer plus tard.');
    }
}

// Delete event
async function deleteEvent(eventId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
        try {
            const res = await fetch('calendar.php', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `id=${encodeURIComponent(eventId)}`
            });
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            await fetchEvents();
            closeModal();
        } catch (error) {
            console.error('Failed to delete event:', error);
            alert('Impossible de supprimer l\'événement. Veuillez réessayer plus tard.');
        }
    }
}

// Calendar rendering
function updateDateInfo() {
    if (!currentMonthElement || !dateRangeElement || !todayBadge) {
        console.error('Date info elements not found');
        return;
    }
    currentMonthElement.textContent = formatDate(currentDate);
    if (currentView === 'week') {
        const weekDates = getWeekDates(currentDate);
        const startDate = weekDates[0];
        const endDate = weekDates[6];
        dateRangeElement.textContent = `${formatDay(startDate)} ${formatDateShort(startDate).split(' ')[1]} - ${formatDay(endDate)} ${formatDateShort(endDate)}`;
    } else if (currentView === 'day') {
        dateRangeElement.textContent = formatDateShort(currentDate);
    } else if (currentView === 'month') {
        dateRangeElement.textContent = formatDate(currentDate);
    }
    todayBadge.style.display = isSameDay(new Date(), currentDate) ? 'inline-block' : 'none';
}

function updateWeekdaysHeader() {
    if (!weekdaysHeader) {
        console.error('Weekdays header not found');
        return;
    }
    weekdaysHeader.innerHTML = '';
    if (currentView === 'week') {
        const weekDates = getWeekDates(currentDate);
        weekDates.forEach(date => {
            const isToday = isSameDay(date, new Date());
            const dayElement = document.createElement('div');
            dayElement.className = `weekday ${isToday ? 'today' : ''}`;
            dayElement.textContent = `${formatDayOfWeek(date)} ${formatDay(date)}`;
            weekdaysHeader.appendChild(dayElement);
        });
    } else if (currentView === 'day') {
        const isToday = isSameDay(currentDate, new Date());
        const dayElement = document.createElement('div');
        dayElement.className = `weekday ${isToday ? 'today' : ''}`;
        dayElement.textContent = `${formatDayOfWeek(currentDate)} ${formatDay(currentDate)}`;
        weekdaysHeader.appendChild(dayElement);
    } else if (currentView === 'month') {
        const daysOfWeek = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
        daysOfWeek.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'weekday';
            dayElement.textContent = day;
            weekdaysHeader.appendChild(dayElement);
        });
    }
}

function renderDayView() {
    if (!calendarGrid) {
        console.error('Calendar grid not found');
        return;
    }
    calendarGrid.innerHTML = '';
    calendarGrid.style.gridTemplateColumns = '1fr';
    const hours = getHoursOfDay();
    hours.forEach(hour => {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = `${hour} ${hour < 12 ? 'AM' : 'PM'}`;
        timeSlot.appendChild(timeLabel);
        const dailyEvents = events.filter(event => {
            const eventDate = new Date(event.start);
            return isSameDay(eventDate, currentDate) && eventDate.getHours() === hour;
        });
        dailyEvents.forEach(event => {
            const eventElement = createEventElement(event);
            timeSlot.appendChild(eventElement);
        });
        calendarGrid.appendChild(timeSlot);
    });
}

function renderWeekView() {
    if (!calendarGrid) {
        console.error('Calendar grid not found');
        return;
    }
    calendarGrid.innerHTML = '';
    calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    const weekDates = getWeekDates(currentDate);
    const hours = getHoursOfDay();
    hours.forEach(hour => {
        weekDates.forEach(date => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            if (date.getDay() === 1) {
                const timeLabel = document.createElement('div');
                timeLabel.className = 'time-label';
                timeLabel.textContent = `${hour} ${hour < 12 ? 'AM' : 'PM'}`;
                timeSlot.appendChild(timeLabel);
            }
            const dailyEvents = events.filter(event => {
                const eventDate = new Date(event.start);
                return isSameDay(eventDate, date) && eventDate.getHours() === hour;
            });
            dailyEvents.forEach(event => {
                const eventElement = createEventElement(event);
                timeSlot.appendChild(eventElement);
            });
            calendarGrid.appendChild(timeSlot);
        });
    });
}

function renderMonthView() {
    if (!calendarGrid) {
        console.error('Calendar grid not found');
        return;
    }
    calendarGrid.innerHTML = '';
    calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    const monthDates = getMonthDates(currentDate);
    monthDates.forEach(date => {
        const dayCell = document.createElement('div');
        dayCell.className = 'time-slot';
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        if (date.getMonth() !== currentDate.getMonth()) {
            dayCell.style.opacity = '0.5';
        }
        if (isSameDay(date, new Date())) {
            dayNumber.style.fontWeight = 'bold';
            dayNumber.style.color = 'var(--primary-color, #007bff)';
        }
        dayCell.appendChild(dayNumber);
        const dailyEvents = events.filter(event => {
            const eventDate = new Date(event.start);
            return isSameDay(eventDate, date);
        });
        const maxEventsToShow = 3;
        dailyEvents.slice(0, maxEventsToShow).forEach(event => {
            const eventElement = createEventElement(event, true);
            dayCell.appendChild(eventElement);
        });
        if (dailyEvents.length > maxEventsToShow) {
            const moreEvents = document.createElement('div');
            moreEvents.className = 'more-events';
            moreEvents.textContent = `+${dailyEvents.length - maxEventsToShow} de plus`;
            dayCell.appendChild(moreEvents);
        }
        calendarGrid.appendChild(dayCell);
    });
}

function createEventElement(event, isMonthView = false) {
    const eventElement = document.createElement('div');
    eventElement.className = `event ${event.color || 'blue'}`;
    eventElement.dataset.eventId = event.id;
    const titleElement = document.createElement('div');
    titleElement.className = 'event-title';
    titleElement.textContent = event.title;
    eventElement.appendChild(titleElement);
    if (!isMonthView) {
        const timeElement = document.createElement('div');
        timeElement.className = 'event-time';
        timeElement.textContent = formatTimeRange(getTimeFromDate(new Date(event.start)), getTimeFromDate(new Date(event.end)));
        eventElement.appendChild(timeElement);
        if (event.description) {
            const descElement = document.createElement('div');
            descElement.className = 'event-description';
            descElement.textContent = event.description;
            eventElement.appendChild(descElement);
        }
        // Ajouter un bouton de suppression
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-event-btn';
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteEvent(event.id);
        });
        eventElement.appendChild(deleteBtn);
    }
    eventElement.addEventListener('click', () => openEditEventModal(event.id));
    return eventElement;
}

function renderCalendar() {
    try {
        updateDateInfo();
        updateWeekdaysHeader();
        switch (currentView) {
            case 'day':
                renderDayView();
                break;
            case 'week':
                renderWeekView();
                break;
            case 'month':
                renderMonthView();
                break;
            default:
                console.error('Invalid view:', currentView);
        }
    } catch (error) {
        console.error('Erreur lors du rendu du calendrier :', error);
        alert('Impossible de rendre le calendrier. Veuillez réessayer.');
    }
}

// Modal functions
function openNewEventModal() {
    if (!eventModal || !eventForm || !modalTitle) {
        console.error('Modal or form elements not found');
        alert('Erreur : Éléments du modal ou du formulaire manquants.');
        return;
    }
    console.log('Opening new event modal');
    selectedEventId = null;
    modalTitle.textContent = 'Nouvel Événement';
    eventForm.reset();
    const today = new Date();
    document.getElementById('eventDate').value = getFormattedDateForInput(today);
    document.getElementById('eventStartTime').value = '08:00';
    document.getElementById('eventEndTime').value = '09:00';
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventDescription').value = '';
    document.getElementById('eventLink').value = '';
    document.getElementById('eventLocation').value = '';
    document.querySelector('input[name="eventColor"][value="blue"]').checked = true;
    document.getElementById('reminderToggle').checked = false;
    document.querySelector('input[name="eventType"][value="event"]').checked = true;
    eventModal.classList.add('show');
}

function openEditEventModal(eventId) {
    if (!eventModal || !eventForm || !modalTitle) {
        console.error('Modal or form elements not found');
        alert('Erreur : Éléments du modal ou du formulaire manquants.');
        return;
    }
    console.log('Opening edit event modal for ID:', eventId);
    modalTitle.textContent = 'Modifier l\'Événement';
    selectedEventId = eventId;
    const event = events.find(e => e.id === eventId);
    if (!event) {
        console.error('Event not found:', eventId);
        alert('Événement non trouvé.');
        return;
    }
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDate').value = getFormattedDateForInput(new Date(event.start));
    document.getElementById('eventStartTime').value = getTimeFromDate(new Date(event.start));
    document.getElementById('eventEndTime').value = getTimeFromDate(new Date(event.end));
    document.getElementById('eventDescription').value = event.description || '';
    document.getElementById('eventLink').value = event.link || '';
    document.getElementById('eventLocation').value = event.location || '';
    document.querySelector(`input[name="eventColor"][value="${event.color || 'blue'}"]`).checked = true;
    document.querySelector(`input[name="eventType"][value="${event.type || 'event'}"]`).checked = true;
    document.getElementById('reminderToggle').checked = event.reminder || false;
    eventModal.classList.add('show');
}

function closeModal() {
    if (eventModal) {
        eventModal.classList.remove('show');
    }
}

// Event handlers
function handleViewChange(e) {
    const selectedView = e.target.dataset.view;
    if (selectedView && selectedView !== currentView) {
        currentView = selectedView;
        viewBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === currentView);
        });
        renderCalendar();
    }
}

function handlePrevNext(direction) {
    if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() + direction);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + direction * 7);
    } else if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + direction);
    }
    renderCalendar();
}

function goToToday() {
    currentDate = new Date();
    renderCalendar();
}

// Form submission
eventForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const eventData = {
        title: sanitizeInput(document.getElementById('eventTitle').value.trim()),
        type: document.querySelector('input[name="eventType"]:checked').value,
        start: combineDateAndTime(
            document.getElementById('eventDate').value,
            document.getElementById('eventStartTime').value
        ).toISOString().slice(0, 19).replace('T', ' '),
        end: combineDateAndTime(
            document.getElementById('eventDate').value,
            document.getElementById('eventEndTime').value
        ).toISOString().slice(0, 19).replace('T', ' '),
        description: sanitizeInput(document.getElementById('eventDescription').value.trim()),
        link: sanitizeInput(document.getElementById('eventLink').value.trim()),
        location: sanitizeInput(document.getElementById('eventLocation').value.trim()),
        color: document.querySelector('input[name="eventColor"]:checked').value,
        reminder: document.getElementById('reminderToggle').checked ? 1 : 0
    };
    if (!eventData.title) {
        alert('Le titre de l\'événement est requis.');
        return;
    }
    if (new Date(eventData.start) >= new Date(eventData.end)) {
        alert('L\'heure de fin doit être postérieure à l\'heure de début.');
        return;
    }
    try {
        const method = selectedEventId ? 'PUT' : 'POST';
        if (selectedEventId) eventData.id = selectedEventId;
        const res = await fetch('calendar.php', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
        }
        await fetchEvents();
        closeModal();
    } catch (error) {
        console.error(`Échec de la ${selectedEventId ? 'mise à jour' : 'création'} de l\'événement :`, error);
        alert(`Échec de la ${selectedEventId ? 'mise à jour' : 'création'} de l\'événement. Veuillez réessayer plus tard.`);
    }
});

// Initialize event listeners
function initEventListeners() {
    if (!newEventBtn || !closeModalBtn || !cancelBtn || !prevBtn || !nextBtn || !todayBadge || !eventForm || !eventModal || !calendarGrid || !weekdaysHeader || !currentMonthElement || !dateRangeElement) {
        console.error('Un ou plusieurs éléments DOM manquants');
        alert('Erreur : Éléments DOM requis manquants.');
        return;
    }
    viewBtns.forEach(btn => {
        btn.removeEventListener('click', handleViewChange);
        btn.addEventListener('click', handleViewChange);
    });
    prevBtn.removeEventListener('click', handlePrevNext);
    prevBtn.addEventListener('click', () => handlePrevNext(-1));
    nextBtn.removeEventListener('click', handlePrevNext);
    nextBtn.addEventListener('click', () => handlePrevNext(1));
    todayBadge.removeEventListener('click', goToToday);
    todayBadge.addEventListener('click', goToToday);
    newEventBtn.removeEventListener('click', openNewEventModal);
    newEventBtn.addEventListener('click', () => {
        console.log('Ouverture du modal pour un nouvel événement');
        openNewEventModal();
    });
    closeModalBtn.removeEventListener('click', closeModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.removeEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    const modalCloseHandler = (e) => {
        if (e.target === eventModal) {
            closeModal();
        }
    };
    window.removeEventListener('click', modalCloseHandler);
    window.addEventListener('click', modalCloseHandler);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM chargé, initialisation de l\'application');
    initEventListeners();
    fetchEvents();
});