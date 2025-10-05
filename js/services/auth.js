import { 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from '../firebase-config.js';
import DOM from '../dom-elements.js';
import { closeModal } from "../ui/modal.js";

/**
 * @file js/services/auth.js
 * @description Lida com toda a lógica de autenticação de usuário com o Firebase.
 */

let onLoginCallback, onLogoutCallback;

/**
 * Inicializa o listener de estado de autenticação.
 * @param {function} onLogin - Função a ser chamada no login.
 * @param {function} onLogout - Função a ser chamada no logout.
 */
export function initAuth(onLogin, onLogout) {
    onLoginCallback = onLogin;
    onLogoutCallback = onLogout;
    onAuthStateChanged(auth, (user) => {
        if (user) {
            onLoginCallback(user);
        } else {
            onLogoutCallback();
        }
    });
}

/**
 * Atualiza a UI da conta do usuário (cabeçalho).
 * @param {object|null} user - O objeto de usuário do Firebase ou null.
 */
export function updateUserUI(user) {
    DOM.userAccountContainer.innerHTML = '';
    DOM.userAccountContainerMobile.innerHTML = '';

    if (user) {
        const loggedInHTML = `<div class="flex items-center"><span class="text-gray-600 text-sm mr-4">${user.email}</span><button id="logout-btn" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Sair</button></div>`;
        const loggedInHTMLMobile = `<div class="flex items-center justify-between"><span class="text-gray-600 text-sm">${user.email}</span><button id="logout-btn-mobile" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Sair</button></div>`;
        DOM.userAccountContainer.innerHTML = loggedInHTML;
        DOM.userAccountContainerMobile.innerHTML = loggedInHTMLMobile;

        document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
        document.getElementById('logout-btn-mobile').addEventListener('click', () => signOut(auth));
    } else {
        const loggedOutHTML = `<button id="show-login-modal-btn" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Minha Conta</button>`;
        DOM.userAccountContainer.innerHTML = loggedOutHTML;
        DOM.userAccountContainerMobile.innerHTML = loggedOutHTML;
    }
}

/**
 * Lida com login e registro via email/senha.
 * @param {string} type - 'login' ou 'register'.
 */
export async function handleAuth(type) {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const authFunction = type === 'login' ? signInWithEmailAndPassword : createUserWithEmailAndPassword;

    DOM.authError.classList.add('hidden');
    try {
        await authFunction(auth, email, password);
        closeModal('auth');
    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
}

/**
 * Lida com o login via Google.
 */
export async function handleGoogleLogin() {
    DOM.authError.classList.add('hidden');
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        closeModal('auth');
    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
}
