/**
 * Gestionnaire universel de navigation et de retour intelligent
 * Règle : Ouverture en plein écran adapté / Fermeture avec retour automatique à l'état précédent.
 */

function quitterPageOuModule() {
    // Si l'historique contient une page précédente sur le même domaine, on y retourne
    if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.hostname)) {
        window.history.back();
    } else {
        // Fallback : Redirection sécurisée vers le tableau de bord principal Maisonnée
        window.location.href = 'index.html';
    }
}

// Interception des boutons de fermeture / retour existants dans le DOM
document.addEventListener('DOMContentLoaded', () => {
    const boutonsRetour = document.querySelectorAll('.btn-fermer, #btn-fermer, .close-button, .navigation-back');
    boutonsRetour.forEach(bouton => {
        bouton.addEventListener('click', (e) => {
            e.preventDefault();
            quitterPageOuModule();
        });
    });
});
