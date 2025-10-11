import { state, getActiveContainer } from '../state.js';
import { renderPerformanceChart, renderWeeklyChart, renderHomePerformanceChart } from '../ui/charts.js';
import { getHistoricalCountsForQuestions } from '../services/firestore.js';
import DOM from '../dom-elements.js';

export function updateStatsPageUI() {
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
            createdAt: { toDate: () => new Date() }
        };
        combinedSessions.push(currentSessionData);
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

    // CORREÇÃO: Apenas renderiza os gráficos e cards se estiver na página inicial.
    if (DOM.statsTotalQuestionsEl) {
        renderHomePerformanceChart(materiaTotals);
        renderWeeklyChart();
        
        DOM.statsTotalQuestionsEl.textContent = totalQuestions;
        DOM.statsTotalCorrectEl.textContent = totalCorrect;
        DOM.statsTotalIncorrectEl.textContent = totalQuestions - totalCorrect;
        const geralAccuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(0) : 0;
        DOM.statsGeralAccuracyEl.textContent = `${geralAccuracy}%`;
    }

    // ... lógica para atualizar a página de estatísticas
}

export async function updateStatsPanel(container = null) {
    let correctCount, incorrectCount, statsByMateria;
    const activeContainer = getActiveContainer();
    const statsContainer = container || (activeContainer ? activeContainer.querySelector('#stats-content') : null);
    
    if (!statsContainer) return;

    // ... (restante da lógica para calcular e renderizar estatísticas da sessão)
}

export async function generateStatsForQuestions(questionIds) {
    if (!state.currentUser || questionIds.length === 0) {
        return { totalCorrect: 0, totalIncorrect: 0, statsByMateria: {} };
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    const statsByMateria = {};

    const questionDetails = questionIds.map(id => state.allQuestions.find(q => q.id === id)).filter(Boolean);

    const counts = await getHistoricalCountsForQuestions(questionIds);
    totalCorrect = counts.correct;
    totalIncorrect = counts.incorrect;
    
    questionDetails.forEach(question => {
        if (!statsByMateria[question.materia]) {
            statsByMateria[question.materia] = { correct: 0, total: 0, assuntos: {} };
        }
    });

    return { totalCorrect, totalIncorrect, statsByMateria };
}
