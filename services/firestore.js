import {
    collection, getDocs, query, addDoc, doc, getDoc, setDoc,
    updateDoc, deleteDoc, onSnapshot, serverTimestamp, orderBy,
    arrayUnion, arrayRemove, Timestamp, increment, writeBatch, where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from '../config/firebase.js';
import { getState, setState, updateState } from './state.js';
import { renderFoldersAndCadernos, updateFolderSelect } from '../modules/cadernos.js';
import { updateSavedFiltersList } from '../modules/filters.js';
import { updateStatsPageUI } from '../modules/stats.js';
import { updateReviewCard } from '../modules/srs.js';
import { displayQuestion } from "../modules/questions.js";

// Variáveis para guardar as funções de unsubscribe dos listeners
let unsubscribers = [];

/**
 * Busca todas as questões do Firestore e as armazena no estado.
 * @returns {Promise<Array>} Uma promessa que resolve com as opções de filtro.
 */
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

        const materia = [];
        const allAssuntosSet = new Set();
        for (const [materiaName, assuntosSet] of materiaMap.entries()) {
            const assuntos = Array.from(assuntosSet).sort();
            materia.push({ name: materiaName, assuntos: assuntos });
            assuntos.forEach(assunto => allAssuntosSet.add(assunto));
        }
        materia.sort((a, b) => a.name.localeCompare(b.name));
        const allAssuntos = Array.from(allAssuntosSet).sort();
        
        setState({ allQuestions });
        return { materia, allAssuntos };

    } catch (error) {
        console.error("Erro ao buscar questões: ", error);
        return { materia: [], allAssuntos: [] };
    }
}

// Funções para salvar dados do usuário
export async function saveUserAnswer(questionId, userAnswer, isCorrect) {
    const { currentUser } = getState();
    if (!currentUser) return;
    const answerRef = doc(db, 'users', currentUser.uid, 'userQuestionState', questionId);
    try {
        await setDoc(answerRef, { userAnswer, isCorrect });
    } catch (error) {
        console.error("Error saving user answer:", error);
    }
}

export async function updateQuestionHistory(questionId, isCorrect) {
    const { currentUser } = getState();
    if (!currentUser) return;
    const historyRef = doc(db, 'users', currentUser.uid, 'questionHistory', questionId);
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

export async function saveSessionStats() {
    const { currentUser, sessionStats } = getState();
    if (!currentUser || sessionStats.length === 0) return;
    
    const total = sessionStats.length;
    const correct = sessionStats.filter(s => s.isCorrect).length;
    
    const sessionData = {
        createdAt: serverTimestamp(),
        totalQuestions: total,
        correctCount: correct,
        incorrectCount: total - correct,
        accuracy: total > 0 ? (correct / total * 100) : 0,
        details: sessionStats.reduce((acc, stat) => {
            if (!acc[stat.materia]) acc[stat.materia] = { correct: 0, total: 0 };
            acc[stat.materia].total++;
            if (stat.isCorrect) acc[stat.materia].correct++;
            return acc;
        }, {})
    };

    try {
        await addDoc(collection(db, 'users', currentUser.uid, 'sessions'), sessionData);
    } catch (error) {
        console.error("Erro ao salvar a sessão:", error);
    }
}

/**
 * Inicia um listener do Firestore e armazena sua função de unsubscribe.
 * @param {import("firebase/firestore").Query} query - A consulta do Firestore.
 * @param {Function} callback - A função a ser chamada com o snapshot.
 */
function setupListener(query, callback) {
    const unsubscribe = onSnapshot(query, callback);
    unsubscribers.push(unsubscribe);
}

/**
 * Inicia todos os listeners de dados do usuário.
 * @param {string} userId - O ID do usuário logado.
 */
export function setupAllFirestoreListeners(userId) {
    // Listener para Cadernos
    setupListener(query(collection(db, 'users', userId, 'cadernos'), orderBy('name')), (snapshot) => {
        const userCadernos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateState({ userCadernos }, renderFoldersAndCadernos);
    });

    // Listener para Pastas
    setupListener(query(collection(db, 'users', userId, 'folders'), orderBy('name')), (snapshot) => {
        const userFolders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateState({ userFolders }, () => {
            updateFolderSelect(userFolders);
            renderFoldersAndCadernos();
        });
    });

    // Listener para Respostas Salvas
    setupListener(query(collection(db, 'users', userId, 'userQuestionState')), (snapshot) => {
        const userAnswers = new Map(getState().userAnswers);
        snapshot.docChanges().forEach((change) => {
            const docData = change.doc.data();
            if (change.type === "added" || change.type === "modified") {
                userAnswers.set(change.doc.id, { userAnswer: docData.userAnswer, isCorrect: docData.isCorrect });
            } else if (change.type === "removed") {
                userAnswers.delete(change.doc.id);
            }
        });
        updateState({ userAnswers }, displayQuestion);
    });
    
    // Listener para Filtros Salvos
    setupListener(query(collection(db, 'users', userId, 'filtros')), (snapshot) => {
        const savedFilters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateState({ savedFilters }, updateSavedFiltersList);
    });
    
    // Listener para Sessões de Estudo
    setupListener(query(collection(db, 'users', userId, 'sessions'), orderBy('createdAt', 'desc')), (snapshot) => {
        const historicalSessions = snapshot.docs.map(doc => doc.data());
        updateState({ historicalSessions }, updateStatsPageUI);
    });

    // Listener para Itens de Revisão (SRS)
    setupListener(query(collection(db, 'users', userId, 'reviewItems')), (snapshot) => {
        const userReviewItemsMap = new Map(getState().userReviewItemsMap);
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                userReviewItemsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            } else if (change.type === "removed") {
                userReviewItemsMap.delete(change.doc.id);
            }
        });
        updateState({ userReviewItemsMap }, updateReviewCard);
    });
}

/**
 * Para e limpa todos os listeners ativos do Firestore.
 */
export function cleanupAllFirestoreListeners() {
    unsubscribers.forEach(unsubscribe => unsubscribe());
    unsubscribers = [];
}

