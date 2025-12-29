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
                <button onclick="acheter('${prod.titre}', ${prod.prix})">Acheter</button>
            `;
            container.appendChild(card);
        });
    }
    
    logVisitor();
}

function acheter(titre, prix) {
    alert(`Bientôt disponible : Achat de ${titre} (${prix}€)`);
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