// ... existing code ...
    setState('editingId', null);
    setState('editingType', null);
}

export function openConfirmationModal(type, id, text, title = "Excluir Item") {
    setState('deletingType', type);
    setState('deletingId', id);
    if (DOM.confirmationModalTitle) DOM.confirmationModalTitle.textContent = title;
    if (DOM.confirmationModalText) DOM.confirmationModalText.textContent = text;
    if (DOM.confirmationModal) DOM.confirmationModal.classList.remove('hidden');
}

export function closeConfirmationModal() {
    if (DOM.confirmationModal) DOM.confirmationModal.classList.add('hidden');
    setState('deletingId', null);
// ... existing code ...
