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
    const target = event.target.closest('.option-item');
    if (!target || target.classList.contains('discarded') || target.classList.contains('is-answered')) {
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

    if (!state.sessionStats.some(s => s.questionId === question.id)) {
        state.sessionStats.push({
            questionId: question.id, isCorrect: isCorrect, materia: question.materia,
            assunto: question.assunto, userAnswer: state.selectedAnswer
        });
    }

    if (state.currentUser) {
        await saveUserAnswer(question.id, state.selectedAnswer, isCorrect);
    }

    renderAnsweredQuestion(isCorrect, state.selectedAnswer, true);
    updateStatsPanel();
}


export function handleDiscardOption(event) {
    event.stopPropagation();
    const targetItem = event.target.closest('.option-item');
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

function renderUnansweredQuestion() {
    const activeContainer = getActiveContainer();
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if (!questionsContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const options = Array.isArray(question.options) ? question.options : [];

    const optionsHtml = options.map((option, index) => {
        let letter = '';
        if (question.tipo === 'Multipla Escolha') {
            letter = String.fromCharCode(65 + index);
        } else if (question.tipo === 'C/E') {
            letter = option.charAt(0).toUpperCase();
        }

        const letterHtml = letter ? `<div class="option-circle flex-shrink-0 w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center mr-4 transition-colors"><span class="option-letter font-bold text-gray-600 transition-colors">${letter}</span></div>` : '';

        return `
            <div data-option="${option}" class="option-item group flex items-start p-3 rounded-md cursor-pointer transition-colors hover:bg-gray-50 border border-transparent">
               ${letterHtml}
               <span class="option-text flex-grow text-gray-700">${option.substring(2)}</span>
               <button class="discard-btn ml-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                    <i class="fas fa-cut pointer-events-none"></i>
               </button>
            </div>
        `;
    }).join('');

    questionsContainer.innerHTML = `
        <p class="text-gray-800 text-lg mb-6 whitespace-pre-wrap">${question.text}</p>
        <div id="options-container" class="space-y-2">
            ${optionsHtml}
        </div>
        <div id="card-footer" class="mt-6 flex items-center">
            <button id="submit-btn" class="bg-green-500 text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled>Resolver</button>
        </div>
    `;
}

export function renderAnsweredQuestion(isCorrect, userAnswer, isFreshAnswer = false) {
    const activeContainer = getActiveContainer();
    if (!activeContainer) return;

    renderUnansweredQuestion();

    const questionsContainer = activeContainer.querySelector('#questions-container');
    if (!questionsContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const correctAnswer = question.correctAnswer;

    questionsContainer.querySelectorAll('.option-item').forEach(item => {
        const option = item.dataset.option;
        item.classList.add('is-answered');
        item.style.pointerEvents = 'none';

        if (option === correctAnswer) {
            item.classList.add('correct-answer');
        } else if (option === userAnswer) {
            item.classList.add('incorrect-answer');
        }
    });
    
    const footer = questionsContainer.querySelector('#card-footer');
    if (footer) {
         footer.innerHTML = `
            <div class="flex items-center space-x-2">
                <button data-feedback="again" class="srs-feedback-btn px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200">Errei</button>
                <button data-feedback="hard" class="srs-feedback-btn px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200">Difícil</button>
                <button data-feedback="good" class="srs-feedback-btn px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">Bom</button>
                <button data-feedback="easy" class="srs-feedback-btn px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200">Fácil</button>
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
    
    await updateNavigation();

    if (state.filteredQuestions.length === 0) {
        questionsContainer.innerHTML = `
            <div class="text-center py-12 px-6">
                <h3 class="text-xl font-bold text-gray-700">Nenhuma questão encontrada</h3>
                <p class="text-gray-500 mt-2">Por favor, ajuste os filtros ou clique em "Limpar filtro" para ver as questões.</p>
            </div>
        `;
        questionInfoContainer.classList.add('hidden');
        questionToolbar.classList.add('hidden');
        return;
    }

    const question = state.filteredQuestions[state.currentQuestionIndex];
    if (!question) return;

    questionInfoContainer.innerHTML = `
        <p class="text-xs text-gray-500"><strong>Disciplina:</strong> ${question.materia}</p>
        <p class="text-xs text-gray-500"><strong>Assunto:</strong> ${question.assunto}</p>
    `;

    questionToolbar.innerHTML = `
         <button class="remove-question-btn text-xs text-gray-500 hover:text-red-600 ${state.currentCadernoId ? '' : 'hidden'}" data-question-id="${question.id}">
             <i class="fas fa-trash-alt mr-1"></i> Remover do Caderno
         </button>
    `;
    questionInfoContainer.classList.remove('hidden');
    questionToolbar.classList.remove('hidden');

    const userAnswerData = state.userAnswers.get(question.id);
    if (userAnswerData) {
        renderAnsweredQuestion(userAnswerData.isCorrect, userAnswerData.userAnswer, false);
    } else {
        renderUnansweredQuestion();
    }
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
        if (prevBtn) prevBtn.disabled = state.currentQuestionIndex === 0;
        if (nextBtn) nextBtn.disabled = state.currentQuestionIndex === state.filteredQuestions.length - 1;

    } else {
        navContainer.classList.add('hidden');
        questionCounterTop.classList.add('hidden');
    }
}

export function renderQuestionListForAdding(questions, existingQuestionIds) {
    const mainContentContainer = document.querySelector('#tabs-and-main-content');
    if(!mainContentContainer) return;
    
    mainContentContainer.classList.add('hidden');

    const listHtml = questions.map(q => {
        const alreadyExists = existingQuestionIds.includes(q.id);
        return `
            <div class="p-4 border-b ${alreadyExists ? 'already-in-caderno' : 'bg-white'}">
                <p class="text-sm text-gray-800">${q.text}</p>
                <p class="text-xs text-gray-500 mt-2">${q.materia} > ${q.assunto}</p>
            </div>
        `;
    }).join('');

    const listContainer = document.getElementById('vade-mecum-content-area');
    listContainer.innerHTML = `<div class="bg-white rounded-lg shadow-sm">${listHtml}</div>`;
}

