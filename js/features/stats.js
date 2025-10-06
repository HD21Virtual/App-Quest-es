import { state } from '../state.js';
import DOM from '../dom-elements.js';
import { getHistoricalCountsForQuestions } from '../services/firestore.js';
import { renderPerformanceChart, renderWeeklyChart, renderHomePerformanceChart, renderItemPerformanceChart } from '../ui/charts.js';
import { getActiveContainer } from '../state.js';

export async function updateNavigation() {
    const activeContainer = getActiveContainer();
    if (!activeContainer) return;

    const navigationControls = activeContainer.querySelector('#navigation-controls');
    const questionCounterTop = activeContainer.querySelector('#question-counter-top');
    const questionInfoContainer = activeContainer.querySelector('#question-info-container');
    const questionToolbar = activeContainer.querySelector('#question-toolbar');
    const prevQuestionBtn = activeContainer.querySelector('#prev-question-btn');
    const nextQuestionBtn = activeContainer.querySelector('#next-question-btn');
    const questionsContainer = activeContainer.querySelector('#questions-container');

    if (!navigationControls || !questionCounterTop || !questionInfoContainer || !prevQuestionBtn || !nextQuestionBtn || !questionsContainer || !questionToolbar) return;

    if (state.filteredQuestions.length > 0) {
        navigationControls.classList.remove('hidden');
        questionCounterTop.classList.remove('hidden');
        questionInfoContainer.classList.remove('hidden');
        questionToolbar.classList.remove('hidden');

        let answeredCount, correctCount, incorrectCount;
        let statsHtml = '';

        if (state.currentCadernoId) {
            const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
            if (caderno && caderno.questionIds) {
                const counts = await getHistoricalCountsForQuestions(caderno.questionIds);
                answeredCount = counts.resolved;
                correctCount = counts.correct;
                incorrectCount = counts.incorrect;

                statsHtml = `
                    <span class="text-sm text-gray-500 ml-2">
                        (${answeredCount} de ${caderno.questionIds.length} Resolvidas, 
                        <span class="text-green-600 font-medium">${correctCount} Acertos</span> e 
                        <span class="text-red-600 font-medium">${incorrectCount} Erros</span>)
                    </span>
                `;
            }
        } else {
            answeredCount = state.sessionStats.length;
            correctCount = state.sessionStats.filter(s => s.isCorrect).length;
            incorrectCount = answeredCount - correctCount;

            if (answeredCount > 0) {
                statsHtml = `
                    <span class="text-sm text-gray-500 ml-2">
                        (${answeredCount} Resolvidas, 
                        <span class="text-green-600 font-medium">${correctCount} Acertos</span> e 
                        <span class="text-red-600 font-medium">${incorrectCount} Erros</span>)
                    </span>
                `;
            }
        }

        questionCounterTop.innerHTML = `
            <span class="text-xl text-gray-800">Questão ${state.currentQuestionIndex + 1} de ${state.filteredQuestions.length}</span>
            ${statsHtml}
        `;

        prevQuestionBtn.disabled = state.currentQuestionIndex === 0;
        nextQuestionBtn.disabled = state.currentQuestionIndex >= state.filteredQuestions.length - 1;

    } else {
        navigationControls.classList.add('hidden');
        questionCounterTop.classList.add('hidden');
        questionInfoContainer.classList.add('hidden');
        questionToolbar.classList.add('hidden');
        if (questionsContainer) {
            questionsContainer.innerHTML = `<div class="text-center"><h3 class="text-xl font-bold">Nenhuma questão encontrada</h3><p class="text-gray-600 mt-2">Este caderno está vazio ou os filtros não retornaram resultados.</p></div>`;
        }
    }
}

export function updateStatsPanel(container = null, data = null) {
    let correctCount, incorrectCount, statsByMateria;
    const activeContainer = getActiveContainer();
    const statsContainer = container || (activeContainer ? activeContainer.querySelector('#stats-content') : null);

    if (!statsContainer) return;

    if (data) {
        correctCount = data.totalCorrect;
        incorrectCount = data.totalIncorrect;
        statsByMateria = data.statsByMateria;
    } else {
        correctCount = state.sessionStats.filter(s => s.isCorrect).length;
        incorrectCount = state.sessionStats.length - correctCount;
        statsByMateria = state.sessionStats.reduce((acc, stat) => {
            if (!acc[stat.materia]) {
                acc[stat.materia] = { correct: 0, total: 0, assuntos: {} };
            }
            if (!acc[stat.materia].assuntos[stat.assunto]) {
                acc[stat.materia].assuntos[stat.assunto] = { correct: 0, total: 0 };
            }

            acc[stat.materia].total++;
            acc[stat.materia].assuntos[stat.assunto].total++;
            if (stat.isCorrect) {
                acc[stat.materia].correct++;
                acc[stat.materia].assuntos[stat.assunto].correct++;
            }
            return acc;
        }, {});
    }

    const answeredCount = correctCount + incorrectCount;

    let materiaStatsHtml = '<div class="space-y-4">';
    let materiaIndex = 0;
    for (const materia in statsByMateria) {
        const disciplinaStats = statsByMateria[materia];
        const disciplinaAccuracy = (disciplinaStats.total > 0 ? (disciplinaStats.correct / disciplinaStats.total * 100) : 0).toFixed(0);
        const targetId = `assuntos-${materia.replace(/\s+/g, '-')}-${materiaIndex}`;
        materiaStatsHtml += `
            <div>
                <div class="flex justify-between items-center text-gray-800 cursor-pointer expand-btn" data-target="${targetId}">
                     <div class="flex items-center">
                        <i class="fas fa-plus-circle text-gray-800 mr-2"></i>
                        <span>${materia}</span>
                    </div>
                    <span class="font-semibold">${disciplinaStats.correct} / ${disciplinaStats.total} (${disciplinaAccuracy}%)</span>
                </div>
                <div id="${targetId}" class="pl-6 mt-2 space-y-2 border-l-2 border-gray-200 hidden">`;
        
        for (const assunto in disciplinaStats.assuntos) {
            const assuntoStats = disciplinaStats.assuntos[assunto];
            const assuntoAccuracy = (assuntoStats.total > 0 ? (assuntoStats.correct / assuntoStats.total * 100) : 0).toFixed(0);
            materiaStatsHtml += `
                <div class="flex justify-between items-center text-gray-600 text-sm">
                    <span>${assunto}</span>
                    <span class="font-semibold">${assuntoStats.correct} / ${assuntoStats.total} (${assuntoAccuracy}%)</span>
                </div>
            `;
        }

        materiaStatsHtml += '</div></div>';
        materiaIndex++;
    }
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

    if (answeredCount > 0) {
        renderPerformanceChart(statsContainer, correctCount, incorrectCount);
    } else {
        statsContainer.innerHTML = `<div class="text-center text-gray-500 py-10">${data ? 'Nenhum histórico de respostas para estas questões.' : 'Responda a pelo menos uma questão para ver suas estatísticas.'}</div>`;
    }
}


export async function generateStatsForQuestions(questionIds) {
    if (!state.currentUser || questionIds.length === 0) {
        return { totalCorrect: 0, totalIncorrect: 0, statsByMateria: {} };
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    const statsByMateria = {};

    const historyPromises = questionIds.map(id => getDoc(doc(db, 'users', state.currentUser.uid, 'questionHistory', id)));
    const historySnapshots = await Promise.all(historyPromises);

    const questionDetails = questionIds.map(id => state.allQuestions.find(q => q.id === id)).filter(Boolean);

    historySnapshots.forEach((snap, index) => {
        const question = questionDetails[index];
        if (snap.exists() && question) {
            const data = snap.data();
            const correct = data.correct || 0;
            const incorrect = data.incorrect || 0;
            totalCorrect += correct;
            totalIncorrect += incorrect;

            if (correct > 0 || incorrect > 0) {
                if (!statsByMateria[question.materia]) {
                    statsByMateria[question.materia] = { correct: 0, total: 0, assuntos: {} };
                }
                if (!statsByMateria[question.materia].assuntos[question.assunto]) {
                    statsByMateria[question.materia].assuntos[question.assunto] = { correct: 0, total: 0 };
                }

                statsByMateria[question.materia].correct += correct;
                statsByMateria[question.materia].total += correct + incorrect;
                statsByMateria[question.materia].assuntos[question.assunto].correct += correct;
                statsByMateria[question.materia].assuntos[question.assunto].total += correct + incorrect;
            }
        }
    });

    return { totalCorrect, totalIncorrect, statsByMateria };
}

export function updateStatsPageUI() {
    const statsMainContent = document.getElementById('stats-main-content');

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

    if (combinedSessions.length === 0) {
        if (statsMainContent) statsMainContent.innerHTML = '<p class="text-center text-gray-500">Ainda não há dados de sessões para exibir. Resolva algumas questões para começar!</p>';
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

    if (DOM.statsTotalQuestionsEl) DOM.statsTotalQuestionsEl.textContent = totalQuestions;
    if (DOM.statsTotalCorrectEl) DOM.statsTotalCorrectEl.textContent = totalCorrect;
    if (DOM.statsTotalIncorrectEl) DOM.statsTotalIncorrectEl.textContent = totalIncorrect;
    if (DOM.statsGeralAccuracyEl) DOM.statsGeralAccuracyEl.textContent = `${geralAccuracy}%`;

    renderHomePerformanceChart(materiaTotals);
    renderWeeklyChart();

    const byMateriaContainer = document.getElementById('stats-by-materia-container');
    if (byMateriaContainer) {
        byMateriaContainer.innerHTML = '';
        const sortedMaterias = Object.keys(materiaTotals).sort();
        sortedMaterias.forEach(materia => {
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
            byMateriaContainer.appendChild(div);
        });
    }

    const historyContainer = document.getElementById('stats-session-history-container');
    if (historyContainer) {
        historyContainer.innerHTML = '';
        combinedSessions.sort((a, b) => {
            const dateA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        }).forEach(session => {
            const date = session.createdAt?.seconds ? session.createdAt.toDate().toLocaleString('pt-BR') : 'Data indisponível';
            const isCurrent = !session.createdAt?.seconds;
            const div = document.createElement('div');
            div.className = `p-3 border-b border-gray-200 ${isCurrent ? 'bg-blue-50' : ''}`;
            const accuracy = session.accuracy || 0;
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <p class="font-medium text-gray-800">${isCurrent ? 'Sessão Atual' : date}</p>
                    <span class="text-sm font-semibold ${accuracy >= 60 ? 'text-green-600' : 'text-red-600'}">${accuracy.toFixed(0)}% de acerto</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">${session.correctCount} acertos de ${session.totalQuestions} questões</p>
            `;
            historyContainer.appendChild(div);
        });
    }
}

