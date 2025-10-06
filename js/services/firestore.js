import { collection, getDocs, query, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, orderBy, arrayUnion, arrayRemove, where, increment, writeBatch, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { state, addUnsubscribe } from '../state.js';
import { renderFoldersAndCadernos } from '../features/caderno.js';
import { updateStatsPageUI } from '../features/stats.js';
import { updateReviewCard } from '../features/srs.js';
import { displayQuestion } from "../features/question-viewer.js";
import DOM from '../dom-elements.js';

// --- FUNÇÕES DE SETUP DE LISTENERS ---

function setupCadernosAndFoldersListener(userId) {
    const cadernosQuery = query(collection(db, 'users', userId, 'cadernos'), orderBy('name'));
    const unsubCadernos = onSnapshot(cadernosQuery, (snapshot) => {
        state.userCadernos = [];
        snapshot.forEach(doc => state.userCadernos.push({ id: doc.id, ...doc.data() }));
        renderFoldersAndCadernos();
    });
    addUnsubscribe('unsubCadernos', unsubCadernos);

    const foldersQuery = query(collection(db, 'users', userId, 'folders'), orderBy('name'));
    const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
        state.userFolders = [];
        const folderOptions = ['<option value="">Salvar em (opcional)</option>'];
        snapshot.forEach(doc => {
            const folder = { id: doc.id, ...doc.data() };
            state.userFolders.push(folder);
            folderOptions.push(`<option value="${folder.id}">${folder.name}</option>`);
        });
        if (DOM.folderSelect) {
            DOM.folderSelect.innerHTML = folderOptions.join('');
        }
        renderFoldersAndCadernos();
    });
    addUnsubscribe('unsubFolders', unsubFolders);
}

function setupFiltrosListener(userId) {
    const filtrosCollection = collection(db, 'users', userId, 'filtros');
    const unsubFiltros = onSnapshot(filtrosCollection, (snapshot) => {
        const savedFilters = [];
        snapshot.forEach(doc => {
            savedFilters.push({ id: doc.id, ...doc.data() });
        });
        
        const searchTerm = DOM.searchSavedFiltersInput.value.toLowerCase();
        const filtered = savedFilters.filter(f => f.name.toLowerCase().includes(searchTerm));

        if (filtered.length === 0) {
            DOM.savedFiltersListContainer.innerHTML = `<p class="text-center text-gray-500">Nenhum filtro encontrado.</p>`;
        } else {
            DOM.savedFiltersListContainer.innerHTML = filtered.map(f => `
                <div class="flex justify-between items-center p-2 rounded-md hover:bg-gray-100">
                    <button class="load-filter-btn text-left" data-id="${f.id}">${f.name}</button>
                    <button class="delete-filter-btn text-red-500 hover:text-red-700" data-id="${f.id}">
                        <i class="fas fa-trash-alt pointer-events-none"></i>
                    </button>
                </div>
            `).join('');
        }
    });
    addUnsubscribe('unsubFiltros', unsubFiltros);
}

function setupStatsListener(userId) {
    const sessionsQuery = query(collection(db, 'users', userId, 'sessions'), orderBy('createdAt', 'desc'));
    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
        state.historicalSessions = [];
        snapshot.forEach(doc => state.historicalSessions.push(doc.data()));
        updateStatsPageUI();
    });
    addUnsubscribe('unsubSessions', unsubSessions);
}

function setupReviewListener(userId) {
    const reviewQuery = query(collection(db, 'users', userId, 'reviewItems'));
    const unsubReviewItems = onSnapshot(reviewQuery, (snapshot) => {
         snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                state.userReviewItemsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            }
            if (change.type === "removed") {
                state.userReviewItemsMap.delete(change.doc.id);
            }
        });
        updateReviewCard();
    });
    addUnsubscribe('unsubReviewItems', unsubReviewItems);
}

function setupUserAnswersListener(userId) {
    const answersQuery = query(collection(db, 'users', userId, 'userQuestionState'));
    const unsubAnswers = onSnapshot(answersQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data();
            if (change.type === "added" || change.type === "modified") {
                state.userAnswers.set(change.doc.id, { userAnswer: docData.userAnswer, isCorrect: docData.isCorrect });
            }
            if (change.type === "removed") {
                state.userAnswers.delete(change.doc.id);
            }
        });
        const currentView = document.querySelector('div[id$="-view"]:not(.hidden)');
        if (currentView && (currentView.id === 'vade-mecum-view' || (currentView.id === 'cadernos-view' && state.currentCadernoId))) {
             displayQuestion();
        }
    });
    addUnsubscribe('unsubAnswers', unsubAnswers);
}

function setupCadernoStateListener(userId) {
    const stateQuery = query(collection(db, 'users', userId, 'cadernoState'));
    const unsubCadernoState = onSnapshot(stateQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                state.userCadernoState.set(change.doc.id, change.doc.data());
            }
            if (change.type === "removed") {
                state.userCadernoState.delete(change.doc.id);
            }
        });
    });
    addUnsubscribe('unsubCadernoState', unsubCadernoState);
}

/**
 * Inicia todos os listeners de dados do Firestore para o usuário logado.
 * @param {string} userId - O ID do usuário.
 */
export function setupAllListeners(userId) {
    setupCadernosAndFoldersListener(userId);
    setupFiltrosListener(userId);
    setupStatsListener(userId);
    setupReviewListener(userId);
    setupUserAnswersListener(userId);
    setupCadernoStateListener(userId);
}


// --- FUNÇÕES DE LEITURA (FETCH) ---

export async function getWeeklySolvedQuestionsData() {
    const weeklyCounts = Array(7).fill(0);
    if (!state.currentUser) return weeklyCounts;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    try {
        const sessionsCollection = collection(db, 'users', state.currentUser.uid, 'sessions');
        const q = query(sessionsCollection, where("createdAt", ">=", sevenDaysAgo));
        
        const querySnapshot = await getDocs(q);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        querySnapshot.forEach(doc => {
            const session = doc.data();
            if (!session.createdAt) return;

            const sessionDate = session.createdAt.toDate();
            sessionDate.setHours(0, 0, 0, 0);

            const timeDiff = today.getTime() - sessionDate.getTime();
            const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
            
            const index = 6 - dayDiff;

            if (index >= 0 && index < 7) {
                weeklyCounts[index] += session.totalQuestions || 0;
            }
        });

    } catch (error) {
        console.error("Erro ao buscar dados de atividades da semana:", error);
    }
    
    return weeklyCounts;
}


export async function fetchAllQuestions() {
    try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        state.allQuestions = [];
        const materiaMap = new Map();

        querySnapshot.forEach((doc) => {
            const question = { id: doc.id, ...doc.data() };
            state.allQuestions.push(question);

            if (question.materia && question.assunto) {
                if (!materiaMap.has(question.materia)) {
                    materiaMap.set(question.materia, new Set());
                }
                materiaMap.get(question.materia).add(question.assunto);
            }
        });

        state.filterOptions.materia = [];
        const allAssuntosSet = new Set();
        for (const [materia, assuntosSet] of materiaMap.entries()) {
            const assuntos = Array.from(assuntosSet).sort();
            state.filterOptions.materia.push({ name: materia, assuntos: assuntos });
            assuntos.forEach(assunto => allAssuntosSet.add(assunto));
        }
        state.filterOptions.materia.sort((a, b) => a.name.localeCompare(b.name));
        state.filterOptions.allAssuntos = Array.from(allAssuntosSet).sort();

    } catch (error) {
        console.error("Erro ao buscar questões: ", error);
    }
}

export async function getQuestionHistory(questionIds) {
    if (!state.currentUser || questionIds.length === 0) {
        return { totalCorrect: 0, totalIncorrect: 0, statsByMateria: {} };
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    const statsByMateria = {};

    const historyPromises = questionIds.map(id => getDoc(doc(db, 'users', state.currentUser.uid, 'questionHistory', id)));
    const historySnapshots = await Promise.all(historyPromises);

    const questionDetails = questionIds.map(id => state.allQuestions.find(q => q.id === id)).filter(Boolean);

    historySnapshots.forEach((snap, index) => {
        const question = questionDetails[index];
        if (snap.exists() && question) {
            const data = snap.data();
            const correct = data.correct || 0;
            const incorrect = data.incorrect || 0;
            totalCorrect += correct;
            totalIncorrect += incorrect;
            
            if (correct > 0 || incorrect > 0) {
                if (!statsByMateria[question.materia]) {
                    statsByMateria[question.materia] = { correct: 0, total: 0, assuntos: {} };
                }
                 if(!statsByMateria[question.materia].assuntos[question.assunto]) {
                    statsByMateria[question.materia].assuntos[question.assunto] = { correct: 0, total: 0 };
                }

                statsByMateria[question.materia].correct += correct;
                statsByMateria[question.materia].total += correct + incorrect;
                statsByMateria[question.materia].assuntos[question.assunto].correct += correct;
                statsByMateria[question.materia].assuntos[question.assunto].total += correct + incorrect;
            }
        }
    });

    return { totalCorrect, totalIncorrect, statsByMateria };
}

// --- FUNÇÕES DE ESCRITA (WRITE) ---

export async function saveSessionStats() {
    if (!state.currentUser || state.sessionStats.length === 0) return;
    
    const total = state.sessionStats.length;
    const correct = state.sessionStats.filter(s => s.isCorrect).length;
    const incorrect = total - correct;
    const accuracy = total > 0 ? (correct / total * 100) : 0; 
    
    const statsByMateria = state.sessionStats.reduce((acc, stat) => {
        if (!acc[stat.materia]) acc[stat.materia] = { correct: 0, total: 0 };
        acc[stat.materia].total++;
        if (stat.isCorrect) acc[stat.materia].correct++;
        return acc;
    }, {});

    const sessionData = {
        createdAt: serverTimestamp(),
        totalQuestions: total,
        correctCount: correct,
        incorrectCount: incorrect,
        accuracy: accuracy,
        details: statsByMateria
    };

    try {
        const sessionsCollection = collection(db, 'users', state.currentUser.uid, 'sessions');
        await addDoc(sessionsCollection, sessionData);
    } catch (error) {
        console.error("Erro ao salvar a sessão:", error);
    }
}


export async function saveUserAnswer(questionId, userAnswer, isCorrect) {
    if (!state.currentUser) return;
    const answerRef = doc(db, 'users', state.currentUser.uid, 'userQuestionState', questionId);
    try {
        await setDoc(answerRef, { userAnswer, isCorrect });
    } catch (error) {
        console.error("Error saving user answer:", error);
    }
}

export async function updateQuestionHistory(questionId, isCorrect) {
    if (!state.currentUser) return;
    const historyRef = doc(db, 'users', state.currentUser.uid, 'questionHistory', questionId);
    const fieldToUpdate = isCorrect ? 'correct' : 'incorrect';
    
    try {
        await setDoc(historyRef, {
            [fieldToUpdate]: increment(1),
            total: increment(1)
        }, { merge: true });
    } catch (error) {
        console.error("Error updating question history:", error);
    }
}

export async function setSrsReviewItem(questionId, newStage) {
    const getNextReviewDate = (stage) => {
        const reviewIntervals = [1, 3, 7, 15, 30, 90]; // Days
        const index = Math.min(stage, reviewIntervals.length - 1);
        const daysToAdd = reviewIntervals[index];
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);
        return Timestamp.fromDate(date);
    };

    const nextReview = getNextReviewDate(newStage);
    const reviewData = { stage: newStage, nextReview: nextReview, questionId: questionId };
    const reviewRef = doc(db, 'users', state.currentUser.uid, 'reviewItems', questionId);
    await setDoc(reviewRef, reviewData, { merge: true });
    state.userReviewItemsMap.set(questionId, reviewData);
}

export async function createOrUpdateItem(type, name, editingId) {
    if (editingId) { // Editando
        const collectionPath = type === 'folder' ? 'folders' : 'cadernos';
        const itemRef = doc(db, 'users', state.currentUser.uid, collectionPath, editingId);
        await updateDoc(itemRef, { name: name });
    } else { // Criando (apenas pastas por enquanto)
        if (type === 'folder') {
            const folderData = { name: name, createdAt: serverTimestamp() };
            const foldersCollection = collection(db, 'users', state.currentUser.uid, 'folders');
            await addDoc(foldersCollection, folderData);
        }
    }
}

export async function createCaderno(name, folderId, questionIds) {
    const caderno = {
        name: name,
        questionIds: questionIds,
        folderId: folderId || null,
        createdAt: serverTimestamp()
    };
    const cadernosCollection = collection(db, 'users', state.currentUser.uid, 'cadernos');
    await addDoc(cadernosCollection, caderno);
}

export async function saveCadernoState(cadernoId, questionIndex) {
    if (!state.currentUser || !cadernoId) return;
    const stateRef = doc(db, 'users', state.currentUser.uid, 'cadernoState', cadernoId);
    try {
        await setDoc(stateRef, { lastQuestionIndex: questionIndex });
    } catch (error) {
        console.error("Error saving caderno state:", error);
    }
}

export async function addQuestionsToCaderno(cadernoId, newQuestionIds) {
    if (newQuestionIds.length > 0) {
        const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', cadernoId);
        await updateDoc(cadernoRef, {
            questionIds: arrayUnion(...newQuestionIds)
        });
    }
}

export async function removeQuestionFromCaderno(cadernoId, questionId) {
    const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', cadernoId);
    await updateDoc(cadernoRef, {
        questionIds: arrayRemove(questionId)
    });
}

// --- FUNÇÕES DE EXCLUSÃO (DELETE) ---

export async function deleteItem(type, id) {
    if (type === 'folder') {
        const cadernosToDelete = state.userCadernos.filter(c => c.folderId === id);
        const deleteCadernoPromises = cadernosToDelete.map(caderno => {
            const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', caderno.id);
            return deleteDoc(cadernoRef);
        });
        await Promise.all(deleteCadernoPromises);
        const folderRef = doc(db, 'users', state.currentUser.uid, 'folders', id);
        await deleteDoc(folderRef);
    } else if (type === 'caderno') {
        const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', id);
        await deleteDoc(cadernoRef);
    }
}

export async function resetAllUserData() {
    if (!state.currentUser) return;
    const collectionsToDelete = ['questionHistory', 'reviewItems', 'userQuestionState', 'cadernoState', 'sessions'];

    for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(db, 'users', state.currentUser.uid, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        if (snapshot.empty) continue;

        const batchArray = [];
        batchArray.push(writeBatch(db));
        let operationCounter = 0;
        let batchIndex = 0;

        snapshot.docs.forEach(doc => {
            batchArray[batchIndex].delete(doc.ref);
            operationCounter++;

            if (operationCounter === 500) {
                batchArray.push(writeBatch(db));
                batchIndex++;
                operationCounter = 0;
            }
        });

        await Promise.all(batchArray.map(batch => batch.commit()));
    }
}

