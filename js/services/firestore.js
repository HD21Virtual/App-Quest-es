import {
    collection,
    getDocs,
    query,
    addDoc,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    orderBy,
    arrayUnion,
    arrayRemove,
    increment,
    writeBatch,
    where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { state, setState, addUnsubscribe } from '../state.js';
import { renderFoldersAndCadernos } from '../features/caderno.js';
import { updateReviewCard } from '../features/srs.js';
import { updateStatsPageUI } from '../features/stats.js';
import DOM from "../dom-elements.js";

// --- LISTENER SETUP ---
export function setupAllListeners(userId) {
    setupCadernosAndFoldersListener(userId);
    setupFiltrosListener(userId);
    setupStatsListener(userId);
    setupReviewListener(userId);
    setupUserAnswersListener(userId);
    setupCadernoStateListener(userId);
}

// --- DATA FETCHING ---
export async function fetchAllQuestions() {
    try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        const allQuestions = [];
        const materiaMap = new Map();

        querySnapshot.forEach((doc) => {
            const question = { id: doc.id, ...doc.data() };
            allQuestions.push(question);

            if (question.materia && question.assunto) {
                if (!materiaMap.has(question.materia)) {
                    materiaMap.set(question.materia, new Set());
                }
                materiaMap.get(question.materia).add(question.assunto);
            }
        });

        const filterMateria = [];
        const allAssuntosSet = new Set();
        for (const [materia, assuntosSet] of materiaMap.entries()) {
            const assuntos = Array.from(assuntosSet).sort();
            filterMateria.push({ name: materia, assuntos: assuntos });
            assuntos.forEach(assunto => allAssuntosSet.add(assunto));
        }

        setState('allQuestions', allQuestions);
        setState('filterOptions', {
            materia: filterMateria.sort((a, b) => a.name.localeCompare(b.name)),
            allAssuntos: Array.from(allAssuntosSet).sort()
        });

    } catch (error) {
        console.error("Erro ao buscar questões: ", error);
    }
}


// --- REALTIME LISTENERS ---

function setupCadernosAndFoldersListener(userId) {
    const cadernosQuery = query(collection(db, 'users', userId, 'cadernos'), orderBy('name'));
    const unsubCadernos = onSnapshot(cadernosQuery, (snapshot) => {
        const userCadernos = [];
        snapshot.forEach(doc => userCadernos.push({ id: doc.id, ...doc.data() }));
        setState('userCadernos', userCadernos);
        renderFoldersAndCadernos();
    });
    addUnsubscribe(unsubCadernos);

    const foldersQuery = query(collection(db, 'users', userId, 'folders'), orderBy('name'));
    const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
        const userFolders = [];
        const folderOptions = ['<option value="">Salvar em (opcional)</option>'];
        snapshot.forEach(doc => {
            const folder = { id: doc.id, ...doc.data() };
            userFolders.push(folder);
            folderOptions.push(`<option value="${folder.id}">${folder.name}</option>`);
        });
        setState('userFolders', userFolders);
        DOM.folderSelect.innerHTML = folderOptions.join('');
        renderFoldersAndCadernos();
    });
    addUnsubscribe(unsubFolders);
}

function setupFiltrosListener(userId) {
    const filtrosCollection = collection(db, 'users', userId, 'filtros');
    const unsub = onSnapshot(filtrosCollection, (snapshot) => {
        const savedFilters = [];
        snapshot.forEach(doc => savedFilters.push({ id: doc.id, ...doc.data() }));
        setState('savedFilters', savedFilters);
        // UI update is handled by the modal logic
    });
    addUnsubscribe(unsub);
}

function setupStatsListener(userId) {
    const sessionsQuery = query(collection(db, 'users', userId, 'sessions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(sessionsQuery, (snapshot) => {
        const historicalSessions = [];
        snapshot.forEach(doc => historicalSessions.push(doc.data()));
        setState('historicalSessions', historicalSessions);
        updateStatsPageUI();
    });
    addUnsubscribe(unsub);
}

function setupReviewListener(userId) {
    const reviewQuery = query(collection(db, 'users', userId, 'reviewItems'));
    const unsub = onSnapshot(reviewQuery, (snapshot) => {
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
    addUnsubscribe(unsub);
}

function setupUserAnswersListener(userId) {
    const answersQuery = query(collection(db, 'users', userId, 'userQuestionState'));
    const unsub = onSnapshot(answersQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data();
            if (change.type === "added" || change.type === "modified") {
                state.userAnswers.set(change.doc.id, { userAnswer: docData.userAnswer, isCorrect: docData.isCorrect });
            }
            if (change.type === "removed") {
                state.userAnswers.delete(change.doc.id);
            }
        });
    });
    addUnsubscribe(unsub);
}

function setupCadernoStateListener(userId) {
    const stateQuery = query(collection(db, 'users', userId, 'cadernoState'));
    const unsub = onSnapshot(stateQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                state.userCadernoState.set(change.doc.id, change.doc.data());
            }
            if (change.type === "removed") {
                state.userCadernoState.delete(change.doc.id);
            }
        });
    });
    addUnsubscribe(unsub);
}

// --- DATA WRITING ---

export async function saveFilter(name, filterData) {
    if (!state.currentUser) return;
    const filtrosCollection = collection(db, 'users', state.currentUser.uid, 'filtros');
    await addDoc(filtrosCollection, { name, ...filterData });
}

export async function deleteFilter(filterId) {
    if (!state.currentUser) return;
    await deleteDoc(doc(db, 'users', state.currentUser.uid, 'filtros', filterId));
}

export async function createCaderno(name, folderId, questionIds) {
    if (!state.currentUser) return;
    const caderno = {
        name: name,
        questionIds: questionIds,
        folderId: folderId || null,
        createdAt: serverTimestamp()
    };
    const cadernosCollection = collection(db, 'users', state.currentUser.uid, 'cadernos');
    await addDoc(cadernosCollection, caderno);
}

export async function createOrUpdateName(type, name, id) {
    if (!state.currentUser) return;
    const collectionPath = type === 'folder' ? 'folders' : 'cadernos';
    if (id) { // Editing
        const itemRef = doc(db, 'users', state.currentUser.uid, collectionPath, id);
        await updateDoc(itemRef, { name: name });
    } else { // Creating
        if (type === 'folder') {
            const folderData = { name: name, createdAt: serverTimestamp() };
            const foldersCollection = collection(db, 'users', state.currentUser.uid, 'folders');
            await addDoc(foldersCollection, folderData);
        }
    }
}

export async function deleteItem(type, id) {
    if (!state.currentUser) return;
    if (type === 'folder') {
        const cadernosToDelete = state.userCadernos.filter(c => c.folderId === id);
        const deletePromises = cadernosToDelete.map(c => deleteDoc(doc(db, 'users', state.currentUser.uid, 'cadernos', c.id)));
        await Promise.all(deletePromises);
        await deleteDoc(doc(db, 'users', state.currentUser.uid, 'folders', id));
    } else if (type === 'caderno') {
        await deleteDoc(doc(db, 'users', state.currentUser.uid, 'cadernos', id));
    }
}

export async function saveSessionStats() {
    if (!state.currentUser || state.sessionStats.length === 0) return;
    // ... logic to save session
}

export async function updateQuestionHistory(questionId, isCorrect) {
    if (!state.currentUser) return;
    // ... logic to update history
}

export async function saveUserAnswer(questionId, userAnswer, isCorrect) {
    if (!state.currentUser) return;
    // ... logic to save answer
}

export async function setSrsReviewItem(questionId, reviewData) {
    if (!state.currentUser) return;
    const reviewRef = doc(db, 'users', state.currentUser.uid, 'reviewItems', questionId);
    await setDoc(reviewRef, reviewData, { merge: true });
}

export async function resetAllUserData() {
    if (!state.currentUser) return;
    const collectionsToDelete = ['questionHistory', 'reviewItems', 'userQuestionState', 'cadernoState', 'sessions', 'cadernos', 'folders', 'filtros'];
    for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(db, 'users', state.currentUser.uid, collectionName);
        const snapshot = await getDocs(collectionRef);
        if (snapshot.empty) continue;
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
}

