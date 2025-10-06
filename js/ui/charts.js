import { getWeeklySolvedQuestionsData } from '../services/firestore.js';

/**
 * @file js/ui/charts.js
 * @description Funções para renderizar gráficos com Chart.js.
 */

let homePerformanceChart = null;
let weeklyChartInstance = null;

// O plugin ChartDataLabels é registrado globalmente no app.js principal
// Chart.register(ChartDataLabels);

export function renderItemPerformanceChart(canvasId, correct, incorrect) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Acertos', 'Erros'],
            datasets: [{
                data: [correct, incorrect],
                backgroundColor: ['#22c55e', '#ef4444'],
                hoverBackgroundColor: ['#16a34a', '#dc2626'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            cutout: '55%',
            plugins: {
                legend: { display: true },
                tooltip: { enabled: true }
            }
        }
    });
}

function getLast7DaysLabels() {
    const labels = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        if (i === 0) labels.push('Hoje');
        else if (i === 1) labels.push('Ontem');
        else {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            labels.push(`${day}/${month} (${dayNames[date.getDay()]})`);
        }
    }
    return labels;
}

export async function renderWeeklyChart() {
    const ctx = document.getElementById('weeklyPerformanceChart');
    if (!ctx) return;

    const questionsSolvedData = await getWeeklySolvedQuestionsData(); 
    const allLabels = getLast7DaysLabels();

    const filteredLabels = [];
    const filteredData = [];
    questionsSolvedData.forEach((count, index) => {
        if (count > 0) {
            filteredLabels.push(allLabels[index]);
            filteredData.push(count);
        }
    });

    if (weeklyChartInstance) {
        weeklyChartInstance.destroy();
    }

    weeklyChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: filteredLabels,
            datasets: [{
                label: 'Questões Resolvidas',
                data: filteredData,
                backgroundColor: '#FFC000',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Questões Resolvidas (Últimos 7 Dias)' },
                legend: { display: false },
                datalabels: {
                    display: true,
                    align: 'end',
                    anchor: 'end',
                    formatter: (value) => value > 0 ? value : '',
                }
            },
            scales: { y: { beginAtZero: true } }
        }
    });
}

export function renderHomePerformanceChart(materiaTotals) {
    const homeChartCanvas = document.getElementById('homePerformanceChart');
    if (!homeChartCanvas) return;

    if (homePerformanceChart) {
        homePerformanceChart.destroy();
    }

    const sortedMaterias = Object.keys(materiaTotals).sort((a, b) => materiaTotals[b].total - materiaTotals[a].total);
    const labels = sortedMaterias;
    const correctData = sortedMaterias.map(m => materiaTotals[m].correct);
    const incorrectData = sortedMaterias.map(m => materiaTotals[m].total - materiaTotals[m].correct);
    const accuracyData = sortedMaterias.map(m => (materiaTotals[m].total > 0 ? (materiaTotals[m].correct / materiaTotals[m].total) * 100 : 0));

    const ctx = homeChartCanvas.getContext('2d');
    homePerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Acertos', data: correctData, backgroundColor: '#22c55e', yAxisID: 'y' },
                { label: 'Erros', data: incorrectData, backgroundColor: '#ef4444', yAxisID: 'y' },
                { type: 'line', label: 'Aproveitamento', data: accuracyData, borderColor: '#3b82f6', yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Desempenho por Disciplina' },
                legend: { display: false },
                datalabels: {
                    display: true,
                    align: 'end',
                    anchor: 'end',
                    formatter: (value, context) => (context.dataset.type === 'line' ? Math.round(value) + '%' : (value > 0 ? value : '')),
                }
            },
            scales: {
                y: { beginAtZero: true, position: 'left' },
                y1: { beginAtZero: false, position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: value => value + '%' } }
            }
        }
    });
}

