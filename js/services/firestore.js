import { 
    getFirestore, collection, getDocs, query, addDoc, doc, getDoc, setDoc, 
    updateDoc, deleteDoc, onSnapshot, serverTimestamp, orderBy, arrayUnion, 
    arrayRemove, Timestamp, increment, writeBatch, where 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { state } from '../state.js';

/**
 * @file js/services/firestore.js
 * @description Funções para interagir com o Cloud Firestore.
 */

// --- READ / LISTENERS ---

export async function fetchAllQuestions() {
    try {
        const querySnapshot = await getDocs(collection(db, "questions"));
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

export function setupCadernosAndFoldersListener(userId, callback) {
    const cadernosQuery = query(collection(db, `users/${userId}/cadernos`), orderBy('name'));
    const foldersQuery = query(collection(db, `users/${userId}/folders`), orderBy('name'));

    const unsubCadernos = onSnapshot(cadernosQuery, (snapshot) => {
        state.userCadernos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback();
    });

    const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
        state.userFolders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback();
    });
    
    return () => { unsubCadernos(); unsubFolders(); };
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
        console.error("Erro ao buscar dados da semana:", error);
    }
    
    return weeklyCounts;
}


// --- WRITE ---

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

export async function setSrsReviewItem(questionId, stage, nextReviewDate) {
    if (!state.currentUser) return;
    const reviewRef = doc(db, 'users', state.currentUser.uid, 'reviewItems', questionId);
    const reviewData = { 
        stage: stage, 
        nextReview: Timestamp.fromDate(nextReviewDate),
        questionId: questionId 
    };
    try {
        await setDoc(reviewRef, reviewData, { merge: true });
        state.userReviewItemsMap.set(questionId, { id: questionId, ...reviewData });
    } catch (error) {
        console.error("Error setting SRS review item:", error);
    }
}

export async function createOrUpdateFolder(folderId, name) {
    if (!state.currentUser) return;
    if (folderId) {
        const itemRef = doc(db, 'users', state.currentUser.uid, 'folders', folderId);
        await updateDoc(itemRef, { name });
    } else {
        const foldersCollection = collection(db, 'users', state.currentUser.uid, 'folders');
        await addDoc(foldersCollection, { name, createdAt: serverTimestamp() });
    }
}

export async function createOrUpdateCaderno(cadernoId, name, folderId = null, questionIds = []) {
     if (!state.currentUser) return;
     if (cadernoId) {
         const itemRef = doc(db, 'users', state.currentUser.uid, 'cadernos', cadernoId);
         await updateDoc(itemRef, { name });
     } else {
         const cadernosCollection = collection(db, 'users', state.currentUser.uid, 'cadernos');
         await addDoc(cadernosCollection, { 
             name, 
             folderId, 
             questionIds, 
             createdAt: serverTimestamp() 
         });
     }
}

export async function addQuestionsToCaderno(cadernoId, questionIds) {
    if (!state.currentUser || !cadernoId || questionIds.length === 0) return;
    const cadernoRef = doc(db, 'users', state.currentUser.uid, 'cadernos', cadernoId);
    await updateDoc(cadernoRef, {
        questionIds: arrayUnion(...questionIds)
    });
}

