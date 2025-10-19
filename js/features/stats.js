import { state, getActiveContainer } from '../state.js';
import { renderPerformanceChart, renderWeeklyChart, renderHomePerformanceChart, renderStatsPagePerformanceChart } from '../ui/charts.js';
import { getHistoricalCountsForQuestions } from '../services/firestore.js';
import DOM from '../dom-elements.js';

export function updateStatsPageUI() {
    let totalQuestions = 0;
    let totalCorrect = 0;
    const materiaTotals = {};

    // 1. Processa as sessões históricas do Firestore
    state.historicalSessions.forEach(session => {
        totalQuestions += session.totalQuestions || 0;
        totalCorrect += session.correctCount || 0;
        for (const materia in session.details) {
            if (!materiaTotals[materia]) materiaTotals[materia] = { correct: 0, total: 0 };
            materiaTotals[materia].correct += session.details[materia].correct || 0;
            materiaTotals[materia].total += session.details[materia].total || 0;
        }
    });

    // 2. Adiciona as estatísticas da sessão atual (não salva) por cima
    state.sessionStats.forEach(stat => {
        totalQuestions += 1;
        if (stat.isCorrect) {
            totalCorrect += 1;
        }
        if (!materiaTotals[stat.materia]) {
            materiaTotals[stat.materia] = { correct: 0, total: 0 };
        }
        materiaTotals[stat.materia].total += 1;
        if (stat.isCorrect) {
            materiaTotals[stat.materia].correct += 1;
        }
    });
    
    // 3. Atualiza os elementos da UI (cards)
    if (DOM.statsTotalQuestionsEl) DOM.statsTotalQuestionsEl.textContent = totalQuestions;
    if (DOM.statsTotalCorrectEl) DOM.statsTotalCorrectEl.textContent = totalCorrect;
    if (DOM.statsTotalIncorrectEl) DOM.statsTotalIncorrectEl.textContent = totalQuestions - totalCorrect;
    const geralAccuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(0) : 0;
    if (DOM.statsGeralAccuracyEl) DOM.statsGeralAccuracyEl.textContent = `${geralAccuracy}%`;

    // 4. Atualiza os gráficos incondicionalmente
    // As funções de renderização de gráficos têm as suas próprias verificações de existência do canvas.
    renderHomePerformanceChart(materiaTotals);
    renderWeeklyChart();
}

export function renderEstatisticasView() {
    if (!state.currentUser) {
        DOM.statsMainContent.innerHTML = '<p class="text-center text-gray-500 p-8">Por favor, faça login para ver suas estatísticas.</p>';
        return;
    }

    let totalQuestions = 0;
    let totalCorrect = 0;
    const materiasSet = new Set();

    // 1. Processa as sessões históricas do Firestore
    state.historicalSessions.forEach(session => {
        totalQuestions += session.totalQuestions || 0;
        totalCorrect += session.correctCount || 0;
        for (const materia in session.details) {
            materiasSet.add(materia);
        }
    });

    // 2. Adiciona as estatísticas da sessão atual (não salva)
    state.sessionStats.forEach(stat => {
        totalQuestions += 1;
        if (stat.isCorrect) {
            totalCorrect += 1;
        }
        materiasSet.add(stat.materia);
    });
    
    const totalIncorrect = totalQuestions - totalCorrect;
    const totalMaterias = materiasSet.size;

    // 3. Atualiza os elementos da UI (cards)
    if (DOM.statsGeralResolvidas) DOM.statsGeralResolvidas.textContent = totalQuestions;
    if (DOM.statsGeralAcertos) DOM.statsGeralAcertos.textContent = totalCorrect;
    if (DOM.statsGeralErros) DOM.statsGeralErros.textContent = totalIncorrect;
    if (DOM.statsGeralMaterias) DOM.statsGeralMaterias.textContent = totalMaterias;
    
    // 4. Renderiza o gráfico de desempenho
    renderStatsPagePerformanceChart(totalCorrect, totalIncorrect);
}

export async function updateStatsPanel(container = null) {
    let correctCount, incorrectCount, statsByMateria;
    const activeContainer = getActiveContainer(); // Corrected call
    const statsContainer = container || (activeContainer ? activeContainer.querySelector('#stats-content') : null);
    
    if (!statsContainer) return;

    // ... logic to calculate stats
    
    let materiaStatsHtml = '<div class="space-y-4">';
    // ... logic to build HTML
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

    renderPerformanceChart(correctCount, incorrectCount);
}

export async function generateStatsForQuestions(questionIds) {
    if (!state.currentUser || questionIds.length === 0) {
        return { totalCorrect: 0, totalIncorrect: 0, statsByMateria: {} };
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    const statsByMateria = {};

    const questionDetails = questionIds.map(id => state.allQuestions.find(q => q.id === id)).filter(Boolean);

    // This is a simplified version. In a real app, you'd fetch history.
    // For this example, let's assume we have the history.
    const counts = await getHistoricalCountsForQuestions(questionIds);
    totalCorrect = counts.correct;
    totalIncorrect = counts.incorrect;
    
    // Logic to distribute counts across materias for the statsByMateria object
    questionDetails.forEach(question => {
        // This part needs real history data to be accurate, so it's a simplification.
        if (!statsByMateria[question.materia]) {
            statsByMateria[question.materia] = { correct: 0, total: 0, assuntos: {} };
        }
        // Simplified distribution
        // A more complex logic would be needed here based on actual per-question history
    });


    return { totalCorrect, totalIncorrect, statsByMateria };
}
