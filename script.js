// --- 1. CONFIGURATION ---
const SUPABASE_URL = 'https://yiccodvdibpwcggsptvc.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_UNoN4Gw2cqx7YTU13NkSpg_75Ec1fdJ'; // (J'ai remis ta clé publique visible plus haut)

// Initialisation de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// --- 2. GESTION DU PANIER (LOCAL) ---
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];
setTimeout(mettreAJourPanierAffichage, 500); 

function ajouterAuPanier(titre, prix) {
    panier.push({ titre: titre, prix: parseFloat(prix) });
    sauvegarderPanier();
    mettreAJourPanierAffichage();
    alert("Article ajouté au panier !");
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    if(modal) modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'block' : 'none';
}

function mettreAJourPanierAffichage() {
    const tbody = document.getElementById('cart-items');
    const totalSpan = document.getElementById('cart-total');
    const btnMain = document.getElementById('cart-btn');
    
    if(!tbody) return; // Sécurité si on n'est pas sur la page

    tbody.innerHTML = "";
    let total = 0;

    panier.forEach((item, index) => {
        total += item.prix;
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #f9f9f9;">
                <td style="padding: 8px 5px;">${item.titre}</td>
                <td style="padding: 8px 5px; text-align: right;">${item.prix}€</td>
                <td style="padding: 8px 5px; text-align: right;">
                    <button onclick="retirerDuPanier(${index})" style="color:red; border:none; background:none; cursor:pointer;">X</button>
                </td>
            </tr>`;
    });

    if(totalSpan) totalSpan.innerText = total.toFixed(2);
    if(btnMain) btnMain.innerText = `Panier (${panier.length})`;
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
    // ⚠️ REMETS TON EMAIL PAYPAL ICI
    const emailPayPal = "ton-email-paypal@gmail.com"; 
    
    let total = 0;
    panier.forEach(p => total += p.prix);
    const nomCommande = `Commande de ${panier.length} articles (Atelier)`;

    if(confirm(`Payer un total de ${total}€ via PayPal ?`)) {
        // Sauvegarde Historique
        const nouvelleCommande = {
            date: new Date().toLocaleDateString(),
            articles: panier,
            total: total
        };
        let historique = JSON.parse(localStorage.getItem('monHistorique')) || [];
        historique.push(nouvelleCommande);
        localStorage.setItem('monHistorique', JSON.stringify(historique));

        const url = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${emailPayPal}&currency_code=EUR&amount=${total}&item_name=${encodeURIComponent(nomCommande)}`;
        window.open(url, '_blank');
        
        panier = [];
        sauvegarderPanier();
        mettreAJourPanierAffichage();
        document.getElementById('cart-modal').style.display = 'none';
    }
}


// --- 3. HISTORIQUE ---
function toggleOrders() {
    const modal = document.getElementById('orders-modal');
    if(!modal) return;
    if (modal.style.display === 'none' || modal.style.display === '') {
        afficherHistorique();
        modal.style.display = 'block';
        if(document.getElementById('cart-modal')) document.getElementById('cart-modal').style.display = 'none';
        if(document.getElementById('auth-modal')) document.getElementById('auth-modal').style.display = 'none';
    } else {
        modal.style.display = 'none';
    }
}

function afficherHistorique() {
    const container = document.getElementById('orders-list');
    const historique = JSON.parse(localStorage.getItem('monHistorique')) || [];

    if(!container) return;

    if (historique.length === 0) {
        container.innerHTML = '<p>Aucune commande enregistrée.</p>';
        return;
    }
    container.innerHTML = "";
    historique.slice().reverse().forEach(cmd => {
        let details = cmd.articles.map(a => `<li>${a.titre}</li>`).join('');
        container.innerHTML += `
            <div style="background:#f9f9f9; border:1px solid #eee; padding:10px; margin-bottom:5px;">
                <strong>${cmd.date}</strong> - ${cmd.total}€
                <ul style="font-size:0.8em;">${details}</ul>
            </div>`;
    });
}


// --- 4. AUTHENTIFICATION CLIENT (SUPABASE) ---
let modeInscription = false;

function toggleAuthModal() {
    const modal = document.getElementById('auth-modal');
    if(!modal) return; // Évite le bug si la fenêtre n'est pas dans le HTML
    
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'block' : 'none';
    
    if(document.getElementById('cart-modal')) document.getElementById('cart-modal').style.display = 'none';
    if(document.getElementById('orders-modal')) document.getElementById('orders-modal').style.display = 'none';
}

function basculerModeAuth() {
    modeInscription = !modeInscription;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-action-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    
    if (modeInscription) {
        title.innerText = "Créer un compte";
        btn.innerText = "M'inscrire";
        toggleText.innerText = "Déjà un compte ?";
    } else {
        title.innerText = "Connexion";
        btn.innerText = "Se connecter";
        toggleText.innerText = "Pas encore de compte ?";
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
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) alert("Erreur : " + error.message);
        else {
            alert("Compte créé ! Vérifiez vos emails.");
            toggleAuthModal();
        }
    } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Erreur : " + error.message);
        else {
            alert("Connecté !");
            toggleAuthModal();
            verificationSession();
        }
    }
}

async function logoutClient() {
    await supabase.auth.signOut();
    alert("Déconnecté.");
    verificationSession();
    location.reload();
}

async function verificationSession() {
    // Cette fonction plante si supabase n'est pas défini plus haut
    const { data: { session } } = await supabase.auth.getSession();
    
    const loginLink = document.getElementById('login-btn-text');
    const logoutLink = document.getElementById('logout-btn');
    const mainLink = document.getElementById('auth-link');

    // On vérifie que les éléments existent avant de changer leur texte
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

    const { data: produits, error } = await supabase.from('produits').select('*');

    if (error) {
        container.innerHTML = "<p>Erreur chargement vitrine.</p>";
    } else {
        container.innerHTML = "";
        produits.forEach(prod => {
            const imageSrc = prod.image_file ? prod.image_file : 'https://via.placeholder.com/300';
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="height: 200px; overflow: hidden; background: white; border-bottom: 1px solid #eee;">
                    <img src="${imageSrc}" style="width:100%; height:100%; object-fit:cover;" 
                    onmouseover="this.style.objectFit='contain'" onmouseout="this.style.objectFit='cover'">
                </div>
                <h3>${prod.titre}</h3>
                <p>${prod.prix} €</p>
                <button onclick="ajouterAuPanier('${prod.titre}', ${prod.prix})">Ajouter au panier</button>
            `;
            container.appendChild(card);
        });
    }
}


// --- 6. FONCTIONS ADMIN ---
async function login() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: pass });
    if (error) document.getElementById('login-msg').innerText = "Erreur : " + error.message;
    else location.reload();
}

async function chargerListeAdmin() {
    const listDiv = document.getElementById('admin-product-list');
    if(!listDiv) return;
    const { data: produits } = await supabase.from('produits').select('*');
    listDiv.innerHTML = "";
    produits.forEach(prod => {
        listDiv.innerHTML += `
            <div class="product-list-item">
                <span>${prod.titre} (${prod.prix}€)</span>
                <span class="delete-btn" onclick="supprimerProduit(${prod.id})">[X] Supprimer</span>
            </div>`;
    });
}

async function ajouterProduit() {
    const titre = document.getElementById('new-titre').value;
    const prix = document.getElementById('new-prix').value;
    const img = document.getElementById('new-image').value;
    const { error } = await supabase.from('produits').insert([{ titre, prix, image_file: img }]);
    if (error) alert(error.message);
    else { chargerListeAdmin(); alert('Ajouté !'); }
}

async function supprimerProduit(id) {
    if(confirm("Supprimer ?")) {
        await supabase.from('produits').delete().eq('id', id);
        chargerListeAdmin();
    }
}


// --- 7. DÉMARRAGE ---
window.onload = function() {
    // Lancement vitrine
    if(document.getElementById('gallery-container')) chargerVitrine();
    
    // Lancement Admin
    if(document.getElementById('dashboard-section')) {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                document.getElementById('login-section').classList.add('hidden');
                document.getElementById('dashboard-section').classList.remove('hidden');
                chargerListeAdmin();
            }
        });
    }

    // Vérification Auth Client (partout)
    verificationSession();
};