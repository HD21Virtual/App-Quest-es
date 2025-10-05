import DOM from '../dom-elements.js';
import { state } from '../state.js';
import { renderWeeklyChart, renderHomePerformanceChart, renderSessionDoughnut } from '../ui/charts.js';

/**
 * @file js/features/stats.js
 * @description Lida com o cálculo e a renderização de todas as estatísticas
 * da aplicação, tanto na página inicial quanto na página de estatísticas.
 */

export function updateStatsPageUI() {
    const combinedSessions = getCombinedSessions();
    if (combinedSessions.length === 0) {
        DOM.statsMainContent.innerHTML = '<p class="text-center text-gray-500">Resolva algumas questões para ver suas estatísticas.</p>';
        updateHomeCards(0, 0, 0, 0);
        return;
    }

    let totalQuestions = 0, totalCorrect = 0;
    const materiaTotals = {};

    combinedSessions.forEach(session => {
        totalQuestions += session.totalQuestions;
        totalCorrect += session.correctCount;
        for (const materia in session.details) {
            if (!materiaTotals[materia]) materiaTotals[materia] = { correct: 0, total: 0 };
            materiaTotals[materia].correct += session.details[materia].correct;
            materiaTotals[materia].total += session.details[materia].total;
        }
    });

    const geralAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions * 100) : 0;
    
    updateHomeCards(totalQuestions, totalCorrect, totalQuestions - totalCorrect, geralAccuracy);
    renderWeeklyChart();
    renderHomePerformanceChart(materiaTotals);
    renderStatsPage(materiaTotals, combinedSessions);
}

function getCombinedSessions() {
    const combined = [...state.historicalSessions];
    if (state.sessionStats.length > 0) {
        const correct = state.sessionStats.filter(s => s.isCorrect).length;
        const total = state.sessionStats.length;
        combined.push({
            totalQuestions: total,
            correctCount: correct,
            accuracy: total > 0 ? (correct / total * 100) : 0,
            details: state.sessionStats.reduce((acc, stat) => {
                if (!acc[stat.materia]) acc[stat.materia] = { correct: 0, total: 0 };
                acc[stat.materia].total++;
                if (stat.isCorrect) acc[stat.materia].correct++;
                return acc;
            }, {}),
            createdAt: { toDate: () => new Date() } // Mock for current session
        });
    }
    return combined;
}

function updateHomeCards(total, correct, incorrect, accuracy) {
    document.getElementById('stats-total-questions').textContent = total;
    document.getElementById('stats-total-correct').textContent = correct;
    document.getElementById('stats-total-incorrect').textContent = incorrect;
    document.getElementById('stats-geral-accuracy').textContent = `${accuracy.toFixed(0)}%`;
}

function renderStatsPage(materiaTotals, sessions) {
    const byMateriaContainer = document.getElementById('stats-by-materia-container');
    const historyContainer = document.getElementById('stats-session-history-container');
    if (!byMateriaContainer || !historyContainer) return;

    byMateriaContainer.innerHTML = Object.keys(materiaTotals).sort().map(materia => {
        const data = materiaTotals[materia];
        const acc = data.total > 0 ? (data.correct / data.total * 100) : 0;
        return `
            <div>
                <div class="flex justify-between text-sm"><span>${materia}</span><span>${acc.toFixed(0)}%</span></div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div class="bg-${acc >= 60 ? 'green' : 'red'}-500 h-2 rounded-full" style="width: ${acc}%"></div>
                </div>
            </div>`;
    }).join('');

    historyContainer.innerHTML = sessions.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate()).map(session => {
        const date = session.createdAt.toDate().toLocaleString('pt-BR');
        const isCurrent = date === new Date().toLocaleString('pt-BR');
        return `
            <div class="p-3 border-b ${isCurrent ? 'bg-blue-50' : ''}">
                <p>${isCurrent ? 'Sessão Atual' : date}</p>
                <p>${session.correctCount} acertos de ${session.totalQuestions} questões (${session.accuracy.toFixed(0)}%)</p>
            </div>`;
    }).join('');
}

export function updateStatsPanel() {
    const container = state.currentCadernoId ? DOM.savedCadernosListContainer : DOM.vadeMecumView;
    const statsContainer = container.querySelector('#stats-content');
    if (!statsContainer) return;
    
    const correct = state.sessionStats.filter(s => s.isCorrect).length;
    const incorrect = state.sessionStats.length - correct;
    
    statsContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div class="relative w-full max-w-xs mx-auto">
                <canvas id="performanceChart"></canvas>
                <div id="chart-center-text" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"></div>
            </div>
            <div id="session-materia-stats"></div>
        </div>`;
        
    renderSessionDoughnut('performanceChart', correct, incorrect);
    // Renderizar estatísticas por matéria da sessão...
}
