import { Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state, setState } from '../state.js';
import DOM from '../dom-elements.js';
import { navigateToView } from '../ui/navigation.js';
import { displayQuestion, renderAnsweredQuestion } from './question-viewer.js';
import { updateStatsPanel, updateStatsPageUI } from './stats.js';
import { setSrsReviewItem, saveUserAnswer, updateQuestionHistory } from '../services/firestore.js';

const reviewIntervals = [1, 3, 7, 15, 30, 90]; // Days

function getNextReviewDate(stage) {
    const index = Math.min(stage, reviewIntervals.length - 1);
    const daysToAdd = reviewIntervals[index];
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return Timestamp.fromDate(date);
}

export async function handleSrsFeedback(feedback) {
    const question = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = state.selectedAnswer === question.correctAnswer;

    if (!state.sessionStats.some(s => s.questionId === question.id)) {
        state.sessionStats.push({
            questionId: question.id, isCorrect: isCorrect, materia: question.materia,
            assunto: question.assunto, userAnswer: state.selectedAnswer
        });
    }

    if (state.currentUser) {
        const reviewItem = state.userReviewItemsMap.get(question.id);
        let currentStage = reviewItem ? reviewItem.stage : 0;
        let newStage;

        switch (feedback) {
            case 'again': newStage = 0; break;
            case 'hard': newStage = Math.max(0, currentStage - 1); break;
            case 'good': newStage = currentStage + 1; break;
            case 'easy': newStage = currentStage + 2; break;
            default: newStage = currentStage;
        }

        const nextReview = getNextReviewDate(newStage);
        const reviewData = { stage: newStage, nextReview: nextReview, questionId: question.id };
        await setSrsReviewItem(question.id, reviewData);
        state.userReviewItemsMap.set(question.id, reviewData);

        await saveUserAnswer(question.id, state.selectedAnswer, isCorrect);
        const historyIsCorrect = (feedback !== 'again') && isCorrect;
        await updateQuestionHistory(question.id, historyIsCorrect);
    }

    renderAnsweredQuestion(isCorrect, state.selectedAnswer, false);
    updateStatsPanel();
    updateStatsPageUI(); // CORREÇÃO: Atualiza os stats da página inicial em tempo real
}

export function updateReviewCard() {
    if (!state.currentUser) {
        DOM.reviewCard.classList.add('hidden');
        return;
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const questionsToReview = Array.from(state.userReviewItemsMap.values()).filter(item => {
        if (!item.nextReview) return false;
        const reviewDate = item.nextReview.toDate();
        reviewDate.setHours(0, 0, 0, 0);
        return reviewDate <= now;
    });

    const count = questionsToReview.length;
    DOM.reviewCountEl.textContent = count;
    DOM.startReviewBtn.disabled = count === 0;
    DOM.reviewCard.classList.remove('hidden');
}

export async function handleStartReview() {
    if (!state.currentUser) return;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const questionsToReview = Array.from(state.userReviewItemsMap.values())
        .filter(item => {
            if (!item.nextReview) return false;
            const reviewDate = item.nextReview.toDate();
            reviewDate.setHours(0, 0, 0, 0);
            return reviewDate <= now;
        });

    const questionsToReviewIds = questionsToReview.map(item => item.questionId);

    if (questionsToReviewIds.length > 0) {
        setState('isReviewSession', true);
        setState('filteredQuestions', state.allQuestions.filter(q => questionsToReviewIds.includes(q.id)));
        setState('sessionStats', []);
        setState('currentQuestionIndex', 0);

        navigateToView('vade-mecum-view', false);

        DOM.vadeMecumTitle.textContent = "Sessão de Revisão";
        DOM.toggleFiltersBtn.classList.add('hidden');
        DOM.filterCard.classList.add('hidden');
        DOM.selectedFiltersContainer.innerHTML = `<span class="text-gray-500">Revisando ${state.filteredQuestions.length} questões.</span>`;

        await displayQuestion();
        updateStatsPanel();
    }
}
