// --- 1. CONFIGURATION ---
// Remplace par ton URL (celle qui finit par .supabase.co)
const SUPABASE_URL = 'https://yiccodvdibpwcggsptvc.supabase.co'; 

// Remplace par ta nouvelle clé (sb_publishable_...)
const SUPABASE_KEY = "sb_publishable_UNoN4Gw2cqx7YTU13NkSpg_75Ec1fdJ"; 

// Le bundle supabase charge un objet global `supabase` (lib).
// Ne pas ré-déclarer `supabase` pour éviter l'erreur "already been declared".
// On crée le client sous un autre nom local `supabaseClient`.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// --- 2. FONCTIONS PAGE D'ACCUEIL (VITRINE) ---

async function chargerVitrine() {
    const container = document.getElementById('gallery-container');
    // Sécurité : si on n'est pas sur la page d'accueil, on arrête
    if (!container) return; 

    // Récupérer les produits depuis Supabase
    const { data: produits, error } = await supabaseClient.from('produits').select('*');

    if (error) {
        console.error("Erreur chargement", error);
        container.innerHTML = "<p>Impossible de charger la vitrine. Vérifiez la console.</p>";
    } else if (produits.length === 0) {
        container.innerHTML = "<p>Aucun produit en vente pour le moment.</p>";
    } else {
        container.innerHTML = ""; // Vider le texte "Chargement..."
        produits.forEach(prod => {
            // Création de la carte HTML
            const card = document.createElement('div');
            card.className = 'card';
            // Gestion de l'image (si pas d'image, on met un gris)
            const imageSrc = prod.image_file ? prod.image_file : 'https://via.placeholder.com/300?text=Pas+d+image';
            
            card.innerHTML = `
                <img src="${imageSrc}" alt="${prod.titre}" style="width:100%; height:200px; object-fit:contain; background: #000000ff">
                <h3>${prod.titre}</h3>
                <p>${prod.prix} €</p>
                <button onclick="ajouterAuPanier('${prod.titre}', ${prod.prix})">Ajouter au panier</button>
            `;
            container.appendChild(card);
        });
    }
    
    logVisitor();
}

function acheter(titre, prix) {
    // ⚠️ REMPLACE PAR TON ADRESSE PAYPAL (Celle de ton compte)
    const emailPayPal = "onetwotree@etik.com"; 
    
    // On demande confirmation à l'utilisateur
    if(confirm(`Voulez-vous être redirigé vers PayPal pour acheter "${titre}" à ${prix}€ ?`)) {
        
        // On construit le lien de paiement sécurisé
        // cmd=_xclick : bouton acheter classique
        // business : ton email pour recevoir l'argent
        // amount : le prix
        // item_name : le nom du produit
        // currency_code : en Euros
        const url = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${emailPayPal}&currency_code=EUR&amount=${prix}&item_name=${encodeURIComponent(titre)}`;
        
        // On ouvre PayPal dans un nouvel onglet
        window.open(url, '_blank');
    }
}

async function logVisitor() {
    await supabaseClient.from('visiteurs').insert([{ page_viewed: 'Accueil', timestamp: new Date() }]);
}


// --- 3. FONCTIONS ADMIN ---

async function login() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email, password: pass });

    if (error) {
        document.getElementById('login-msg').innerText = "Erreur : " + error.message;
    } else {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        chargerListeAdmin();
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

async function ajouterProduit() {
    const titre = document.getElementById('new-titre').value;
    const prix = document.getElementById('new-prix').value;
    const img = document.getElementById('new-image').value;
    const cat = document.getElementById('new-cat').value;

    const { error } = await supabaseClient
        .from('produits')
        .insert([{ titre: titre, prix: prix, image_file: img, categorie: cat }]);

    if (error) alert('Erreur ajout: ' + error.message);
    else {
        alert('Produit ajouté !');
        chargerListeAdmin();
        document.getElementById('new-titre').value = ''; // Reset champ
    }
}

async function chargerListeAdmin() {
    const listDiv = document.getElementById('admin-product-list');
    const { data: produits } = await supabaseClient.from('produits').select('*');
    
    listDiv.innerHTML = "";
    produits.forEach(prod => {
        listDiv.innerHTML += `
            <div class="product-list-item">
                <span>${prod.titre} (${prod.prix}€)</span>
                <span class="delete-btn" onclick="supprimerProduit(${prod.id})"> [X] Supprimer</span>
            </div>
        `;
    });
}

async function supprimerProduit(id) {
    if(confirm("Vraiment supprimer ?")) {
        await supabaseClient.from('produits').delete().eq('id', id);
        chargerListeAdmin();
    }
}


// --- 4. DÉMARRAGE ---

window.onload = function() {
    // Si on est sur l'accueil
    if(document.getElementById('gallery-container')) {
        chargerVitrine();
    }
    
    // Si on est sur l'admin
    if(document.getElementById('dashboard-section')) {
        // Vérifier si déjà connecté
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                document.getElementById('login-section').classList.add('hidden');
                document.getElementById('dashboard-section').classList.remove('hidden');
                chargerListeAdmin();
            }
        });
    }
};
// --- 5. GESTION DU PANIER ---

// On charge le panier depuis la mémoire du navigateur
let panier = JSON.parse(localStorage.getItem('monPanier')) || [];
// On lance l'affichage au démarrage (s'il y a des choses en mémoire)
setTimeout(mettreAJourPanierAffichage, 500); 

function ajouterAuPanier(titre, prix) {
    panier.push({ titre: titre, prix: parseFloat(prix) });
    sauvegarderPanier();
    mettreAJourPanierAffichage();
    alert("Article ajouté au panier !");
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    // Bascule entre caché (none) et visible (block)
    modal.style.display = (modal.style.display === 'none' || modal.style.display === '') ? 'block' : 'none';
}

function mettreAJourPanierAffichage() {
    const liste = document.getElementById('cart-items');
    const totalSpan = document.getElementById('cart-total');
    const btnMain = document.getElementById('cart-btn');
    
    // Si les éléments HTML n'existent pas encore (page admin), on arrête
    if(!liste) return;

    liste.innerHTML = "";
    let total = 0;

    panier.forEach((item, index) => {
        total += item.prix;
        liste.innerHTML += `
            <li style="margin-bottom: 10px; border-bottom: 1px solid #eee;">
                ${item.titre} (${item.prix}€) 
                <button onclick="retirerDuPanier(${index})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">X</button>
            </li>`;
    });

    // On arrondit le total à 2 chiffres après la virgule
    totalSpan.innerText = total.toFixed(2);
    btnMain.innerText = `Panier (${panier.length})`;
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
        const url = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${emailPayPal}&currency_code=EUR&amount=${total}&item_name=${encodeURIComponent(nomCommande)}`;
        window.open(url, '_blank');
    }
}