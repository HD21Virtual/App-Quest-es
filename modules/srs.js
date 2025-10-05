import { getState, setState } from '../services/state.js';
import { db } from '../config/firebase.js';
import { doc, setDoc, Timestamp, collection, onSnapshot, query } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { saveUserAnswer, updateQuestionHistory } from '../services/firestore.js';
import { renderAnsweredQuestion } from './questions.js';
import { updateStatsPanel } from './stats.js';
import { updateNavigation, navigateToView } from './ui.js';

        const reviewCard = document.getElementById('review-card');
        const reviewCountEl = document.getElementById('review-count');
        const startReviewBtn = document.getElementById('start-review-btn');

        // --- FUNÇÕES DE REVISÃO INTELIGENTE (SRS) ---
        const reviewIntervals = [1, 3, 7, 15, 30, 90]; // Days

        function getNextReviewDate(stage) {
            const index = Math.min(stage, reviewIntervals.length - 1);
            const daysToAdd = reviewIntervals[index];
            const date = new Date();
            date.setDate(date.getDate() + daysToAdd);
            return Timestamp.fromDate(date);
        }

        export async function handleSrsFeedback(event) {
            const { filteredQuestions, currentQuestionIndex, currentUser, sessionStats, selectedAnswer } = getState();
            const feedback = event.target.closest('.srs-feedback-btn').dataset.feedback;
            const question = filteredQuestions[currentQuestionIndex];
            const isCorrect = selectedAnswer === question.correctAnswer;
            
            if (!sessionStats.some(s => s.questionId === question.id)) {
                 sessionStats.push({
                    questionId: question.id, isCorrect: isCorrect, materia: question.materia,
                    assunto: question.assunto, userAnswer: selectedAnswer
                });
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
                userReviewItemsMap.set(question.id, reviewData); // Update local map immediately

                await saveUserAnswer(question.id, selectedAnswer, isCorrect);
                const historyIsCorrect = (feedback !== 'again') && isCorrect;
                await updateQuestionHistory(question.id, historyIsCorrect);
            }

            renderAnsweredQuestion(isCorrect, selectedAnswer, false);
            updateStatsPanel();
            updateNavigation();
            updateStatsPageUI();
            updateReviewCard();
        }

        function updateReviewCard() {
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

        function setupReviewListener(userId) {
            if (unsubReviewItems) unsubReviewItems();
            const reviewQuery = query(collection(db, 'users', userId, 'reviewItems'));
            unsubReviewItems = onSnapshot(reviewQuery, (snapshot) => {
                 snapshot.docChanges().forEach((change) => {
                    if (change.type === "added" || change.type === "modified") {
                        userReviewItemsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
                    }
                    if (change.type === "removed") {
                        userReviewItemsMap.delete(change.doc.id);
                    }
                });
                updateReviewCard();
            });
        }
        
        startReviewBtn.addEventListener('click', async () => {
            if(!currentUser) return;
            
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            // CORREÇÃO: A lógica de filtro aqui deve ser a mesma do `updateReviewCard`
            // para garantir que o número de questões seja consistente.
            const questionsToReview = Array.from(userReviewItemsMap.values())
                .filter(item => {
                    if (!item.nextReview) return false;
                    const reviewDate = item.nextReview.toDate();
                    reviewDate.setHours(0, 0, 0, 0); // Normaliza a data para o início do dia
                    return reviewDate <= now;
                });

            const questionsToReviewIds = questionsToReview.map(item => item.questionId);

            if (questionsToReviewIds.length > 0) {
                isReviewSession = true;
                filteredQuestions = allQuestions.filter(q => questionsToReviewIds.includes(q.id));
                sessionStats = [];
                currentQuestionIndex = 0;
                
                document.querySelector('.nav-link[data-view="vade-mecum-view"]').click();
                
                vadeMecumTitle.textContent = "Sessão de Revisão";
                toggleFiltersBtn.classList.add('hidden');
                filterCard.classList.add('hidden');
                selectedFiltersContainer.innerHTML = `<span class="text-gray-500">Revisando ${filteredQuestions.length} questões.</span>`;

                await displayQuestion();
                updateStatsPanel();
            }
        });



