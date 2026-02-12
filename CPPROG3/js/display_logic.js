const API_URL = 'http://localhost:3000/api/bookings';
let durChart; 

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    loadBookings();
    setupNavigation();
    
    const form = document.getElementById('bookingForm');
    if (form) form.addEventListener('submit', createBooking);
});

// --- NAVIGATION LOGIC ---
function setupNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const pages = document.querySelectorAll('.page');

    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPageId = item.getAttribute('data-page');

            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            pages.forEach(page => {
                page.classList.toggle('active', page.id === targetPageId);
            });
        });
    });
}

// --- CRUD: READ ---
async function loadBookings() {
    try {
        const response = await fetch(API_URL);
        const bookings = await response.json();
        
        renderTable(bookings);
        updateStats(bookings);
        renderRecentList(bookings);
        
        // This triggers the Atmospheric Analytics update
        updateAtmosphericAnalytics(bookings); 
        
    } catch (error) {
        console.error("Error loading data:", error);
        showToast("Could not connect to server", "error");
    }
}

// --- ANALYTICS ENGINE (Atmospheric Blue Palette) ---
function updateAtmosphericAnalytics(bookings) {
    const ctx = document.getElementById('durationChart');
    if (!ctx) return;

    // Helper to extract numeric hours from strings (e.g., "2", "3 hours", "11 - 5")
    const parseHours = (str) => {
        if (!str) return 0;
        if (!isNaN(str)) return parseFloat(str);
        const matches = str.match(/(\d+(\.\d+)?)/);
        return matches ? parseFloat(matches[0]) : 0;
    };

    const durations = bookings.map(b => parseHours(b.timeSlot));
    const names = bookings.map(b => b.studentName.split(' ')[0]);
    const totalEntries = bookings.length;
    
    // Calculate REAL Average Time from MongoDB data
    const totalHours = durations.reduce((a, b) => a + b, 0);
    const avg = totalEntries > 0 ? (totalHours / totalEntries).toFixed(1) : "0.0";

    // Update Analytics Stat Cards using Atmospheric Palette colors
    if (document.getElementById('totalCount')) {
        document.getElementById('totalCount').innerText = totalEntries;
        // Logic for sessions 2 hours or longer
        document.getElementById('completedCount').innerText = durations.filter(d => d >= 2).length;
        document.getElementById('progressCount').innerText = durations.filter(d => d < 2).length;
        document.getElementById('avgDuration').innerText = avg + "h";
    }

    if (!durChart) {
        durChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: names.slice(-10),
                datasets: [{
                    label: 'Hours Borrowed',
                    data: durations.slice(-10),
                    borderColor: '#21303E', // NAVAL
                    backgroundColor: 'rgba(183, 199, 210, 0.4)', // WINDY BLUE fill
                    borderWidth: 3,
                    pointBackgroundColor: '#2F4E6F', // INDIGO BATIK
                    pointBorderColor: '#fff',
                    pointRadius: 6,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { color: '#D9E2E8' }, // STARDEW
                        ticks: { color: '#21303E', font: { weight: '600' } }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { color: '#5F7381' } // WATERLOO
                    }
                }
            }
        });
    } else {
        durChart.data.labels = names.slice(-10);
        durChart.data.datasets[0].data = durations.slice(-10);
        durChart.update();
    }
}

// --- CRUD: CREATE ---
async function createBooking(e) {
    e.preventDefault();

    const bookingData = {
        studentName: document.getElementById('studentName').value,
        roomNumber: document.getElementById('room').value,
        timeSlot: document.getElementById('timeSlot').value,
        status: 'Confirmed'
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        if (response.ok) {
            showToast("Booking Confirmed!");
            document.getElementById('bookingForm').reset();
            loadBookings(); // Refreshes table, stats, and chart
        }
    } catch (error) {
        showToast("Failed to save booking", "error");
    }
}

// --- CRUD: DELETE ---
async function deleteBooking(id) {
    if (!confirm("Delete this reservation?")) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast("Reservation Deleted", "success");
            loadBookings(); // Auto-updates chart and stats
        }
    } catch (error) {
        showToast("Error deleting", "error");
    }
}

// --- UI RENDERING HELPERS ---
function renderTable(bookings) {
    const tableBody = document.getElementById('bookingsTableBody');
    if (!tableBody) return;
    
    if (bookings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No reservations found.</td></tr>';
        return;
    }

    tableBody.innerHTML = bookings.map(b => `
        <tr class="border-b border-[#D9E2E8] hover:bg-[#f0f4f8]">
            <td style="font-weight:600; color:#21303E;">${b.studentName}</td>
            <td style="color:#5F7381;">${b.roomNumber}</td>
            <td style="color:#2F4E6F; font-weight:bold;">${b.timeSlot}h</td>
            <td><span class="px-3 py-1 rounded-full text-[10px] font-bold bg-[#D9E2E8]/40 text-[#2F4E6F] border border-[#D9E2E8]">${b.status || 'Confirmed'}</span></td>
            <td>
                <button class="delete-btn text-red-400 hover:text-red-600" onclick="deleteBooking('${b._id}')">
                    <i class="fas fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function updateStats(bookings) {
    const totalEl = document.getElementById('totalBookings');
    const activeEl = document.getElementById('activeBookings');
    if (totalEl) totalEl.innerText = bookings.length;
    if (activeEl) activeEl.innerText = bookings.length;
}

function renderRecentList(bookings) {
    const recentContainer = document.getElementById('recentBookingsList');
    if (!recentContainer) return;

    const recent = bookings.slice(-3).reverse(); 
    if (recent.length === 0) return;

    recentContainer.innerHTML = recent.map(b => `
        <div class="booking-item border-l-4 border-[#2F4E6F] bg-white p-3 mb-2 shadow-sm rounded-r-lg">
            <div class="booking-info">
                <h4 class="text-[#21303E] font-bold">${b.studentName}</h4>
                <p class="text-[#5F7381] text-xs">${b.roomNumber}</p>
            </div>
            <div class="booking-details text-[#2F4E6F] font-black text-sm"><p>${b.timeSlot}h</p></div>
        </div>
    `).join('');
}

function showToast(msg, type = "success") {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    // Applied Atmospheric colors to the toast
    toast.style.background = type === "error" ? "#e11d48" : "#2F4E6F";
    toast.className = `toast show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}