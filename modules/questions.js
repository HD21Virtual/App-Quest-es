import { getState, setState } from '../services/state.js';
import { handleSrsFeedback } from './srs.js';
import { updateNavigation, elements } from './ui.js';

/**
 * Renderiza a questão atual na tela, seja ela respondida ou não.
 */
export async function displayQuestion() {
    const { currentCadernoId, filteredQuestions, currentQuestionIndex, userAnswers, isReviewSession, sessionStats } = getState();
    const activeContainer = currentCadernoId ? document.getElementById('saved-cadernos-list-container') : document.getElementById('vade-mecum-content-area');
    
    const questionsContainer = activeContainer.querySelector('#questions-container');
    const questionInfoContainer = activeContainer.querySelector('#question-info-container');

    if (!questionsContainer || !questionInfoContainer) return;

    questionsContainer.innerHTML = '';
    questionInfoContainer.innerHTML = '';
    setState({ selectedAnswer: null });
    await updateNavigation();

    if (filteredQuestions.length === 0) return;
    
    const question = filteredQuestions[currentQuestionIndex];
    questionInfoContainer.innerHTML = `
        <p>Matéria: <span class="font-semibold text-gray-700">${question.materia}</span></p>
        <p>Assunto: <span class="font-semibold text-gray-700">${question.assunto}</span></p>
    `;

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
 * Renderiza uma questão que ainda não foi respondida na sessão.
 */
function renderUnansweredQuestion() {
    const { currentCadernoId, filteredQuestions, currentQuestionIndex } = getState();
    const activeContainer = currentCadernoId ? document.getElementById('saved-cadernos-list-container') : document.getElementById('vade-mecum-content-area');
    const questionsContainer = activeContainer.querySelector('#questions-container');
    if (!questionsContainer) return;

    const question = filteredQuestions[currentQuestionIndex];
    const options = question.options || [];

    const optionsHtml = options.map((option, index) => {
        const letter = String.fromCharCode(65 + index);
        return `
            <div data-option="${option}" class="option-item group flex items-center p-2 rounded-md cursor-pointer transition">
                <div class="action-icon-container w-8 h-8 flex-shrink-0 flex items-center justify-center mr-1">
                    <div class="discard-btn opacity-0 group-hover:opacity-100 transition-opacity p-1.5">
                        <i class="fas fa-cut text-blue-500"></i>
                    </div>
                </div>
                <div class="option-circle flex-shrink-0 w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center mr-4">
                    <span class="option-letter">${letter}</span>
                </div>
                <span class="option-text text-gray-800">${option}</span>
            </div>
        `;
    }).join('');

    questionsContainer.innerHTML = `
        <p class="text-gray-800 text-lg mb-6">${question.text}</p>
        <div id="options-container" class="space-y-2">${optionsHtml}</div>
        <div id="card-footer" class="mt-6">
            <button id="submit-btn" class="bg-green-500 text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 disabled:bg-gray-400" disabled>Resolver</button>
        </div>
    `;
}

/**
 * Renderiza uma questão que já foi respondida, mostrando o gabarito.
 * @param {boolean} isCorrect - Se a resposta do usuário foi correta.
 * @param {string} userAnswer - A resposta que o usuário selecionou.
 * @param {boolean} isFreshAnswer - Se a resposta acabou de ser enviada (mostra botões SRS).
 */
export function renderAnsweredQuestion(isCorrect, userAnswer, isFreshAnswer = false) {
    renderUnansweredQuestion();
    
    const { currentCadernoId, filteredQuestions, currentQuestionIndex } = getState();
    const activeContainer = currentCadernoId ? document.getElementById('saved-cadernos-list-container') : document.getElementById('vade-mecum-content-area');
    const questionsContainer = activeContainer.querySelector('#questions-container');
    const question = filteredQuestions[currentQuestionIndex];

    questionsContainer.querySelectorAll('.option-item').forEach(item => {
        item.classList.add('is-answered');
        item.style.cursor = 'default';
        const optionValue = item.getAttribute('data-option');
        if (optionValue === question.correctAnswer) {
            item.classList.add('correct-answer');
        } else if (optionValue === userAnswer && !isCorrect) {
            item.classList.add('incorrect-answer');
        }
    });

    const cardFooter = questionsContainer.querySelector('#card-footer');
    const messageColor = isCorrect ? 'text-green-600' : 'text-red-600';
    let feedbackHtml = `<div class="p-4 rounded-md ${isCorrect ? 'bg-green-50' : 'bg-red-50'}"><p class="${messageColor} font-bold">${isCorrect ? 'Correta!' : 'Errada!'}</p></div>`;

    if (isFreshAnswer) {
        feedbackHtml += `
            <div class="mt-4 grid grid-cols-4 gap-2 w-full text-center text-sm">
                <button class="srs-feedback-btn bg-red-100 text-red-700 font-semibold py-2 px-2 rounded-md hover:bg-red-200" data-feedback="again">Errei</button>
                <button class="srs-feedback-btn bg-yellow-100 text-yellow-700 font-semibold py-2 px-2 rounded-md hover:bg-yellow-200" data-feedback="hard">Difícil</button>
                <button class="srs-feedback-btn bg-green-100 text-green-700 font-semibold py-2 px-2 rounded-md hover:bg-green-200" data-feedback="good">Bom</button>
                <button class="srs-feedback-btn bg-blue-100 text-blue-700 font-semibold py-2 px-2 rounded-md hover:bg-blue-200" data-feedback="easy">Fácil</button>
            </div>
        `;
    }
    
    cardFooter.innerHTML = feedbackHtml;
    
    if (isFreshAnswer) {
        cardFooter.querySelectorAll('.srs-feedback-btn').forEach(btn => {
            btn.addEventListener('click', handleSrsFeedback);
        });
    }
}

/**
 * Renderiza uma lista de questões para o modo "Adicionar ao Caderno".
 * @param {Array} questions - A lista de questões a ser renderizada.
 * @param {Array} existingQuestionIds - IDs das questões que já estão no caderno.
 */
export function renderQuestionListForAdding(questions, existingQuestionIds) {
    const questionsContainer = elements.vadeMecumContentArea.querySelector('#questions-container');
    const mainContentContainer = elements.vadeMecumContentArea.querySelector('#tabs-and-main-content');
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
        tempDiv.textContent = q.text;
        const shortText = (tempDiv.textContent.length > 200 ? tempDiv.textContent.substring(0, 200) + '...' : tempDiv.textContent)
                           .replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

/**
 * Lida com o clique do usuário para selecionar uma opção de resposta.
 * @param {Event} event - O evento de clique.
 */
export function handleOptionSelect(event) {
    const target = event.target.closest('.option-item');
    if (!target || target.classList.contains('is-answered') || target.classList.contains('discarded')) return;

    const activeContainer = getState().currentCadernoId ? document.getElementById('saved-cadernos-list-container') : document.getElementById('vade-mecum-content-area');
    activeContainer.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
    target.classList.add('selected');
    setState({ selectedAnswer: target.getAttribute('data-option') });
    activeContainer.querySelector('#submit-btn').disabled = false;
}

/**
 * Lida com o clique para descartar uma opção.
 * @param {Event} event - O evento de clique.
 */
export function handleDiscardOption(event) {
    event.stopPropagation();
    const targetItem = event.currentTarget.closest('.option-item');
    if (targetItem) {
        targetItem.classList.toggle('discarded');
        if (targetItem.classList.contains('selected')) {
            targetItem.classList.remove('selected');
            setState({ selectedAnswer: null });
            const activeContainer = getState().currentCadernoId ? document.getElementById('saved-cadernos-list-container') : document.getElementById('vade-mecum-content-area');
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
