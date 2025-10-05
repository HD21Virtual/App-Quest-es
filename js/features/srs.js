import DOM from '../dom-elements.js';
import { state } from '../state.js';
import { switchView } from '../ui/navigation.js';
import { displayQuestion } from './question-viewer.js';
import { updateStatsPanel } from './stats.js';
import { updateSrsItem, saveUserAnswer, updateQuestionHistory } from '../services/firestore.js';
import { Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * @file js/features/srs.js
 * @description Lida com a lógica do Sistema de Repetição Espaçada (SRS).
 */

const reviewIntervals = [1, 3, 7, 15, 30, 90]; // Dias

export function updateReviewCard() {
    if (!state.currentUser) return;
    const now = new Date();
    const questionsToReview = Array.from(state.userReviewItemsMap.values()).filter(item => {
        return item.nextReview && item.nextReview.toDate() <= now;
    });
    DOM.reviewCountEl.textContent = questionsToReview.length;
    DOM.startReviewBtn.disabled = questionsToReview.length === 0;
    DOM.reviewCard.classList.remove('hidden');
}

export function startReviewSession() {
    const now = new Date();
    const toReviewIds = Array.from(state.userReviewItemsMap.values())
        .filter(item => item.nextReview && item.nextReview.toDate() <= now)
        .map(item => item.questionId);

    if (toReviewIds.length > 0) {
        state.isReviewSession = true;
        state.filteredQuestions = state.allQuestions.filter(q => toReviewIds.includes(q.id));
        state.sessionStats = [];
        state.currentQuestionIndex = 0;
        
        switchView('vade-mecum-view');
        
        DOM.vadeMecumTitle.textContent = "Sessão de Revisão";
        DOM.toggleFiltersBtn.classList.add('hidden');
        DOM.filterCard.classList.add('hidden');
        
        displayQuestion();
        updateStatsPanel();
    }
}

export async function handleSrsFeedback(event) {
    const feedback = event.target.closest('.srs-feedback-btn').dataset.feedback;
    const question = state.filteredQuestions[state.currentQuestionIndex];
    const isCorrect = state.selectedAnswer === question.correctAnswer;
    
    // Adiciona à estatística da sessão atual
    if (!state.sessionStats.some(s => s.questionId === question.id)) {
         state.sessionStats.push({
            questionId: question.id, isCorrect, materia: question.materia,
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

        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + reviewIntervals[Math.min(newStage, reviewIntervals.length - 1)]);
        const nextReview = Timestamp.fromDate(nextReviewDate);
        
        const reviewData = { stage: newStage, nextReview, questionId: question.id };
        await updateSrsItem(question.id, reviewData);
        state.userReviewItemsMap.set(question.id, reviewData);

        await saveUserAnswer(question.id, state.selectedAnswer, isCorrect);
        await updateQuestionHistory(question.id, isCorrect);
    }
}
