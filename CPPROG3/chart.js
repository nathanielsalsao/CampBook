// Global chart instances to prevent "canvas already in use" errors
let lineChartInstance = null;
let pieChartInstance = null;

function updateCharts(allBookings) {
    const lineCtx = document.getElementById('usageLineChart');
    const pieCtx = document.getElementById('sessionPieChart');
    if (!lineCtx || !pieCtx) return;

    // --- DATA PROCESSING ---
    const lastTen = allBookings.slice(-10);
    const labels = lastTen.map(b => b.studentName.split(' ')[0]); // First names for labels
    const dataPoints = lastTen.map(b => parseFloat(b.timeSlot));

    const longSessions = allBookings.filter(b => parseFloat(b.timeSlot) >= 2).length;
    const shortSessions = allBookings.filter(b => parseFloat(b.timeSlot) < 2).length;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f8f9ff' : '#1a1d2e';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    // --- LINE CHART: USAGE TREND ---
    if (lineChartInstance) lineChartInstance.destroy(); // Clear old instance
    lineChartInstance = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hours Borrowed',
                data: dataPoints,
                borderColor: '#60a5fa',
                backgroundColor: 'rgba(96, 165, 250, 0.2)',
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#60a5fa'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });

    // --- PIE CHART: SESSION RATIO ---
    if (pieChartInstance) pieChartInstance.destroy(); // Clear old instance
    pieChartInstance = new Chart(pieCtx, {
        type: 'doughnut', // Doughnut looks cleaner for modern UI
        data: {
            labels: ['Long (2h+)', 'Short (<2h)'],
            datasets: [{
                data: [longSessions, shortSessions],
                backgroundColor: ['#10b981', '#f59e0b'], // Green and Orange
                hoverOffset: 15,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%', // Inner hole size
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, padding: 20 }
                }
            }
        }
    });
}