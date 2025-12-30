// --- 1. CONFIGURATION ---
const SUPABASE_URL = 'https://yiccodvdibpwcggsptvc.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_UNoN4Gw2cqx7YTU13NkSpg_75Ec1fdJ'; 

// Configuration admin
const ADMIN_EMAIL = 'xavier.frassinelli@gmail.com';

// Initialisation de Supabase (Vérification de sécurité)
let supabaseClient;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Supabase SDK non chargé. Vérifiez le <head> de votre HTML.");
}

// --- 1.5. UTILITAIRES ADMIN ---
async function verifierAdmin() {
    if (!supabaseClient) return false;
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session && session.user.email === ADMIN_EMAIL;
}

// --- 2. GESTION DU PANIER (LOCAL) ---
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];

function ajouterAuPanier(titre, prix) {
    panier.push({ titre: titre, prix: parseFloat(prix) });
    sauvegarderPanier();
    mettreAJourPanierAffichage();
    alert("Article ajouté au panier !");
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    fermerToutesModalesSauf('cart-modal');
    
    if(modal) {
        if (modal.style.display === 'none' || modal.style.display === '') {
            modal.style.display = 'block';
            
            // --- AJOUT IMPORTANT ICI ---
            // On attend un tout petit peu que la fenêtre s'ouvre pour dessiner les boutons
            setTimeout(() => {
                // On vide d'abord le conteneur pour ne pas avoir 2 boutons si on rouvre
                const container = document.getElementById('paypal-button-container');
                if(container) container.innerHTML = ""; 
                
                // On affiche les boutons si le panier n'est pas vide
                if (panier.length > 0) {
                    afficherBoutonsPayPal();
                } else {
                    if(container) container.innerHTML = "<p style='text-align:center; font-size:0.8em;'>Le panier est vide</p>";
                }
            }, 100); 
            // ---------------------------

        } else {
            modal.style.display = 'none';
        }
    }
}

function mettreAJourPanierAffichage() {
    const tbody = document.getElementById('cart-items');
    const totalSpan = document.getElementById('cart-total');
    const countSpan = document.getElementById('cart-count'); // Cible le span du compteur
    
    if(!tbody) return; 

    tbody.innerHTML = "";
    let total = 0;

    panier.forEach((item, index) => {
        total += item.prix;
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #f9f9f9;">
                <td style="padding: 8px 5px;">${item.titre}</td>
                <td style="padding: 8px 5px; text-align: right;">${item.prix}€</td>
                <td style="padding: 8px 5px; text-align: right;">
                    <button onclick="retirerDuPanier(${index})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">&times;</button>
                </td>
            </tr>`;
    });

    // Mise à jour des totaux
    if(totalSpan) totalSpan.innerText = total.toFixed(2);
    
    // Mise à jour du petit chiffre dans le bouton (sans effacer le texte "Panier")
    if(countSpan) countSpan.innerText = panier.length;
}

function retirerDuPanier(index) {
    panier.splice(index, 1);
    sauvegarderPanier();
    mettreAJourPanierAffichage();
}

function viderPanier() {
    panier = [];
    sauvegarderPanier();
    mettreAJourPanierAffichage();
}

function sauvegarderPanier() {
    localStorage.setItem('monPanier', JSON.stringify(panier));
}

async function payerPanier() {
    if(panier.length === 0) {
        alert("Votre panier est vide !");
        return;
    }
    
    // 1. Calcul des totaux
    let total = 0;
    panier.forEach(p => total += p.prix);
    const nomCommande = `Commande de ${panier.length} articles`;

    // 2. Demande de confirmation
    if(confirm(`Payer un total de ${total.toFixed(2)}€ via PayPal ?`)) {
        
        // --- NOUVEAU : SAUVEGARDE SUPABASE ---
        
        // On regarde si l'utilisateur est connecté pour récupérer son ID et Email
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        let clientEmail = "Invité";
        let userId = null;

        if (session) {
            clientEmail = session.user.email;
            userId = session.user.id;
        }

        // On insère la commande dans la base de données
        const { error } = await supabaseClient.from('commandes').insert({
            client_email: clientEmail,
            user_id: userId,
            articles: panier, // Supabase convertit automatiquement le tableau JS en JSON
            total: total,
            statut: "Redirigé vers PayPal" 
        });

        if (error) {
            console.error("Erreur sauvegarde commande:", error);
            alert("Une erreur est survenue lors de l'enregistrement de la commande, mais vous allez être redirigé vers le paiement.");
        }
        // -------------------------------------

        // 3. Gestion Locale (On garde ça pour l'instant pour l'affichage immédiat)
        const nouvelleCommande = {
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
            articles: panier,
            total: total.toFixed(2)
        };
        let historique = JSON.parse(localStorage.getItem('monHistorique')) || [];
        historique.push(nouvelleCommande);
        localStorage.setItem('monHistorique', JSON.stringify(historique));

        // 4. Redirection PayPal
        const emailPayPal = "votre-email-paypal@exemple.com"; // REMETS TON EMAIL PAYPAL ICI
        const url = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${emailPayPal}&currency_code=EUR&amount=${total}&item_name=${encodeURIComponent(nomCommande)}`;
        
        // On vide le panier et on redirige
        viderPanier(); 
        document.getElementById('cart-modal').style.display = 'none';
        
        // Petite astuce : on ouvre PayPal dans le même onglet ou un nouvel onglet
        window.open(url, '_blank');
    }
}


// --- 3. HISTORIQUE & MODALES ---

// Utilitaire pour éviter d'avoir 3 fenêtres ouvertes en même temps
function fermerToutesModalesSauf(idSauf) {
    const ids = ['cart-modal', 'auth-modal', 'orders-modal'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el && id !== idSauf) el.style.display = 'none';
    });
}

function toggleOrders() {
    const modal = document.getElementById('orders-modal');
    if(!modal) {
        alert("Section historique introuvable dans le HTML.");
        return;
    }
    fermerToutesModalesSauf('orders-modal');
    
    if (modal.style.display === 'none' || modal.style.display === '') {
        afficherHistorique();
        modal.style.display = 'block';
    } else {
        modal.style.display = 'none';
    }
}

function afficherHistorique() {
    const container = document.getElementById('orders-list');
    const historique = JSON.parse(localStorage.getItem('monHistorique')) || [];

    if(!container) return;

    if (historique.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#777;">Aucune commande enregistrée.</p>';
        return;
    }
    container.innerHTML = "";
    historique.slice().reverse().forEach(cmd => {
        let details = cmd.articles.map(a => `<li>${a.titre}</li>`).join('');
        container.innerHTML += `
            <div style="background:#f9f9f9; border:1px solid #eee; padding:10px; margin-bottom:10px; border-radius:4px;">
                <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:5px;">
                    <span>${cmd.date}</span>
                    <span>${cmd.total}€</span>
                </div>
                <ul style="font-size:0.85em; margin:0; padding-left:20px; color:#555;">${details}</ul>
            </div>`;
    });
}


// --- 4. AUTHENTIFICATION CLIENT (SUPABASE) ---
let modeInscription = false;

function toggleAuthModal() {
    const modal = document.getElementById('auth-modal');
    if(!modal) return;
    
    fermerToutesModalesSauf('auth-modal');
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'block' : 'none';
}

function basculerModeAuth() {
    modeInscription = !modeInscription;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-action-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');
    
    if (modeInscription) {
        title.innerText = "Créer un compte";
        btn.innerText = "M'inscrire";
        toggleText.innerText = "Déjà un compte ?";
        toggleLink.innerText = "Se connecter";
    } else {
        title.innerText = "Connexion";
        btn.innerText = "Se connecter";
        toggleText.innerText = "Pas encore de compte ?";
        toggleLink.innerText = "Créer un compte";
    }
}

async function gererAuth() {
    const email = document.getElementById('client-email').value;
    const password = document.getElementById('client-password').value;

    if (!email || !password) {
        alert("Merci de remplir l'email et le mot de passe.");
        return;
    }

    if (modeInscription) {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) alert("Erreur : " + error.message);
        else {
            alert("Compte créé ! Vérifiez vos emails pour confirmer.");
            toggleAuthModal();
        }
    } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) alert("Erreur : " + error.message);
        else {
            // alert("Connecté !"); // Optionnel, parfois intrusif
            toggleAuthModal();
            verificationSession();
        }
    }
}

async function loginAdmin(event) {
    event.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    if (!email || !password) {
        document.getElementById('login-msg').innerText = "Veuillez remplir tous les champs.";
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        document.getElementById('login-msg').innerText = "Erreur : " + error.message;
    } else {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        chargerListeAdmin();
    }
}

async function logoutClient() {
    await supabaseClient.auth.signOut();
    alert("Vous avez été déconnecté.");
    verificationSession();
    window.location.href = 'index.html';
}

async function verificationSession() {
    if(!supabaseClient) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    
    const loginLink = document.getElementById('login-btn-text');
    const logoutLink = document.getElementById('logout-btn');
    const mainLink = document.getElementById('auth-link');

    if(mainLink && loginLink && logoutLink) {
        if (session) {
            mainLink.innerText = "Mon Compte (Connecté)";
            loginLink.style.display = 'none';
            logoutLink.style.display = 'block';
        } else {
            mainLink.innerText = "Mon Espace";
            loginLink.style.display = 'block';
            logoutLink.style.display = 'none';
        }
    }
}


// --- 5. FONCTIONS VITRINE (ACCUEIL) ---
async function chargerVitrine(filtre = "Tout") {
    console.log("--- CHARGEMENT VITRINE ---");
    console.log("Filtre demandé :", filtre);

    const container = document.getElementById('gallery-container');
    if (!container) return; 

    // Petit message de chargement pour que l'utilisateur sache qu'il se passe quelque chose
    container.innerHTML = "<p style='text-align:center; width:100%;'>Recherche en cours...</p>";

    // 1. On prépare la requête de base (tout sélectionner)
    let query = supabaseClient.from('produits').select('*');

    // 2. Si un filtre spécifique est choisi (autre que "Tout"), on filtre
    if (filtre !== "Tout") {
        // IMPORTANT : Le mot doit être EXACTEMENT le même que dans ta base de données
        query = query.eq('categorie', filtre);
    }

    // 3. On lance la requête
    const { data: produits, error } = await query;

    if (error) {
        console.error("Erreur Supabase :", error);
        container.innerHTML = "<p>Impossible de charger la vitrine pour le moment.</p>";
    } else {
        container.innerHTML = "";
        
        console.log("Produits trouvés :", produits.length);

        if (produits.length === 0) {
            container.innerHTML = `<p style='text-align:center; width:100%;'>Aucune création trouvée pour le thème : <strong>${filtre}</strong></p>`;
            return;
        }

        produits.forEach(prod => {
            const imageSrc = prod.image_file ? prod.image_file : 'img/default.jpg'; 
            
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="height: 200px; overflow: hidden; background: white; border-bottom: 1px solid #eee;">
                    <img src="${imageSrc}" alt="${prod.titre}" style="width:100%; height:100%; object-fit:cover; transition: transform 0.3s;" 
                    onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                </div>
                <h3 style="margin: 10px 0;">${prod.titre}</h3>
                <p style="font-size: 0.8em; color: #777;">${prod.categorie || 'Non classé'}</p>
                <p style="font-weight: bold; color: #555;">${prod.prix} €</p>
                <button class="btn-primary" onclick="ajouterAuPanier('${prod.titre.replace(/'/g, "\\'")}', ${prod.prix})">Ajouter au panier</button>
            `;
            container.appendChild(card);
        });
    }
}


// --- 6. FONCTIONS ADMIN (Seulement pour admin.html) ---
// Ces fonctions ne se déclencheront que si les éléments existent dans le DOM

async function chargerListeAdmin() {
    const listDiv = document.getElementById('admin-product-list');
    if(!listDiv) return;

    const { data: produits } = await supabaseClient.from('produits').select('*').order('id', { ascending: false });
    
    listDiv.innerHTML = "";
    produits.forEach(prod => {
        listDiv.innerHTML += `
            <div class="product-list-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <span>${prod.titre} — <strong>${prod.prix}€</strong></span>
                <span style="color:red; cursor:pointer;" onclick="supprimerProduit(${prod.id})">[Supprimer]</span>
            </div>`;
    });
}

async function ajouterProduit() {
    // Vérification admin
    const isAdmin = await verifierAdmin();
    if (!isAdmin) {
        alert("Accès refusé : Seuls les administrateurs peuvent ajouter des produits.");
        return;
    }

    const titreInput = document.getElementById('new-titre');
    const prixInput = document.getElementById('new-prix');
    const imgInput = document.getElementById('new-image'); // URL de l'image

    const catInput = document.getElementById('new-categorie'); // On récupère le menu
    // -------------------------------

    if(!titreInput || !prixInput) return;

    const { error } = await supabaseClient.from('produits').insert([{ 
        titre: titreInput.value, 
        prix: parseFloat(prixInput.value), 
        image_file: imgInput.value,
        categorie: catInput.value, 
    }]);

    if (error) alert("Erreur : " + error.message);
    else { 
        alert('Produit ajouté !'); 
        titreInput.value = ''; 
        prixInput.value = '';
        imgInput.value = '';
        catInput.value = 'Divers'; // On remet à zéro
        chargerListeAdmin(); 
    }
}

async function supprimerProduit(id) {
    // Vérification admin
    const isAdmin = await verifierAdmin();
    if (!isAdmin) {
        alert("Accès refusé : Seuls les administrateurs peuvent supprimer des produits.");
        return;
    }

    console.log("Tentative de suppression du produit ID:", id);
    if(confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
        console.log("Confirmation reçue, suppression en cours...");
        const { error } = await supabaseClient.from('produits').delete().eq('id', id);
        if(error) {
            console.error("Erreur suppression:", error);
            alert("Erreur suppression: " + error.message);
        } else {
            console.log("Suppression réussie");
            chargerListeAdmin();
        }
    } else {
        console.log("Suppression annulée");
    }
}


// --- 7. DÉMARRAGE ---
window.onload = function() {
    // 1. Initialiser l'affichage du panier au chargement
    mettreAJourPanierAffichage();

    // 2. Lancement vitrine (si sur page d'accueil)
    if(document.getElementById('gallery-container')) chargerVitrine();
    
    // 3. Vérification Auth Client (partout)
    verificationSession();

    // 4. Lancement Admin (si sur page admin)
    if(document.getElementById('admin-product-list')) {
        // On vérifie si l'admin est connecté
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                chargerListeAdmin();
            } else {
                // Rediriger ou afficher message d'erreur si pas connecté sur admin
                console.log("Admin non connecté");
            }
        });
    }
};

// --- 8. GESTION PAYPAL (INTELLIGENT) ---

function afficherBoutonsPayPal() {
    const container = document.getElementById('paypal-button-container');
    
    // Si le conteneur n'existe pas (bug) ou s'il a déjà des boutons (pour éviter les doublons), on arrête
    if (!container) return;
    if (container.innerHTML !== "") return; 

    // On vide le conteneur par sécurité avant de dessiner
    container.innerHTML = "";

    paypal.Buttons({
        style: {
            color:  'gold',
            shape:  'rect',
            label:  'pay',
            height: 40
        },

        // A. CRÉATION DE LA COMMANDE
        createOrder: function(data, actions) {
            // On recalcule le total ici pour la sécurité
            let total = 0;
            panier.forEach(p => total += p.prix);
            
            if(total === 0) {
                alert("Votre panier est vide !");
                return actions.reject();
            }

            return actions.order.create({
                purchase_units: [{
                    description: "Commande Atelier",
                    amount: {
                        value: total.toFixed(2) // Le montant doit être une chaîne (ex: "45.00")
                    }
                }]
            });
        },

        // B. PAIEMENT VALIDÉ (C'est ici qu'on sauvegarde !)
        onApprove: async function(data, actions) {
            // 1. On capture la transaction
            const orderData = await actions.order.capture();
            console.log('Paiement PayPal réussi :', orderData);

            // 2. On prépare les infos pour Supabase
            const { data: { session } } = await supabaseClient.auth.getSession();
            
            let clientEmail = "Invité (" + orderData.payer.email_address + ")";
            let userId = null;

            if (session) {
                clientEmail = session.user.email;
                userId = session.user.id;
            }

            let total = 0;
            panier.forEach(p => total += p.prix);

            // 3. On insère dans la base de données
            const { error } = await supabaseClient.from('commandes').insert({
                client_email: clientEmail,
                user_id: userId,
                articles: panier,
                total: total,
                statut: "Payé (ID: " + orderData.id + ")" // Preuve du paiement
            });

            // 4. Feedback utilisateur
            if (error) {
                console.error("Erreur sauvegarde Supabase :", error);
                alert("Paiement reçu, mais erreur lors de la sauvegarde de la commande. Contactez l'artisan.");
            } else {
                alert("Merci ! Votre commande a été payée et validée.");
                viderPanier(); // On vide le panier local
                document.getElementById('cart-modal').style.display = 'none'; // On ferme la fenêtre
            }
        },

        // C. GESTION DES ERREURS
        onError: function(err) {
            console.error('Erreur PayPal:', err);
            alert("Le paiement n'a pas pu aboutir. Veuillez réessayer.");
        }

    }).render('#paypal-button-container');
}