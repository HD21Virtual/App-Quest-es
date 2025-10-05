import DOM from '../dom-elements.js';
import { state } from '../state.js';
import { handleSrsFeedback } from './srs.js';
import { saveUserAnswer, updateQuestionHistory, saveCadernoState } from '../services/firestore.js';
import { updateStatsPanel } from './stats.js';

/**
 * @file js/features/question-viewer.js
 * @description Lida com a exibição de questões, interação do usuário (seleção de resposta,
 * descarte) e navegação entre questões.
 */

export async function displayQuestion() {
    const { questionsContainer, questionInfoContainer, questionToolbar } = getActiveUIContainers();
    if (!questionsContainer || !questionInfoContainer || !questionToolbar) return;

    questionsContainer.innerHTML = '';
    questionInfoContainer.innerHTML = '';
    questionToolbar.innerHTML = '';
    state.selectedAnswer = null;

    updateNavigation();

    if (!state.currentUser) {
        questionsContainer.innerHTML = `<div class="text-center p-6"><h3 class="text-xl font-bold">Bem-vindo!</h3><p class="text-gray-600 mt-2">Por favor, <button id="login-from-empty" class="text-blue-600 underline">faça login</button> para começar a resolver questões.</p></div>`;
        questionsContainer.querySelector('#login-from-empty').addEventListener('click', () => DOM.authModal.classList.remove('hidden'));
        return;
    }

    if (state.filteredQuestions.length === 0) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    questionInfoContainer.innerHTML = `<p><strong>Matéria:</strong> ${question.materia}</p><p><strong>Assunto:</strong> ${question.assunto}</p>`;
    // Adicionar toolbar...

    const answeredInSession = state.sessionStats.find(s => s.questionId === question.id);
    const persistedAnswer = state.userAnswers.get(question.id);

    if (answeredInSession) {
        renderAnsweredQuestion(answeredInSession.isCorrect, answeredInSession.userAnswer);
    } else if (persistedAnswer && !state.isReviewSession) {
        renderAnsweredQuestion(persistedAnswer.isCorrect, persistedAnswer.userAnswer);
    } else {
        renderUnansweredQuestion();
    }
}

function renderUnansweredQuestion() {
    const { questionsContainer } = getActiveUIContainers();
    if (!questionsContainer) return;

    const question = state.filteredQuestions[state.currentQuestionIndex];
    const optionsHtml = (question.options || []).map((option, index) => {
        const letter = question.tipo === 'C/E' ? option.charAt(0) : String.fromCharCode(65 + index);
        return `
            <div data-option="${option}" class="option-item group flex items-center p-2 rounded-md cursor-pointer transition">
                <div class="option-circle flex-shrink-0 w-8 h-8 border-2 border-gray-300 rounded-full flex items-center justify-center mr-4">
                    <span class="option-letter text-gray-700">${letter}</span>
                </div>
                <span class="option-text text-gray-800">${option}</span>
            </div>`;
    }).join('');

    questionsContainer.innerHTML = `
        <p class="text-gray-800 text-lg mb-6">${question.text}</p>
        <div id="options-container" class="space-y-2">${optionsHtml}</div>
        <div class="mt-6">
            <button id="submit-btn" class="bg-green-500 text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 disabled:bg-green-300" disabled>Resolver</button>
        </div>`;
    
    questionsContainer.querySelectorAll('.option-item').forEach(item => item.addEventListener('click', handleOptionSelect));
    questionsContainer.querySelector('#submit-btn').addEventListener('click', checkAnswer);
}

function renderAnsweredQuestion(isCorrect, userAnswer, isFreshAnswer = false) {
    renderUnansweredQuestion(); // Re-renderiza para limpar listeners e estado
    const { questionsContainer } = getActiveUIContainers();
    const question = state.filteredQuestions[state.currentQuestionIndex];

    questionsContainer.querySelectorAll('.option-item').forEach(item => {
        item.removeEventListener('click', handleOptionSelect);
        item.style.cursor = 'default';
        item.classList.add('is-answered');
        const optionValue = item.dataset.option;
        if (optionValue === question.correctAnswer) item.classList.add('correct-answer');
        else if (optionValue === userAnswer) item.classList.add('incorrect-answer');
    });

    const footer = questionsContainer.querySelector('.mt-6');
    if (isFreshAnswer) {
        // Render SRS feedback buttons
        footer.innerHTML = getSrsFeedbackHtml(question.id);
        footer.querySelectorAll('.srs-feedback-btn').forEach(btn => btn.addEventListener('click', handleSrsFeedback));
    } else {
        // Render simple feedback
        footer.innerHTML = `<p class="font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}">${isCorrect ? 'Você acertou!' : 'Você errou!'}</p>`;
    }
}

async function checkAnswer() {
    const question = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = state.selectedAnswer === question.correctAnswer;
    renderAnsweredQuestion(isCorrect, state.selectedAnswer, true); // Fresh answer
}

function handleOptionSelect(event) {
    const { questionsContainer } = getActiveUIContainers();
    const target = event.currentTarget;
    questionsContainer.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
    target.classList.add('selected');
    state.selectedAnswer = target.dataset.option;
    questionsContainer.querySelector('#submit-btn').disabled = false;
}

export async function handleQuestionNav(event) {
    const prevBtn = event.target.closest('#prev-question-btn');
    const nextBtn = event.target.closest('#next-question-btn');
    if (prevBtn && state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
    } else if (nextBtn && state.currentQuestionIndex < state.filteredQuestions.length - 1) {
        state.currentQuestionIndex++;
    } else {
        return;
    }
    if (state.currentCadernoId) saveCadernoState(state.currentCadernoId, state.currentQuestionIndex);
    displayQuestion();
}

function updateNavigation() {
    const { navigationControls, questionCounterTop, prevQuestionBtn, nextQuestionBtn, questionsContainer } = getActiveUIContainers();
    if (!navigationControls || !questionCounterTop || !questionsContainer) return;

    if (state.filteredQuestions.length > 0) {
        navigationControls.classList.remove('hidden');
        questionCounterTop.classList.remove('hidden');
        questionCounterTop.innerHTML = `<span class="text-xl">Questão ${state.currentQuestionIndex + 1} de ${state.filteredQuestions.length}</span>`;
        prevQuestionBtn.disabled = state.currentQuestionIndex === 0;
        nextQuestionBtn.disabled = state.currentQuestionIndex >= state.filteredQuestions.length - 1;
    } else {
        navigationControls.classList.add('hidden');
        questionCounterTop.classList.add('hidden');
        questionsContainer.innerHTML = `<div class="text-center p-6"><h3 class="text-xl font-bold">Nenhuma questão encontrada</h3><p class="text-gray-600 mt-2">Ajuste seus filtros ou adicione questões a este caderno.</p></div>`;
    }
}

function getActiveUIContainers() {
    const container = state.currentCadernoId ? DOM.savedCadernosListContainer : DOM.vadeMecumContentArea;
    return {
        questionsContainer: container.querySelector('#questions-container'),
        questionInfoContainer: container.querySelector('#question-info-container'),
        questionToolbar: container.querySelector('#question-toolbar'),
        navigationControls: container.querySelector('#navigation-controls'),
        questionCounterTop: container.querySelector('#question-counter-top'),
        prevQuestionBtn: container.querySelector('#prev-question-btn'),
        nextQuestionBtn: container.querySelector('#next-question-btn')
    };
}


function getSrsFeedbackHtml(questionId) {
    // Lógica para gerar os botões de feedback do SRS
    return `
        <div class="mt-4 grid grid-cols-4 gap-2 w-full text-center text-sm">
            <button class="srs-feedback-btn bg-red-100 text-red-700 py-2 rounded-md" data-feedback="again">Errei</button>
            <button class="srs-feedback-btn bg-yellow-100 text-yellow-700 py-2 rounded-md" data-feedback="hard">Difícil</button>
            <button class="srs-feedback-btn bg-green-100 text-green-700 py-2 rounded-md" data-feedback="good">Bom</button>
            <button class="srs-feedback-btn bg-blue-100 text-blue-700 py-2 rounded-md" data-feedback="easy">Fácil</button>
        </div>
    `;
}

export function handleVadeMecumTabs(event) {
    const targetTab = event.target.dataset.tab;
    if (!targetTab) return;
    
    const container = state.currentCadernoId ? DOM.savedCadernosListContainer : DOM.vadeMecumView;
    const questionView = container.querySelector('#question-view');
    const statsView = container.querySelector('#stats-view');

    container.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (targetTab === 'question') {
        questionView.classList.remove('hidden');
        statsView.classList.add('hidden');
    } else if (targetTab === 'stats') {
        questionView.classList.add('hidden');
        statsView.classList.remove('hidden');
        updateStatsPanel(); // Atualiza o painel de estatísticas da sessão/caderno
    }
}
