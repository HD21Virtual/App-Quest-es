import { Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state, setState } from '../state.js';
import DOM from '../dom-elements.js';
import { navigateToView } from '../ui/navigation.js';
import { displayQuestion } from './question-viewer.js';
import { setSrsReviewItem, saveUserAnswer, updateQuestionHistory } from '../services/firestore.js';

function getNextReviewDate(intervalInMinutes) {
    const date = new Date();
    date.setMinutes(date.getMinutes() + intervalInMinutes);
    return Timestamp.fromDate(date);
}

function formatInterval(minutes) {
    if (minutes < 60) return `<${Math.round(minutes)}m`;
    if (minutes < 1440) return `~${Math.round(minutes / 60)}h`;
    const days = minutes / 1440;
    if (days < 30) return `~${Math.round(days)}d`;
    if (days < 365) return `~${Math.round(days / 30)}mo`;
    return `~${Math.round(days / 365)}y`;
}


export function calculateNextIntervals(reviewItem) {
    const settings = state.srsSettings;
    const now = new Date();

    const item = reviewItem || {
        status: 'new',
        easeFactor: settings.initialEaseFactor / 100,
        interval: 0,
        learningStep: 0,
    };

    const intervals = {};

    switch (item.status) {
        case 'new':
        case 'learning':
        case 'relearning':
            const steps = item.status === 'relearning' ? settings.relearningSteps : settings.learningSteps;
            intervals.again = formatInterval(steps[0]);
            
            if (item.learningStep + 1 < steps.length) {
                intervals.good = formatInterval(steps[item.learningStep + 1]);
            } else {
                 intervals.good = formatInterval(settings.graduatingInterval * 1440);
            }
            intervals.easy = formatInterval(settings.easyInterval * 1440);
            break;

        case 'review':
            intervals.again = formatInterval(settings.relearningSteps[0]);
            intervals.hard = formatInterval(item.interval * 1.2 * 1440);
            intervals.good = formatInterval(item.interval * item.easeFactor * 1440);
            intervals.easy = formatInterval(item.interval * item.easeFactor * (settings.intervalMultiplier) * 1440);
            break;
    }
    
    return intervals;
}


export async function handleSrsFeedback(feedback) {
    const question = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = state.selectedAnswer === question.correctAnswer;
    const settings = state.srsSettings;
    
    // 1. Get current review item or create a new one
    const currentItem = state.userReviewItemsMap.get(question.id) || {
        status: 'new',
        easeFactor: settings.initialEaseFactor / 100,
        interval: 0,
        learningStep: 1,
        questionId: question.id
    };

    const newItem = { ...currentItem };

    // 2. Process based on current status and feedback
    switch (newItem.status) {
        case 'new':
        case 'learning':
            const learningSteps = settings.learningSteps;
            if (feedback === 'again') {
                newItem.learningStep = 1; // Reset to first step
                newItem.nextReview = getNextReviewDate(learningSteps[0]);
            } else if (feedback === 'good') {
                if (newItem.learningStep < learningSteps.length) {
                    newItem.nextReview = getNextReviewDate(learningSteps[newItem.learningStep]);
                    newItem.learningStep += 1;
                } else { // Graduate
                    newItem.status = 'review';
                    newItem.interval = settings.graduatingInterval;
                    newItem.nextReview = getNextReviewDate(newItem.interval * 1440);
                }
            } else if (feedback === 'easy') { // Graduate immediately
                newItem.status = 'review';
                newItem.interval = settings.easyInterval;
                newItem.nextReview = getNextReviewDate(newItem.interval * 1440);
            }
            break;

        case 'review':
            if (feedback === 'again') {
                newItem.status = 'relearning';
                newItem.learningStep = 1;
                newItem.easeFactor = Math.max(1.3, newItem.easeFactor - 0.2);
                newItem.interval = Math.max(1, newItem.interval * (settings.lapseIntervalMultiplier));
                newItem.nextReview = getNextReviewDate(settings.relearningSteps[0]);
            } else { // Hard, Good, Easy
                if (feedback === 'hard') {
                    newItem.easeFactor = Math.max(1.3, newItem.easeFactor - 0.15);
                    newItem.interval *= 1.2;
                } else if (feedback === 'good') {
                    // Ease factor remains the same
                } else if (feedback === 'easy') {
                    newItem.easeFactor += 0.15;
                }
                newItem.interval *= newItem.easeFactor;
                newItem.interval = Math.min(newItem.interval, settings.maximumInterval);
                newItem.nextReview = getNextReviewDate(newItem.interval * 1440);
            }
            break;
        
        case 'relearning':
             const relearningSteps = settings.relearningSteps;
             if (feedback === 'again') {
                newItem.learningStep = 1;
                newItem.nextReview = getNextReviewDate(relearningSteps[0]);
             } else if (feedback === 'good') {
                 if (newItem.learningStep < relearningSteps.length) {
                    newItem.nextReview = getNextReviewDate(relearningSteps[newItem.learningStep]);
                    newItem.learningStep += 1;
                 } else { // Graduate back to review
                    newItem.status = 'review';
                    newItem.nextReview = getNextReviewDate(newItem.interval * 1440);
                 }
             }
            break;
    }

    // 3. Save all data
    if (state.currentUser) {
        await setSrsReviewItem(question.id, newItem);
        await saveUserAnswer(question.id, state.selectedAnswer, isCorrect);
        // Only count as 'correct' for history if it wasn't an 'again' feedback
        await updateQuestionHistory(question.id, feedback !== 'again');
    }

    // 4. Update session stats
     if (!state.sessionStats.some(s => s.questionId === question.id)) {
        state.sessionStats.push({
            questionId: question.id, isCorrect: isCorrect, materia: question.materia,
            assunto: question.assunto, userAnswer: state.selectedAnswer
        });
    }
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
        
        const status = item.status || 'new';

        if(status === 'relearning') {materiaStats.errei++; assuntoStats.errei++;}

        if (item.nextReview && item.nextReview.toDate() <= now) {
            materiaStats.aRevisar++;
            assuntoStats.aRevisar++;
            materiaStats.questionIdsARevisar.push(item.questionId);
            assuntoStats.questionIdsARevisar.push(item.questionId);
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
    }
}

