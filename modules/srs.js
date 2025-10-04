// Lógica para o Sistema de Repetição Espaçada (Spaced Repetition System)
import { getState, updateState } from '../services/state.js';
import { saveUserAnswer, updateQuestionHistory } from '../services/firestore.js';

export function updateReviewCard() {
    const { userReviewItemsMap } = getState();
    const reviewCountEl = document.getElementById('review-count');
    // ... Lógica para calcular e exibir o número de itens a revisar ...
    if(reviewCountEl) reviewCountEl.textContent = userReviewItemsMap.size;
}

export async function handleSrsFeedback(isCorrect, userAnswer) {
    const { filteredQuestions, currentQuestionIndex, sessionStats } = getState();
    const question = filteredQuestions[currentQuestionIndex];

    // Adiciona à sessão atual
    if (!sessionStats.some(s => s.questionId === question.id)) {
        const newSessionStats = [...sessionStats, {
            questionId: question.id, isCorrect, materia: question.materia,
            assunto: question.assunto, userAnswer
        }];
        updateState({ sessionStats });
    }

    // Salva no Firestore
    await saveUserAnswer(question.id, userAnswer, isCorrect);
    await updateQuestionHistory(question.id, isCorrect);
    // ... Lógica SRS para calcular a próxima data de revisão ...
}
