import { state } from '../state.js';
import DOM from '../dom-elements.js';
import { handleSrsFeedback } from './srs.js';
import { getHistoricalCountsForQuestions, updateStatsPanel } from './stats.js';

/**
 * @file js/features/question-viewer.js
 * @description Gerencia a exibição e interação com as questões.
 */

export async function displayQuestion() {
    const activeContainer = state.currentCadernoId ? DOM.savedCadernosListContainer : DOM.vadeMecumContentArea;
    const questionsContainer = activeContainer.querySelector('#questions-container');
    
    if (!questionsContainer) return;

    questionsContainer.innerHTML = '';
    state.selectedAnswer = null;
    await updateNavigation();
    
    if (!state.currentUser) {
        questionsContainer.innerHTML = `<div class="text-center p-4">Por favor, faça login para resolver questões.</div>`;
        return;
    }
    if (state.filteredQuestions.length === 0) return;

    const answeredInSession = state.sessionStats.find(s => s.questionId === state.filteredQuestions[state.currentQuestionIndex].id);
    const persistedAnswer = state.userAnswers.get(state.filteredQuestions[state.currentQuestionIndex].id);

    if (answeredInSession) {
        renderAnsweredQuestion(answeredInSession.isCorrect, answeredInSession.userAnswer, false);
    } else if (persistedAnswer && !state.isReviewSession) {
        renderAnsweredQuestion(persistedAnswer.isCorrect, persistedAnswer.userAnswer, false);
    } else {
        renderUnansweredQuestion();
    }
}

function renderUnansweredQuestion() {
    const activeContainer = state.currentCadernoId ? DOM.savedCadernosListContainer : DOM.vadeMecumContentArea;
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if (!questionsContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const options = Array.isArray(question.options) ? question.options : [];
    
    const optionsHtml = options.map((option, index) => {
        let letter = '';
        if (question.tipo === 'Multipla Escolha') letter = String.fromCharCode(65 + index);
        else if (question.tipo === 'C/E') letter = option.charAt(0);
        
        return `
            <div data-option="${option}" class="option-item group flex items-center p-2 rounded-md cursor-pointer">
                <div class="option-circle flex-shrink-0 w-8 h-8 border-2 rounded-full flex items-center justify-center mr-4">
                    <span>${letter}</span>
                </div>
                <span class="option-text">${option}</span>
            </div>
        `;
    }).join('');

    questionsContainer.innerHTML = `
        <p class="text-lg mb-6">${question.text}</p>
        <div id="options-container">${optionsHtml}</div>
        <div id="card-footer" class="mt-6">
            <button id="submit-btn" class="bg-green-500 text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 disabled:bg-green-300" disabled>Resolver</button>
        </div>
    `;
}

export function renderAnsweredQuestion(isCorrect, userAnswer, isFreshAnswer = false) {
    renderUnansweredQuestion();
    const activeContainer = state.currentCadernoId ? DOM.savedCadernosListContainer : DOM.vadeMecumContentArea;
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if (!questionsContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    
    questionsContainer.querySelectorAll('.option-item').forEach(item => {
        item.style.cursor = 'default';
        const optionValue = item.getAttribute('data-option');
        if (optionValue === question.correctAnswer) item.classList.add('correct-answer');
        else if (optionValue === userAnswer && !isCorrect) item.classList.add('incorrect-answer');
    });

    const cardFooter = questionsContainer.querySelector('#card-footer');
    if (!cardFooter) return;

    if (isFreshAnswer) {
        const reviewItem = state.userReviewItemsMap.get(question.id);
        const currentStage = reviewItem ? reviewItem.stage : 0;
        
        cardFooter.innerHTML = `
            <div class="mt-4 grid grid-cols-4 gap-2 w-full text-center text-sm">
                <button class="srs-feedback-btn bg-red-100 text-red-700 p-2 rounded-md" data-feedback="again">Errei</button>
                <button class="srs-feedback-btn bg-yellow-100 text-yellow-700 p-2 rounded-md" data-feedback="hard">Difícil</button>
                <button class="srs-feedback-btn bg-green-100 text-green-700 p-2 rounded-md" data-feedback="good">Bom</button>
                <button class="srs-feedback-btn bg-blue-100 text-blue-700 p-2 rounded-md" data-feedback="easy">Fácil</button>
            </div>
        `;
    } else {
        cardFooter.innerHTML = `<p class="${isCorrect ? 'text-green-600' : 'text-red-600'} font-bold">${isCorrect ? 'Correta!' : 'Errada!'}</p>`;
    }
}

export function renderQuestionListForAdding(questions, existingQuestionIds) {
    const questionsContainer = DOM.vadeMecumContentArea.querySelector('#questions-container');
    const mainContentContainer = DOM.vadeMecumContentArea.querySelector('#tabs-and-main-content');
    if (!questionsContainer || !mainContentContainer) return;
    
    mainContentContainer.classList.add('hidden');

    if (questions.length === 0) {
        questionsContainer.innerHTML = `<div class="text-center text-gray-500 p-4">Nenhuma questão encontrada.</div>`;
        return;
    }

    questionsContainer.innerHTML = questions.map(q => {
        const isAlreadyIn = existingQuestionIds.includes(q.id);
        const highlightClass = isAlreadyIn ? 'already-in-caderno opacity-70' : '';
        const badgeHtml = isAlreadyIn ? `<span class="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">No Caderno</span>` : '';
        return `
            <div class="p-4 border-b ${highlightClass}">
                <div class="flex justify-between items-start">
                    <p>${q.text.substring(0, 200)}...</p>
                    ${badgeHtml}
                </div>
            </div>`;
    }).join('');
}


// --- Event Handlers & Helpers ---

export function handleOptionSelect(event) {
    const target = event.target.closest('.option-item');
    if (!target) return;

    const activeContainer = state.currentCadernoId ? DOM.savedCadernosListContainer : DOM.vadeMecumContentArea;
    activeContainer.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
    target.classList.add('selected');
    state.selectedAnswer = target.getAttribute('data-option');
    activeContainer.querySelector('#submit-btn').disabled = false;
}

export function checkAnswer() {
    const question = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = state.selectedAnswer === question.correctAnswer;
    renderAnsweredQuestion(isCorrect, state.selectedAnswer, true);
}

export async function updateNavigation() {
    const activeContainer = state.currentCadernoId ? DOM.savedCadernosListContainer : DOM.vadeMecumContentArea;
    if (!activeContainer.querySelector('#navigation-controls')) return;

    if (state.filteredQuestions.length > 0) {
        activeContainer.querySelector('#navigation-controls').classList.remove('hidden');
        activeContainer.querySelector('#question-counter-top').classList.remove('hidden');

        let statsHtml = '';
        if (state.currentCadernoId) {
            const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
            const counts = await getHistoricalCountsForQuestions(caderno.questionIds);
            statsHtml = `(${counts.resolved} de ${caderno.questionIds.length} Resolvidas)`;
        } else {
            const answeredCount = state.sessionStats.length;
            if (answeredCount > 0) statsHtml = `(${answeredCount} Resolvidas)`;
        }

        activeContainer.querySelector('#question-counter-top').innerHTML = `Questão ${state.currentQuestionIndex + 1} de ${state.filteredQuestions.length} ${statsHtml}`;
        activeContainer.querySelector('#prev-question-btn').disabled = state.currentQuestionIndex === 0;
        activeContainer.querySelector('#next-question-btn').disabled = state.currentQuestionIndex >= state.filteredQuestions.length - 1;
    } else {
        activeContainer.querySelector('#navigation-controls').classList.add('hidden');
        activeContainer.querySelector('#question-counter-top').classList.add('hidden');
    }
}

export function handleVadeMecumTabs(event) {
    const targetTab = event.target.dataset.tab;
    if (!targetTab) return;
    
    const activeContainer = state.currentCadernoId ? DOM.savedCadernosListContainer : DOM.vadeMecumContentArea;
    const questionView = activeContainer.querySelector('#question-view');
    const statsView = activeContainer.querySelector('#stats-view');

    activeContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (targetTab === 'question') {
        questionView.classList.remove('hidden');
        statsView.classList.add('hidden');
    } else if (targetTab === 'stats') {
        questionView.classList.add('hidden');
        statsView.classList.remove('hidden');
        updateStatsPanel();
    }
}

export function handleQuestionViewerClick(event) {
    if (event.target.id === 'submit-btn') checkAnswer();
    else if (event.target.closest('.option-item')) handleOptionSelect(event);
    else if (event.target.closest('.srs-feedback-btn')) {
        handleSrsFeedback(event.target.closest('.srs-feedback-btn').dataset.feedback);
    }
}

