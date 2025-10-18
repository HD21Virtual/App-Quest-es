import { state, setState } from '../state.js';
import { getWeeklySolvedQuestionsData } from '../services/firestore.js';
import DOM from '../dom-elements.js';

// Chart.js e o plugin datalabels são carregados globalmente pelo index.html
// Aqui, apenas registramos o plugin para que o Chart.js possa usá-lo.
if (window.ChartDataLabels) {
    Chart.register(window.ChartDataLabels);
}


let performanceChart = null;
let homePerformanceChart = null;
let weeklyChartInstance = null;

// Função auxiliar para obter os rótulos dos últimos 7 dias
function getLast7DaysLabels() {
    const labels = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);

        if (i === 0) {
            labels.push('Hoje');
        } else if (i === 1) {
            labels.push('Ontem');
        } else {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            labels.push(`${day}/${month}`);
        }
    }
    return labels;
}

// O trecho de código que causava o erro foi removido daqui.
// A lógica para renderizar o gráfico semanal já está corretamente implementada na função renderWeeklyChart.

export function renderPerformanceChart(correct, incorrect) {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;

    if (performanceChart) {
        performanceChart.destroy();
    }
    const answeredCount = correct + incorrect;
    if (answeredCount > 0) {
        const ctx = canvas.getContext('2d');
        performanceChart = new Chart(ctx, {
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
}

export function renderWeeklyChart() {
    const canvas = DOM.weeklyChartCanvas;
    if (!canvas) return;

    getWeeklySolvedQuestionsData().then(questionsSolvedData => {
        if (weeklyChartInstance) {
            weeklyChartInstance.destroy();
        }

        const labels = getLast7DaysLabels();
        const ctx = canvas.getContext('2d');

        // Filtra os dados e rótulos para mostrar apenas os dias com atividade
        const filteredData = [];
        const filteredLabels = [];
        questionsSolvedData.forEach((count, index) => {
            if (count > 0) {
                filteredData.push(count);
                filteredLabels.push(labels[index]);
            }
        });

        // Se não houver dados, não renderiza o gráfico
        if (filteredData.length === 0) {
            return;
        }

        weeklyChartInstance = new Chart(ctx, {
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
                    title: {
                        display: true,
                        text: 'Questões Resolvidas (Últimos 7 Dias)',
                        font: { size: 18 },
                        color: '#4b5563',
                        padding: { bottom: 20 }
                    },
                    legend: { display: false },
                    tooltip: { enabled: true },
                    datalabels: {
                        display: true,
                        align: 'end',
                        anchor: 'end',
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
    });
}


export function renderHomePerformanceChart(materiaTotals) {
    const canvas = DOM.homeChartCanvas;
    if (!canvas) return;

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

    const ctx = canvas.getContext('2d');
    homePerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Acertos',
                    data: correctData,
                    backgroundColor: '#22c55e',
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: 'Erros',
                    data: incorrectData,
                    backgroundColor: '#ef4444',
                    yAxisID: 'y',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Aproveitamento',
                    data: accuracyData,
                    borderColor: '#3b82f6',
                    backgroundColor: '#3b82f6',
                    yAxisID: 'y1',
                    tension: 0.4,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Desempenho por Disciplina',
                    font: { size: 18 },
                    color: '#4b5563'
                },
                legend: { display: false },
                tooltip: { enabled: false },
                datalabels: {
                    display: true,
                    align: 'end',
                    anchor: 'end',
                    formatter: (value, context) => {
                        if (context.dataset.type === 'line') {
                            return Math.round(value) + '%';
                        }
                        return value > 0 ? value : '';
                    },
                    font: { weight: 'bold' },
                    color: (context) => {
                        if (context.dataset.type === 'line') return '#3b82f6';
                        return context.dataset.backgroundColor;
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, grid: { color: '#e5e7eb' } },
                y1: {
                    beginAtZero: false,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { callback: function (value) { return value + '%'; } }
                }
            }
        }
    });
}


export function renderItemPerformanceChart(correct, incorrect) {
    const canvas = document.getElementById('itemPerformanceChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
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
            plugins: { legend: { position: 'top' } }
        }
    });
}

