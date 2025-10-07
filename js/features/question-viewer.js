import { state, setState, getActiveContainer } from '../state.js';
import { handleSrsFeedback } from './srs.js';
import { updateStatsPanel } from './stats.js';
import { saveUserAnswer, updateQuestionHistory, saveCadernoState } from '../services/firestore.js';
import { removeQuestionFromCaderno } from './caderno.js';

export async function navigateQuestion(direction) {
    if (direction === 'prev' && state.currentQuestionIndex > 0) {
        setState('currentQuestionIndex', state.currentQuestionIndex - 1);
    } else if (direction === 'next' && state.currentQuestionIndex < state.filteredQuestions.length - 1) {
        setState('currentQuestionIndex', state.currentQuestionIndex + 1);
    }

    if (state.currentCadernoId) {
        await saveCadernoState(state.currentCadernoId, state.currentQuestionIndex);
    }
    await displayQuestion();
}

export function handleOptionSelect(event) {
    const target = event.currentTarget;
    if (target.classList.contains('discarded') || target.closest('.is-answered')) {
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
    await handleSrsFeedback('good'); // Defaulting to 'good', SRS buttons will handle specifics
    const question = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = state.selectedAnswer === question.correctAnswer;
    renderAnsweredQuestion(isCorrect, state.selectedAnswer);
    updateStatsPanel();
}

export function handleDiscardOption(event) {
    event.stopPropagation();
    const targetItem = event.currentTarget.closest('.option-item');
    if (targetItem && !targetItem.closest('.is-answered')) {
        targetItem.classList.toggle('discarded');
        if (targetItem.classList.contains('selected')) {
            targetItem.classList.remove('selected');
            setState('selectedAnswer', null);
            const activeContainer = getActiveContainer();
            const submitBtn = activeContainer.querySelector('#submit-btn');
            if(submitBtn) submitBtn.disabled = true;
        }
    }
}

function renderUnansweredQuestion() {
    const activeContainer = getActiveContainer();
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if (!questionsContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const options = Array.isArray(question.options) ? question.options : [];

    const optionsHtml = options.map((option, index) => {
        const letter = question.tipo === 'C/E' ? option.charAt(0) : String.fromCharCode(65 + index);
        const uniqueId = `option-${question.id}-${index}`;
        return `
            <div data-option="${option}" class="option-item group flex items-start p-3 rounded-md cursor-pointer transition-all duration-200 border border-transparent hover:bg-gray-50">
                <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border-2 border-gray-300 transition-all duration-200 option-circle mr-4 mt-1">
                    <span class="option-letter font-bold text-gray-600">${letter}</span>
                </div>
                <div class="flex-grow option-text text-gray-700">${option}</div>
                <button class="discard-btn opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 ml-2">
                    <i class="fas fa-times-circle pointer-events-none"></i>
                </button>
            </div>
        `;
    }).join('');

    questionsContainer.innerHTML = `
        <p class="text-gray-800 text-lg leading-relaxed mb-6">${question.text}</p>
        <div id="options-container" class="space-y-2">
            ${optionsHtml}
        </div>
        <div id="card-footer" class="mt-8 flex items-center border-t pt-4">
            <button id="submit-btn" class="bg-blue-600 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled>Resolver</button>
        </div>
    `;
}

export function renderAnsweredQuestion(isCorrect, userAnswer) {
    renderUnansweredQuestion(); // First, render the base question
    const activeContainer = getActiveContainer();
    if (!activeContainer) return;

    const optionsContainer = activeContainer.querySelector('#options-container');
    const question = state.filteredQuestions[state.currentQuestionIndex];
    
    optionsContainer.classList.add('is-answered');

    optionsContainer.querySelectorAll('.option-item').forEach(item => {
        const optionValue = item.dataset.option;
        if (optionValue === question.correctAnswer) {
            item.classList.add('correct-answer');
        }
        if (optionValue === userAnswer && !isCorrect) {
            item.classList.add('incorrect-answer');
        }
    });
    
    const cardFooter = activeContainer.querySelector('#card-footer');
    if(cardFooter) {
        cardFooter.innerHTML = `
            <div class="flex items-center space-x-2">
                <span class="text-sm font-medium text-gray-600 mr-2">Como foi seu desempenho?</span>
                <button data-feedback="again" class="srs-feedback-btn bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm hover:bg-red-200">Errei</button>
                <button data-feedback="hard" class="srs-feedback-btn bg-yellow-100 text-yellow-700 px-3 py-1 rounded-md text-sm hover:bg-yellow-200">Difícil</button>
                <button data-feedback="good" class="srs-feedback-btn bg-green-100 text-green-700 px-3 py-1 rounded-md text-sm hover:bg-green-200">Bom</button>
                <button data-feedback="easy" class="srs-feedback-btn bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-sm hover:bg-blue-200">Fácil</button>
            </div>
        `;
    }
}

export async function displayQuestion() {
    const activeContainer = getActiveContainer();
    if (!activeContainer) return;

    const questionsContainer = activeContainer.querySelector('#questions-container');
    const questionInfoContainer = activeContainer.querySelector('#question-info-container');
    const questionToolbar = activeContainer.querySelector('#question-toolbar');

    if (!questionsContainer || !questionInfoContainer || !questionToolbar) return;

    questionsContainer.innerHTML = '';
    questionInfoContainer.innerHTML = '';
    questionToolbar.innerHTML = '';
    setState('selectedAnswer', null);
    
    if (!state.currentUser) {
        questionsContainer.innerHTML = `<div class="text-center"><h3 class="text-xl font-bold">Bem-vindo!</h3><p class="text-gray-600 mt-2">Por favor, <button id="login-from-empty" class="text-blue-600 underline">faça login</button> para começar a resolver questões.</p></div>`;
        return;
    }

    if (state.filteredQuestions.length === 0) {
        questionsContainer.innerHTML = `
            <div class="text-center p-8 bg-gray-50 rounded-lg">
                <h3 class="text-xl font-semibold text-gray-700">Nenhuma questão encontrada</h3>
                <p class="text-gray-500 mt-2">Tente ajustar seus filtros para encontrar o que procura.</p>
            </div>
        `;
        const navigationControls = activeContainer.querySelector('#navigation-controls');
        if(navigationControls) navigationControls.classList.add('hidden');
        const questionCounterTop = activeContainer.querySelector('#question-counter-top');
        if(questionCounterTop) questionCounterTop.classList.add('hidden');
        if(questionInfoContainer) questionInfoContainer.classList.add('hidden');
        if(questionToolbar) questionToolbar.classList.add('hidden');
        return;
    }
    
    const question = state.filteredQuestions[state.currentQuestionIndex];
    const userAnswerData = state.userAnswers.get(question.id);

    if (userAnswerData) {
        renderAnsweredQuestion(userAnswerData.isCorrect, userAnswerData.userAnswer);
    } else {
        renderUnansweredQuestion();
    }

    // Update info and toolbar
    questionInfoContainer.innerHTML = `
        <p><strong>Matéria:</strong> ${question.materia || 'N/A'}</p>
        <p><strong>Assunto:</strong> ${question.assunto || 'N/A'}</p>
    `;
    questionToolbar.innerHTML = `
        ${state.currentCadernoId ? `<button data-question-id="${question.id}" class="remove-question-btn text-gray-500 hover:text-red-600"><i class="fas fa-trash-alt mr-1"></i> Remover</button>` : ''}
    `;

    questionInfoContainer.classList.remove('hidden');
    questionToolbar.classList.remove('hidden');

    await updateNavigation();
}

async function updateNavigation() {
    const activeContainer = getActiveContainer();
    if (!activeContainer) return;

    const prevBtn = activeContainer.querySelector('#prev-question-btn');
    const nextBtn = activeContainer.querySelector('#next-question-btn');
    const counter = activeContainer.querySelector('#question-counter-top');
    const navControls = activeContainer.querySelector('#navigation-controls');

    if (!prevBtn || !nextBtn || !counter || !navControls) return;

    if (state.filteredQuestions.length > 0) {
        counter.textContent = `Questão ${state.currentQuestionIndex + 1} de ${state.filteredQuestions.length}`;
        counter.classList.remove('hidden');
        navControls.classList.remove('hidden');

        prevBtn.disabled = state.currentQuestionIndex === 0;
        nextBtn.disabled = state.currentQuestionIndex === state.filteredQuestions.length - 1;
    } else {
        counter.classList.add('hidden');
        navControls.classList.add('hidden');
    }
}

export function renderQuestionListForAdding(questions, existingQuestionIds) {
    const questionsContainer = document.querySelector('#questions-container');
    if (!questionsContainer) return;

    if (questions.length === 0) {
        questionsContainer.innerHTML = `<p class="text-center text-gray-500">Nenhuma questão encontrada com os filtros atuais.</p>`;
        return;
    }

    questionsContainer.innerHTML = questions.map(q => {
        const alreadyIn = existingQuestionIds.includes(q.id);
        return `
            <div class="p-4 border-b ${alreadyIn ? 'already-in-caderno' : ''}">
                <p class="text-sm text-gray-600">${q.text}</p>
                ${alreadyIn ? '<span class="text-xs font-bold text-blue-600 mt-2 inline-block">Já está no caderno</span>' : ''}
            </div>
        `;
    }).join('');
}


