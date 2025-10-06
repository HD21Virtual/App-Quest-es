import { state } from '../state.js';
import DOM from '../dom-elements.js';
import { renderHomePerformanceChart, renderWeeklyChart, renderPerformanceChart, renderItemPerformanceChart } from '../ui/charts.js';
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../firebase-config.js';

export function updateStatsPageUI() {
    const combinedSessions = [...state.historicalSessions];
    if (state.sessionStats.length > 0) {
        const correct = state.sessionStats.filter(s => s.isCorrect).length;
        const total = state.sessionStats.length;
        const accuracy = total > 0 ? (correct / total * 100) : 0;
        combinedSessions.push({
            totalQuestions: state.sessionStats.length,
            correctCount: correct,
            accuracy,
            details: state.sessionStats.reduce((acc, stat) => {
                if (!acc[stat.materia]) acc[stat.materia] = { correct: 0, total: 0 };
                acc[stat.materia].total++;
                if (stat.isCorrect) acc[stat.materia].correct++;
                return acc;
            }, {}),
            createdAt: { toDate: () => new Date() }
        });
    }

    if (combinedSessions.length === 0 && DOM.statsMainContent) {
        DOM.statsMainContent.innerHTML = '<p class="text-center text-gray-500">Ainda não há dados de sessões para exibir. Resolva algumas questões para começar!</p>';
        return;
    }

    let totalQuestions = 0;
    let totalCorrect = 0;
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

    const totalIncorrect = totalQuestions - totalCorrect;
    const geralAccuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(0) : 0;

    if (DOM.statsTotalQuestions) DOM.statsTotalQuestions.textContent = totalQuestions;
    if (DOM.statsTotalCorrect) DOM.statsTotalCorrect.textContent = totalCorrect;
    if (DOM.statsTotalIncorrect) DOM.statsTotalIncorrect.textContent = totalIncorrect;
    if (DOM.statsGeralAccuracy) DOM.statsGeralAccuracy.textContent = `${geralAccuracy}%`;

    if (DOM.homePerformanceChart) renderHomePerformanceChart(materiaTotals);
    if (DOM.weeklyPerformanceChart) renderWeeklyChart();

    if (DOM.statsByMateriaContainer) {
        DOM.statsByMateriaContainer.innerHTML = '';
        Object.keys(materiaTotals).sort().forEach(materia => {
            const data = materiaTotals[materia];
            const acc = data.total > 0 ? ((data.correct / data.total) * 100).toFixed(0) : 0;
            const div = document.createElement('div');
            div.innerHTML = `
                <div class="flex justify-between items-center text-sm">
                    <span class="font-medium text-gray-800">${materia}</span>
                    <span class="font-semibold ${acc >= 60 ? 'text-green-600' : 'text-red-600'}">${acc}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div class="bg-${acc >= 60 ? 'green' : 'red'}-500 h-2 rounded-full" style="width: ${acc}%"></div>
                </div>
                <p class="text-xs text-gray-500 text-right mt-1">${data.correct} / ${data.total} acertos</p>
            `;
            DOM.statsByMateriaContainer.appendChild(div);
        });
    }

    if (DOM.statsSessionHistoryContainer) {
        DOM.statsSessionHistoryContainer.innerHTML = '';
        combinedSessions.sort((a, b) => (b.createdAt.toDate() - a.createdAt.toDate())).forEach(session => {
            const isCurrent = !session.createdAt.seconds;
            const div = document.createElement('div');
            div.className = `p-3 border-b border-gray-200 ${isCurrent ? 'bg-blue-50' : ''}`;
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <p class="font-medium text-gray-800">${isCurrent ? 'Sessão Atual' : session.createdAt.toDate().toLocaleString('pt-BR')}</p>
                    <span class="text-sm font-semibold ${session.accuracy >= 60 ? 'text-green-600' : 'text-red-600'}">${session.accuracy.toFixed(0)}% de acerto</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">${session.correctCount} acertos de ${session.totalQuestions} questões</p>
            `;
            DOM.statsSessionHistoryContainer.appendChild(div);
        });
    }
}

export function updateStatsPanel(container = null, data = null) {
    const statsContainer = container || state.getActiveContainer().querySelector('#stats-content');
    if (!statsContainer) return;

    let correctCount, incorrectCount, statsByMateria;
    if (data) {
        correctCount = data.totalCorrect;
        incorrectCount = data.totalIncorrect;
        statsByMateria = data.statsByMateria;
    } else {
        correctCount = state.sessionStats.filter(s => s.isCorrect).length;
        incorrectCount = state.sessionStats.length - correctCount;
        statsByMateria = state.sessionStats.reduce((acc, stat) => {
            if (!acc[stat.materia]) acc[stat.materia] = { correct: 0, total: 0, assuntos: {} };
            if (!acc[stat.materia].assuntos[stat.assunto]) acc[stat.materia].assuntos[stat.assunto] = { correct: 0, total: 0 };
            acc[stat.materia].total++;
            acc[stat.materia].assuntos[stat.assunto].total++;
            if (stat.isCorrect) {
                acc[stat.materia].correct++;
                acc[stat.materia].assuntos[stat.assunto].correct++;
            }
            return acc;
        }, {});
    }

    if (correctCount + incorrectCount === 0) {
        statsContainer.innerHTML = `<div class="text-center text-gray-500 py-10">${data ? 'Nenhum histórico de respostas para estas questões.' : 'Responda a pelo menos uma questão para ver suas estatísticas.'}</div>`;
        return;
    }
    
    let materiaStatsHtml = '<div class="space-y-4">';
    Object.keys(statsByMateria).forEach((materia, index) => {
        const disciplinaStats = statsByMateria[materia];
        const disciplinaAccuracy = (disciplinaStats.total > 0 ? (disciplinaStats.correct / disciplinaStats.total * 100) : 0).toFixed(0);
        const targetId = `assuntos-${materia.replace(/\s+/g, '-')}-${index}`;
        materiaStatsHtml += `...`; // Simplified for brevity
    });
    materiaStatsHtml += '</div>';

    statsContainer.innerHTML = `
         <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div class="relative w-full max-w-xs mx-auto">
                <canvas id="performanceChart"></canvas>
                <div id="chart-center-text" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"></div>
            </div>
            <div>
                <h4 class="text-xl font-bold text-gray-800 mb-3">Desempenho por Disciplina</h4>
                ${materiaStatsHtml}
            </div>
         </div>
    `;

    renderPerformanceChart(statsContainer, correctCount, incorrectCount);
}

export async function generateStatsForQuestions(questionIds) {
    if (!state.currentUser || questionIds.length === 0) {
        return { totalCorrect: 0, totalIncorrect: 0, statsByMateria: {} };
    }
    // ... logic to generate stats
}

export async function getHistoricalCountsForQuestions(questionIds) {
    if (!state.currentUser || questionIds.length === 0) {
        return { correct: 0, incorrect: 0, resolved: 0 };
    }
    // ... logic to get counts
}

