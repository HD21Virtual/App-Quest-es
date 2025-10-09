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
    const canvas = DOM.weeklyPerformanceChart;
    if (!canvas) return; // Guard clause

    getWeeklySolvedQuestionsData().then(questionsSolvedData => {
        if (weeklyChartInstance) {
            weeklyChartInstance.destroy();
        }
        // ... Chart rendering logic
    });
}

export function renderHomePerformanceChart(materiaTotals) {
    const canvas = DOM.homePerformanceChart;
    if (!canvas) return; // Guard clause

    if (homePerformanceChart) {
        homePerformanceChart.destroy();
    }
    const ctx = canvas.getContext('2d');
    // ... Chart rendering logic
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

