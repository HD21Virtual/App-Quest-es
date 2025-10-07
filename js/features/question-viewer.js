import { state, setState, getActiveContainer } from '../state.js';
import { handleSrsFeedback } from './srs.js';
import { updateStatsPanel } from './stats.js';
import { saveUserAnswer, updateQuestionHistory, saveCadernoState } from '../services/firestore.js';
import { removeQuestionFromCaderno } from './caderno.js';

export async function navigateQuestion(direction) {
// ... existing code ...
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
// ... existing code ...
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
// ... existing code ...
    const question = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = state.selectedAnswer === question.correctAnswer;
    renderAnsweredQuestion(isCorrect, state.selectedAnswer, true);
}

export function handleDiscardOption(event) {
// ... existing code ...
    event.stopPropagation();
    const targetItem = event.currentTarget.closest('.option-item');
    if (targetItem) {
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
// ... existing code ...
    const activeContainer = getActiveContainer();
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if(!questionsContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const options = Array.isArray(question.options) ? question.options : [];
    
    const optionsHtml = options.map((option, index) => {
        let letterContent = '';
        if (question.tipo === 'Multipla Escolha' || question.tipo === 'C/E') {
            const letter = question.tipo === 'C/E' ? option.charAt(0) : String.fromCharCode(65 + index);
            letterContent = `<span class="option-letter text-gray-700">${letter}</span>`;
        }
        
        const scissorIconSVG = `...`; // SVG content

        return `
            <div data-option="${option}" class="option-item group flex items-center p-2 rounded-md cursor-pointer ...">
               ...
            </div>
        `;
    }).join('');

    questionsContainer.innerHTML = `
        <p class="text-gray-800 text-lg mb-6">${question.text}</p>
        <div id="options-container" class="space-y-2">
            ${optionsHtml}
        </div>
        <div id="card-footer" class="mt-6 flex items-center">
            <button id="submit-btn" class="bg-green-500 text-white font-bold py-3 px-6 rounded-md ... " disabled>Resolver</button>
        </div>
    `;
}


export function renderAnsweredQuestion(isCorrect, userAnswer, isFreshAnswer = false) {
// ... existing code ...
    const activeContainer = getActiveContainer();
    if (!activeContainer) return;

    renderUnansweredQuestion();
    
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if (!questionsContainer) return;
    // ... rest of the function
}

export async function displayQuestion() {
    const activeContainer = getActiveContainer();
    // Guard clause to prevent error on initial load or view switch
    if (!activeContainer) {
        return;
    }

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
        questionsContainer.innerHTML = `
            <div class="text-center py-12 px-6">
                <h3 class="text-xl font-bold text-gray-700">Nenhuma questão encontrada</h3>
                <p class="text-gray-500 mt-2">Por favor, ajuste os filtros ou clique em "Limpar filtro" para ver as questões.</p>
            </div>
        `;
        return;
    }
    
    const question = state.filteredQuestions[state.currentQuestionIndex];
// ... existing code ...
}


async function updateNavigation() {
    const activeContainer = getActiveContainer();
    if (!activeContainer) return;

    const navContainer = activeContainer.querySelector('#navigation-controls');
    const questionCounterTop = activeContainer.querySelector('#question-counter-top');

    if (!navContainer || !questionCounterTop) return;

    if (state.filteredQuestions.length > 0) {
        navContainer.classList.remove('hidden');
        questionCounterTop.classList.remove('hidden');
        questionCounterTop.innerHTML = `Questão <strong>${state.currentQuestionIndex + 1}</strong> de <strong>${state.filteredQuestions.length}</strong>`;

        const prevBtn = activeContainer.querySelector('#prev-question-btn');
        const nextBtn = activeContainer.querySelector('#next-question-btn');
        if(prevBtn) prevBtn.disabled = state.currentQuestionIndex === 0;
        if(nextBtn) nextBtn.disabled = state.currentQuestionIndex === state.filteredQuestions.length - 1;

    } else {
        navContainer.classList.add('hidden');
        questionCounterTop.classList.add('hidden');
    }
}


export function renderQuestionListForAdding(questions, existingQuestionIds) {
// ... existing code ...
}
