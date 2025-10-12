import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from '../firebase-config.js';
import { state, setState, resetStateOnLogout, clearUnsubscribes } from '../state.js';
// CORREÇÃO: Importar saveSessionStats para salvar o progresso ao deslogar
import { setupAllListeners, saveSessionStats } from '../services/firestore.js';
import { updateUserUI } from '../ui/ui-helpers.js';
import { closeAuthModal } from '../ui/modal.js';
import DOM from '../dom-elements.js';
import { navigateToView } from "../ui/navigation.js";

export function initAuth() {
// ... existing code ...
    onAuthStateChanged(auth, (user) => {
        clearUnsubscribes();
        setState('currentUser', user);

        if (user) {
            updateUserUI(user);
            closeAuthModal();
            setupAllListeners(user.uid);
            navigateToView('inicio-view');
        } else {
            resetStateOnLogout();
            updateUserUI(null);
            navigateToView('inicio-view');
        }
    });
}

export async function handleAuth(action) {
// ... existing code ...
    DOM.authError.classList.add('hidden');
    try {
        if (action === 'login') {
            await signInWithEmailAndPassword(auth, DOM.emailInput.value, DOM.passwordInput.value);
        } else if (action === 'register') {
            await createUserWithEmailAndPassword(auth, DOM.emailInput.value, DOM.passwordInput.value);
        } else if (action === 'logout') {
            // CORREÇÃO: Salvar a sessão atual antes de fazer o logout
            if (state.sessionStats && state.sessionStats.length > 0) {
                await saveSessionStats();
            }
            await signOut(auth);
        }
    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
}

export async function handleGoogleAuth() {
// ... existing code ...
    DOM.authError.classList.add('hidden');
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
}
