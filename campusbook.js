// ============================================
// CAMPUSBOOK - MAIN JAVASCRIPT (CLEAN & OPTIMIZED)
// ============================================

// Configuration
const CONFIG = {
    API_URL: 'http://localhost:3000/api/bookings',
    ROOM_CAPACITIES: {
        '101': 30,
        '102': 25,
        'Lab 1': 20,
        'Lab 2': 20,
        'Lab 3': 15,
        'Lab 4': 15,
        'BG2.233': 50,
        'Media Lab': 15
    },
    ROOM_ICONS: {
        '101': 'fa-desktop',
        '102': 'fa-microscope',
        'Lab 1': 'fa-flask',
        'Lab 2': 'fa-memory',
        'Lab 3': 'fa-robot',
        'Lab 4': 'fa-code',
        'BG2.233': 'fa-chalkboard-user',
        'Media Lab': 'fa-video'
    },
    REFRESH_INTERVAL: 30000 // 30 seconds
};

// State Management
const State = {
    currentTheme: localStorage.getItem('campusbook-theme') || 'light',
    durChart: null,
    timerInterval: null,
    refreshInterval: null
};

// DOM Elements Cache
const DOM = {
    themeToggle: null,
    themeDropdown: null,
    bookingForm: null,
    studentSearch: null,
    sidebarItems: null,
    pages: null,
    toast: null
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    cacheDOM();
    initTheme();
    setupEventListeners();
    loadBookings();
    startAutoRefresh();
});

function cacheDOM() {
    DOM.themeToggle = document.getElementById('themeToggle');
    DOM.themeDropdown = document.getElementById('themeDropdown');
    DOM.bookingForm = document.getElementById('bookingForm');
    DOM.studentSearch = document.getElementById('studentSearch');
    DOM.sidebarItems = document.querySelectorAll('.sidebar-item');
    DOM.pages = document.querySelectorAll('.page');
    DOM.toast = document.getElementById('toast');
}

function setupEventListeners() {
    // Theme
    DOM.themeToggle?.addEventListener('click', toggleThemeDropdown);
    document.addEventListener('click', closeThemeDropdown);
    setupThemeOptions();

    // Navigation
    setupNavigation();
    setupFooterLinks();

    // Forms
    DOM.bookingForm?.addEventListener('submit', createBooking);
    DOM.studentSearch?.addEventListener('keyup', filterReservations);
}

// ============================================
// THEME MANAGEMENT
// ============================================
function initTheme() {
    document.documentElement.setAttribute('data-theme', State.currentTheme);
    updateThemeUI();
}

function toggleThemeDropdown(e) {
    e.stopPropagation();
    DOM.themeDropdown.classList.toggle('active');
}

function closeThemeDropdown(e) {
    if (!DOM.themeToggle?.contains(e.target) && !DOM.themeDropdown?.contains(e.target)) {
        DOM.themeDropdown?.classList.remove('active');
    }
}

function setupThemeOptions() {
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            const theme = e.currentTarget.getAttribute('data-theme');
            changeTheme(theme);
        });
    });
}

function changeTheme(theme) {
    State.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('campusbook-theme', theme);
    updateThemeUI();
    DOM.themeDropdown?.classList.remove('active');

    // Update charts if they exist
    if (State.durChart) updateChartTheme();
    loadBookings(); // Refresh to update pie chart colors
}

function updateThemeUI() {
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        if (option.getAttribute('data-theme') === State.currentTheme) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

function updateChartTheme() {
    if (!State.durChart) return;

    const isDark = State.currentTheme === 'dark' || State.currentTheme === 'aurora' || State.currentTheme === 'deepearth';
    const textColor = isDark ? '#f0f0ff' : '#1a1d2e';

    State.durChart.options.scales.y.grid.color = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    State.durChart.options.scales.y.ticks.color = textColor;
    State.durChart.options.scales.x.ticks.color = textColor;
    State.durChart.update();
}

// ============================================
// NAVIGATION
// ============================================
function setupNavigation() {
    DOM.sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPageId = item.getAttribute('data-page');
            navigateToPage(targetPageId);
        });
    });
}

function setupFooterLinks() {
    const footerLinks = document.querySelectorAll('.footer-section ul li a[data-page]');
    footerLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute('data-page');
            navigateToPage(targetPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function navigateToPage(pageId) {
    // Update sidebar
    DOM.sidebarItems.forEach(i => i.classList.remove('active'));
    const activeItem = document.querySelector(`.sidebar-item[data-page="${pageId}"]`);
    activeItem?.classList.add('active');

    // Update pages
    DOM.pages.forEach(page => {
        page.classList.toggle('active', page.id === pageId);
    });

    // Reload data for specific pages
    if (pageId === 'analytics' || pageId === 'dashboard' || pageId === 'history') {
        setTimeout(() => loadBookings(), 50);
    }
}

// ============================================
// DATA LOADING
// ============================================
async function loadBookings() {
    try {
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) throw new Error('Failed to fetch bookings');

        const allBookings = await response.json();
        const activeBookings = allBookings.filter(b => b.isArchived !== true);

        renderTable(activeBookings);
        updateStats(allBookings, activeBookings);
        updateAtmosphericAnalytics(allBookings);
        updateStatusPieChart(allBookings, 'dashboardStatusChart');
        updateStatusPieChart(allBookings, 'statusPieChart');
        renderRecentList(allBookings);
        updateRoomCapacity(activeBookings);
        updateCleanupTool(activeBookings);

        // Load history if on history page
        if (document.getElementById('history').classList.contains('active')) {
            loadHistory();
        }

    } catch (error) {
        console.error('Error loading bookings:', error);
        showToast("Could not connect to server", "error");
    }
}

function startAutoRefresh() {
    // Clear existing interval
    if (State.refreshInterval) {
        clearInterval(State.refreshInterval);
    }

    // Set new interval
    State.refreshInterval = setInterval(() => {
        loadBookings();
    }, CONFIG.REFRESH_INTERVAL);
}

// ============================================
// CREATE BOOKING
// ============================================
async function createBooking(e) {
    e.preventDefault();

    const studentName = document.getElementById('studentName').value.trim();
    const bookTitle = document.getElementById('bookTitle').value.trim();
    const roomNumber = document.getElementById('room').value.trim();
    const timeSlot = document.getElementById('timeSlot').value;

    if (!studentName || !bookTitle || !roomNumber || !timeSlot) {
        showToast("Please fill in all fields", "error");
        return;
    }

    const bookingData = {
        studentName,
        bookTitle,
        roomNumber,
        timeSlot,
        status: 'Confirmed',
        isArchived: false,
        createdAt: new Date().toISOString()
    };

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        if (response.ok) {
            showToast("✓ Booking Confirmed!");
            DOM.bookingForm.reset();
            loadBookings();
        } else {
            throw new Error('Failed to create booking');
        }
    } catch (error) {
        console.error('Error creating booking:', error);
        showToast("✗ Failed to connect to server", "error");
    }
}

// ============================================
// RENDER UI COMPONENTS
// ============================================
function renderTable(activeBookings) {
    const tableBody = document.getElementById('bookingsTableBody');
    if (!tableBody) return;

    if (activeBookings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No active reservations.</td></tr>';
        return;
    }

    tableBody.innerHTML = activeBookings.map(b => {
        const displayBook = b.bookTitle || b.book || '—';

        return `
            <tr>
                <td style="font-weight:700;">${escapeHtml(b.studentName)}</td>
                <td style="color: var(--text-muted);">${escapeHtml(displayBook)}</td>
                <td style="color: var(--accent-blue); font-weight: 500;">${escapeHtml(b.roomNumber)}</td>
                <td style="color: var(--accent-blue); font-weight: 500;">${b.timeSlot}h</td>
                <td>
                    <span class="timer-countdown" 
                          data-created="${b.createdAt}" 
                          data-allotted="${b.timeSlot}">
                        Syncing...
                    </span>
                </td>
                <td><span class="status-badge">Confirmed</span></td>
                <td>
                    <div class="action-btns">
                        <button class="check-btn" onclick="archiveBooking('${b._id}')" title="Complete Session">
                            <i class="fas fa-check-circle"></i>
                        </button>
                        <button class="delete-btn" onclick="deletePermanent('${b._id}')" title="Delete Permanent">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    startLiveTimers();
}

function renderRecentList(allBookings) {
    const container = document.getElementById('recentBookingsList');
    if (!container) return;

    const recent = allBookings.slice(-5).reverse();

    if (recent.length === 0) {
        container.innerHTML = '<p class="empty-state">No recent activity.</p>';
        return;
    }

    container.innerHTML = recent.map(b => `
        <div class="booking-item">
            <div class="booking-info">
                <h4>${escapeHtml(b.studentName)}</h4>
                <p>${escapeHtml(b.bookTitle || 'General Study')} • Room ${escapeHtml(b.roomNumber)}</p>
            </div>
            <div class="booking-details">+${b.timeSlot}h</div>
        </div>
    `).join('');
}

function updateRoomCapacity(activeBookings) {
    const container = document.getElementById('roomCapacityGrid');
    if (!container) return;

    const roomsHTML = Object.keys(CONFIG.ROOM_CAPACITIES).map(roomId => {
        const count = activeBookings.filter(b => b.roomNumber === roomId).length;
        const max = CONFIG.ROOM_CAPACITIES[roomId];
        const percentage = Math.min((count / max) * 100, 100);
        const barWidth = count === 0 ? '2%' : `${percentage}%`;

        let statusColor = '#10b981'; // Green
        if (percentage > 50) statusColor = '#fbbf24'; // Yellow
        if (percentage > 85) statusColor = '#ef4444'; // Red

        const colorClass = roomId.toLowerCase().replace(/\s+/g, '').replace('.', '');
        const icon = CONFIG.ROOM_ICONS[roomId] || 'fa-door-open';

        return `
            <div class="room-status-item room-${colorClass}">
                <h4>${escapeHtml(roomId)} <i class="fas ${icon}"></i></h4>
                <p>Load: <span class="load-count">${count}/${max}</span> Students</p>
                <div class="progress-container">
                    <div class="progress-fill" 
                         style="width: ${barWidth}; 
                                background: ${statusColor}; 
                                box-shadow: 0 0 6px ${statusColor};">
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = roomsHTML;
}

// ============================================
// STATISTICS & ANALYTICS
// ============================================
function updateStats(allBookings, activeBookings) {
    const elements = {
        totalBookings: document.getElementById('totalBookings'),
        activeBookings: document.getElementById('activeBookings'),
        totalCount: document.getElementById('totalCount'),
        completedCount: document.getElementById('completedCount'),
        progressCount: document.getElementById('progressCount'),
        avgDuration: document.getElementById('avgDuration')
    };

    if (elements.totalBookings) elements.totalBookings.innerText = allBookings.length;
    if (elements.activeBookings) elements.activeBookings.innerText = activeBookings.length;
    if (elements.totalCount) elements.totalCount.innerText = allBookings.length;

    const longSessions = allBookings.filter(b => parseFloat(b.timeSlot) >= 2).length;
    const shortSessions = allBookings.filter(b => parseFloat(b.timeSlot) < 2).length;

    if (elements.completedCount) elements.completedCount.innerText = longSessions;
    if (elements.progressCount) elements.progressCount.innerText = shortSessions;

    const avg = allBookings.length > 0
        ? (allBookings.reduce((sum, b) => sum + parseFloat(b.timeSlot), 0) / allBookings.length).toFixed(1)
        : "0.0";

    if (elements.avgDuration) elements.avgDuration.innerText = `${avg}h`;
}

function updateAtmosphericAnalytics(allBookings) {
    const ctx = document.getElementById('usageLineChart');
    if (!ctx || !window.Chart) return;

    const lastTen = allBookings.slice(-10);
    const durations = lastTen.map(b => parseFloat(b.timeSlot) || 0);
    const names = lastTen.map(b => b.studentName.split(' ')[0]);

    const isDark = State.currentTheme === 'dark' || State.currentTheme === 'aurora' || State.currentTheme === 'deepearth';
    const textColor = isDark ? '#f0f0ff' : '#1a1d2e';

    if (State.durChart) {
        State.durChart.destroy();
    }

    State.durChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: names,
            datasets: [{
                label: 'Hours',
                data: durations,
                borderColor: '#60a5fa',
                backgroundColor: 'rgba(96, 165, 250, 0.15)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor },
                    grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { display: false }
                }
            }
        }
    });
}

function updateStatusPieChart(allBookings, canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !window.Chart) return;

    const totalEntries = allBookings.length;
    const activeCount = allBookings.filter(b => !b.isArchived).length;
    const completedBookings = allBookings.filter(b => b.isArchived);

    const longCount = completedBookings.filter(b => parseFloat(b.timeSlot) >= 2).length;
    const shortCount = completedBookings.filter(b => parseFloat(b.timeSlot) < 2).length;
    const finishedTotal = completedBookings.length;

    const instanceKey = `instance_${canvasId}`;
    if (window[instanceKey]) {
        window[instanceKey].destroy();
    }

    const isDark = State.currentTheme === 'dark' || State.currentTheme === 'aurora' || State.currentTheme === 'deepearth';
    const borderColor = isDark ? '#1a1d2e' : '#ffffff';
    const textColor = isDark ? '#f0f0ff' : '#1a1d2e';

    window[instanceKey] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active Now', 'Finished (Total)', 'Long (2h+)', 'Short (<2h)'],
            datasets: [{
                data: [activeCount, finishedTotal, longCount, shortCount],
                backgroundColor: [
                    'rgba(96, 165, 250, 0.85)',
                    'rgba(248, 113, 113, 0.85)',
                    'rgba(139, 92, 246, 0.85)',
                    'rgba(16, 185, 129, 0.85)'
                ],
                borderColor: borderColor,
                borderWidth: 2,
                hoverOffset: 15,
                borderRadius: 5,
                spacing: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        padding: 15,
                        usePointStyle: true,
                        font: { family: "'Inter', sans-serif", size: 10, weight: '600' }
                    }
                }
            }
        },
        plugins: [{
            id: 'centerText',
            afterDraw: (chart) => {
                const { ctx, chartArea: { top, width, height } } = chart;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `bold 2rem 'Inter', sans-serif`;
                ctx.fillStyle = textColor;
                ctx.fillText(totalEntries, width / 2, height / 2 + top - 5);
                ctx.font = `600 0.75rem 'Inter', sans-serif`;
                ctx.fillStyle = '#a1a1aa';
                ctx.fillText('OVERALL DATA', width / 2, height / 2 + top + 25);
                ctx.restore();
            }
        }]
    });
}

// ============================================
// TIMER ENGINE
// ============================================
function startLiveTimers() {
    if (State.timerInterval) clearInterval(State.timerInterval);

    State.timerInterval = setInterval(() => {
        const timerDisplays = document.querySelectorAll('.timer-countdown');
        timerDisplays.forEach(display => {
            const createdAttr = display.getAttribute('data-created');
            if (!createdAttr || createdAttr === "undefined") return;

            const startTime = new Date(createdAttr).getTime();
            const allottedHours = parseFloat(display.getAttribute('data-allotted'));
            const endTime = startTime + (allottedHours * 60 * 60 * 1000);
            const now = new Date().getTime();
            const timeLeft = endTime - now;

            if (timeLeft > 0) {
                const h = Math.floor(timeLeft / (1000 * 60 * 60));
                const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((timeLeft % (1000 * 60)) / 1000);
                display.innerText = `${h}h ${m}m ${s}s`;

                // Remove expired class if time is restored
                display.classList.remove('timer-expired');

                // Visual warning for expiring sessions
                if (timeLeft < 15 * 60000) { // Less than 15 minutes
                    display.classList.add('timer-expired');
                }
            } else {
                display.innerText = "EXPIRED";
                display.classList.add('timer-expired');
            }
        });
    }, 1000);
}

// ============================================
// CLEANUP TOOL
// ============================================
function updateCleanupTool(activeBookings) {
    const expiredCountEl = document.getElementById('expiredCount');
    const cleanupBtn = document.getElementById('cleanupBtn');
    if (!expiredCountEl || !cleanupBtn) return;

    const expiredList = activeBookings.filter(b => {
        const endTime = new Date(b.createdAt).getTime() + (parseFloat(b.timeSlot) * 3600000);
        return new Date().getTime() > endTime;
    });

    expiredCountEl.innerText = expiredList.length;

    if (expiredList.length > 0) {
        cleanupBtn.disabled = false;
        cleanupBtn.innerHTML = `<i class="fas fa-broom"></i> Archive ${expiredList.length} Sessions`;
    } else {
        cleanupBtn.disabled = true;
        cleanupBtn.innerHTML = `<i class="fas fa-check"></i> System Clean`;
    }
}

async function archiveAllExpired() {
    try {
        const response = await fetch(CONFIG.API_URL);
        const all = await response.json();
        const toArchive = all.filter(b => {
            if (b.isArchived) return false;
            const endTime = new Date(b.createdAt).getTime() + (parseFloat(b.timeSlot) * 3600000);
            return new Date().getTime() > endTime;
        });

        if (toArchive.length === 0) return;

        showToast(`Cleaning ${toArchive.length} sessions...`);

        for (const b of toArchive) {
            await fetch(`${CONFIG.API_URL}/${b._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isArchived: true, status: 'Completed' })
            });
        }

        showToast("✓ System Purged", "success");
        loadBookings();
    } catch (error) {
        console.error('Error archiving expired sessions:', error);
        showToast("Error cleaning sessions", "error");
    }
}

// ============================================
// CRUD ACTIONS
// ============================================
async function archiveBooking(id) {
    if (!confirm("Are you sure this session is finished?")) return;

    try {
        await fetch(`${CONFIG.API_URL}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isArchived: true, status: 'Completed' })
        });
        showToast("Session Archived");
        loadBookings();
    } catch (error) {
        console.error('Error archiving booking:', error);
        showToast("Error archiving", "error");
    }
}

async function deletePermanent(id) {
    if (!confirm("This will permanently delete the record. Continue?")) return;

    try {
        await fetch(`${CONFIG.API_URL}/${id}`, { method: 'DELETE' });
        showToast("Record Deleted", "error");
        loadBookings();
    } catch (error) {
        console.error('Error deleting booking:', error);
        showToast("Error deleting", "error");
    }
}

// ============================================
// SEARCH FILTER
// ============================================
function filterReservations() {
    const input = DOM.studentSearch;
    const filter = input.value.toUpperCase();
    const rows = document.querySelector("#bookingsTableBody")?.getElementsByTagName("tr");

    if (!rows) return;

    for (let row of rows) {
        const studentName = row.cells[0]?.textContent || "";
        const bookTitle = row.cells[1]?.textContent || "";

        if (studentName.toUpperCase().includes(filter) || bookTitle.toUpperCase().includes(filter)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
}

// ============================================
// EXPORT TO CSV
// ============================================
async function exportToCSV() {
    try {
        const response = await fetch(CONFIG.API_URL);
        const bookings = await response.json();

        if (bookings.length === 0) {
            showToast("No data to export", "error");
            return;
        }

        let csv = "Student,Room,Book,Hours,Status,Date\n";
        bookings.forEach(b => {
            const statusLabel = b.isArchived ? 'Completed' : 'Active';
            csv += `"${b.studentName}","${b.roomNumber}","${b.bookTitle || 'N/A'}",${b.timeSlot},${statusLabel},${new Date(b.createdAt).toLocaleDateString()}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `CampusBook_Report_${new Date().getTime()}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("✓ Report Exported");
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showToast("Export failed", "error");
    }
}

// ============================================
// UTILITIES
// ============================================
function showToast(msg, type = "success") {
    if (!DOM.toast) return;

    DOM.toast.innerText = msg;
    DOM.toast.style.background = type === "error" ? "#ef4444" : "#10b981";
    DOM.toast.className = `toast show`;

    setTimeout(() => {
        DOM.toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// CLEANUP ON PAGE UNLOAD
// ============================================
window.addEventListener('beforeunload', () => {
    if (State.timerInterval) clearInterval(State.timerInterval);
    if (State.refreshInterval) clearInterval(State.refreshInterval);
    if (State.durChart) State.durChart.destroy();
});
