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
let statsPagePerformanceChart = null;
// ===== INÍCIO DA MODIFICAÇÃO =====
let evolutionChart = null;
// ===== FIM DA MODIFICAÇÃO =====

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
                    label: 'Rendimento',
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
                legend: { display: false }, // Ativado para melhor contexto no hover
                tooltip: {
                    enabled: true, // Habilita o efeito de hover
                    
                    intersect: true, // Mostra o tooltip mesmo que não esteja exatamente sobre o item
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                // Se for o dataset da linha de aproveitamento, adiciona o '%'
                                if (context.dataset.type === 'line') {
                                    label += Math.round(context.parsed.y) + '%';
                                } else {
                                    label += context.parsed.y;
                                }
                            }
                            return label;
                        }
                    }
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
                    font: { weight: 'bold' },
                    color: (context) => {
                        if (context.dataset.type === 'line') return '#3b82f6';
                        return context.dataset.backgroundColor;
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    // Estas propriedades fazem as barras de um mesmo grupo ficarem coladas
                    categoryPercentage: 0.8, // Controla o espaço ENTRE os grupos de barras (disciplinas)
                    barPercentage: 1.0       // Controla o espaço DENTRO de um grupo (entre acertos e erros)
                },
                y: {
                    beginAtZero: true,
                    position: 'left',
                    grid: { color: '#e5e7eb' }
                },
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

export function renderStatsPagePerformanceChart(correct, incorrect) {
    const canvas = DOM.statsPagePerformanceChartCanvas;
    if (!canvas) return;

    if (statsPagePerformanceChart) {
        statsPagePerformanceChart.destroy();
    }

    const answeredCount = correct + incorrect;
    const ctx = canvas.getContext('2d');

    if (answeredCount === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "16px 'Inter', sans-serif";
        ctx.fillStyle = "#9ca3af";
        // ===== INÍCIO DA MODIFICAÇÃO =====
        ctx.fillText("Não foram encontradas resoluções com o filtro selecionado.", canvas.width / 2, canvas.height / 2);
        // ===== FIM DA MODIFICAÇÃO =====
        ctx.restore();
        return;
    }

    // Plugin customizado para desenhar o texto no centro do gráfico
    const centerTextPlugin = {
        id: 'doughnutCenterText',
        afterDraw: (chart) => {
            const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            if (total === 0) return;

            const { ctx, chartArea: { left, right, top, bottom } } = chart;
            const correctValue = chart.data.datasets[0].data[0];
            const percentage = total > 0 ? Math.round((correctValue / total) * 100) : 0;
            const text = `${percentage}%`;
            
            ctx.save();
            const x = (left + right) / 2;
            const y = (top + bottom) / 2;

            // Texto do Percentual
            ctx.font = 'bold 32px Inter, sans-serif';
            ctx.fillStyle = '#374151'; // gray-700
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x, y);

            // Texto "de Acertos"
            

            ctx.restore();
        }
    };

    statsPagePerformanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Acertos', 'Erros'],
            datasets: [{
                data: [correct, incorrect],
                backgroundColor: ['#22c55e', '#ef4444'],
                hoverBackgroundColor: ['#16a34a', '#dc2626'],
                borderColor: '#f9fafb', // Cor de fundo do card (bg-gray-50)
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '50%', // Aumenta o buraco central, deixando o anel mais fino
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 20,
                        padding: 20,
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    enabled: true
                },
                title: {
                    display: true,
                    text: 'Desempenho Geral',
                    font: {
                        size: 16
                    },
                    color: '#4b5563',
                    padding: {
                        bottom: 20
                    }
                },
                // Desativa o plugin de datalabels para este gráfico específico
                datalabels: {
                    display: false
                }
            }
        },
        // Registra o plugin customizado apenas para esta instância do gráfico
        plugins: [centerTextPlugin]
    });
}


// ===== INÍCIO DA MODIFICAÇÃO =====
/**
 * Processa o log de desempenho bruto em dados agrupados para o gráfico de evolução.
 * @param {Array} performanceLog - O log de desempenho filtrado (pode ser grande).
 * @param {Date} startDate - A data de início do filtro.
 * @param {Date} endDate - A data de fim do filtro.
 * @param {string} metric - 'resolucoes' ou 'desempenho'.
 * @param {number} periods - O número de períodos para dividir (ex: 10).
 * @returns {object} - { labels: Array, datasets: Array }
 */
function processEvolutionData(performanceLog, startDate, endDate, metric = 'resolucoes', periods = 10) {
    // 1. Se não houver log, retorna vazio
    if (performanceLog.length === 0) {
        return { labels: [], datasets: [] };
    }

    // 2. Define o intervalo de tempo
    // Se 'Tudo' (startDate nulo), define um padrão (ex: últimos 6 meses)
    let start = startDate;
    let end = endDate;
    
    if (!start) {
        start = new Date(end);
        start.setMonth(start.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
    }

    const totalMilliseconds = end.getTime() - start.getTime();
    // Garante que o intervalo seja de pelo menos 1ms para evitar divisão por zero
    const periodDuration = Math.max(1, totalMilliseconds / periods); 

    // 3. Inicializa os períodos
    const periodData = [];
    const labels = [];
    const formatDate = (date) => {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${d}/${m}`;
    };

    for (let i = 0; i < periods; i++) {
        const periodStart = new Date(start.getTime() + (i * periodDuration));
        // O último período deve ir exatamente até a data final
        const periodEnd = (i === periods - 1) 
            ? new Date(end.getTime()) 
            : new Date(start.getTime() + ((i + 1) * periodDuration) - 1); // -1ms para não sobrepor

        periodData.push({
            start: periodStart,
            end: periodEnd,
            correct: 0,
            incorrect: 0,
            total: 0
        });
        
        // Cria rótulos amigáveis
        if (periods <= 15) { // Se for período curto (ex: 7 dias), mostra data a data
             labels.push(formatDate(periodStart));
        } else { // Se for longo, mostra intervalos
            labels.push(`${formatDate(periodStart)} a ${formatDate(periodEnd)}`);
        }
    }

    // 4. Agrupa os dados do log nos períodos
    performanceLog.forEach(entry => {
        if (!entry.createdAt) return;
        const entryDate = entry.createdAt.toDate();
        
        // Encontra o período ao qual esta entrada pertence
        // Garante que a entrada esteja dentro dos limites de start/end
        if (entryDate.getTime() < start.getTime() || entryDate.getTime() > end.getTime()) {
            return;
        }

        const periodIndex = Math.min(
            periods - 1, // Garante que não estoure o índice
            Math.max(0, Math.floor((entryDate.getTime() - start.getTime()) / periodDuration))
        );

        if (periodIndex >= 0 && periodIndex < periods) {
            const period = periodData[periodIndex];
            period.total++;
            if (entry.isCorrect) {
                period.correct++;
            } else {
                period.incorrect++;
            }
        }
    });

    // 5. Formata os datasets para o Chart.js
    let datasets;
    // --- MODIFICAÇÃO: Lógica para 'desempenho' gerar duas linhas ---
    if (metric === 'desempenho') {
        const correctPercentageData = periodData.map(p => p.total > 0 ? (p.correct / p.total) * 100 : 0);
        const incorrectPercentageData = periodData.map(p => p.total > 0 ? (p.incorrect / p.total) * 100 : 0);
        datasets = [
            {
                label: 'Acertos (%)',
                data: correctPercentageData,
                borderColor: '#22c55e', // green-500
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#22c55e',
                pointRadius: 4,
                pointHoverRadius: 6
            },
             {
                label: 'Erros (%)',
                data: incorrectPercentageData,
                borderColor: '#ef4444', // red-500
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ef4444',
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ];
    // --- FIM DA MODIFICAÇÃO ---
    } else { // Padrão: 'resolucoes'
        const acertosData = periodData.map(p => p.correct);
        const errosData = periodData.map(p => p.incorrect);
        datasets = [
            {
                label: 'Acertos',
                data: acertosData,
                borderColor: '#22c55e', // green-500
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#22c55e',
                pointRadius: 4,
                pointHoverRadius: 6
            },
            {
                label: 'Erros',
                data: errosData,
                borderColor: '#ef4444', // red-500
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ef4444',
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ];
    }

    return { labels, datasets };
}

/**
 * Renderiza o gráfico de evolução com base nos dados filtrados.
 * @param {Array} performanceLog - O log de desempenho JÁ FILTRADO por matéria/assunto.
 * @param {Date} startDate - A data de início do filtro de período.
 * @param {Date} endDate - A data de fim do filtro de período.
 */
export function renderEvolutionChart(performanceLog, startDate, endDate) {
    const canvas = DOM.evolutionChartCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    if (evolutionChart) {
        evolutionChart.destroy();
    }
    
    // 1. Determina a métrica (Resoluções vs. Desempenho)
    const metricRadio = document.querySelector('input[name="evolucao-filter"]:checked');
    const metric = metricRadio ? metricRadio.value : 'resolucoes';

    // 2. Determina o número de períodos
    // Se for menos de 15 dias, agrupa por dia
    let periods = 10; // Padrão
    let start = startDate;
    let end = endDate;

    // Se 'Tudo' (startDate nulo), usa o padrão de 6 meses
    if (!start) {
        start = new Date(end);
        start.setMonth(start.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
    }
    
    const timeDiff = end.getTime() - start.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (dayDiff <= 15) {
        periods = dayDiff; // Agrupa por dia
    }
    
    // 3. Processa os dados
    const { labels, datasets } = processEvolutionData(performanceLog, start, end, metric, periods);

    // 4. Verifica se há dados para exibir
    const hasData = datasets.length > 0 && datasets.some(ds => ds.data.some(d => d > 0));

    if (labels.length === 0 || !hasData) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "16px 'Inter', sans-serif";
        ctx.fillStyle = "#9ca3af";
        // ===== INÍCIO DA MODIFICAÇÃO =====
        ctx.fillText("Não foram encontradas resoluções com o filtro selecionado.", canvas.width / 2, canvas.height / 2);
        // ===== FIM DA MODIFICAÇÃO =====
        ctx.restore();
        return;
    }
    
    // 5. Configurações do gráfico
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'center',
                labels: {
                    usePointStyle: false, 
                    boxWidth: 20,
                    // ===== ALTERAÇÃO 3 INÍCIO: Adiciona generateLabels =====
                    // Função para garantir que a cor de preenchimento da legenda
                    // seja a mesma da borda da linha.
                    generateLabels: function(chart) {
                        const originalLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                        originalLabels.forEach(label => {
                            // Define fillStyle para ser igual ao strokeStyle (cor da linha)
                            label.fillStyle = label.strokeStyle; 
                        });
                        return originalLabels;
                    }
                    // ===== ALTERAÇÃO 3 FIM =====
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {}
            },
            datalabels: {
                display: false // Desabilitado para um visual mais limpo
            }
        },
        scales: {
            x: {
                grid: { color: '#e5e7eb' }, 
                ticks: { color: '#6b7280' } // gray-500
            },
            y: {
                beginAtZero: true,
                grid: { color: '#e5e7eb' }, // gray-200
                ticks: { color: '#6b7280' } // gray-500
            }
        },
        interaction: {
            intersect: false,
            mode: 'index',
        }
    };
    
    // 6. Adiciona formatação de '%' se a métrica for 'desempenho'
    if (metric === 'desempenho') {
        chartOptions.scales.y.ticks.callback = function (value) {
            return value.toFixed(0) + '%'; // Ajustado para não mostrar decimais
        };
         chartOptions.scales.y.max = 100; // Define o máximo do eixo Y para 100%
        chartOptions.plugins.tooltip.callbacks.label = function (context) {
            let label = context.dataset.label || '';
            if (label) {
                label += ': ';
            }
            if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(0) + '%'; // Ajustado para não mostrar decimais
            }
            return label;
        };
    }

    // 7. Renderiza o gráfico
    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: chartOptions
    });
}
// ===== FIM DA MODIFICAÇÃO =====
