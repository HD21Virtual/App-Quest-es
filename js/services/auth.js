import { auth } from '../firebase-config.js';
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { state, setCurrentUser, clearUnsubscribes, resetStateOnLogout } from '../state.js';
import DOM from '../dom-elements.js';
import { closeAuthModal } from '../ui/modal.js';
import { setupFirestoreListeners, fetchAllQuestions } from './firestore.js';
import { applyFilters } from '../features/filter.js';
import { navigateToView } from '../ui/navigation.js';

/**
 * @file js/services/auth.js
 * @description Lida com a autenticação de usuários.
 */


function updateUserUI(user) {
    const mobileContainer = DOM.userAccountContainerMobile;
    DOM.userAccountContainer.innerHTML = '';
    mobileContainer.innerHTML = '';
    const loginBtnId = 'show-login-modal-btn';
    const logoutBtnId = 'logout-btn';
    
    let loggedInHTML, loggedOutHTML;

    if (user) {
        loggedInHTML = `<div class="flex items-center"><span class="text-gray-600 text-sm mr-4">${user.email}</span><button id="${logoutBtnId}" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Sair</button></div>`;
        DOM.userAccountContainer.innerHTML = loggedInHTML;
        mobileContainer.innerHTML = loggedInHTML.replace(`id="${logoutBtnId}"`, `id="${logoutBtnId}-mobile"`);

    } else {
        loggedOutHTML = `<button id="${loginBtnId}" class="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Minha Conta</button>`;
        DOM.userAccountContainer.innerHTML = loggedOutHTML;
        mobileContainer.innerHTML = loggedOutHTML.replace(`id="${loginBtnId}"`, `id="${loginBtnId}-mobile"`);
    }
}


export function handleAuth(type) {
    const authFunction = type === 'login' ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
    DOM.authError.classList.add('hidden');
    authFunction(auth, DOM.emailInput.value, DOM.passwordInput.value)
        .then(() => closeAuthModal())
        .catch(error => {
            DOM.authError.textContent = error.message;
            DOM.authError.classList.remove('hidden');
        });
}

export function handleGoogleLogin() {
    DOM.authError.classList.add('hidden');
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then(() => closeAuthModal())
        .catch(error => {
            DOM.authError.textContent = error.message;
            DOM.authError.classList.remove('hidden');
        });
}

function handleLogout() {
    signOut(auth).catch(error => console.error("Erro ao fazer logout:", error));
}


export function setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
        clearUnsubscribes();
        setCurrentUser(user);

        if (user) {
            updateUserUI(user);
            closeAuthModal();
            navigateToView('inicio-view');
            
            fetchAllQuestions().then(() => {
                document.querySelectorAll('.custom-select-container').forEach(setupCustomSelect);
                applyFilters();
            });
            
            setupFirestoreListeners(user.uid);
        } else {
            updateUserUI(null);
            resetStateOnLogout();
            navigateToView('inicio-view');
            // Limpar UI de dados do usuário
            DOM.savedCadernosListContainer.innerHTML = '<p class="text-center text-gray-500">Faça login para ver seus cadernos.</p>';
            DOM.savedFiltersListContainer.innerHTML = '<p class="text-center text-gray-500">Faça login para ver seus filtros.</p>';
            DOM.reviewCard.classList.add('hidden');
        }
    });

     // Delegação de eventos para login/logout
    document.addEventListener('click', (event) => {
        if (event.target.id.startsWith('show-login-modal-btn')) {
            DOM.authModal.classList.remove('hidden');
        }
        if (event.target.id.startsWith('logout-btn')) {
            handleLogout();
        }
    });
}

