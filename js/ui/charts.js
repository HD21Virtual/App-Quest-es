import { getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { state } from '../state.js';

/**
 * @file js/ui/charts.js
 * @description Contém toda a lógica para renderização e atualização dos gráficos
 * usando Chart.js.
 */

let weeklyChartInstance = null;
let homePerformanceChart = null;
let performanceChart = null; // Para o painel de estatísticas da sessão

export function destroyAllCharts() {
    if (weeklyChartInstance) weeklyChartInstance.destroy();
    if (homePerformanceChart) homePerformanceChart.destroy();
    if (performanceChart) performanceChart.destroy();
    weeklyChartInstance = null;
    homePerformanceChart = null;
    performanceChart = null;
}

// --- GRÁFICOS DA PÁGINA INICIAL ---

async function getWeeklySolvedQuestionsData() {
    const weeklyCounts = Array(7).fill(0);
    if (!state.currentUser) return weeklyCounts;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const q = query(collection(db, 'users', state.currentUser.uid, 'sessions'), where("createdAt", ">=", sevenDaysAgo));
    const querySnapshot = await getDocs(q);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    querySnapshot.forEach(doc => {
        const sessionDate = doc.data().createdAt.toDate();
        sessionDate.setHours(0, 0, 0, 0);
        const dayDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 3600 * 24));
        const index = 6 - dayDiff;
        if (index >= 0 && index < 7) {
            weeklyCounts[index] += doc.data().totalQuestions || 0;
        }
    });
    return weeklyCounts;
}

export async function renderWeeklyChart() {
    const ctx = document.getElementById('weeklyPerformanceChart')?.getContext('2d');
    if (!ctx) return;
    
    if (weeklyChartInstance) weeklyChartInstance.destroy();
    
    const questionsSolvedData = await getWeeklySolvedQuestionsData();
    const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return `${day} (${d.getDate()}/${d.getMonth()+1})`;
    });

    weeklyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: 'Questões Resolvidas', data: questionsSolvedData, backgroundColor: '#FFC000' }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Questões Resolvidas (Últimos 7 Dias)', font: { size: 18 } },
                legend: { display: false },
                datalabels: { align: 'end', anchor: 'end', formatter: v => v > 0 ? v : '' }
            }
        }
    });
}

export function renderHomePerformanceChart(materiaTotals) {
    const ctx = document.getElementById('homePerformanceChart')?.getContext('2d');
    if (!ctx) return;

    if (homePerformanceChart) homePerformanceChart.destroy();
    
    const sortedMaterias = Object.keys(materiaTotals).sort((a, b) => materiaTotals[b].total - materiaTotals[a].total);
    const labels = sortedMaterias;
    const correctData = sortedMaterias.map(m => materiaTotals[m].correct);
    const incorrectData = sortedMaterias.map(m => materiaTotals[m].total - materiaTotals[m].correct);
    const accuracyData = sortedMaterias.map(m => (materiaTotals[m].total > 0 ? (materiaTotals[m].correct / materiaTotals[m].total) * 100 : 0));

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
                title: { display: true, text: 'Desempenho por Disciplina', font: { size: 18 } },
                legend: { display: false },
                datalabels: { formatter: (v, ctx) => ctx.dataset.type === 'line' ? Math.round(v) + '%' : (v > 0 ? v : '') }
            },
            scales: {
                y: { beginAtZero: true, position: 'left' },
                y1: { beginAtZero: false, position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: v => v + '%' } }
            }
        }
    });
}


// --- GRÁFICO DA SESSÃO/CADERNO (DOUGHNUT) ---

export function renderSessionDoughnut(containerId, correct, incorrect) {
    const canvas = document.getElementById(containerId);
    const chartCenterTextEl = document.getElementById('chart-center-text');
    if (!canvas) return;
    
    if(performanceChart) performanceChart.destroy();
    
    const total = correct + incorrect;
    if (total === 0) {
         if(chartCenterTextEl) chartCenterTextEl.parentElement.innerHTML = `<div class="text-center p-8">Sem dados para exibir.</div>`;
         return;
    }

    const correctPerc = (correct / total * 100);
    const incorrectPerc = (incorrect / total * 100);

    if (chartCenterTextEl) {
        chartCenterTextEl.innerHTML = `<span class="text-3xl font-bold text-green-500">${correctPerc.toFixed(0)}%</span>`;
    }

    performanceChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Acertos', 'Erros'],
            datasets: [{ data: [correct, incorrect], backgroundColor: ['#22c55e', '#ef4444'] }]
        },
        options: {
            responsive: true,
            cutout: '75%',
            plugins: { legend: { display: false }, tooltip: { enabled: true } }
        }
    });
}
