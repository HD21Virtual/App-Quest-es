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
// ... existing code ...
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
    // ... rest of rendering logic
}


async function updateNavigation() {
// ... existing code ...
    if (!activeContainer) return;
    // ... rest of navigation update logic
}


export function renderQuestionListForAdding(questions, existingQuestionIds) {
    // ... rendering logic
}

