import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from '../firebase-config.js';
import DOM from '../dom-elements.js';
import { closeAuthModal } from '../ui/modal.js';

/**
 * @file js/services/auth.js
 * @description Funções de autenticação com Firebase.
 */

export const handleAuthAction = async (authFunction) => {
    if (!DOM.authError || !DOM.emailInput || !DOM.passwordInput) return;
    DOM.authError.classList.add('hidden');
    try {
        await authFunction(auth, DOM.emailInput.value, DOM.passwordInput.value);
        closeAuthModal();
    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
};

export const handleGoogleLogin = async () => {
    if (!DOM.authError) return;
    DOM.authError.classList.add('hidden');
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        closeAuthModal();
    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
};

export const handleSignOut = () => {
    signOut(auth);
};

