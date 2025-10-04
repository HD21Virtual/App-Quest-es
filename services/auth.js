import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from '../config/firebase.js';
import { setupAllFirestoreListeners, cleanupAllFirestoreListeners } from './firestore.js';
import { resetState, setState } from './state.js';
import { elements } from '../modules/ui.js';

/**
 * Inicializa o observador de estado de autenticação do Firebase.
 * @param {function} callback - Função a ser chamada quando o estado do usuário muda.
 */
export function initAuth(callback) {
    onAuthStateChanged(auth, callback);
}

/**
 * Ações a serem executadas quando um usuário faz login.
 * @param {object} user - O objeto de usuário do Firebase.
 */
export function onUserLoggedIn(user) {
    setupAllFirestoreListeners(user.uid);
}

/**
 * Ações a serem executadas quando um usuário faz logout.
 */
export function onUserLoggedOut() {
    cleanupAllFirestoreListeners();
    resetState();
    setState({ currentUser: null });
}

/**
 * Registra um novo usuário com e-mail e senha.
 */
export function registerWithEmail() {
    const email = elements.emailInput.value;
    const password = elements.passwordInput.value;
    return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Realiza login de um usuário com e-mail e senha.
 */
export function signInWithEmail() {
    const email = elements.emailInput.value;
    const password = elements.passwordInput.value;
    return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Realiza login com a conta do Google.
 */
export function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
}

/**
 * Realiza o logout do usuário atual.
 */
export function logout() {
    return signOut(auth);
}

