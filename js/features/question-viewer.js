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
    const question = state.filteredQuestions[state.currentQuestionIndex];
    if (!state.selectedAnswer) return;
    const isCorrect = state.selectedAnswer === question.correctAnswer;

    if (!state.sessionStats.some(s => s.questionId === question.id)) {
        state.sessionStats.push({
            questionId: question.id, isCorrect: isCorrect, materia: question.materia,
            assunto: question.assunto, userAnswer: state.selectedAnswer
        });
    }

    if (state.currentUser && !state.isReviewSession) {
         await saveUserAnswer(question.id, state.selectedAnswer, isCorrect);
         await updateQuestionHistory(question.id, isCorrect);
    }

    renderAnsweredQuestion(isCorrect, state.selectedAnswer, true);
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
    if(!questionsContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const options = Array.isArray(question.options) ? question.options : [];
    
    const optionsHtml = options.map((option, index) => {
        let letterContent = '';
        if (question.tipo === 'Multipla Escolha' || question.tipo === 'C/E') {
            const letter = question.tipo === 'C/E' ? option.charAt(0) : String.fromCharCode(65 + index);
            letterContent = `<span class="option-letter text-gray-700 font-medium">${letter}</span>`;
        }
        
        const scissorIconSVG = `<svg class="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 7.879l-1.414-1.414L9 10.172l-1.707-1.707-1.414 1.414L7.586 12l-1.707 1.707 1.414 1.414L9 13.828l1.707 1.707 1.414-1.414L10.414 12l3.707-3.707zM18 6a2 2 0 11-4 0 2 2 0 014 0zM6 18a2 2 0 11-4 0 2 2 0 014 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17l-8-8"></path></svg>`;

        return `
            <div data-option="${option}" class="option-item group flex items-start p-3 rounded-md cursor-pointer transition-colors duration-200 border border-transparent hover:border-blue-300">
                <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border-2 border-gray-300 transition-colors duration-200 option-circle mr-4 mt-1">
                    ${letterContent}
                </div>
                <div class="flex-grow option-text text-gray-700">${option}</div>
                 <button class="discard-btn ml-4 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Descartar alternativa">
                    ${scissorIconSVG}
                 </button>
            </div>
        `;
    }).join('');

    questionsContainer.innerHTML = `
        <p class="text-gray-800 text-lg mb-6 leading-relaxed">${question.text}</p>
        <div id="options-container" class="space-y-2">
            ${optionsHtml}
        </div>
        <div id="card-footer" class="mt-6 flex items-center">
            <button id="submit-btn" class="bg-blue-600 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-700 transition-colors duration-300 disabled:bg-blue-400 disabled:cursor-not-allowed" disabled>Resolver</button>
        </div>
    `;
}


export function renderAnsweredQuestion(isCorrect, userAnswer, isFreshAnswer = false) {
    const activeContainer = getActiveContainer();
    if (!activeContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    
    activeContainer.querySelectorAll('.option-item').forEach(item => {
        item.classList.add('is-answered');
        item.style.cursor = 'default';
        const option = item.dataset.option;

        if (option === question.correctAnswer) {
            item.classList.add('correct-answer');
        }
        if (option === userAnswer && !isCorrect) {
            item.classList.add('incorrect-answer');
        }
    });

    const footer = activeContainer.querySelector('#card-footer');
    if (footer) {
        if(state.isReviewSession){
             footer.innerHTML = `
                <div class="flex space-x-2">
                    <button data-feedback="again" class="srs-feedback-btn bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">Errei</button>
                    <button data-feedback="hard" class="srs-feedback-btn bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600">Difícil</button>
                    <button data-feedback="good" class="srs-feedback-btn bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">Bom</button>
                    <button data-feedback="easy" class="srs-feedback-btn bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Fácil</button>
                </div>
            `;
        } else {
            footer.innerHTML = '';
        }
    }
}

export async function displayQuestion() {
    const activeContainer = getActiveContainer();
    if (!activeContainer) return;

    const questionsContainer = activeContainer.querySelector('#questions-container');
    const questionInfoContainer = activeContainer.querySelector('#question-info-container');
    const questionToolbar = activeContainer.querySelector('#question-toolbar');
    const questionCounterTop = activeContainer.querySelector('#question-counter-top');
    const navigationControls = activeContainer.querySelector('#navigation-controls');

    if (!questionsContainer || !questionInfoContainer || !questionToolbar || !questionCounterTop || !navigationControls) return;

    questionsContainer.innerHTML = '';
    questionInfoContainer.classList.add('hidden');
    questionToolbar.classList.add('hidden');
    questionCounterTop.classList.add('hidden');
    navigationControls.classList.add('hidden');
    setState('selectedAnswer', null);

    if (!state.currentUser) {
        questionsContainer.innerHTML = `<div class="text-center p-8"><h3 class="text-xl font-bold">Bem-vindo!</h3><p class="text-gray-600 mt-2">Por favor, <button id="login-from-empty" class="text-blue-600 underline">faça login</button> para começar a resolver questões.</p></div>`;
        return;
    }

    if (state.filteredQuestions.length === 0) {
        questionsContainer.innerHTML = `<div class="text-center p-8 bg-gray-50 rounded-lg">
            <h3 class="text-xl font-bold text-gray-700">Nenhuma questão encontrada</h3>
            <p class="text-gray-500 mt-2">Tente ajustar seus filtros ou clique em "Limpar filtro" para ver todas as questões.</p>
        </div>`;
        return;
    }

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const userAnswerData = state.userAnswers.get(question.id);

    // Render info, counter, and controls
    questionCounterTop.innerHTML = `Questão <strong>${state.currentQuestionIndex + 1}</strong> de <strong>${state.filteredQuestions.length}</strong>`;
    questionInfoContainer.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:space-x-4">
          <span class="font-semibold text-gray-700">Disciplina:</span> <span class="text-gray-600">${question.materia || 'N/A'}</span>
        </div>
        <div class="flex flex-col sm:flex-row sm:space-x-4">
          <span class="font-semibold text-gray-700">Assunto:</span> <span class="text-gray-600">${question.assunto || 'N/A'}</span>
        </div>
    `;

    let toolbarHTML = `
        <button class="text-gray-500 hover:text-blue-600 transition-colors" title="Adicionar aos favoritos (em breve)">
            <i class="far fa-star text-lg"></i>
        </button>
        <button class="text-gray-500 hover:text-blue-600 transition-colors" title="Ver comentários (em breve)">
            <i class="far fa-comment text-lg"></i>
        </button>`;
        
    if(state.currentCadernoId) {
        toolbarHTML += `
            <button class="remove-question-btn text-red-500 hover:text-red-700 transition-colors" data-question-id="${question.id}" title="Remover do caderno">
                <i class="fas fa-trash-alt text-lg"></i>
            </button>
        `;
    }
    questionToolbar.innerHTML = toolbarHTML;

    questionCounterTop.classList.remove('hidden');
    questionInfoContainer.classList.remove('hidden');
    questionToolbar.classList.remove('hidden');
    navigationControls.classList.remove('hidden');

    renderUnansweredQuestion();

    if (userAnswerData) {
        renderAnsweredQuestion(userAnswerData.isCorrect, userAnswerData.userAnswer, false);
    }
    
    await updateNavigation();
}


async function updateNavigation() {
    const activeContainer = getActiveContainer();
    if (!activeContainer) return;

    const prevBtn = activeContainer.querySelector('#prev-question-btn');
    const nextBtn = activeContainer.querySelector('#next-question-btn');

    if (prevBtn && nextBtn) {
        prevBtn.disabled = state.currentQuestionIndex === 0;
        nextBtn.disabled = state.currentQuestionIndex >= state.filteredQuestions.length - 1;
    }
}


export function renderQuestionListForAdding(questions, existingQuestionIds) {
    const questionsContainer = getActiveContainer().querySelector('#questions-container');
    if(!questionsContainer) return;

    if (questions.length === 0) {
        questionsContainer.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhuma questão encontrada com estes filtros.</p>`;
        return;
    }

    questionsContainer.innerHTML = questions.map(q => {
        const alreadyIn = existingQuestionIds.includes(q.id);
        return `
            <div class="p-4 border-b border-gray-200 ${alreadyIn ? 'already-in-caderno' : ''}">
                <p class="text-gray-800">${q.text}</p>
                ${alreadyIn ? '<span class="text-sm font-medium text-blue-600 mt-2 block">Esta questão já está no caderno.</span>' : ''}
            </div>
        `;
    }).join('');
}
