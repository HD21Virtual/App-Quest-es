import { state, getActiveContainer } from '../state.js';
import { renderPerformanceChart, renderWeeklyChart, renderHomePerformanceChart } from '../ui/charts.js';
import { getHistoricalCountsForQuestions } from '../services/firestore.js';
import DOM from '../dom-elements.js';

export function updateStatsPageUI() {
    // Combina sessões históricas com a sessão atual para ter dados em tempo real
    const combinedSessions = [...state.historicalSessions];
    if (state.sessionStats.length > 0) {
        const correct = state.sessionStats.filter(s => s.isCorrect).length;
        const total = state.sessionStats.length;
        const accuracy = total > 0 ? (correct / total * 100) : 0; 
        
        const currentSessionData = {
            totalQuestions: state.sessionStats.length,
            correctCount: correct,
            accuracy: accuracy, 
            details: state.sessionStats.reduce((acc, stat) => {
                if (!acc[stat.materia]) acc[stat.materia] = { correct: 0, total: 0 };
                acc[stat.materia].total++;
                if (stat.isCorrect) acc[stat.materia].correct++;
                return acc;
            }, {}),
            createdAt: { toDate: () => new Date() } // Simula um objeto de timestamp para a sessão atual
        };
        // Adiciona a sessão atual ao início para garantir que ela seja processada
        combinedSessions.unshift(currentSessionData);
    }

    let totalQuestions = 0;
    let totalCorrect = 0;
    const materiaTotals = {};
    const processedSessions = new Set(); // Para evitar contagem dupla

    // Calcula os totais a partir das sessões combinadas
    combinedSessions.forEach(session => {
        // Evita reprocessar sessões históricas que já foram salvas e reaparecem
        if (session.id && processedSessions.has(session.id)) return;
        if(session.id) processedSessions.add(session.id);

        totalQuestions += session.totalQuestions;
        totalCorrect += session.correctCount;
        for (const materia in session.details) {
            if (!materiaTotals[materia]) materiaTotals[materia] = { correct: 0, total: 0 };
            materiaTotals[materia].correct += session.details[materia].correct;
            materiaTotals[materia].total += session.details[materia].total;
        }
    });
    
    // Atualiza os cards de estatísticas gerais na página inicial
    if (DOM.statsTotalQuestionsEl) DOM.statsTotalQuestionsEl.textContent = totalQuestions;
    if (DOM.statsTotalCorrectEl) DOM.statsTotalCorrectEl.textContent = totalCorrect;
    if (DOM.statsTotalIncorrectEl) DOM.statsTotalIncorrectEl.textContent = totalQuestions - totalCorrect;
    const geralAccuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(0) : 0;
    if (DOM.statsGeralAccuracyEl) DOM.statsGeralAccuracyEl.textContent = `${geralAccuracy}%`;

    // Renderiza os gráficos apenas se a aba "Início" estiver visível
    if (DOM.inicioView && !DOM.inicioView.classList.contains('hidden')) {
        renderHomePerformanceChart(materiaTotals);
        renderWeeklyChart();
    }
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
