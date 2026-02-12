// ============================================
// HISTORY.JS - History Page with Sorting
// ============================================

// Global variable to store history data
let historyData = [];
let currentSortBy = 'date-desc';

// ============================================
// LOAD HISTORY DATA
// ============================================
async function loadHistory() {
    try {
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) throw new Error('Failed to fetch history');

        const allBookings = await response.json();
        historyData = allBookings.filter(b => b.isArchived === true);

        // Apply current sorting
        sortHistory();
    } catch (error) {
        console.error('Error loading history:', error);
        const historyTableBody = document.getElementById('historyTableBody');
        if (historyTableBody) {
            historyTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Failed to load history data.</td></tr>';
        }
    }
}

// ============================================
// SORT HISTORY
// ============================================
function sortHistory() {
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        currentSortBy = sortSelect.value;
    }

    let sortedData = [...historyData];

    switch (currentSortBy) {
        case 'date-desc':
            sortedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'date-asc':
            sortedData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'student-asc':
            sortedData.sort((a, b) => a.studentName.localeCompare(b.studentName));
            break;
        case 'student-desc':
            sortedData.sort((a, b) => b.studentName.localeCompare(a.studentName));
            break;
        case 'book-asc':
            sortedData.sort((a, b) => {
                const bookA = a.bookTitle || a.book || '';
                const bookB = b.bookTitle || b.book || '';
                return bookA.localeCompare(bookB);
            });
            break;
        case 'book-desc':
            sortedData.sort((a, b) => {
                const bookA = a.bookTitle || a.book || '';
                const bookB = b.bookTitle || b.book || '';
                return bookB.localeCompare(bookA);
            });
            break;
        case 'room-asc':
            sortedData.sort((a, b) => {
                // Handle room numbers with different formats (e.g., "101", "Lab 1", "BG2.233")
                return String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true });
            });
            break;
        case 'room-desc':
            sortedData.sort((a, b) => {
                return String(b.roomNumber).localeCompare(String(a.roomNumber), undefined, { numeric: true });
            });
            break;
        case 'duration-desc':
            sortedData.sort((a, b) => parseFloat(b.timeSlot) - parseFloat(a.timeSlot));
            break;
        case 'duration-asc':
            sortedData.sort((a, b) => parseFloat(a.timeSlot) - parseFloat(b.timeSlot));
            break;
        default:
            // Default: newest first
            sortedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    renderHistory(sortedData);
}

// ============================================
// RENDER HISTORY TABLE
// ============================================
function renderHistory(data) {
    const historyTableBody = document.getElementById('historyTableBody');
    if (!historyTableBody) return;

    if (data.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No completed sessions found.</td></tr>';
        return;
    }

    historyTableBody.innerHTML = data.map(b => {
        const displayBook = b.bookTitle || b.book || '—';
        const displayDate = new Date(b.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const displayTime = new Date(b.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <tr>
                <td style="font-weight:700;">${escapeHtml(b.studentName)}</td>
                <td style="color: var(--text-muted);">${escapeHtml(displayBook)}</td>
                <td style="color: var(--accent-blue); font-weight: 500;">${escapeHtml(b.roomNumber)}</td>
                <td style="color: var(--accent-purple); font-weight: 600;">${b.timeSlot}h</td>
                <td><span class="status-badge status-completed">Completed</span></td>
                <td style="color: var(--text-secondary); font-size: 0.9rem;">
                    ${displayDate}<br>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${displayTime}</span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="delete-btn" onclick="deleteHistoryEntry('${b._id}')" title="Delete Entry">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// DELETE HISTORY ENTRY
// ============================================
async function deleteHistoryEntry(id) {
    if (!confirm("This will permanently delete this history entry. Continue?")) return;

    try {
        const response = await fetch(`${CONFIG.API_URL}/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            showToast("History Entry Deleted", "success");
            loadHistory(); // Reload history data
        } else {
            throw new Error('Failed to delete entry');
        }
    } catch (error) {
        console.error('Error deleting history entry:', error);
        showToast("Error deleting entry", "error");
    }
}

// ============================================
// SEARCH/FILTER HISTORY
// ============================================
function filterHistory(searchTerm) {
    const filter = searchTerm.toUpperCase();
    const rows = document.querySelector("#historyTableBody")?.getElementsByTagName("tr");

    if (!rows) return;

    for (let row of rows) {
        const studentName = row.cells[0]?.textContent || "";
        const bookTitle = row.cells[1]?.textContent || "";
        const roomNumber = row.cells[2]?.textContent || "";

        if (studentName.toUpperCase().includes(filter) || 
            bookTitle.toUpperCase().includes(filter) ||
            roomNumber.toUpperCase().includes(filter)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
}

// ============================================
// EXPORT HISTORY TO CSV
// ============================================
async function exportHistoryToCSV() {
    try {
        if (historyData.length === 0) {
            showToast("No history data to export", "error");
            return;
        }

        let csv = "Student,Book,Room,Duration (Hours),Status,Date,Time\n";
        historyData.forEach(b => {
            const displayDate = new Date(b.createdAt).toLocaleDateString('en-US');
            const displayTime = new Date(b.createdAt).toLocaleTimeString('en-US');
            csv += `"${b.studentName}","${b.bookTitle || 'N/A'}","${b.roomNumber}",${b.timeSlot},Completed,"${displayDate}","${displayTime}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `CampusBook_History_${new Date().getTime()}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("✓ History Exported");
    } catch (error) {
        console.error('Error exporting history:', error);
        showToast("Export failed", "error");
    }
}

// ============================================
// STATISTICS FOR HISTORY
// ============================================
function getHistoryStats() {
    const totalCompleted = historyData.length;
    const totalHours = historyData.reduce((sum, b) => sum + parseFloat(b.timeSlot), 0);
    const avgDuration = totalCompleted > 0 ? (totalHours / totalCompleted).toFixed(1) : 0;

    // Most active student
    const studentCounts = {};
    historyData.forEach(b => {
        studentCounts[b.studentName] = (studentCounts[b.studentName] || 0) + 1;
    });
    const mostActiveStudent = Object.keys(studentCounts).reduce((a, b) => 
        studentCounts[a] > studentCounts[b] ? a : b, ''
    );

    // Most used room
    const roomCounts = {};
    historyData.forEach(b => {
        roomCounts[b.roomNumber] = (roomCounts[b.roomNumber] || 0) + 1;
    });
    const mostUsedRoom = Object.keys(roomCounts).reduce((a, b) => 
        roomCounts[a] > roomCounts[b] ? a : b, ''
    );

    return {
        totalCompleted,
        totalHours: totalHours.toFixed(1),
        avgDuration,
        mostActiveStudent,
        mostUsedRoom
    };
}
