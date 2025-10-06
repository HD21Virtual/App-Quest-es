import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from '../firebase-config.js';
import { setupAllListeners } from '../services/firestore.js';
import { updateUserUI } from '../ui/ui-helpers.js';
import { closeAuthModal } from '../ui/modal.js';
import { setState, clearUnsubscribes, resetStateOnLogout } from '../state.js';
import DOM from '../dom-elements.js';

let onLoginCallback, onLogoutCallback;

async function handleAuth(authFunction) {
    DOM.authError.classList.add('hidden');
    try {
        await authFunction(auth, DOM.emailInput.value, DOM.passwordInput.value);
        closeAuthModal();
    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
}

export function handleEmailLogin() {
    handleAuth(signInWithEmailAndPassword);
}

export function handleEmailRegister() {
    handleAuth(createUserWithEmailAndPassword);
}

export async function handleGoogleLogin() {
    DOM.authError.classList.add('hidden');
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        closeAuthModal();
    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
}

export function handleSignOut() {
    signOut(auth);
}

export function initAuth(onLogin, onLogout) {
    onLoginCallback = onLogin;
    onLogoutCallback = onLogout;

    onAuthStateChanged(auth, (user) => {
        clearUnsubscribes();
        resetStateOnLogout();

        if (user) {
            setState('currentUser', user);
            if (onLoginCallback) onLoginCallback(user);
        } else {
            setState('currentUser', null);
            if (onLogoutCallback) onLogoutCallback();
        }
    });
}

