import { state, setState, getActiveContainer } from '../state.js';
import { updateNavigation, updateStatsPanel } from './stats.js';
import { handleSrsFeedback } from './srs.js';
import { openAuthModal } from '../ui/modal.js';
import { saveCadernoState } from '../services/firestore.js';
import { removeQuestionFromCaderno } from './caderno.js';

function renderUnansweredQuestion() {
    const activeContainer = getActiveContainer();
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if (!questionsContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const options = Array.isArray(question.options) ? question.options : [];
    if (options.length === 0) {
        console.warn("Questão sem opções válidas:", question);
    }

    const optionsHtml = options.map((option, index) => {
        let letterContent = '';
        if (question.tipo === 'Multipla Escolha' || question.tipo === 'C/E') {
            const letter = question.tipo === 'C/E' ? option.charAt(0) : String.fromCharCode(65 + index);
            letterContent = `<span class="option-letter text-gray-700">${letter}</span>`;
        }

        const checkIcon = question.tipo === 'C/E'
            ? `<svg class="check-icon hidden w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`
            : '';

        const scissorIconSVG = `
            <svg class="h-5 w-5 text-blue-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
               <path stroke-linecap="round" stroke-linejoin="round" d="M3.5 6.5a2 2 0 114 0 2 2 0 01-4 0zM3.5 17.5a2 2 0 114 0 2 2 0 01-4 0z"></path>
               <path stroke-linecap="round" stroke-linejoin="round" d="M6 8.5L18 15.5"></path>
               <path stroke-linecap="round" stroke-linejoin="round" d="M6 15.5L18 8.5"></path>
            </svg>`;

        return `
            <div data-option="${option}" class="option-item group flex items-center p-2 rounded-md cursor-pointer transition duration-200">
               <div class="action-icon-container w-8 h-8 flex-shrink-0 flex items-center justify-center mr-1">
                    <div class="discard-btn opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-blue-100 rounded-full p-1.5">
                        ${scissorIconSVG}
                    </div>
                </div>
               <div class="option-circle flex-shrink-0 w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center mr-4 transition-all duration-200">
                   ${letterContent}
                   ${checkIcon}
               </div>
               <span class="option-text text-gray-800">${option}</span>
            </div>
        `;
    }).join('');

    questionsContainer.innerHTML = `
        <p class="text-gray-800 text-lg mb-6">${question.text}</p>
        <div id="options-container" class="space-y-2">
            ${optionsHtml}
        </div>
        <div id="card-footer" class="mt-6 flex items-center">
            <button id="submit-btn" class="bg-green-500 text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 transition-colors duration-300 disabled:bg-green-300 disabled:cursor-not-allowed" disabled>Resolver</button>
        </div>
    `;
}

export function renderAnsweredQuestion(isCorrect, userAnswer, isFreshAnswer = false) {
    renderUnansweredQuestion();

    const activeContainer = getActiveContainer();
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if (!questionsContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];

    questionsContainer.querySelectorAll('.option-item').forEach(item => {
        const actionIconContainer = item.querySelector('.action-icon-container');
        if (actionIconContainer) actionIconContainer.innerHTML = '';

        item.style.cursor = 'default';
        item.classList.add('is-answered');

        const optionValue = item.getAttribute('data-option');
        if (optionValue === question.correctAnswer) {
            item.classList.add('correct-answer');
            if (actionIconContainer) actionIconContainer.innerHTML = `<i class="fas fa-check text-green-500 text-xl"></i>`;
        } else if (optionValue === userAnswer && !isCorrect) {
            item.classList.add('incorrect-answer');
            if (actionIconContainer) actionIconContainer.innerHTML = `<i class="fas fa-times text-red-500 text-xl"></i>`;
        }
    });

    const cardFooter = questionsContainer.querySelector('#card-footer');
    if (!cardFooter) return;

    cardFooter.innerHTML = '';
    cardFooter.className = 'mt-6 w-full';

    let feedbackHtml = '';
    if (isFreshAnswer) {
        feedbackHtml = `...`; // SRS Feedback HTML
    } else {
        const isCorrectClass = isCorrect ? 'text-green-600' : 'text-red-600';
        feedbackHtml = `<div class="flex items-center space-x-4 flex-wrap"><span class="${isCorrectClass} font-bold text-lg">${isCorrect ? 'Correta!' : 'Errada!'}</span>`;
        if (state.currentCadernoId) {
            feedbackHtml += `<button class="remove-question-btn text-red-500 hover:underline ml-auto" data-question-id="${question.id}">Remover do Caderno</button>`;
        }
        feedbackHtml += `</div>`;
    }
    cardFooter.innerHTML = feedbackHtml;
}


export async function displayQuestion() {
    const activeContainer = getActiveContainer();
    const questionsContainer = activeContainer.querySelector('#questions-container');
    
    if (!questionsContainer) return;

    questionsContainer.innerHTML = '';
    setState('selectedAnswer', null);
    await updateNavigation();

    if (!state.currentUser) {
        questionsContainer.innerHTML = `<div class="text-center"><h3 class="text-xl font-bold">Bem-vindo!</h3><p class="text-gray-600 mt-2">Por favor, <button id="login-from-empty" class="text-blue-600 underline">faça login</button> para começar a resolver questões.</p></div>`;
        return;
    }

    if (state.filteredQuestions.length === 0) {
        return;
    }

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const answeredInSession = state.sessionStats.find(s => s.questionId === question.id);
    const persistedAnswer = state.userAnswers.get(question.id);

    if (answeredInSession) {
        renderAnsweredQuestion(answeredInSession.isCorrect, answeredInSession.userAnswer, false);
    } else if (persistedAnswer && !state.isReviewSession) {
        renderAnsweredQuestion(persistedAnswer.isCorrect, persistedAnswer.userAnswer, false);
    } else {
        renderUnansweredQuestion();
    }
}

export function handleOptionSelect(event) {
    const target = event.currentTarget;
    if (target.classList.contains('discarded')) {
        return;
    }
    const activeContainer = getActiveContainer();
    activeContainer.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
    target.classList.add('selected');
    setState('selectedAnswer', target.getAttribute('data-option'));
    
    const submitBtn = activeContainer.querySelector('#submit-btn');
    if (submitBtn) submitBtn.disabled = false;
}

export async function checkAnswer() {
    const question = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = state.selectedAnswer === question.correctAnswer;
    renderAnsweredQuestion(isCorrect, state.selectedAnswer, true);
}

export function handleDiscardOption(event) {
    event.stopPropagation();
    const targetItem = event.currentTarget.closest('.option-item');
    if (targetItem) {
        targetItem.classList.toggle('discarded');
        if (targetItem.classList.contains('selected')) {
            targetItem.classList.remove('selected');
            setState('selectedAnswer', null);
            const activeContainer = getActiveContainer();
            const submitBtn = activeContainer.querySelector('#submit-btn');
            if (submitBtn) submitBtn.disabled = true;
        }
    }
}

export async function navigateQuestion(direction) {
    const isPrev = direction === 'prev';
    const canNavigate = (isPrev && state.currentQuestionIndex > 0) || (!isPrev && state.currentQuestionIndex < state.filteredQuestions.length - 1);
    
    if (canNavigate) {
        const newIndex = isPrev ? state.currentQuestionIndex - 1 : state.currentQuestionIndex + 1;
        setState('currentQuestionIndex', newIndex);
        if (state.currentCadernoId) {
            await saveCadernoState(state.currentCadernoId, newIndex);
        }
        await displayQuestion();
    }
}

export function renderQuestionListForAdding(questions, existingQuestionIds) {
    const activeContainer = getActiveContainer();
    const questionsContainer = activeContainer.querySelector('#questions-container');
    const mainContentContainer = activeContainer.querySelector('#tabs-and-main-content');
    if (!questionsContainer || !mainContentContainer) return;

    mainContentContainer.classList.add('hidden');

    if (questions.length === 0) {
        questionsContainer.innerHTML = `<div class="text-center text-gray-500 p-8 bg-white rounded-lg shadow-sm">Nenhuma questão encontrada com os filtros atuais.</div>`;
        return;
    }

    const listHtml = questions.map(q => {
        const isAlreadyIn = existingQuestionIds.includes(q.id);
        const highlightClass = isAlreadyIn ? 'already-in-caderno opacity-70' : '';
        const badgeHtml = isAlreadyIn ? `<span class="text-xs font-semibold bg-blue-200 text-blue-800 px-2 py-1 rounded-full">No Caderno</span>` : '';

        const shortText = q.text.substring(0, 200) + (q.text.length > 200 ? '...' : '');

        return `
            <div class="p-4 border-b border-gray-200 ${highlightClass}">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-gray-800">${shortText}</p>
                        <p class="text-xs text-gray-500 mt-1">${q.materia} &bull; ${q.assunto}</p>
                    </div>
                    <div class="flex-shrink-0 ml-4">
                        ${badgeHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    questionsContainer.innerHTML = `<div class="bg-white rounded-lg shadow-sm">${listHtml}</div>`;
}

