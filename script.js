// CONFIGURATION SUPABASE
// Remplace ces valeurs par celles de ton projet Supabase
const SUPABASE_URL = 'https://ton-projet.supabase.co'; 
const SUPABASE_KEY = 'ta-cle-publique-anon-key';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// FONCTION : LOGGER LE VISITEUR
async function logVisitor() {
    console.log("Tentative de log visiteur...");
    const { data, error } = await supabase
        .from('visiteurs')
        .insert([
            { 
                page_viewed: 'Accueil',
                user_agent: navigator.userAgent, // Info technique sur le navigateur
                timestamp: new Date().toISOString()
            },
        ]);

    if (error) console.error('Erreur Supabase:', error);
    else console.log('Visiteur loggué avec succès');
}

// Lancer le log au chargement de la page
window.onload = function() {
    logVisitor();
    
    // Initialisation Bouton PayPal (Exemple pour l'article 1)
    if(document.getElementById('paypal-button-container-1')){
        paypal.Buttons({
            createOrder: function(data, actions) {
                return actions.order.create({
                    purchase_units: [{
                        amount: { value: '45.00' } // PRIX DE L'ARTICLE
                    }]
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                    alert('Transaction validée par ' + details.payer.name.given_name);
                    // Ici on pourrait logger la vente dans Supabase
                });
            }
        }).render('#paypal-button-container-1');
    }
};