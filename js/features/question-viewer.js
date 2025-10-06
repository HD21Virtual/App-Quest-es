import { state, setState, getActiveContainer } from '../state.js';
import DOM from '../dom-elements.js';
import { updateStatsPanel } from './stats.js';
import { handleSrsFeedback } from './srs.js';
import { saveCadernoState, saveUserAnswer, updateQuestionHistory } from '../services/firestore.js';
import { removeQuestionFromCaderno } from './caderno.js';

export async function displayQuestion() {
    const activeContainer = getActiveContainer();
    const questionsContainer = activeContainer.querySelector('#questions-container');
    const questionInfoContainer = activeContainer.querySelector('#question-info-container');
    const questionToolbar = activeContainer.querySelector('#question-toolbar');

    if (!questionsContainer || !questionInfoContainer || !questionToolbar) return;

    questionsContainer.innerHTML = '';
    questionInfoContainer.innerHTML = '';
    questionToolbar.innerHTML = '';
    setState('selectedAnswer', null);
    await updateNavigation();

    if (!state.currentUser) {
        questionsContainer.innerHTML = `<div class="text-center"><h3 class="text-xl font-bold">Bem-vindo!</h3><p class="text-gray-600 mt-2">Por favor, <button id="login-from-empty" class="text-blue-600 underline">faça login</button> para começar a resolver questões.</p></div>`;
        return;
    }

    if (state.filteredQuestions.length === 0) {
        questionsContainer.innerHTML = `<div class="text-center text-gray-500 p-8 bg-white rounded-lg shadow-sm">Nenhuma questão encontrada com os filtros atuais.</div>`;
        return;
    }

    const question = state.filteredQuestions[state.currentQuestionIndex];
    questionInfoContainer.innerHTML = `
        <p>Matéria: <a href="#" class="text-blue-600 hover:underline">${question.materia}</a></p>
        <p>Assunto: <a href="#" class="text-blue-600 hover:underline">${question.assunto}</a></p>
    `;

    questionToolbar.innerHTML = `
        <button class="flex items-center hover:text-blue-600 transition-colors"><i class="fas fa-graduation-cap mr-2"></i>Gabarito Comentado</button>
        <button class="flex items-center hover:text-blue-600 transition-colors"><i class="fas fa-comment-dots mr-2"></i>Comentários</button>
    `;

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

function renderUnansweredQuestion() {
    const activeContainer = getActiveContainer();
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if (!questionsContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const options = Array.isArray(question.options) ? question.options : [];

    const optionsHtml = options.map((option, index) => `
        <div data-option="${option}" class="option-item group flex items-center p-2 rounded-md cursor-pointer transition duration-200">
           <div class="option-circle flex-shrink-0 w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center mr-4 transition-all duration-200">
               <span class="option-letter text-gray-700">${String.fromCharCode(65 + index)}</span>
           </div>
           <span class="option-text text-gray-800">${option}</span>
        </div>
    `).join('');

    questionsContainer.innerHTML = `
        <p class="text-gray-800 text-lg mb-6">${question.text}</p>
        <div id="options-container" class="space-y-2">${optionsHtml}</div>
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
        item.style.cursor = 'default';
        item.classList.add('is-answered');
        const optionValue = item.getAttribute('data-option');
        if (optionValue === question.correctAnswer) {
            item.classList.add('correct-answer');
        } else if (optionValue === userAnswer && !isCorrect) {
            item.classList.add('incorrect-answer');
        }
    });

    const cardFooter = questionsContainer.querySelector('#card-footer');
    if (!cardFooter) return;
    cardFooter.innerHTML = '';
    
    let feedbackHtml = `...`; // Simplified for brevity

    if (isFreshAnswer) {
        feedbackHtml += `...`; // SRS feedback buttons
        cardFooter.innerHTML = feedbackHtml;
    } else {
        if (state.currentCadernoId) {
           feedbackHtml += `<button class="remove-question-btn text-red-500 hover:underline ml-auto" data-question-id="${question.id}">Remover do Caderno</button>`;
        }
        cardFooter.innerHTML = `<div class="flex items-center space-x-4 flex-wrap">${feedbackHtml}</div>`;
    }
}

export async function checkAnswer() {
    const question = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = state.selectedAnswer === question.correctAnswer;
    renderAnsweredQuestion(isCorrect, state.selectedAnswer, true);
}

export function handleOptionSelect(option) {
    setState('selectedAnswer', option);
    const activeContainer = getActiveContainer();
    const submitBtn = activeContainer.querySelector('#submit-btn');
    if (submitBtn) submitBtn.disabled = false;
}

export async function navigateQuestion(direction) {
    const newIndex = state.currentQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < state.filteredQuestions.length) {
        setState('currentQuestionIndex', newIndex);
        if (state.currentCadernoId) {
            await saveCadernoState(state.currentCadernoId, newIndex);
        }
        await displayQuestion();
    }
}

export async function updateNavigation() {
    const activeContainer = getActiveContainer();
    const navigationControls = activeContainer.querySelector('#navigation-controls');
    const questionCounterTop = activeContainer.querySelector('#question-counter-top');
    
    if (!navigationControls || !questionCounterTop) return;
    
    if (state.filteredQuestions.length > 0) {
        navigationControls.classList.remove('hidden');
        questionCounterTop.classList.remove('hidden');
        questionCounterTop.innerHTML = `Questão ${state.currentQuestionIndex + 1} de ${state.filteredQuestions.length}`;
        
        activeContainer.querySelector('#prev-question-btn').disabled = state.currentQuestionIndex === 0;
        activeContainer.querySelector('#next-question-btn').disabled = state.currentQuestionIndex >= state.filteredQuestions.length - 1;
    } else {
        navigationControls.classList.add('hidden');
        questionCounterTop.classList.add('hidden');
    }
}

export function renderQuestionListForAdding(questions, existingQuestionIds) {
    const questionsContainer = DOM.vadeMecumContentArea.querySelector('#questions-container');
    const mainContentContainer = DOM.vadeMecumContentArea.querySelector('#tabs-and-main-content');
    if (!questionsContainer || !mainContentContainer) return;

    mainContentContainer.classList.add('hidden');

    if (questions.length === 0) {
        questionsContainer.innerHTML = `<div class="text-center text-gray-500 p-8 bg-white rounded-lg shadow-sm">Nenhuma questão encontrada com os filtros atuais.</div>`;
        return;
    }

    const listHtml = questions.map(q => {
        const isAlreadyIn = existingQuestionIds.includes(q.id);
        const highlightClass = isAlreadyIn ? 'already-in-caderno opacity-70' : '';
        const badgeHtml = isAlreadyIn 
            ? `<span class="text-xs font-semibold bg-blue-200 text-blue-800 px-2 py-1 rounded-full">No Caderno</span>`
            : '';

        const tempDiv = document.createElement('div');
        tempDiv.innerText = q.text;
        const shortText = tempDiv.innerHTML.substring(0, 200) + (q.text.length > 200 ? '...' : '');

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

