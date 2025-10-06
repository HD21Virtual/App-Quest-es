import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from '../firebase-config.js';
import { state, clearUnsubscribes, resetStateOnLogout } from '../state.js';
import { setupAllListeners } from '../services/firestore.js';
import { updateUserUI } from '../ui/ui-helpers.js';
import { closeAuthModal } from '../ui/modal.js';
import DOM from '../dom-elements.js';

async function handleAuthSuccess(user) {
    state.currentUser = user;
    updateUserUI(user);
    closeAuthModal();
    await setupAllListeners(user.uid);
    // Navegar para a view inicial ou recarregar dados necessários
    const inicioLink = DOM.navLinks.find(link => link.dataset.view === 'inicio-view');
    if (inicioLink) {
        inicioLink.click();
    }
}

function handleLogout() {
    updateUserUI(null);
    clearUnsubscribes();
    resetStateOnLogout();
    // Resetar a UI para o estado inicial
    DOM.vadeMecumView.classList.add('hidden');
    DOM.cadernosView.classList.add('hidden');
    DOM.materiasView.classList.add('hidden');
    DOM.revisaoView.classList.add('hidden');
    DOM.estatisticasView.classList.add('hidden');
    DOM.inicioView.classList.remove('hidden');
    DOM.reviewCard.classList.add('hidden');
}


export function setupAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await handleAuthSuccess(user);
        } else {
            handleLogout();
        }
    });
}

export async function handleEmailLogin() {
    DOM.authError.classList.add('hidden');
    try {
        await signInWithEmailAndPassword(auth, DOM.emailInput.value, DOM.passwordInput.value);
        // O onAuthStateChanged vai lidar com o resto
    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
}

export async function handleEmailRegister() {
    DOM.authError.classList.add('hidden');
    try {
        await createUserWithEmailAndPassword(auth, DOM.emailInput.value, DOM.passwordInput.value);
        // O onAuthStateChanged vai lidar com o resto
    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
}

export async function handleGoogleLogin() {
    DOM.authError.classList.add('hidden');
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // O onAuthStateChanged vai lidar com o resto
    } catch (error) {
        DOM.authError.textContent = error.message;
        DOM.authError.classList.remove('hidden');
    }
}

export function handleSignOut() {
    signOut(auth);
}


