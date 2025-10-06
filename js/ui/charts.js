import { getWeeklySolvedQuestionsData } from '../services/firestore.js';
import DOM from '../dom-elements.js';
import { state } from '../state.js';

let performanceChart = null;
let homePerformanceChart = null;
let weeklyChartInstance = null;

export function renderPerformanceChart(container, correctCount, incorrectCount) {
    if (performanceChart) {
        performanceChart.destroy();
    }
    const answeredCount = correctCount + incorrectCount;
    if (answeredCount > 0) {
        const correctPercentage = (correctCount / answeredCount * 100);
        const incorrectPercentage = (incorrectCount / answeredCount * 100);
        
        const chartCenterText = container.querySelector('#chart-center-text');
        if (chartCenterText) {
            chartCenterText.innerHTML = `
                <div class="flex flex-col">
                    <span class="text-3xl font-bold" style="color: #63dd63;">${correctPercentage.toFixed(0)}%</span>
                    <span class="text-3xl font-bold" style="color: #f03024;">${incorrectPercentage.toFixed(0)}%</span>
                </div>
            `;
        }
        
        const canvas = container.querySelector('#performanceChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            performanceChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Acertos', 'Erros'],
                    datasets: [{
                        data: [correctCount, incorrectCount],
                        backgroundColor: ['#63dd63', '#f03024'],
                        hoverBackgroundColor: ['#81e681', '#f35950'],
                        borderColor: ['#ffffff'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '55%',
                    animation: { duration: 0 },
                    plugins: { legend: { display: true } }
                }
            });
        }
    }
}

export function renderHomePerformanceChart(materiaTotals) {
    if (homePerformanceChart) {
        homePerformanceChart.destroy();
    }

    const sortedMaterias = Object.keys(materiaTotals).sort((a, b) => materiaTotals[b].total - materiaTotals[a].total);
    const labels = sortedMaterias;
    const correctData = sortedMaterias.map(m => materiaTotals[m].correct);
    const incorrectData = sortedMaterias.map(m => materiaTotals[m].total - materiaTotals[m].correct);
    const accuracyData = sortedMaterias.map(m => {
        const data = materiaTotals[m];
        return data.total > 0 ? ((data.correct / data.total) * 100) : 0;
    });

    const ctx = DOM.homePerformanceChart.getContext('2d');
    homePerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Acertos', data: correctData, backgroundColor: '#22c55e', yAxisID: 'y', order: 2 },
                { label: 'Erros', data: incorrectData, backgroundColor: '#ef4444', yAxisID: 'y', order: 2 },
                { type: 'line', label: 'Aproveitamento', data: accuracyData, borderColor: '#3b82f6', backgroundColor: '#3b82f6', yAxisID: 'y1', tension: 0.4, order: 1 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Desempenho por Disciplina', font: { size: 18 }, color: '#4b5563' },
                legend: { display: false },
                datalabels: {
                    display: true, align: 'end', anchor: 'end',
                    formatter: (value, context) => context.dataset.type === 'line' ? Math.round(value) + '%' : (value > 0 ? value : ''),
                    font: { weight: 'bold' },
                    color: (context) => context.dataset.type === 'line' ? '#3b82f6' : context.dataset.backgroundColor
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, position: 'left', grid: { color: '#e5e7eb' } },
                y1: { beginAtZero: false, position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: (value) => value + '%' } }
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
            const dayOfWeek = dayNames[date.getDay()];
            labels.push(`${day}/${month} (${dayOfWeek})`);
        }
    }
    return labels;
}

export async function renderWeeklyChart() {
    if (!DOM.weeklyPerformanceChart) return;
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

    weeklyChartInstance = new Chart(DOM.weeklyPerformanceChart.getContext('2d'), {
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
                title: { display: true, text: 'Questões Resolvidas (Últimos 7 Dias)', font: { size: 18 }, color: '#4b5563', padding: { bottom: 20 } },
                legend: { display: false },
                datalabels: {
                    display: true, align: 'end', anchor: 'end',
                    formatter: (value) => value > 0 ? value : '',
                    font: { weight: 'bold', size: 14 },
                    color: '#FFC000'
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#6b7280' } },
                y: { beginAtZero: true, grid: { color: '#e5e7eb' }, ticks: { color: '#6b7280' } }
            }
        }
    });
}

