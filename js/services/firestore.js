import { collection, getDocs, query, orderBy, onSnapshot, getDoc, doc, updateDoc, arrayRemove, setDoc, addDoc, serverTimestamp, where, writeBatch, deleteDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { state, setState, addUnsubscribe } from '../state.js';
import { renderFoldersAndCadernos } from '../features/caderno.js';
import { renderReviewView } from '../features/srs.js';
import { displayQuestion } from "../features/question-viewer.js";
// MODIFICADO: Importar renderEstatisticasView para atualizar a tabela
import { updateStatsPageUI, renderEstatisticasView } from "../features/stats.js";
import { updateSavedFiltersList } from "../ui/modal.js";
import DOM from "../dom-elements.js";

export async function fetchAllQuestions() {
    try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        const questions = [];
        // Estrutura: Map<nomeMateria, Map<nomeAssunto, Set<nomeSubAssunto>>>
        const hierarchy = new Map();

        querySnapshot.forEach((doc) => {
            const question = { id: doc.id, ...doc.data() };
            questions.push(question);

            const { materia, assunto, subAssunto } = question;

            if (materia && assunto) {
                if (!hierarchy.has(materia)) {
                    hierarchy.set(materia, new Map());
                }
                const assuntosMap = hierarchy.get(materia);

                if (!assuntosMap.has(assunto)) {
                    assuntosMap.set(assunto, new Set());
                }
                
                if (subAssunto) {
                    assuntosMap.get(assunto).add(subAssunto);
                }
            }
        });

        setState('allQuestions', questions);

        const newFilterOptions = { materia: [] };
        
        const sortedMaterias = Array.from(hierarchy.keys()).sort();

        for (const materiaName of sortedMaterias) {
            const materiaData = { name: materiaName, assuntos: [] };
            const assuntosMap = hierarchy.get(materiaName);
            const sortedAssuntos = Array.from(assuntosMap.keys()).sort();

            for (const assuntoName of sortedAssuntos) {
                const subAssuntosSet = assuntosMap.get(assuntoName);
                const sortedSubAssuntos = Array.from(subAssuntosSet).sort();
                materiaData.assuntos.push({
                    name: assuntoName,
                    subAssuntos: sortedSubAssuntos
                });
            }
            newFilterOptions.materia.push(materiaData);
        }

        setState('filterOptions', newFilterOptions);

    } catch (error) {
        console.error("Erro ao buscar questões: ", error);
    }
}

export function setupAllListeners(userId) {
    // Queries must be declared before they are used in onSnapshot
    const cadernosQuery = query(collection(db, 'users', userId, 'cadernos'), orderBy('name'));
    const foldersQuery = query(collection(db, 'users', userId, 'folders'), orderBy('name'));
    const filtrosQuery = query(collection(db, 'users', userId, 'filtros'));
    const sessionsQuery = query(collection(db, 'users', userId, 'sessions'), orderBy('createdAt', 'desc'));
    const reviewQuery = query(collection(db, 'users', userId, 'reviewItems'));
    const answersQuery = query(collection(db, 'users', userId, 'userQuestionState'));
    const stateQuery = query(collection(db, 'users', userId, 'cadernoState'));
    // ADICIONADO: Query para o histórico total de questões
    const historyQuery = query(collection(db, 'users', userId, 'questionHistory'));

    const unsubCadernos = onSnapshot(cadernosQuery, (snapshot) => {
        const userCadernos = [];
        snapshot.forEach(doc => userCadernos.push({ id: doc.id, ...doc.data() }));
        setState('userCadernos', userCadernos);
        renderFoldersAndCadernos();
    });
    addUnsubscribe(unsubCadernos);

    const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
        const userFolders = [];
        snapshot.forEach(doc => userFolders.push({ id: doc.id, ...doc.data() }));
        setState('userFolders', userFolders);
        renderFoldersAndCadernos();
    });
    addUnsubscribe(unsubFolders);
    
    const unsubFiltros = onSnapshot(filtrosQuery, (snapshot) => {
        const savedFilters = [];
        snapshot.forEach(doc => savedFilters.push({ id: doc.id, ...doc.data() }));
        setState('savedFilters', savedFilters);
        updateSavedFiltersList();
    });
    addUnsubscribe(unsubFiltros);
    
    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
        const historicalSessions = [];
        snapshot.forEach(doc => historicalSessions.push(doc.data()));
        setState('historicalSessions', historicalSessions);
        updateStatsPageUI();
    });
    addUnsubscribe(unsubSessions);

    const unsubReviewItems = onSnapshot(reviewQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                state.userReviewItemsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            }
            if (change.type === "removed") {
                state.userReviewItemsMap.delete(change.doc.id);
            }
        });
        if (DOM.revisaoView && !DOM.revisaoView.classList.contains('hidden')) {
            renderReviewView();
        }
    });
    addUnsubscribe(unsubReviewItems);
    
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

        // BUG FIX: Suppress re-render if an answer update is already in progress.
        if (state.isUpdatingAnswer) {
            return;
        }

        if (state.currentCadernoId || (state.vadeMecumView && !state.vadeMecumView.classList.contains('hidden'))) {
            displayQuestion();
        }
    });
    addUnsubscribe(unsubAnswers);
    
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
    addUnsubscribe(unsubCadernoState);

    // ADICIONADO: Listener for questionHistory
    const unsubHistory = onSnapshot(historyQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                state.userQuestionHistoryMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            }
            if (change.type === "removed") {
                state.userQuestionHistoryMap.delete(change.doc.id);
            }
        });
        
        // Se a tela de estatísticas estiver visível, re-renderiza ela
        if (DOM.estatisticasView && !DOM.estatisticasView.classList.contains('hidden')) {
            renderEstatisticasView();
        }
    });
    addUnsubscribe(unsubHistory);
}

export async function removeQuestionIdFromCaderno(cadernoId, questionId) {
    if (!state.currentUser) return;
    const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', cadernoId);
    await updateDoc(cadernoRef, {
        questionIds: arrayRemove(questionId)
    });
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

export async function setSrsReviewItem(questionId, reviewData) {
    if (!state.currentUser) return;
    const reviewRef = doc(db, 'users', state.currentUser.uid, 'reviewItems', questionId);
    await setDoc(reviewRef, reviewData, { merge: true });
}

export async function createCaderno(name, questionIds, folderId) {
    const caderno = {
        name,
        questionIds,
        folderId: folderId || null,
        createdAt: serverTimestamp()
    };
    const cadernosCollection = collection(db, 'users', state.currentUser.uid, 'cadernos');
    await addDoc(cadernosCollection, caderno);
}

export async function createOrUpdateName(type, name, id = null) {
    if (id) {
        const collectionPath = type === 'folder' ? 'folders' : 'cadernos';
        const itemRef = doc(db, 'users', state.currentUser.uid, collectionPath, id);
        await updateDoc(itemRef, { name: name });
    } else {
        if (type === 'folder') {
            const folderData = { name: name, createdAt: serverTimestamp() };
            const foldersCollection = collection(db, 'users', state.currentUser.uid, 'folders');
            await addDoc(foldersCollection, folderData);
        }
    }
}


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

export async function getHistoricalCountsForQuestions(questionIds) {
    if (!state.currentUser || questionIds.length === 0) {
        return { correct: 0, incorrect: 0, resolved: 0 };
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    let questionsWithHistory = 0;

    const historyPromises = questionIds.map(id => getDoc(doc(db, 'users', state.currentUser.uid, 'questionHistory', id)));
    const historySnapshots = await Promise.all(historyPromises);

    historySnapshots.forEach(snap => {
        if (snap.exists()) {
            const data = snap.data();
            const correct = data.correct || 0;
            const incorrect = data.incorrect || 0;
            if (correct > 0 || incorrect > 0) {
                questionsWithHistory++;
            }
            totalCorrect += correct;
            totalIncorrect += incorrect;
        }
    });
    
    return { correct: totalCorrect, incorrect: totalIncorrect, resolved: questionsWithHistory };
}

export async function deleteFilter(filterId) {
    if (!state.currentUser) return;
    await deleteDoc(doc(db, 'users', state.currentUser.uid, 'filtros', filterId));
}

export async function saveFilter(filterData) {
    if (!state.currentUser) return;
    const filtrosCollection = collection(db, 'users', state.currentUser.uid, 'filtros');
    await addDoc(filtrosCollection, filterData);
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

export async function deleteItem(type, id) {
    if (!state.currentUser) return;

    if (type === 'folder') {
        const cadernosToDelete = state.userCadernos.filter(c => c.folderId === id);
        const batch = writeBatch(db);
        cadernosToDelete.forEach(caderno => {
            const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', caderno.id);
            batch.delete(cadernoRef);
        });
        const folderRef = doc(db, 'users', state.currentUser.uid, 'folders', id);
        batch.delete(folderRef);
        await batch.commit();

    } else if (type === 'caderno') {
        const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', id);
        await deleteDoc(cadernoRef);
    }
}

export async function addQuestionIdsToCaderno(cadernoId, questionIds) {
    if (!state.currentUser || !questionIds || questionIds.length === 0) return;
    const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', cadernoId);
    try {
        await updateDoc(cadernoRef, {
            questionIds: arrayUnion(...questionIds)
        });
    } catch (error) {
        console.error("Erro ao adicionar questões ao caderno:", error);
    }
}


