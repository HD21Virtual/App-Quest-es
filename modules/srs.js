import { Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getState, setState } from '../services/state.js';
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../config/firebase.js';
import { saveUserAnswer, updateQuestionHistory } from '../services/firestore.js';
import { renderAnsweredQuestion } from './questions.js';
import { updateStatsPanel } from './stats.js';
import { updateNavigation, elements as uiElements } from './ui.js';
import { updateStatsPageUI } from "./stats.js";

// Definição dos intervalos de revisão em dias.
const reviewIntervals = [1, 3, 7, 15, 30, 90]; 

/**
 * Calcula a próxima data de revisão com base no estágio atual.
 * @param {number} stage - O estágio atual de revisão do item.
 * @returns {Timestamp} A data da próxima revisão como um Timestamp do Firebase.
 */
function getNextReviewDate(stage) {
    const index = Math.min(stage, reviewIntervals.length - 1);
    const daysToAdd = reviewIntervals[index];
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return Timestamp.fromDate(date);
}

/**
 * Manipula o feedback do usuário (Errei, Difícil, Bom, Fácil) após responder uma questão.
 * Atualiza o estágio de revisão e salva no Firestore.
 * @param {Event} event - O evento de clique do botão de feedback.
 */
export async function handleSrsFeedback(event) {
    const feedback = event.target.closest('.srs-feedback-btn').dataset.feedback;
    const { filteredQuestions, currentQuestionIndex, selectedAnswer, currentUser, sessionStats, userReviewItemsMap } = getState();
    
    const question = filteredQuestions[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    // Adiciona a resposta à sessão atual se ainda não estiver lá
    if (!sessionStats.some(s => s.questionId === question.id)) {
        sessionStats.push({
            questionId: question.id,
            isCorrect: isCorrect,
            materia: question.materia,
            assunto: question.assunto,
            userAnswer: selectedAnswer
        });
        setState({ sessionStats });
    }

    if (currentUser) {
        const reviewRef = doc(db, 'users', currentUser.uid, 'reviewItems', question.id);
        const reviewItem = userReviewItemsMap.get(question.id);
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
        
        await setDoc(reviewRef, reviewData, { merge: true });
        userReviewItemsMap.set(question.id, reviewData); // Atualiza o mapa local
        setState({ userReviewItemsMap });

        await saveUserAnswer(question.id, selectedAnswer, isCorrect);
        const historyIsCorrect = (feedback !== 'again') && isCorrect;
        await updateQuestionHistory(question.id, historyIsCorrect);
    }

    // Re-renderiza a questão para remover os botões de feedback e mostrar o resultado.
    renderAnsweredQuestion(isCorrect, selectedAnswer, false);
    updateStatsPanel();
    updateNavigation();
    updateStatsPageUI();
    updateReviewCard();
}


/**
 * Atualiza o card de revisão na UI com o número de questões a serem revisadas.
 */
export function updateReviewCard() {
    const { currentUser, userReviewItemsMap } = getState();
    const reviewCard = uiElements.reviewCard;
    if (!reviewCard) return;

    if (!currentUser) {
        reviewCard.classList.add('hidden');
        return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    
    const questionsToReview = Array.from(userReviewItemsMap.values()).filter(item => {
        if (!item.nextReview) return false;
        const reviewDate = item.nextReview.toDate();
        reviewDate.setHours(0, 0, 0, 0);
        return reviewDate <= now;
    });

    const count = questionsToReview.length;
    const reviewCountEl = document.getElementById('review-count');
    const startReviewBtn = document.getElementById('start-review-btn');

    if (reviewCountEl) reviewCountEl.textContent = count;
    if (startReviewBtn) startReviewBtn.disabled = count === 0;
    
    reviewCard.classList.remove('hidden');
}

