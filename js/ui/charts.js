import { state, setState } from '../state.js';
import { getWeeklySolvedQuestionsData } from '../services/firestore.js';
import DOM from '../dom-elements.js';

let performanceChart = null;
let homePerformanceChart = null;
let weeklyChartInstance = null;

export function renderPerformanceChart(correct, incorrect) {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return; // Guard clause

    if (performanceChart) {
        performanceChart.destroy();
    }
    const answeredCount = correct + incorrect;
    if (answeredCount > 0) {
        // ... Chart rendering logic
    }
}

export function renderWeeklyChart() {
    const canvas = DOM.weeklyChartCanvas;
    if (!canvas) return;

    getWeeklySolvedQuestionsData().then(questionsSolvedData => {
        if (weeklyChartInstance) {
            weeklyChartInstance.destroy();
        }
        const ctx = canvas.getContext('2d');
        const labels = Array(7).fill('').map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
        });

        weeklyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Questões Resolvidas',
                    data: questionsSolvedData,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Questões resolvidas nos últimos 7 dias',
                        font: {
                            size: 16
                        },
                        padding: {
                            bottom: 20
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
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
    const ctx = canvas.getContext('2d');

    const labels = Object.keys(materiaTotals);
    const data = labels.map(label => {
        const { correct, total } = materiaTotals[label];
        return total > 0 ? (correct / total) * 100 : 0;
    });

    if (labels.length === 0) {
        // Clear previous chart and show a message
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        ctx.fillStyle = "#9ca3af"; // gray-400
        ctx.textAlign = "center";
        ctx.fillText("Resolva algumas questões para ver seu desempenho.", canvas.width / 2, canvas.height / 2);
        return;
    }


    homePerformanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Desempenho %',
                data: data,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(139, 92, 246, 0.7)',
                    'rgba(236, 72, 153, 0.7)'
                ],
                borderColor: '#ffffff',
                borderWidth: 3,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Desempenho Geral por Matéria (%)',
                    font: {
                        size: 16
                    },
                     padding: {
                        bottom: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed.toFixed(1) + '%';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

export function renderItemPerformanceChart(correct, incorrect) {
    const canvas = document.getElementById('itemPerformanceChart');
    if (!canvas) return; // Guard clause

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
