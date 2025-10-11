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
import { setupAllListeners } from '../services/firestore.js';
import { updateUserUI } from '../ui/ui-helpers.js';
import { closeAuthModal } from '../ui/modal.js';
import DOM from '../dom-elements.js';
import { navigateToPage } from "../ui/navigation.js";

export function initAuth() {
    onAuthStateChanged(auth, (user) => {
        clearUnsubscribes();
        setState('currentUser', user);

        if (user) {
            updateUserUI(user);
            closeAuthModal();
            setupAllListeners(user.uid);
            // CORREÇÃO: O redirecionamento foi removido daqui.
            // Isso impedia a navegação para outras páginas após o login.
        } else {
            resetStateOnLogout();
            updateUserUI(null);
        }
    });
}

export async function handleAuth(action) {
    DOM.authError.classList.add('hidden');
    try {
        let shouldRedirect = false;
        if (action === 'login') {
            await signInWithEmailAndPassword(auth, DOM.emailInput.value, DOM.passwordInput.value);
            shouldRedirect = true;
        } else if (action === 'register') {
            await createUserWithEmailAndPassword(auth, DOM.emailInput.value, DOM.passwordInput.value);
            shouldRedirect = true;
        } else if (action === 'logout') {
            await signOut(auth);
            // Redireciona para o início após o logout
            navigateToPage('inicio-view');
        }
        
        // CORREÇÃO: Redireciona para o início APENAS após o login/registro bem-sucedido.
        if (shouldRedirect) {
            navigateToPage('inicio-view');
        }

    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
}

export async function handleGoogleAuth() {
    DOM.authError.classList.add('hidden');
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // CORREÇÃO: Redireciona para o início APENAS após o login com Google.
        navigateToPage('inicio-view');
    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
}
