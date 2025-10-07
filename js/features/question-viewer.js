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

        return `
            <div data-option="${option}" class="option-item group flex items-start p-3 rounded-md cursor-pointer transition-colors duration-200 border border-transparent hover:border-blue-300">
                <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border-2 border-gray-300 transition-colors duration-200 option-circle mr-4 mt-1">
                    ${letterContent}
                </div>
                <div class="flex-grow option-text text-gray-700">${option}</div>
            </div>
        `;
    }).join('');

    questionsContainer.innerHTML = `
        <p class="text-gray-800 text-lg mb-6 leading-relaxed">${question.text}</p>
        <div id="options-container" class="space-y-2">
            ${optionsHtml}
        </div>
        <div id="card-footer" class="mt-6 flex items-center">
             <!-- O botão de resolver será adicionado se não for respondido -->
        </div>
        <div id="commentary-container" class="hidden mt-6 pt-6 border-t border-gray-200"></div>
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
        const optionCircle = item.querySelector('.option-circle');
        const optionText = item.querySelector('.option-text');


        if (option === question.correctAnswer) {
            item.classList.add('correct-answer');
            if (optionCircle) optionCircle.innerHTML = `<i class="fas fa-check text-green-600"></i>`;
        }
        if (option === userAnswer && !isCorrect) {
            item.classList.add('incorrect-answer');
             if (optionCircle) optionCircle.innerHTML = `<i class="fas fa-times text-red-600"></i>`;
        }
        // Remove hover effects from answered questions
        item.classList.remove('hover:border-blue-300');
    });

    const footer = activeContainer.querySelector('#card-footer');
    if (footer) {
        const resultClass = isCorrect ? 'text-green-600' : 'text-red-600';
        const resultText = isCorrect ? 'Correta!' : 'Incorreta!';
        
        // Simulating percentage, replace with real data if available
        const randomPercentage = (Math.random() * (85 - 60) + 60).toFixed(1);

        footer.innerHTML = `
            <div class="flex items-center space-x-4">
                <span class="font-bold text-lg ${resultClass}">${resultText}</span>
                <span class="text-sm text-gray-500">${randomPercentage}% acertaram</span>
                <button class="view-resolution-btn text-sm text-blue-600 hover:underline">Ver resolução</button>
            </div>
        `;

        if(state.isReviewSession){
             const reviewButtons = `
                <div class="flex space-x-2">
                    <button data-feedback="again" class="srs-feedback-btn bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">Errei</button>
                    <button data-feedback="hard" class="srs-feedback-btn bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600">Difícil</button>
                    <button data-feedback="good" class="srs-feedback-btn bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">Bom</button>
                    <button data-feedback="easy" class="srs-feedback-btn bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Fácil</button>
                </div>
            `;
            footer.innerHTML += `<div class="mt-4 pt-4 border-t w-full">${reviewButtons}</div>`;
            footer.classList.add('flex-col', 'items-start');
        }
    }

    const viewResolutionBtn = activeContainer.querySelector('.view-resolution-btn');
    const commentaryContainer = activeContainer.querySelector('#commentary-container');
    
    if (viewResolutionBtn && commentaryContainer) {
        viewResolutionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const isHidden = commentaryContainer.classList.contains('hidden');
            
            if (isHidden) {
                const commentaryText = question.commentary || '<p class="text-gray-600">Nenhum comentário disponível para esta questão.</p>';
                commentaryContainer.innerHTML = `
                    <h4 class="font-bold text-lg text-gray-800 mb-2">Gabarito Comentado</h4>
                    <div class="prose max-w-none text-gray-700">${commentaryText}</div>
                `;
                commentaryContainer.classList.remove('hidden');
                viewResolutionBtn.textContent = 'Ocultar resolução';
            } else {
                commentaryContainer.classList.add('hidden');
                commentaryContainer.innerHTML = '';
                viewResolutionBtn.textContent = 'Ver resolução';
            }
        });
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
          <span class="font-semibold text-gray-700">Matéria:</span> <a href="#" class="text-blue-600 hover:underline">${question.materia || 'N/A'}</a>
        </div>
        <div class="flex flex-col sm:flex-row sm:space-x-4">
          <span class="font-semibold text-gray-700">Assunto:</span> <a href="#" class="text-blue-600 hover:underline">${question.assunto || 'N/A'}</a>
        </div>
    `;

    let toolbarHTML = `
        <a href="#" class="flex items-center text-gray-600 hover:text-blue-600 text-sm"><i class="fas fa-comment-alt mr-2"></i>Gabarito Comentado</a>
        <a href="#" class="flex items-center text-gray-600 hover:text-blue-600 text-sm"><i class="fas fa-comments mr-2"></i>Comentários</a>
        <a href="#" class="flex items-center text-gray-600 hover:text-blue-600 text-sm"><i class="fas fa-edit mr-2"></i>Criar Anotações</a>
        <a href="#" class="flex items-center text-gray-600 hover:text-blue-600 text-sm"><i class="fas fa-book mr-2"></i>Cadernos</a>
        <a href="#" class="flex items-center text-gray-600 hover:text-blue-600 text-sm"><i class="fas fa-chart-bar mr-2"></i>Desempenho</a>
        <a href="#" class="flex items-center text-gray-600 hover:text-blue-600 text-sm"><i class="fas fa-exclamation-triangle mr-2"></i>Notificar Erro</a>
    `;
    
    if(state.currentCadernoId) {
        toolbarHTML += `
            <button class="remove-question-btn text-red-500 hover:text-red-700 transition-colors text-sm flex items-center" data-question-id="${question.id}" title="Remover do caderno">
                <i class="fas fa-trash-alt mr-2"></i>Remover
            </button>
        `;
    }
    questionToolbar.innerHTML = toolbarHTML;
    questionToolbar.className = 'flex items-center flex-wrap gap-x-4 gap-y-2 text-gray-600';


    questionCounterTop.classList.remove('hidden');
    questionInfoContainer.classList.remove('hidden');
    questionToolbar.classList.remove('hidden');
    navigationControls.classList.remove('hidden');

    renderUnansweredQuestion();
    
    const footer = activeContainer.querySelector('#card-footer');
    if (userAnswerData) {
        renderAnsweredQuestion(userAnswerData.isCorrect, userAnswerData.userAnswer, false);
    } else if (footer) {
        footer.innerHTML = `<button id="submit-btn" class="bg-blue-600 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-700 transition-colors duration-300 disabled:bg-blue-400 disabled:cursor-not-allowed" disabled>Resolver</button>`;
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

