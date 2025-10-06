import { state, getActiveContainer } from '../state.js';
import DOM from '../dom-elements.js';
import { handleSrsFeedback } from './srs.js';
import { updateStatsPanel } from './stats.js';
import { saveCadernoState, saveUserAnswer, updateQuestionHistory } from '../services/firestore.js';
import { getHistoricalCountsForQuestions } from './stats.js';

/**
 * @file js/features/question-viewer.js
 * @description Lida com a renderização e interação de questões.
 */

let selectedAnswer = null;

async function updateNavigation() {
    const activeContainer = getActiveContainer();
    const navigationControls = activeContainer.querySelector('#navigation-controls');
    const questionCounterTop = activeContainer.querySelector('#question-counter-top');
    const questionInfoContainer = activeContainer.querySelector('#question-info-container');
    const questionToolbar = activeContainer.querySelector('#question-toolbar');
    const prevQuestionBtn = activeContainer.querySelector('#prev-question-btn');
    const nextQuestionBtn = activeContainer.querySelector('#next-question-btn');
    const questionsContainer = activeContainer.querySelector('#questions-container');

    if (!navigationControls || !questionCounterTop || !questionInfoContainer || !prevQuestionBtn || !nextQuestionBtn || !questionsContainer || !questionToolbar) return;

    if (state.filteredQuestions.length > 0) {
        navigationControls.classList.remove('hidden');
        questionCounterTop.classList.remove('hidden');
        questionInfoContainer.classList.remove('hidden');
        questionToolbar.classList.remove('hidden');

        let answeredCount, correctCount, incorrectCount;
        let statsHtml = '';

        if (state.currentCadernoId) {
            const caderno = state.userCadernos.find(c => c.id === state.currentCadernoId);
            if (caderno && caderno.questionIds) {
                const counts = await getHistoricalCountsForQuestions(caderno.questionIds);
                answeredCount = counts.resolved;
                correctCount = counts.correct;
                incorrectCount = counts.incorrect;
                
                statsHtml = `
                    <span class="text-sm text-gray-500 ml-2">
                        (${answeredCount} de ${caderno.questionIds.length} Resolvidas, 
                        <span class="text-green-600 font-medium">${correctCount} Acertos</span> e 
                        <span class="text-red-600 font-medium">${incorrectCount} Erros</span>)
                    </span>
                `;
            }
        } else {
            answeredCount = state.sessionStats.length;
            correctCount = state.sessionStats.filter(s => s.isCorrect).length;
            incorrectCount = answeredCount - correctCount;

            if (answeredCount > 0) {
                statsHtml = `
                    <span class="text-sm text-gray-500 ml-2">
                        (${answeredCount} Resolvidas, 
                        <span class="text-green-600 font-medium">${correctCount} Acertos</span> e 
                        <span class="text-red-600 font-medium">${incorrectCount} Erros</span>)
                    </span>
                `;
            }
        }

        questionCounterTop.innerHTML = `
            <span class="text-xl text-gray-800">Questão ${state.currentQuestionIndex + 1} de ${state.filteredQuestions.length}</span>
            ${statsHtml}
        `;

        prevQuestionBtn.disabled = state.currentQuestionIndex === 0;
        nextQuestionBtn.disabled = state.currentQuestionIndex >= state.filteredQuestions.length - 1;

    } else {
        navigationControls.classList.add('hidden');
        questionCounterTop.classList.add('hidden');
        questionInfoContainer.classList.add('hidden');
        questionToolbar.classList.add('hidden');
        questionsContainer.innerHTML = `<div class="text-center"><h3 class="text-xl font-bold">Nenhuma questão encontrada</h3><p class="text-gray-600 mt-2">Este caderno está vazio ou os filtros não retornaram resultados.</p></div>`;
    }
}

function handleOptionSelect(event) {
    const target = event.currentTarget;
    if (target.classList.contains('discarded')) return;

    const activeContainer = getActiveContainer();
    activeContainer.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
    target.classList.add('selected');
    selectedAnswer = target.getAttribute('data-option');
    const submitBtn = activeContainer.querySelector('#submit-btn');
    if (submitBtn) submitBtn.disabled = false;
}

function handleDiscardOption(event) {
    event.stopPropagation();
    const targetItem = event.currentTarget.closest('.option-item');
    if (targetItem) {
        targetItem.classList.toggle('discarded');
        if (targetItem.classList.contains('selected')) {
            targetItem.classList.remove('selected');
            selectedAnswer = null;
            const activeContainer = getActiveContainer();
            const submitBtn = activeContainer.querySelector('#submit-btn');
            if(submitBtn) submitBtn.disabled = true;
        }
    }
}


async function checkAnswer() {
    const question = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    renderAnsweredQuestion(isCorrect, selectedAnswer, true); 
}

function showOrToggleComment() {
    const activeContainer = getActiveContainer();
    const questionCard = activeContainer.querySelector('#questions-container');
    if(!questionCard) return;

    let explanationBox = questionCard.querySelector('#explanation-box');

    if (explanationBox) {
        explanationBox.classList.toggle('hidden');
        return;
    }

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    if (question.explanation) {
        explanationBox = document.createElement('div');
        explanationBox.id = 'explanation-box';
        const boxColorClass = isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800';
        explanationBox.className = `mt-6 p-4 rounded-lg ${boxColorClass}`;
        explanationBox.innerHTML = `
            <p class="leading-relaxed">
                <strong class="font-bold">Gabarito: ${question.correctAnswer}</strong>
                <br>
                ${question.explanation}
            </p>`;
        questionCard.appendChild(explanationBox);
    }
}

function renderUnansweredQuestion() {
    const activeContainer = getActiveContainer();
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if(!questionsContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const options = Array.isArray(question.options) ? question.options : [];
    if(options.length === 0) {
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
    
    questionsContainer.querySelectorAll('.option-item').forEach(item => {
        item.addEventListener('click', handleOptionSelect);
        const discardBtn = item.querySelector('.discard-btn');
        if(discardBtn) discardBtn.addEventListener('click', handleDiscardOption);
    });
    const submitBtn = questionsContainer.querySelector('#submit-btn');
    if(submitBtn) submitBtn.addEventListener('click', checkAnswer);
}

export function renderAnsweredQuestion(isCorrect, userAnswer, isFreshAnswer = false) {
     renderUnansweredQuestion(); 
     
     const activeContainer = getActiveContainer();
     const questionsContainer = activeContainer.querySelector('#questions-container');
     if(!questionsContainer) return;

     const question = state.filteredQuestions[state.currentQuestionIndex];
     
     questionsContainer.querySelectorAll('.option-item').forEach(item => {
        const actionIconContainer = item.querySelector('.action-icon-container');
        if(actionIconContainer) actionIconContainer.innerHTML = ''; 

        item.removeEventListener('click', handleOptionSelect);
        item.style.cursor = 'default';
        item.classList.add('is-answered');

        const optionValue = item.getAttribute('data-option');
        if (optionValue === question.correctAnswer) {
            item.classList.add('correct-answer');
            if(actionIconContainer) actionIconContainer.innerHTML = `<i class="fas fa-check text-green-500 text-xl"></i>`;
        } else if (optionValue === userAnswer && !isCorrect) {
            item.classList.add('incorrect-answer');
            if(actionIconContainer) actionIconContainer.innerHTML = `<i class="fas fa-times text-red-500 text-xl"></i>`;
        }
    });

    const cardFooter = questionsContainer.querySelector('#card-footer');
    if(!cardFooter) return;

    cardFooter.innerHTML = ''; 
    cardFooter.className = 'mt-6 w-full';
    
    const correctOptionIndex = question.options.findIndex(opt => opt === question.correctAnswer);
    let correctOptionLetter = '';
    if (question.tipo === 'Multipla Escolha') {
        correctOptionLetter = String.fromCharCode(65 + correctOptionIndex);
    } else { 
        correctOptionLetter = question.correctAnswer.charAt(0);
    }

    const messageColor = isCorrect ? 'text-green-600' : 'text-red-600';
    
    let feedbackHtml = `<div class="flex items-center space-x-4 flex-wrap">`;
    if (isCorrect) {
        feedbackHtml += `<span class="${messageColor} font-bold text-lg">Correta!</span>`;
    } else {
        feedbackHtml += `
            <span class="${messageColor} font-bold text-lg">Errada!</span>
            <span class="text-gray-500 text-lg">Opção correta:</span>
            <div class="option-circle flex-shrink-0 w-6 h-6 border-2 border-green-500 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-xs font-bold">${correctOptionLetter}</div>
        `;
    }
    feedbackHtml += `</div>`;

    if (isFreshAnswer) {
        // ... (SRS logic remains, will be converted to use handleSrsFeedback)
    } else {
         const mockPercentage = (Math.random() * (85 - 55) + 55).toFixed(1);
         feedbackHtml += `
            <span class="text-lg text-gray-600">${mockPercentage}% acertaram</span>
            <button id="show-comment-btn" class="text-blue-600 hover:underline">Ver resolução</button>
         `;
         if (state.currentCadernoId) {
            feedbackHtml += `<button class="remove-question-btn text-red-500 hover:underline ml-auto" data-question-id="${question.id}">Remover do Caderno</button>`;
         }
        cardFooter.innerHTML = `<div class="flex items-center space-x-4 flex-wrap">${feedbackHtml}</div>`;
        const showCommentBtn = cardFooter.querySelector('#show-comment-btn');
        if(showCommentBtn) showCommentBtn.addEventListener('click', showOrToggleComment);
    }

    // Since feedback is now handled by a delegated listener, we ensure the buttons are present
    if (isFreshAnswer) {
        const reviewItem = state.userReviewItemsMap.get(question.id);
        const currentStage = reviewItem ? reviewItem.stage : 0;
        
        const getIntervalLabel = (stage) => {
            const reviewIntervals = [1, 3, 7, 15, 30, 90];
            const index = Math.min(stage, reviewIntervals.length - 1);
            const days = reviewIntervals[index];
            if (!days) return "";
            if (days < 30) return `${days}d`;
            return `${Math.round(days/30)}m`;
        };

        const againLabel = getIntervalLabel(0);
        const hardLabel = getIntervalLabel(Math.max(0, currentStage - 1));
        const goodLabel = getIntervalLabel(currentStage + 1);
        const easyLabel = getIntervalLabel(currentStage + 2);
        
        cardFooter.innerHTML = `
            ${feedbackHtml}
            <div class="mt-4 grid grid-cols-4 gap-2 w-full text-center text-sm">
                <button class="srs-feedback-btn bg-red-100 text-red-700 font-semibold py-2 px-2 rounded-md hover:bg-red-200" data-feedback="again">Errei<br>(${againLabel})</button>
                <button class="srs-feedback-btn bg-yellow-100 text-yellow-700 font-semibold py-2 px-2 rounded-md hover:bg-yellow-200" data-feedback="hard">Difícil<br>(${hardLabel})</button>
                <button class="srs-feedback-btn bg-green-100 text-green-700 font-semibold py-2 px-2 rounded-md hover:bg-green-200" data-feedback="good">Bom<br>(${goodLabel})</button>
                <button class="srs-feedback-btn bg-blue-100 text-blue-700 font-semibold py-2 px-2 rounded-md hover:bg-blue-200" data-feedback="easy">Fácil<br>(${easyLabel})</button>
            </div>
        `;
    }
}


export async function displayQuestion() {
    const activeContainer = getActiveContainer();
    const questionsContainer = activeContainer.querySelector('#questions-container');
    const questionInfoContainer = activeContainer.querySelector('#question-info-container');
    const questionToolbar = activeContainer.querySelector('#question-toolbar');
    
    if(!questionsContainer || !questionInfoContainer || !questionToolbar) return;

    questionsContainer.innerHTML = '';
    questionInfoContainer.innerHTML = '';
    questionToolbar.innerHTML = '';
    selectedAnswer = null;
    await updateNavigation();
    
    if (!state.currentUser) {
        questionsContainer.innerHTML = `<div class="text-center"><h3 class="text-xl font-bold">Bem-vindo!</h3><p class="text-gray-600 mt-2">Por favor, <button id="login-from-empty" class="text-blue-600 underline">faça login</button> para começar a resolver questões.</p></div>`;
        const loginBtn = questionsContainer.querySelector('#login-from-empty');
        if(loginBtn) loginBtn.addEventListener('click', () => DOM.authModal.classList.remove('hidden'));
        return;
    }

    if (state.filteredQuestions.length === 0) {
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
        <button class="flex items-center hover:text-blue-600 transition-colors"><i class="fas fa-edit mr-2"></i>Criar Anotações</button>
        <button class="flex items-center hover:text-blue-600 transition-colors"><i class="fas fa-book mr-2"></i>Cadernos</button>
        <button class="flex items-center hover:text-blue-600 transition-colors"><i class="fas fa-chart-bar mr-2"></i>Desempenho</button>
        <button class="flex items-center hover:text-blue-600 transition-colors"><i class="fas fa-flag mr-2"></i>Notificar Erro</button>
    `;

    const answeredInSession = state.sessionStats.find(s => s.questionId === question.id);
    const persistedAnswer = state.userAnswers.get(question.id);

    if (answeredInSession) {
        renderAnsweredQuestion(answeredInSession.isCorrect, answeredInSession.userAnswer, false); 
    } else if (persistedAnswer && !state.isReviewSession) { 
        renderAnsweredQuestion(persistedAnswer.isCorrect, persistedAnswer.userAnswer, false);
    }
    else {
        renderUnansweredQuestion();
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

export async function navigateQuestion(direction) {
    const canGoPrev = state.currentQuestionIndex > 0;
    const canGoNext = state.currentQuestionIndex < state.filteredQuestions.length - 1;

    if (direction === 'prev' && canGoPrev) {
        state.currentQuestionIndex--;
    } else if (direction === 'next' && canGoNext) {
        state.currentQuestionIndex++;
    } else {
        return; // No change
    }

    if (state.currentCadernoId) {
        await saveCadernoState(state.currentCadernoId, state.currentQuestionIndex);
    }
    await displayQuestion();
}

