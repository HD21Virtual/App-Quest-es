import { getState, setState } from '../services/state.js';
import { db } from '../config/firebase.js';
import { doc, setDoc, Timestamp, collection, onSnapshot, query } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { saveUserAnswer, updateQuestionHistory } from '../services/firestore.js';
// REMOVIDO: import { renderAnsweredQuestion } from './questions.js'; para quebrar o ciclo.
import { updateStatsPanel } from './stats.js';
import { updateNavigation, navigateToView } from './ui.js';

const reviewIntervals = [1, 3, 7, 15, 30, 90]; // Dias
const reviewCard = document.getElementById('review-card');
const reviewCountEl = document.getElementById('review-count');
const startReviewBtn = document.getElementById('start-review-btn');

/**
 * Configura o listener para o botão de iniciar revisão.
 */
export function setupSrsEventListeners() {
    startReviewBtn.addEventListener('click', async () => {
        if (!getState().currentUser) return;
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const { userReviewItemsMap, allQuestions } = getState();

        // Lógica de filtro corrigida e consistente
        const questionsToReview = Array.from(userReviewItemsMap.values()).filter(item => {
            if (!item.nextReview) return false;
            const reviewDate = item.nextReview.toDate();
            reviewDate.setHours(0, 0, 0, 0); // Normaliza a data para comparação
            return reviewDate <= now;
        });

        const questionsToReviewIds = questionsToReview.map(item => item.questionId);

        if (questionsToReviewIds.length > 0) {
            setState({
                isReviewSession: true,
                filteredQuestions: allQuestions.filter(q => questionsToReviewIds.includes(q.id)),
                sessionStats: [],
                currentQuestionIndex: 0
            });
            
            // Navega para a view correta, a view cuidará da UI
            navigateToView('vade-mecum-view');
        } else {
            alert("Nenhuma questão para revisar no momento.");
        }
    });
}

/**
 * Calcula a próxima data de revisão com base no estágio atual.
 * @param {number} stage - O estágio atual do item.
 * @returns {Timestamp} A próxima data de revisão.
 */
function getNextReviewDate(stage) {
    const index = Math.min(stage, reviewIntervals.length - 1);
    const daysToAdd = reviewIntervals[index];
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return Timestamp.fromDate(date);
}

/**
 * Lida com o feedback do usuário (Errei, Difícil, Bom, Fácil) para um item de revisão.
 * @param {Event} event - O evento de clique.
 */
export async function handleSrsFeedback(event) {
    const { filteredQuestions, currentQuestionIndex, currentUser, sessionStats, selectedAnswer } = getState();
    const feedback = event.target.closest('.srs-feedback-btn').dataset.feedback;
    const question = filteredQuestions[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    // Adiciona à sessão atual se ainda não estiver lá
    if (!sessionStats.some(s => s.questionId === question.id)) {
        const newSessionStats = [...sessionStats, {
            questionId: question.id, isCorrect, materia: question.materia,
            assunto: question.assunto, userAnswer: selectedAnswer
        }];
        setState({ sessionStats: newSessionStats });
    }

    if (currentUser) {
        const { userReviewItemsMap } = getState();
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
        const reviewData = { stage: newStage, nextReview, questionId: question.id };
        await setDoc(reviewRef, reviewData, { merge: true });

        await saveUserAnswer(question.id, selectedAnswer, isCorrect);
        await updateQuestionHistory(question.id, isCorrect);
    }

    // CORREÇÃO: Importa a função dinamicamente apenas quando for usada.
    const { renderAnsweredQuestion } = await import('./questions.js');
    renderAnsweredQuestion(isCorrect, selectedAnswer, false);

    updateStatsPanel();
    updateNavigation();
    import('./stats.js').then(m => m.updateStatsPageUI());
    updateReviewCard();
}

/**
 * Atualiza o card de revisão na UI com o número de questões pendentes.
 */
export function updateReviewCard() {
    const { currentUser, userReviewItemsMap } = getState();
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
    reviewCountEl.textContent = count;
    startReviewBtn.disabled = count === 0;
    reviewCard.classList.remove('hidden');
}

/**
 * Configura o listener do Firestore para os itens de revisão.
 * @param {string} userId - O ID do usuário logado.
 * @returns {Function} A função de unsubscribe.
 */
export function setupReviewListener(userId) {
    const q = query(collection(db, 'users', userId, 'reviewItems'));
    return onSnapshot(q, (snapshot) => {
        const currentMap = getState().userReviewItemsMap;
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                currentMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            }
            if (change.type === "removed") {
                currentMap.delete(change.doc.id);
            }
        });
        setState({ userReviewItemsMap: currentMap });
        updateReviewCard();
    });
}

