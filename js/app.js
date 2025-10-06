import { initAuth } from './services/auth.js';
import { fetchAllQuestions } from './services/firestore.js';
import { setupAllEventListeners } from './event-listeners.js';
import { navigateToView } from './ui/navigation.js';
import { updateUserUI } from './ui/ui-helpers.js';
import { updateStatsPageUI } from './features/stats.js';

function onUserLogin(user) {
    console.log("User logged in:", user.uid);
    updateUserUI(user);
    fetchAllQuestions().then(() => {
        setupAllListeners();
        navigateToView('inicio-view');
    });
}

function onUserLogout() {
    console.log("User logged out.");
    updateUserUI(null);
    navigateToView('inicio-view'); 
    updateStatsPageUI(); // Clear stats on logout
}

function main() {
    // Initialize authentication first, as it controls the data flow
    initAuth(onUserLogin, onUserLogout);
    
    // Set up listeners for elements that are always present (like modals, nav)
    setupAllEventListeners();
    
    // Show the initial view for a logged-out user
    updateUserUI(null);
    navigateToView('inicio-view');
}

// Wait for the DOM to be fully loaded before running the main script
document.addEventListener('DOMContentLoaded', main);

