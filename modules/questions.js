import { getState, setState } from '../services/state.js';
import { updateNavigation, elements } from './ui.js';
import { handleSrsFeedback } from './srs.js';

/**
 * Exibe a questão atual na tela.
 */
export async function displayQuestion() {
    const { filteredQuestions, currentQuestionIndex, currentUser, sessionStats, userAnswers, isReviewSession, currentCadernoId } = getState();
    const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : elements.vadeMecumContentArea;
    
    const questionsContainer = activeContainer.querySelector('#questions-container');
    const questionInfoContainer = activeContainer.querySelector('#question-info-container');
    const questionToolbar = activeContainer.querySelector('#question-toolbar');
    
    if(!questionsContainer || !questionInfoContainer || !questionToolbar) return;

    questionsContainer.innerHTML = '';
    questionInfoContainer.innerHTML = '';
    questionToolbar.innerHTML = '';
    setState({ selectedAnswer: null });
    await updateNavigation();
    
    if (!currentUser) {
        questionsContainer.innerHTML = `<div class="text-center p-6"><h3 class="text-xl font-bold">Bem-vindo!</h3><p class="text-gray-600 mt-2">Por favor, <button id="login-from-empty" class="text-blue-600 underline">faça login</button> para começar a resolver questões.</p></div>`;
        return;
    }
    if (filteredQuestions.length === 0) return;
    
    const question = filteredQuestions[currentQuestionIndex];
    questionInfoContainer.innerHTML = `<p><strong>Matéria:</strong> ${question.materia}</p><p><strong>Assunto:</strong> ${question.assunto}</p>`;
    questionToolbar.innerHTML = getToolbarHTML(question, currentCadernoId);

    const answeredInSession = sessionStats.find(s => s.questionId === question.id);
    const persistedAnswer = userAnswers.get(question.id);

    if (answeredInSession) {
        renderAnsweredQuestion(answeredInSession.isCorrect, answeredInSession.userAnswer, false); 
    } else if (persistedAnswer && !isReviewSession) { 
        renderAnsweredQuestion(persistedAnswer.isCorrect, persistedAnswer.userAnswer, false);
    } else {
        renderUnansweredQuestion();
    }
}

/**
 * Renderiza a estrutura de uma questão não respondida.
 */
export function renderUnansweredQuestion() {
    const { filteredQuestions, currentQuestionIndex, currentCadernoId } = getState();
    const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : elements.vadeMecumContentArea;
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if(!questionsContainer) return;

    const question = filteredQuestions[currentQuestionIndex];
    const options = Array.isArray(question.options) ? question.options : [];

    questionsContainer.innerHTML = `
        <p class="text-gray-800 text-lg mb-6">${question.text}</p>
        <div id="options-container" class="space-y-2">${getOptionsHTML(question, options)}</div>
        <div id="card-footer" class="mt-6 flex items-center">
            <button id="submit-btn" class="bg-blue-600 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed" disabled>Resolver</button>
        </div>
    `;
}

/**
 * Renderiza uma questão que já foi respondida, mostrando o resultado.
 * @param {boolean} isCorrect - Se a resposta do usuário foi correta.
 * @param {string} userAnswer - A resposta que o usuário selecionou.
 * @param {boolean} isFreshAnswer - Se a resposta acabou de ser enviada.
 */
export function renderAnsweredQuestion(isCorrect, userAnswer, isFreshAnswer = false) {
    renderUnansweredQuestion(); 
    
    const { filteredQuestions, currentQuestionIndex, currentCadernoId } = getState();
    const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : elements.vadeMecumContentArea;
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if(!questionsContainer) return;

    const question = filteredQuestions[currentQuestionIndex];
     
    questionsContainer.querySelectorAll('.option-item').forEach(item => {
        item.querySelector('.action-icon-container')?.remove();
        item.removeEventListener('click', handleOptionSelect);
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
    if(!cardFooter) return;
    cardFooter.innerHTML = getCardFooterHTML(isCorrect, isFreshAnswer, question);
}

/**
 * Manipula a seleção de uma opção de resposta.
 * @param {Event} event O evento de clique.
 */
export function handleOptionSelect(event) {
    const target = event.currentTarget;
    if (target.classList.contains('discarded')) return;

    const { currentCadernoId } = getState();
    const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : elements.vadeMecumContentArea;

    activeContainer.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
    target.classList.add('selected');
    setState({ selectedAnswer: target.getAttribute('data-option') });
    activeContainer.querySelector('#submit-btn').disabled = false;
}

/**
 * Manipula o descarte de uma opção.
 * @param {Event} event O evento de clique.
 */
export function handleDiscardOption(event) {
    event.stopPropagation();
    const targetItem = event.currentTarget.closest('.option-item');
    if (targetItem) {
        targetItem.classList.toggle('discarded');
        if (targetItem.classList.contains('selected')) {
            targetItem.classList.remove('selected');
            setState({ selectedAnswer: null });
            const { currentCadernoId } = getState();
            const activeContainer = currentCadernoId ? elements.savedCadernosListContainer : elements.vadeMecumContentArea;
            activeContainer.querySelector('#submit-btn').disabled = true;
        }
    }
}

/**
 * Verifica a resposta selecionada pelo usuário.
 */
export function checkAnswer() {
    const { filteredQuestions, currentQuestionIndex, selectedAnswer } = getState();
    const question = filteredQuestions[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    renderAnsweredQuestion(isCorrect, selectedAnswer, true); 
}

/**
 * Gera o HTML para as opções de uma questão.
 */
function getOptionsHTML(question, options) {
    return options.map((option, index) => {
        const letter = question.tipo === 'C/E' ? option.charAt(0) : String.fromCharCode(65 + index);
        return `
            <div data-option="${option}" class="option-item group flex items-start p-2 rounded-md cursor-pointer transition duration-200">
               <div class="action-icon-container w-8 h-8 flex-shrink-0 flex items-center justify-center mr-1">
                    <div class="discard-btn opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-blue-100 rounded-full p-1.5">
                        <svg class="h-5 w-5 text-gray-500 hover:text-blue-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.5 6.5a2 2 0 114 0 2 2 0 01-4 0zM3.5 17.5a2 2 0 114 0 2 2 0 01-4 0zM6 8.5L18 15.5M6 15.5L18 8.5"></path></svg>
                    </div>
                </div>
               <div class="option-circle flex-shrink-0 w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center mr-4 transition-all duration-200">
                   <span class="option-letter font-semibold text-gray-700">${letter}</span>
               </div>
               <span class="option-text text-gray-800 flex-1">${option}</span>
            </div>
        `;
    }).join('');
}

/**
 * Gera o HTML para a barra de ferramentas abaixo da questão.
 */
function getToolbarHTML(question, currentCadernoId) {
    let html = `
        <button class="flex items-center hover:text-blue-600 transition-colors text-sm"><i class="fas fa-comment-dots mr-2"></i>Comentários</button>
        <button class="flex items-center hover:text-blue-600 transition-colors text-sm"><i class="fas fa-edit mr-2"></i>Anotações</button>
        <button class="flex items-center hover:text-blue-600 transition-colors text-sm"><i class="fas fa-chart-bar mr-2"></i>Estatísticas</button>
    `;
    if (currentCadernoId) {
        html += `<button class="remove-question-btn text-red-500 hover:underline ml-auto text-sm" data-question-id="${question.id}">Remover do Caderno</button>`;
    }
    return html;
}

/**
 * Gera o HTML para o rodapé do card da questão após ser respondida.
 */
function getCardFooterHTML(isCorrect, isFreshAnswer, question) {
    if (isFreshAnswer) {
        // ... (lógica SRS)
        const { userReviewItemsMap } = getState();
        const reviewItem = userReviewItemsMap.get(question.id);
        const currentStage = reviewItem ? reviewItem.stage : 0;
        const getIntervalLabel = (stage) => { /* ... */ return `${stage}d` };
        
        return `
            <div class="mt-4 grid grid-cols-4 gap-2 w-full text-center text-sm">
                <button class="srs-feedback-btn bg-red-100 text-red-700 font-semibold py-2 px-2 rounded-md hover:bg-red-200" data-feedback="again">Errei<br>(${getIntervalLabel(0)})</button>
                <button class="srs-feedback-btn bg-yellow-100 text-yellow-700 font-semibold py-2 px-2 rounded-md hover:bg-yellow-200" data-feedback="hard">Difícil<br>(${getIntervalLabel(Math.max(0, currentStage - 1))})</button>
                <button class="srs-feedback-btn bg-green-100 text-green-700 font-semibold py-2 px-2 rounded-md hover:bg-green-200" data-feedback="good">Bom<br>(${getIntervalLabel(currentStage + 1)})</button>
                <button class="srs-feedback-btn bg-blue-100 text-blue-700 font-semibold py-2 px-2 rounded-md hover:bg-blue-200" data-feedback="easy">Fácil<br>(${getIntervalLabel(currentStage + 2)})</button>
            </div>
        `;
    } else {
        const message = isCorrect ? 'Você acertou!' : 'Você errou!';
        const color = isCorrect ? 'text-green-600' : 'text-red-600';
        return `<div class="font-bold ${color}">${message}</div>`;
    }
}

/**
 * Renderiza a lista de questões para o modo de adição em um caderno.
 */
export function renderQuestionListForAdding(questions, existingQuestionIds) {
    const { vadeMecumContentArea } = elements;
    const questionsContainer = vadeMecumContentArea.querySelector('#questions-container');
    const mainContentContainer = vadeMecumContentArea.querySelector('#tabs-and-main-content');
    if (!questionsContainer || !mainContentContainer) return;
    
    mainContentContainer.classList.add('hidden');

    if (questions.length === 0) {
        questionsContainer.innerHTML = `<div class="text-center text-gray-500 p-8 bg-white rounded-lg shadow-sm">Nenhuma questão encontrada.</div>`;
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
                    <div class="flex-shrink-0 ml-4">${badgeHtml}</div>
                </div>
            </div>`;
    }).join('');

    questionsContainer.innerHTML = `<div class="bg-white rounded-lg shadow-sm">${listHtml}</div>`;
}

