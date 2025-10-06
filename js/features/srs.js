import { state } from '../state.js';
import DOM from '../dom-elements.js';
import { navigateToView } from '../ui/navigation.js';
import { displayQuestion, renderAnsweredQuestion } from './question-viewer.js';
import { updateStatsPanel } from './stats.js';
import { saveUserAnswer, updateQuestionHistory, setSrsReviewItem } from '../services/firestore.js';

/**
 * @file js/features/srs.js
 * @description Lida com a lógica do Sistema de Repetição Espaçada (SRS).
 */

const reviewIntervals = [1, 3, 7, 15, 30, 90]; // Dias

function getNextReviewDate(stage) {
    const index = Math.min(stage, reviewIntervals.length - 1);
    const daysToAdd = reviewIntervals[index];
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    // Retorna o objeto Date para ser convertido em Timestamp no Firestore
    return date; 
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

        const nextReviewDate = getNextReviewDate(newStage);
        await setSrsReviewItem(question.id, newStage, nextReviewDate);
        
        await saveUserAnswer(question.id, state.selectedAnswer, isCorrect);
        
        const historyIsCorrect = (feedback !== 'again') && isCorrect;
        await updateQuestionHistory(question.id, historyIsCorrect);
    }

    renderAnsweredQuestion(isCorrect, state.selectedAnswer, false);
    updateStatsPanel();
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

export function startReviewSession() {
    if(!state.currentUser) return;
    
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
        state.isReviewSession = true;
        state.filteredQuestions = state.allQuestions.filter(q => questionsToReviewIds.includes(q.id));
        state.sessionStats = [];
        state.currentQuestionIndex = 0;
        
        navigateToView('vade-mecum-view');
        
        DOM.vadeMecumTitle.textContent = "Sessão de Revisão";
        DOM.toggleFiltersBtn.classList.add('hidden');
        DOM.filterCard.classList.add('hidden');
        DOM.selectedFiltersContainer.innerHTML = `<span class="text-gray-500">Revisando ${state.filteredQuestions.length} questões.</span>`;

        displayQuestion();
        updateStatsPanel();
    }
}

