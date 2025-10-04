import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from '../config/firebase.js';
import { elements } from '../modules/ui.js';

/**
 * Lida com o processo de autenticação (login ou registro).
 * @param {Function} authFunction - A função de autenticação do Firebase a ser executada.
 */
const handleAuth = async (authFunction) => {
    elements.authError.classList.add('hidden');
    try {
        await authFunction(auth, elements.emailInput.value, elements.passwordInput.value);
        elements.authModal.classList.add('hidden');
    } catch (error) {
        elements.authError.textContent = error.message;
        elements.authError.classList.remove('hidden');
    }
};

/**
 * Inicia o listener de autenticação do Firebase.
 * @param {Function} onLogin - Callback a ser executado quando o usuário faz login.
 * @param {Function} onLogout - Callback a ser executado quando o usuário faz logout.
 */
export function initAuth(onLogin, onLogout) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            onLogin(user);
        } else {
            onLogout();
        }
    });

    // Adiciona listeners aos botões do modal de autenticação
    elements.loginBtn.addEventListener('click', () => handleAuth(signInWithEmailAndPassword));
    elements.registerBtn.addEventListener('click', () => handleAuth(createUserWithEmailAndPassword));
    elements.googleLoginBtn.addEventListener('click', async () => {
        elements.authError.classList.add('hidden');
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            elements.authModal.classList.add('hidden');
        } catch (error) {
            elements.authError.textContent = error.message;
            elements.authError.classList.remove('hidden');
        }
    });
}

/**
 * Desconecta o usuário atual.
 */
export function signOutUser() {
    signOut(auth);
}
