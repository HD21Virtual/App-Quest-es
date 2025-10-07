import {
    getFirestore, collection, getDocs, query, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, where, writeBatch, increment
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { state, setState, addUnsubscribe } from '../state.js';

export async function fetchAllQuestions() {
    try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        const questions = [];
        const materiaMap = new Map();

        querySnapshot.forEach((doc) => {
            const question = { id: doc.id, ...doc.data() };
            questions.push(question);

            if (question.materia && question.assunto) {
                if (!materiaMap.has(question.materia)) {
                    materiaMap.set(question.materia, new Set());
                }
                materiaMap.get(question.materia).add(question.assunto);
            }
        });

        const materias = [];
        const allAssuntosSet = new Set();
        for (const [materia, assuntosSet] of materiaMap.entries()) {
            const assuntos = Array.from(assuntosSet).sort();
            materias.push({ name: materia, assuntos: assuntos });
            assuntos.forEach(assunto => allAssuntosSet.add(assunto));
        }
        materias.sort((a, b) => a.name.localeCompare(b.name));
        
        setState('allQuestions', questions);
        setState('filterOptions', {
            materia: materias,
            allAssuntos: Array.from(allAssuntosSet).sort()
        });

    } catch (error) {
        console.error("Erro ao buscar questões: ", error);
    }
}

export function setupAllListeners(userId) {
    const cadernosQuery = query(collection(db, 'users', userId, 'cadernos'), onSnapshot(cadernosQuery, (snapshot) => {
        const cadernos = [];
        snapshot.forEach(doc => cadernos.push({ id: doc.id, ...doc.data() }));
        setState('userCadernos', cadernos.sort((a, b) => a.name.localeCompare(b.name)));
    }));
    addUnsubscribe(cadernosQuery);

    const foldersQuery = query(collection(db, 'users', userId, 'folders'), onSnapshot(foldersQuery, (snapshot) => {
        const folders = [];
        snapshot.forEach(doc => folders.push({ id: doc.id, ...doc.data() }));
        setState('userFolders', folders.sort((a, b) => a.name.localeCompare(b.name)));
    }));
    addUnsubscribe(foldersQuery);
    
    const filtrosQuery = onSnapshot(collection(db, 'users', userId, 'filtros'), (snapshot) => {
        const filters = [];
        snapshot.forEach(doc => filters.push({ id: doc.id, ...doc.data() }));
        setState('savedFilters', filters);
    });
    addUnsubscribe(filtrosQuery);

    const sessionsQuery = query(collection(db, 'users', userId, 'sessions'), onSnapshot(sessionsQuery, (snapshot) => {
        const sessions = [];
        snapshot.forEach(doc => sessions.push(doc.data()));
        setState('historicalSessions', sessions.sort((a, b) => b.createdAt - a.createdAt));
    }));
    addUnsubscribe(sessionsQuery);

    const reviewQuery = query(collection(db, 'users', userId, 'reviewItems'), onSnapshot(reviewQuery, (snapshot) => {
        const reviewMap = new Map();
        snapshot.forEach(doc => reviewMap.set(doc.id, { id: doc.id, ...doc.data() }));
        setState('userReviewItemsMap', reviewMap);
    }));
    addUnsubscribe(reviewQuery);

    const answersQuery = query(collection(db, 'users', userId, 'userQuestionState'), onSnapshot(answersQuery, (snapshot) => {
        const answersMap = new Map(state.userAnswers);
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                answersMap.set(change.doc.id, change.doc.data());
            } else if (change.type === "removed") {
                answersMap.delete(change.doc.id);
            }
        });
        setState('userAnswers', answersMap);
    }));
    addUnsubscribe(answersQuery);

    const stateQuery = query(collection(db, 'users', userId, 'cadernoState'), onSnapshot(stateQuery, (snapshot) => {
        const stateMap = new Map(state.userCadernoState);
         snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                stateMap.set(change.doc.id, change.doc.data());
            } else if (change.type === "removed") {
                stateMap.delete(change.doc.id);
            }
        });
        setState('userCadernoState', stateMap);
    }));
    addUnsubscribe(stateQuery);
}

export async function saveSessionStats() {
    if (!state.currentUser || state.sessionStats.length === 0) return;
    
    const total = state.sessionStats.length;
    const correct = state.sessionStats.filter(s => s.isCorrect).length;
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
        accuracy: accuracy,
        details: statsByMateria
    };
    await addDoc(collection(db, 'users', state.currentUser.uid, 'sessions'), sessionData);
}

export async function createCaderno(name, folderId, questionIds) {
    if (!state.currentUser) return;
    const caderno = {
        name,
        folderId: folderId || null,
        questionIds: questionIds || [],
        createdAt: serverTimestamp()
    };
    await addDoc(collection(db, 'users', state.currentUser.uid, 'cadernos'), caderno);
}

export async function createOrUpdateName(type, id, name) {
    if (!state.currentUser) return;
    const collectionPath = type === 'folder' ? 'folders' : 'cadernos';
    if (id) {
        await updateDoc(doc(db, 'users', state.currentUser.uid, collectionPath, id), { name });
    } else if (type === 'folder') {
        await addDoc(collection(db, 'users', state.currentUser.uid, 'folders'), { name, createdAt: serverTimestamp() });
    }
}

export async function deleteItem(type, id) {
    if (!state.currentUser) return;
    if (type === 'folder') {
        const cadernosToDelete = state.userCadernos.filter(c => c.folderId === id);
        const batch = writeBatch(db);
        cadernosToDelete.forEach(c => batch.delete(doc(db, 'users', state.currentUser.uid, 'cadernos', c.id)));
        batch.delete(doc(db, 'users', state.currentUser.uid, 'folders', id));
        await batch.commit();
    } else if (type === 'caderno') {
        await deleteDoc(doc(db, 'users', state.currentUser.uid, 'cadernos', id));
    }
}

export async function deleteFilter(filterId) {
    if (!state.currentUser || !filterId) return;
    await deleteDoc(doc(db, 'users', state.currentUser.uid, 'filtros', filterId));
}

export async function saveUserAnswer(questionId, userAnswer, isCorrect) {
    if (!state.currentUser) return;
    await setDoc(doc(db, 'users', state.currentUser.uid, 'userQuestionState', questionId), { userAnswer, isCorrect });
}

export async function updateQuestionHistory(questionId, isCorrect) {
    if (!state.currentUser) return;
    const fieldToUpdate = isCorrect ? 'correct' : 'incorrect';
    await setDoc(doc(db, 'users', state.currentUser.uid, 'questionHistory', questionId), {
        [fieldToUpdate]: increment(1),
        total: increment(1)
    }, { merge: true });
}

export async function setSrsReviewItem(questionId, reviewData) {
    if (!state.currentUser) return;
    await setDoc(doc(db, 'users', state.currentUser.uid, 'reviewItems', questionId), reviewData, { merge: true });
}

export async function saveCadernoState(cadernoId, questionIndex) {
    if (!state.currentUser || !cadernoId) return;
    await setDoc(doc(db, 'users', state.currentUser.uid, 'cadernoState', cadernoId), { lastQuestionIndex: questionIndex });
}

export async function getWeeklySolvedQuestionsData() {
    const weeklyCounts = Array(7).fill(0);
    if (!state.currentUser) return weeklyCounts;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const q = query(collection(db, 'users', state.currentUser.uid, 'sessions'), where("createdAt", ">=", sevenDaysAgo));
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
    return weeklyCounts;
}

export async function removeQuestionIdFromCaderno(cadernoId, questionId) {
    if (!state.currentUser || !cadernoId || !questionId) return;
    const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', cadernoId);
    await updateDoc(cadernoRef, {
        questionIds: arrayRemove(questionId)
    });
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

