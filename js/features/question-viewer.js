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
            if(submitBtn) submitBtn.disabled = true;
        }
    }
}

function renderUnansweredQuestion() {
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
    const activeContainer = getActiveContainer();
    if (!activeContainer) return;

    renderUnansweredQuestion();
    
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if (!questionsContainer) return;
    // ... rest of the function
}

export async function displayQuestion() {
    const activeContainer = getActiveContainer();
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
    
    if (!state.currentUser) {
        questionsContainer.innerHTML = `<div class="text-center"><h3 class="text-xl font-bold">Bem-vindo!</h3><p class="text-gray-600 mt-2">Por favor, <button id="login-from-empty" class="text-blue-600 underline">faça login</button> para começar a resolver questões.</p></div>`;
        return;
    }

    // CORREÇÃO: Mostra uma mensagem quando não há questões a serem exibidas
    if (state.filteredQuestions.length === 0) {
        questionsContainer.innerHTML = `
            <div class="text-center py-10 px-4">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 class="mt-2 text-sm font-semibold text-gray-900">Nenhuma questão para mostrar</h3>
                <p class="mt-1 text-sm text-gray-500">Use os filtros acima e clique em "Filtrar questões" para começar.</p>
            </div>
        `;
        await updateNavigation();
        return;
    }
    
    await updateNavigation();
    const question = state.filteredQuestions[state.currentQuestionIndex];
    
    const userAnswerData = state.currentUser.answers?.[question.id];

    if (userAnswerData) {
        renderAnsweredQuestion(userAnswerData.isCorrect, userAnswerData.answer);
    } else {
        renderUnansweredQuestion();
    }
    // ... rest of rendering logic
}


async function updateNavigation() {
    const activeContainer = getActiveContainer();
    if (!activeContainer) return;
    // ... rest of navigation update logic
}


export function renderQuestionListForAdding(questions, existingQuestionIds) {
    // ... rendering logic
}
