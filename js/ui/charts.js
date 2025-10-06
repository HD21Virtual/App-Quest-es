import { getWeeklySolvedQuestionsData } from '../services/firestore.js';
import { state } from '../state.js';
import DOM from '../dom-elements.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js/auto/auto.js';
import ChartDataLabels from 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0';

Chart.register(ChartDataLabels);

let performanceChart = null;
let homePerformanceChart = null;
let weeklyChartInstance = null;

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
            const dayOfWeek = dayNames[date.getDay()];
            labels.push(`${day}/${month} (${dayOfWeek})`);
        }
    }
    return labels;
}

export async function renderWeeklyChart() {
    const ctx = DOM.weeklyPerformanceChart;
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
            datasets: [
                {
                    label: 'Questões Resolvidas',
                    data: filteredData,
                    backgroundColor: '#FFC000',
                }
            ]
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
                    padding: {
                        bottom: 20
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true
                },
                datalabels: {
                    display: true,
                    align: 'end',
                    anchor: 'end',
                    formatter: (value) => value > 0 ? value : '',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    color: '#FFC000'
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#e5e7eb'
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

export function renderHomePerformanceChart(materiaTotals) {
    const homeChartCanvas = DOM.homePerformanceChart;
    if (!homeChartCanvas) return;
    
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

    const ctx = homeChartCanvas.getContext('2d');
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
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                },
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
                    font: {
                        weight: 'bold'
                    },
                    color: (context) => {
                        if (context.dataset.type === 'line') return '#3b82f6';
                        return context.dataset.backgroundColor;
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    position: 'left',
                     grid: {
                        color: '#e5e7eb'
                    }
                },
                y1: {
                    beginAtZero: false,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

export function renderSessionPerformanceChart(correctCount, incorrectCount, container) {
    if (performanceChart) {
        performanceChart.destroy();
    }

    const answeredCount = correctCount + incorrectCount;
    if (answeredCount > 0) {
        const correctPercentage = (correctCount / answeredCount * 100);
        
        const chartCenterText = container.querySelector('#chart-center-text');
        if(chartCenterText) {
            chartCenterText.innerHTML = `
                <div class="flex flex-col">
                    <span class="text-3xl font-bold" style="color: #63dd63;">${correctPercentage.toFixed(0)}%</span>
                    <span class="text-sm text-gray-500">Acertos</span>
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
                    plugins: {
                        legend: {
                            display: true
                        },
                        tooltip: {
                            enabled: true,
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw;
                                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? (value / total * 100).toFixed(0) : 0;
                                    return `${label}: ${percentage}%`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
}

export function renderItemPerformanceChart(correctCount, incorrectCount, container) {
    const canvas = container.querySelector('#itemPerformanceChart');
    if (!canvas) return;
    
    const totalAttempts = correctCount + incorrectCount;

    if (totalAttempts > 0) {
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Acertos', 'Erros'],
                datasets: [{
                    data: [correctCount, incorrectCount],
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
    } else {
         canvas.outerHTML = '<p class="text-center text-gray-500 mt-4">Nenhum histórico de respostas para exibir o gráfico.</p>';
    }
}

