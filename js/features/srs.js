import { Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state, setState } from '../state.js';
import DOM from '../dom-elements.js';
import { navigateToView } from '../ui/navigation.js';
import { displayQuestion, renderAnsweredQuestion } from './question-viewer.js';
import { updateStatsPanel, updateStatsPageUI } from './stats.js';
import { setSrsReviewItem, saveUserAnswer, updateQuestionHistory } from '../services/firestore.js';

const reviewIntervals = [1, 3, 7, 15, 30, 90]; // Days

function getNextReviewDate(stage) {
    const index = Math.min(stage, reviewIntervals.length - 1);
    const daysToAdd = reviewIntervals[index];
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return Timestamp.fromDate(date);
}

export async function handleSrsFeedback(feedback) {
    const question = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = state.selectedAnswer === question.correctAnswer;

    if (!state.sessionStats.some(s => s.questionId === question.id)) {
        state.sessionStats.push({
            questionId: question.id, isCorrect: isCorrect, materia: question.materia,
            assunto: question.assunto, userAnswer: state.selectedAnswer
        });
    }

    if (state.currentUser) {
        const reviewItem = state.userReviewItemsMap.get(question.id);
        let currentStage = reviewItem ? reviewItem.stage : 0;
        let newStage;

        switch (feedback) {
            case 'again': newStage = 0; break;
            case 'hard': newStage = Math.max(0, currentStage - 1); break;
            case 'good': newStage = currentStage + 1; break;
            case 'easy': newStage = currentStage + 2; break;
            default: newStage = currentStage;
        }

        const nextReview = getNextReviewDate(newStage);
        const reviewData = { stage: newStage, nextReview: nextReview, questionId: question.id };
        await setSrsReviewItem(question.id, reviewData);
        state.userReviewItemsMap.set(question.id, reviewData);

        await saveUserAnswer(question.id, state.selectedAnswer, isCorrect);
        const historyIsCorrect = (feedback !== 'again') && isCorrect;
        await updateQuestionHistory(question.id, historyIsCorrect);
    }

    renderAnsweredQuestion(isCorrect, state.selectedAnswer, false);
    updateStatsPanel();
    updateStatsPageUI(); // CORREÇÃO: Atualiza os stats da página inicial em tempo real
}

export function renderReviewView() {
    if (!state.currentUser) {
        DOM.reviewTableContainer.innerHTML = `<p class="text-center text-gray-500 p-8">Por favor, faça login para ver suas revisões.</p>`;
        return;
    }

    if (state.userReviewItemsMap.size === 0) {
        DOM.reviewTableContainer.innerHTML = `<p class="text-center text-gray-500 p-8">Você ainda não tem nenhuma questão para revisar. Resolva questões para começar.</p>`;
        return;
    }

    const questionIdToDetails = new Map();
    state.allQuestions.forEach(q => {
        questionIdToDetails.set(q.id, { materia: q.materia, assunto: q.assunto });
    });

    const reviewStatsByMateria = {};
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    state.userReviewItemsMap.forEach(item => {
        const details = questionIdToDetails.get(item.questionId);
        if (!details) return;
        const { materia, assunto } = details;

        if (!reviewStatsByMateria[materia]) {
            reviewStatsByMateria[materia] = {
                total: 0, errei: 0, dificil: 0, bom: 0, facil: 0, aRevisar: 0,
                questionIdsARevisar: [],
                assuntos: {}
            };
        }

        if (!reviewStatsByMateria[materia].assuntos[assunto]) {
            reviewStatsByMateria[materia].assuntos[assunto] = {
                total: 0, errei: 0, dificil: 0, bom: 0, facil: 0, aRevisar: 0,
                questionIdsARevisar: []
            };
        }

        const materiaStats = reviewStatsByMateria[materia];
        const assuntoStats = reviewStatsByMateria[materia].assuntos[assunto];
        
        materiaStats.total++;
        assuntoStats.total++;
        
        const stage = item.stage || 0;

        if (stage === 0) { materiaStats.errei++; assuntoStats.errei++; }
        else if (stage === 1) { materiaStats.dificil++; assuntoStats.dificil++; }
        else if (stage === 2 || stage === 3) { materiaStats.bom++; assuntoStats.bom++; }
        else if (stage >= 4) { materiaStats.facil++; assuntoStats.facil++; }

        if (item.nextReview) {
            const reviewDate = item.nextReview.toDate();
            reviewDate.setHours(0, 0, 0, 0);
            if (reviewDate <= now) {
                materiaStats.aRevisar++;
                assuntoStats.aRevisar++;
                materiaStats.questionIdsARevisar.push(item.questionId);
                assuntoStats.questionIdsARevisar.push(item.questionId);
            }
        }
    });
    
    setState('reviewStatsByMateria', reviewStatsByMateria);

    const sortedMaterias = Object.keys(reviewStatsByMateria).sort();
    
    if (sortedMaterias.length === 0) {
        DOM.reviewTableContainer.innerHTML = `<p class="text-center text-gray-500 p-8">Nenhuma matéria com questões para revisar.</p>`;
        return;
    }

    let tableHtml = `
        <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><input type="checkbox" id="select-all-review-materias" class="rounded"></th>
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matéria / Assunto</th>
                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Questões marcadas como 'Errei'">Errei</th>
                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Questões marcadas como 'Difícil'">Difícil</th>
                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Questões marcadas como 'Bom'">Bom</th>
                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Questões marcadas como 'Fácil'">Fácil</th>
                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">A Revisar</th>
                    <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Concluído</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">`;

    sortedMaterias.forEach(materia => {
        const materiaStats = reviewStatsByMateria[materia];
        const isMateriaDisabled = materiaStats.aRevisar === 0;
        const materiaConcluidoPercent = materiaStats.total > 0 ? Math.round(((materiaStats.total - materiaStats.aRevisar) / materiaStats.total) * 100) : 100;
        const materiaProgressColor = materiaConcluidoPercent >= 80 ? 'bg-green-500' : materiaConcluidoPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500';

        tableHtml += `
            <tr class="materia-row ${isMateriaDisabled ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50 cursor-pointer'}" data-materia="${materia}">
                <td class="px-4 py-4 whitespace-nowrap"><input type="checkbox" class="materia-review-checkbox rounded" data-materia="${materia}" ${isMateriaDisabled ? 'disabled' : ''}></td>
                <td class="px-4 py-4 whitespace-nowrap font-medium ${isMateriaDisabled ? '' : 'text-gray-900'}">
                    <div class="flex items-center">
                        <i class="fas fa-chevron-right transition-transform duration-200 mr-2 text-gray-400"></i>
                        <span>${materia}</span>
                    </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-center">${materiaStats.total}</td>
                <td class="px-4 py-4 whitespace-nowrap text-center text-red-500 font-medium">${materiaStats.errei}</td>
                <td class="px-4 py-4 whitespace-nowrap text-center text-yellow-500 font-medium">${materiaStats.dificil}</td>
                <td class="px-4 py-4 whitespace-nowrap text-center text-green-500 font-medium">${materiaStats.bom}</td>
                <td class="px-4 py-4 whitespace-nowrap text-center text-blue-500 font-medium">${materiaStats.facil}</td>
                <td class="px-4 py-4 whitespace-nowrap text-center font-bold ${isMateriaDisabled ? '' : 'text-blue-600'}">${materiaStats.aRevisar}</td>
                <td class="px-4 py-4 whitespace-nowrap">
                    <div class="flex items-center justify-center">
                        <span class="text-xs font-medium text-gray-700 w-8">${materiaConcluidoPercent}%</span>
                        <div class="w-24 bg-gray-200 rounded-full h-2.5 ml-2"><div class="${materiaProgressColor} h-2.5 rounded-full" style="width: ${materiaConcluidoPercent}%"></div></div>
                    </div>
                </td>
            </tr>`;

        const sortedAssuntos = Object.keys(materiaStats.assuntos).sort();
        sortedAssuntos.forEach(assunto => {
            const assuntoStats = materiaStats.assuntos[assunto];
            const isAssuntoDisabled = assuntoStats.aRevisar === 0;
            const assuntoConcluidoPercent = assuntoStats.total > 0 ? Math.round(((assuntoStats.total - assuntoStats.aRevisar) / assuntoStats.total) * 100) : 100;
            const assuntoProgressColor = assuntoConcluidoPercent >= 80 ? 'bg-green-500' : assuntoConcluidoPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500';

            tableHtml += `
                <tr class="assunto-row hidden bg-blue-50 hover:bg-blue-100" data-parent-materia="${materia}">
                    <td class="pl-12 pr-4 py-3 whitespace-nowrap"><input type="checkbox" class="assunto-review-checkbox rounded" data-materia="${materia}" data-assunto="${assunto}" ${isAssuntoDisabled ? 'disabled' : ''}></td>
                    <td class="px-4 py-3 whitespace-nowrap text-gray-700">${assunto}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-center">${assuntoStats.total}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-center text-red-500">${assuntoStats.errei}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-center text-yellow-500">${assuntoStats.dificil}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-center text-green-500">${assuntoStats.bom}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-center text-blue-500">${assuntoStats.facil}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-center font-medium ${isAssuntoDisabled ? '' : 'text-blue-600'}">${assuntoStats.aRevisar}</td>
                    <td class="px-4 py-3 whitespace-nowrap">
                        <div class="flex items-center justify-center">
                            <span class="text-xs text-gray-600 w-8">${assuntoConcluidoPercent}%</span>
                            <div class="w-24 bg-gray-200 rounded-full h-2.5 ml-2"><div class="${assuntoProgressColor} h-2.5 rounded-full" style="width: ${assuntoConcluidoPercent}%"></div></div>
                        </div>
                    </td>
                </tr>`;
        });
    });

    tableHtml += `</tbody></table>`;
    DOM.reviewTableContainer.innerHTML = tableHtml;
}


export async function handleStartReview() {
    if (!state.currentUser) return;
    
    const selectedCheckboxes = DOM.reviewTableContainer.querySelectorAll('.assunto-review-checkbox:checked');
    if (selectedCheckboxes.length === 0) return;

    const questionsToReviewIds = new Set();
    selectedCheckboxes.forEach(cb => {
        const materia = cb.dataset.materia;
        const assunto = cb.dataset.assunto;
        const stats = state.reviewStatsByMateria[materia]?.assuntos[assunto];
        if (stats && stats.questionIdsARevisar) {
            stats.questionIdsARevisar.forEach(id => questionsToReviewIds.add(id));
        }
    });

    const uniqueQuestionIds = Array.from(questionsToReviewIds);

    if (uniqueQuestionIds.length > 0) {
        setState('isReviewSession', true);
        setState('filteredQuestions', state.allQuestions.filter(q => uniqueQuestionIds.includes(q.id)));
        setState('sessionStats', []);
        setState('currentQuestionIndex', 0);

        navigateToView('vade-mecum-view', false);

        DOM.vadeMecumTitle.textContent = "Sessão de Revisão";
        DOM.toggleFiltersBtn.classList.add('hidden');
        DOM.filterCard.classList.add('hidden');
        DOM.selectedFiltersContainer.innerHTML = `<span class="text-gray-500">Revisando ${uniqueQuestionIds.length} questões.</span>`;

        await displayQuestion();
        updateStatsPanel();
    }
}

