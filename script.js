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
    fermerToutesModalesSauf('cart-modal'); // Ferme les autres fenêtres
    if(modal) modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'block' : 'none';
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

function payerPanier() {
    if(panier.length === 0) {
        alert("Votre panier est vide !");
        return;
    }
    
    // ⚠️ Mettez votre vrai email PayPal ici
    const emailPayPal = "votre-email-paypal@exemple.com"; 
    
    let total = 0;
    panier.forEach(p => total += p.prix);
    const nomCommande = `Commande de ${panier.length} articles (Atelier)`;

    if(confirm(`Payer un total de ${total.toFixed(2)}€ via PayPal ?`)) {
        // Sauvegarde Historique Local
        const nouvelleCommande = {
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
            articles: panier,
            total: total.toFixed(2)
        };
        
        let historique = JSON.parse(localStorage.getItem('monHistorique')) || [];
        historique.push(nouvelleCommande);
        localStorage.setItem('monHistorique', JSON.stringify(historique));

        // Redirection PayPal
        const url = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${emailPayPal}&currency_code=EUR&amount=${total}&item_name=${encodeURIComponent(nomCommande)}`;
        window.open(url, '_blank');
        
        viderPanier(); // On vide le panier après le clic vers PayPal
        document.getElementById('cart-modal').style.display = 'none';
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
async function chargerVitrine() {
    const container = document.getElementById('gallery-container');
    if (!container) return; 

    // Sélectionne les colonnes nécessaires
    const { data: produits, error } = await supabaseClient.from('produits').select('*');

    if (error) {
        console.error(error);
        container.innerHTML = "<p>Impossible de charger la vitrine pour le moment.</p>";
    } else {
        container.innerHTML = "";
        produits.forEach(prod => {
            const imageSrc = prod.image_file ? prod.image_file : 'img/default.jpg'; // Image par défaut si vide
            
            // Création sécurisée des éléments DOM
            const card = document.createElement('div');
            card.className = 'card'; // Assurez-vous d'avoir du CSS pour .card
            card.innerHTML = `
                <div style="height: 200px; overflow: hidden; background: white; border-bottom: 1px solid #eee;">
                    <img src="${imageSrc}" alt="${prod.titre}" style="width:100%; height:100%; object-fit:cover; transition: transform 0.3s;" 
                    onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                </div>
                <h3 style="margin: 10px 0;">${prod.titre}</h3>
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

    if(!titreInput || !prixInput) return;

    const { error } = await supabaseClient.from('produits').insert([{ 
        titre: titreInput.value, 
        prix: parseFloat(prixInput.value), 
        image_file: imgInput.value 
    }]);

    if (error) alert("Erreur : " + error.message);
    else { 
        alert('Produit ajouté !'); 
        titreInput.value = ''; 
        prixInput.value = '';
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