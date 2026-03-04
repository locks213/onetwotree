// --- 1. CONFIGURATION ---
console.log("Script.js chargé");

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
async function verificationAdmin() {
    console.log("--- Démarrage vérification Admin ---");

    // 1. Est-ce qu'un utilisateur est connecté ?
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
        console.log("Pas d'utilisateur connecté. Redirection.");
        window.location.href = 'index.html'; 
        return;
    }

    console.log("Utilisateur identifié :", user.email);

    // 2. LE POINT CRUCIAL : On va lire le rôle dans la table 'profiles'
    // On demande spécifiquement la colonne 'role' pour l'ID de l'utilisateur
    const { data: profile, error: dbError } = await supabaseClient
        .from('profils')
        .select('role')
        .eq('id', user.id)
        .single();

    // S'il y a une erreur de lecture ou si le profil n'existe pas
    if (dbError) {
        console.error("Erreur lecture base de données :", dbError);
        alert("Erreur de droits. Vérifiez la console.");
        window.location.href = 'index.html';
        return;
    }

    // 3. Vérification finale
    console.log("Rôle trouvé dans la base :", profile.role);

    if (profile.role !== 'admin') {
        console.log("Accès refusé. Ce n'est pas un admin.");
        window.location.href = 'index.html'; // Ouste !
    } else {
        console.log("✅ Accès autorisé. Bienvenue Chef.");
        // Tout est bon, on reste sur la page
    }
}

// --- AJOUTER CECI DANS SCRIPT.JS (Section 1.5) ---

async function verifierAdmin() {
    // 1. Vérifier la session
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) return false; // Pas connecté -> Faux

    // 2. Vérifier le rôle dans la table profils
    const { data: profile, error } = await supabaseClient
        .from('profils')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (error || !profile) return false; // Erreur ou pas de profil -> Faux

    // 3. Renvoie VRAI si admin, sinon FAUX
    return profile.role === 'admin';
}

// --- CONFIGURATION DES FRAIS DE PORT ---
const SEUIL_GRATUITE = 60; // Livraison offerte dès 60€
const FRAIS_STANDARD = 4.90; // Prix en dessous du seuil
const FRAIS_LOURD = 8.50;    // Optionnel : si tu as des règles complexes plus tard

function calculerFraisDePort() {
    // 1. Calcul du sous-total du panier
    let sousTotal = 0;
    panier.forEach(p => sousTotal += p.prix);

    // 2. Si le panier est vide, frais = 0
    if (sousTotal === 0) return 0;

    // 3. Règle de la gratuité
    if (sousTotal >= SEUIL_GRATUITE) {
        return 0; // C'est offert !
    }

    // 4. Sinon, prix standard
    return FRAIS_STANDARD;
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
    
    // Sécurité : si le modal n'existe pas, on arrête tout de suite
    if (!modal) return;

    // 1. On ferme les autres fenêtres pour éviter le bazar
    fermerToutesModalesSauf('cart-modal');
    
    // 2. LA LOGIQUE CORRECTE (INTERRUPTEUR)
    if (modal.style.display === 'none' || modal.style.display === '') {
        // --- CAS A : Il est fermé, donc on OUVRE ---
        modal.style.display = 'block';
        
        // On lance les scripts (Mondial Relay / PayPal) avec un petit délai
        setTimeout(() => {
            const mrSection = document.getElementById('mondial-relay-section');
            if (panier.length > 0) {
                if(mrSection) mrSection.style.display = 'block';
                initialiserMondialRelay(); 
                afficherBoutonsPayPal(); 
            }
        }, 200); 

    } else {
        // --- CAS B : Il est ouvert, donc on FERME ---
        modal.style.display = 'none';
    }
}
function mettreAJourPanierAffichage() {
    const tbody = document.getElementById('cart-items');
    const totalSpan = document.getElementById('cart-total');
    const countSpan = document.getElementById('cart-count'); 
    
    if(!tbody) return; 

    tbody.innerHTML = "";
    let sousTotal = 0;

    // On génère les lignes du tableau
    panier.forEach((item, index) => {
        sousTotal += item.prix;
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #f9f9f9;">
                <td style="padding: 8px 5px;">${item.titre}</td>
                <td style="padding: 8px 5px; text-align: right;">${item.prix}€</td>
                <td style="padding: 8px 5px; text-align: right;">
                    <button onclick="retirerDuPanier(${index})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">&times;</button>
                </td>
            </tr>`;
    });

    // --- LE CALCUL DYNAMIQUE ---
    const fraisPort = calculerFraisDePort();
    const totalFinal = sousTotal + fraisPort;
    
    // Astuce visuelle : Si frais = 0, on écrit "OFFERTS" en vert
    const affichageFrais = fraisPort === 0 
        ? `<span style="color:#28a745; font-weight:bold;">OFFERTS</span>` 
        : `${fraisPort.toFixed(2)}€`;

    // Affichage des totaux détaillés
    if(totalSpan) {
        totalSpan.innerHTML = `
            <div style="font-size: 0.8em; color: #666; margin-bottom:5px;">Sous-total : ${sousTotal.toFixed(2)}€</div>
            <div style="font-size: 0.9em; color: #666; margin-bottom:5px;">
                Frais de port : ${affichageFrais}
            </div>
            <div style="margin-top: 10px; border-top: 1px solid #ccc; padding-top: 5px;">
                Total à payer : <strong style="font-size:1.2em;">${totalFinal.toFixed(2)}€</strong>
            </div>
        `;
    }
    
    // Mise à jour du petit chiffre dans le bouton
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
        const emailPayPal = "https://paypal.me/onetwotreecreation?locale.x=fr_FR&country.x=FR"; // REMETS TON EMAIL PAYPAL ICI
        const url = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${emailPayPal}&currency_code=EUR&amount=${total}&item_name=${encodeURIComponent(nomCommande)}`;
        
        // On vide le panier et on redirige
        viderPanier(); 
        document.getElementById('cart-modal').style.display = 'none';
        
        // Petite astuce : on ouvre PayPal dans le même onglet ou un nouvel onglet
        window.open(url, '_blank');
    }
}
let pointRelaisSelectionne = null;

function initialiserMondialRelay() {
    // On attend que le document (et jQuery) soit totalement prêt
    $(document).ready(function() {
        console.log("Tentative de chargement Mondial Relay...");

        if ($("#Zone_Widget").length === 0) {
            console.error("Erreur : La div #Zone_Widget n'existe pas sur cette page.");
            return;
        }

        // On vide la zone par sécurité
        $('#Zone_Widget').empty();

        // Lancement du widget
        $("#Zone_Widget").MR_ParcelShopPicker({
            Target: "#Target_PMR",
            Brand: "CC23S8XN", 
            Country: "FR",
            PostCode: "75001",
            ColLivMod: "24R",
            NbResults: "7",
            OnParcelShopSelected: function(data) {
                pointRelaisSelectionne = data;
                document.getElementById('Target_PMR').innerHTML = 
                    `<strong>Relais :</strong> ${data.Nom} (${data.Ville})`;
            }
        });
    });
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
    console.log("toggleOrders appelée");
    const modal = document.getElementById('orders-modal');
    if(!modal) {
        alert("Section historique introuvable dans le HTML.");
        return;
    }
    fermerToutesModalesSauf('orders-modal');
    
    if (modal.style.display === 'none' || modal.style.display === '') {
        console.log("Affichage de l'historique");
        afficherHistorique();
        modal.style.display = 'block';
    } else {
        modal.style.display = 'none';
    }
}

async function afficherHistorique() {
    const container = document.getElementById('orders-list');
    if(!container) return;

    // Vérifier si l'utilisateur est connecté
    const { data: { session } } = await supabaseClient.auth.getSession();
    let commandes = [];

    if (session) {
        // Récupérer les commandes depuis Supabase pour l'utilisateur connecté
        const { data, error } = await supabaseClient
            .from('commandes')
            .select('articles, total, created_at, statut')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Erreur récupération commandes:", error);
            container.innerHTML = '<p style="text-align:center; color:#777;">Erreur de chargement des commandes.</p>';
            return;
        }
        commandes = data.map(cmd => ({
            date: new Date(cmd.created_at).toLocaleDateString() + ' ' + new Date(cmd.created_at).toLocaleTimeString(),
            articles: cmd.articles,
            total: cmd.total.toFixed(2),
            statut: cmd.statut
        }));
    } else {
        // Utiliser localStorage pour les invités
        commandes = JSON.parse(localStorage.getItem('monHistorique')) || [];
    }

    if (commandes.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#777;">Aucune commande enregistrée.</p>';
        return;
    }

    container.innerHTML = "";
    commandes.forEach(cmd => {
        let details = cmd.articles.map(a => `<li>${a.titre}</li>`).join('');
        let statutInfo = cmd.statut ? `<br><small style="color:#888;">Statut: ${cmd.statut.split(' (')[0]}</small>` : '';
        container.innerHTML += `
            <div style="background:#f9f9f9; border:1px solid #eee; padding:10px; margin-bottom:10px; border-radius:4px;">
                <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:5px;">
                    <span>${cmd.date}</span>
                    <span>${cmd.total}€</span>
                </div>
                <ul style="font-size:0.85em; margin:0; padding-left:20px; color:#555;">${details}</ul>
                ${statutInfo}
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
        // Essayer de se connecter d'abord pour voir si le compte existe
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (!signInError) {
            // Compte existe et mot de passe correct
            alert("Ce compte existe déjà. Connexion réussie !");
            toggleAuthModal();
            verificationSession();
            return;
        }
        // Si connexion échoue, tenter l'inscription
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
            console.log("Erreur signUp:", error.message); // Debug
            alert("Erreur : " + error.message);
        } else {
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
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');

    if(mainLink && loginLink && logoutLink && userInfo && userEmail) {
        if (session) {
            mainLink.innerText = "Mon Compte";
            loginLink.style.display = 'none';
            logoutLink.style.display = 'block';
            userEmail.innerText = session.user.email;
            userInfo.style.display = 'block';
        } else {
            mainLink.innerText = "Mon Espace";
            loginLink.style.display = 'block';
            logoutLink.style.display = 'none';
            userInfo.style.display = 'none';
        }
    }
}


// --- 5. FONCTIONS VITRINE (ACCUEIL) ---
async function chargerVitrine(filtre = "Tout") {
    console.log("--- CHARGEMENT VITRINE ---");
    console.log("Filtre demandé :", filtre);

    const container = document.getElementById('gallery-container');
    if (!container) return; 

    // Afficher la vitrine
    container.style.display = 'grid';

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
                    <img src="${imageSrc}" alt="${prod.titre}" class="product-clickable-image" style="width:100%; height:100%; object-fit:cover; transition: transform 0.3s;" 
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

function obtenirOuCreerLightboxImage() {
    let lightbox = document.getElementById('image-lightbox');

    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'image-lightbox';
        lightbox.className = 'image-lightbox';
        lightbox.innerHTML = `
            <button type="button" class="image-lightbox-close" aria-label="Fermer">&times;</button>
            <img id="image-lightbox-img" class="image-lightbox-img" alt="Image agrandie">
        `;

        lightbox.addEventListener('click', function(event) {
            if (event.target === lightbox) {
                fermerImageAgrandie();
            }
        });

        lightbox.querySelector('.image-lightbox-close').addEventListener('click', function() {
            fermerImageAgrandie();
        });

        document.body.appendChild(lightbox);
    }

    return lightbox;
}

function ouvrirImageAgrandie(src, altText) {
    if (!src) return;

    const lightbox = obtenirOuCreerLightboxImage();
    const lightboxImage = document.getElementById('image-lightbox-img');

    lightboxImage.src = src;
    lightboxImage.alt = altText || 'Image agrandie';
    lightbox.classList.add('active');
}

function fermerImageAgrandie() {
    const lightbox = document.getElementById('image-lightbox');
    if (!lightbox) return;

    lightbox.classList.remove('active');
}

function initialiserZoomImages() {
    document.addEventListener('click', function(event) {
        const imageProduit = event.target.closest('.product-clickable-image');
        if (!imageProduit) return;

        ouvrirImageAgrandie(imageProduit.src, imageProduit.alt);
    });

    document.addEventListener('dblclick', function(event) {
        const imageTheme = event.target.closest('.theme-card img');
        if (!imageTheme) return;

        event.preventDefault();
        event.stopPropagation();
        ouvrirImageAgrandie(imageTheme.src, imageTheme.alt);
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            fermerImageAgrandie();
        }
    });
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
    // 1. Vérification Admin
    const isAdmin = await verifierAdmin();
    if (!isAdmin) {
        alert("Accès refusé.");
        return;
    }

    const titreInput = document.getElementById('new-titre');
    const prixInput = document.getElementById('new-prix');
    const catInput = document.getElementById('new-categorie');
    const fileInput = document.getElementById('image-upload'); // Le fichier

    if(!titreInput.value || !prixInput.value) {
        alert("Veuillez mettre au moins un titre et un prix.");
        return;
    }

    let imageUrl = "img/default.jpg"; // Image par défaut si rien n'est envoyé

    // 2. GESTION DE L'UPLOAD D'IMAGE
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        
        // On crée un nom de fichier unique pour éviter d'écraser une autre image
        // Ex: 1678945612-mon-image.jpg
        const fileName = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');

        // On envoie chez Supabase Storage
        const { data, error: uploadError } = await supabaseClient
            .storage
            .from('images-produits') // Le nom exact de ton bucket créé à l'étape 1
            .upload(fileName, file);

        if (uploadError) {
            console.error(uploadError);
            alert("Erreur lors de l'envoi de l'image : " + uploadError.message);
            return; // On arrête tout si l'image plante
        }

        // Si ça a marché, on récupère l'URL publique pour l'afficher sur le site
        const { data: publicUrlData } = supabaseClient
            .storage
            .from('images-produits')
            .getPublicUrl(fileName);
            
        imageUrl = publicUrlData.publicUrl;
    }

    // 3. ENREGISTREMENT DU PRODUIT (Comme avant, mais avec la nouvelle URL)
    const { error } = await supabaseClient.from('produits').insert([{ 
        titre: titreInput.value, 
        prix: parseFloat(prixInput.value), 
        image_file: imageUrl, // <-- C'est ici que l'URL générée est stockée
        categorie: catInput.value, 
    }]);

    if (error) {
        alert("Erreur base de données : " + error.message);
    } else { 
        alert('Produit mis en ligne avec succès !'); 
        
        // Remise à zéro
        titreInput.value = ''; 
        prixInput.value = '';
        fileInput.value = ''; 
        catInput.value = 'Divers';
        
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
function initialiserApplication() {
    // Créer et ajouter le logo flottant
    const logoDiv = document.createElement('div');
    logoDiv.className = 'fixed-logo';
    logoDiv.innerHTML = '<img src="img/logo.jpg" alt="Logo Atelier">';
    document.body.appendChild(logoDiv);

    // 1. Initialiser l'affichage du panier au chargement
    mettreAJourPanierAffichage();
    initialiserZoomImages();

    // 2. Lancement vitrine (si sur page d'accueil, pas sur themes.html)
    const estPageObjetPersonnalisable = window.location.pathname.includes('objetpersonnalisable.html');
    if (document.getElementById('gallery-container') && !document.querySelector('.themes-navigation') && !estPageObjetPersonnalisable) {
        chargerVitrine();
    }
    
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
}

window.addEventListener('load', initialiserApplication);

// --- 8. GESTION PAYPAL (INTELLIGENT) ---

function afficherBoutonsPayPal() {
    console.log("afficherBoutonsPayPal appelée");
    const container = document.getElementById('paypal-button-container');
    if (!container || container.innerHTML !== "") return;

    if (typeof paypal === 'undefined') {
        console.error("PayPal SDK non chargé");
        container.innerHTML = '<p style="color:red;">Erreur: PayPal non disponible.</p>';
        return;
    } 

    paypal.Buttons({
        style: { color: 'gold', shape: 'rect', label: 'pay', height: 40 },

        createOrder: function(data, actions) {
    // 1. Calcul du Sous-Total (Articles uniquement)
    let sousTotal = 0;
    panier.forEach(p => sousTotal += p.prix);

    // 2. Calcul des Frais de Port (Appel de notre cerveau)
    const fraisPort = calculerFraisDePort();
    
    // 3. Calcul du Total Réel à facturer
    const montantTotal = sousTotal + fraisPort;

    // Sécurité anti-panier vide
    if(sousTotal <= 0) {
         alert("Votre panier est vide !");
         return; 
    }

    // 4. Envoi de la facture à PayPal
    return actions.order.create({
        purchase_units: [{
            description: "Commande Atelier OneTwoTree",
            amount: { 
                // C'est ICI que l'argent change de main. 
                // On envoie le montant total (Articles + Port).
                value: montantTotal.toFixed(2) 
            }
        }]
    });
},

        onApprove: async function(data, actions) {
    console.log("Paiement approuvé. Traitement en cours...");
    
    try {
        // 1. On valide le paiement chez PayPal d'abord
        const orderData = await actions.order.capture();
        console.log('Succès PayPal:', orderData);

        // 2. On récupère les infos de l'utilisateur
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        let emailPayPal = (orderData.payer && orderData.payer.email_address) ? orderData.payer.email_address : "Email Inconnu";
        let clientEmail = session ? session.user.email : "Invité (" + emailPayPal + ")";
        let userId = session ? session.user.id : null;

        // --- CORRECTION ICI : ON RECALCULE TOUT (ARTICLES + PORT) ---
        let sousTotal = 0;
        panier.forEach(p => sousTotal += p.prix);
        
        const fraisPort = calculerFraisDePort(); // On n'oublie pas le port !
        const totalFinal = sousTotal + fraisPort; // C'est le montant réel payé

        // 3. On prépare l'info du Point Relais
        let infoRelais = null;
        if (pointRelaisSelectionne) {
            infoRelais = {
                id: pointRelaisSelectionne.ID,
                nom: pointRelaisSelectionne.Nom,
                ville: pointRelaisSelectionne.Ville,
                cp: pointRelaisSelectionne.CP
            };
        }

        // 4. On envoie le tout proprement dans Supabase
        const { error: insertError } = await supabaseClient.from('commandes').insert({
            client_email: clientEmail,
            user_id: userId,
            articles: panier,
            total: totalFinal, // On enregistre bien le TOTAL (avec port)
            statut: "Payé (ID: " + orderData.id + ")",
            point_relais: infoRelais 
        });

        if (insertError) {
            console.error("Erreur sauvegarde BDD:", insertError);
            alert("Paiement validé, mais erreur d'enregistrement commande. Contactez-nous.");
        } else {
            alert("Commande validée avec succès ! Merci.");
            
            // On vide le panier et on ferme
            viderPanier();
            document.getElementById('cart-modal').style.display = 'none';
        }

    } catch (err) {
        console.error("Erreur critique:", err);
        alert("Une erreur est survenue lors du traitement final.");
    }
},

        onError: function(err) {
            alert("Erreur PayPal globale : " + err);
        }

    }).render('#paypal-button-container');
}
// --- 9. FONCTIONS ADMIN : ONGLETS & DONNÉES ---

// A. GESTION DES ONGLETS
function switchTab(tabId) {
    // 1. Masquer tous les contenus
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // 2. Désactiver tous les boutons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // 3. Activer le bon contenu
    document.getElementById(tabId).classList.add('active');
    
    // 4. Activer le bon bouton (astuce pour retrouver le bouton cliqué)
    event.currentTarget.classList.add('active');

    // 5. Charger les données si nécessaire
    if (tabId === 'tab-commandes') chargerCommandesAdmin();
    if (tabId === 'tab-messages') chargerMessagesAdmin();
}

// B. CHARGER LES COMMANDES (Triées par date récente)
async function chargerCommandesAdmin() {
    const container = document.getElementById('admin-orders-list');
    if(!container) return;

    container.innerHTML = "<p>Chargement...</p>";

    // Vérification admin avant appel (optionnel mais propre)
    if (!await verifierAdmin()) return;

    const { data: commandes, error } = await supabaseClient
        .from('commandes')
        .select('*')
        .order('created_at', { ascending: false }); // Du plus récent au plus vieux

    if (error) {
        container.innerHTML = "<p style='color:red'>Erreur : " + error.message + "</p>";
    } else {
        container.innerHTML = "";
        if (commandes.length === 0) {
            container.innerHTML = "<p>Aucune commande pour le moment.</p>";
            return;
        }

        commandes.forEach(cmd => {
            const date = new Date(cmd.created_at).toLocaleString('fr-FR');
            
            // Gestion des couleurs de badge
            let badgeColor = '#999'; // Gris par défaut
            if(cmd.statut.includes('Payé')) badgeColor = '#28a745'; // Vert
            if(cmd.statut.includes('Expédié')) badgeColor = '#007bff'; // Bleu

            // Bouton d'action (visible seulement si pas encore expédié)
            let actionBtn = '';
            if (!cmd.statut.includes('Expédié')) {
                actionBtn = `<button onclick="marquerExpedie(${cmd.id})" style="margin-left:10px; padding:2px 8px; font-size:0.8em; background:#007bff; color:white; border:none; border-radius:3px; cursor:pointer;">📦 Marquer expédié</button>`;
            }

            let articlesHtml = "";
            if (Array.isArray(cmd.articles)) {
                articlesHtml = cmd.articles.map(a => `<li>${a.titre} (${a.prix}€)</li>`).join('');
            }

            container.innerHTML += `
                <div class="admin-card" style="border-left-color: ${badgeColor};">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>Date : ${date}</strong>
                        <div>
                            <span class="status-badge" style="background:${badgeColor}">${cmd.statut}</span>
                            ${actionBtn}
                        </div>
                    </div>
                    <p style="margin:5px 0;"><strong>Client :</strong> ${cmd.client_email}</p>
                    <p style="margin:5px 0; color:#555;"><strong>Total :</strong> ${cmd.total} €</p>
                    
                    <details style="margin-top:10px; cursor:pointer;">
                        <summary>Voir le détail des articles</summary>
                        <ul style="font-size:0.9em; padding-left:20px; color:#444;">${articlesHtml}</ul>
                    </details>
                </div>`;
        });
    }
}

// C. CHARGER LES MESSAGES (CONTACT)
async function chargerMessagesAdmin() {
    const container = document.getElementById('admin-messages-list');
    if(!container) return;

    container.innerHTML = "<p>Chargement...</p>";

    if (!await verifierAdmin()) return;

    const { data: messages, error } = await supabaseClient
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = "<p style='color:red'>Erreur : " + error.message + "</p>";
    } else {
        container.innerHTML = "";
        if (messages.length === 0) {
            container.innerHTML = "<p>Boîte de réception vide.</p>";
            return;
        }

        messages.forEach(msg => {
            const date = new Date(msg.created_at).toLocaleString('fr-FR');
            
            container.innerHTML += `
                <div class="admin-card" style="border-left-color: #007bff;">
                    <div style="display:flex; justify-content:space-between; color:#777; font-size:0.9em;">
                        <span>${date}</span>
                        <span>De : <strong>${msg.nom}</strong></span>
                    </div>
                    <h4 style="margin: 5px 0;">${msg.objet || 'Sans objet'}</h4>
                    <p style="font-style:italic; color:#555; background:#f1f1f1; padding:10px; border-radius:4px;">
                        "${msg.contenu}"
                    </p>
                    <div style="text-align:right;">
                        <a href="mailto:${msg.email}" style="text-decoration:none; color:blue; font-weight:bold;">
                            📧 Répondre (${msg.email})
                        </a>
                    </div>
                </div>`;
        });
    }
}
// --- 10. GESTION DU PROFIL CLIENT ---

// A. Ouvrir la modale et charger les données
async function ouvrirProfil() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    // Si pas connecté, on ouvre la fenêtre de connexion à la place
    if (!session) {
        toggleAuthModal();
        return;
    }

    // On ferme les autres fenêtres
    fermerToutesModalesSauf('profile-modal');
    document.getElementById('profile-modal').style.display = 'block';

    // On va chercher les infos dans la table 'profils'
    const { data: profil, error } = await supabaseClient
        .from('profils')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error) {
        console.error("Erreur chargement profil:", error);
    } else if (profil) {
        // On remplit les champs
        document.getElementById('prof-nom').value = profil.nom_complet || '';
        document.getElementById('prof-tel').value = profil.telephone || '';
        document.getElementById('prof-adresse').value = profil.adresse || '';
        document.getElementById('prof-cp').value = profil.code_postal || '';
        document.getElementById('prof-ville').value = profil.ville || '';

        
    }
chargerHistoriqueClient();    
}

// B. Sauvegarder les modifications (Version UPSERT blindée)
async function sauvegarderProfil() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    // On prépare les données
    const infoProfil = {
        id: session.user.id, // <--- TRES IMPORTANT : On force l'ID pour que l'Upsert marche
        email: session.user.email, // On remet l'email au cas où
        nom_complet: document.getElementById('prof-nom').value,
        telephone: document.getElementById('prof-tel').value,
        adresse: document.getElementById('prof-adresse').value,
        code_postal: document.getElementById('prof-cp').value,
        ville: document.getElementById('prof-ville').value,
        updated_at: new Date()
    };

    // On utilise "upsert" au lieu de "update"
    const { error } = await supabaseClient
        .from('profils')
        .upsert(infoProfil);

    if (error) {
        console.error("Erreur sauvegarde :", error);
        alert('Erreur lors de la sauvegarde : ' + error.message);
    } else {
        alert('Profil enregistré avec succès ! ✅');
        document.getElementById('profile-modal').style.display = 'none';
    }
}
async function marquerExpedie(idCommande) {
    if(!confirm("Confirmer que cette commande a été expédiée ?")) return;

    // Mise à jour dans Supabase
    const { error } = await supabaseClient
        .from('commandes')
        .update({ statut: 'Expédié 🚚' })
        .eq('id', idCommande);

    if(error) {
        alert("Erreur : " + error.message);
    } else {
        // On recharge la liste pour voir le changement (le badge deviendra bleu)
        chargerCommandesAdmin();
    }
}

// C. Charger l'historique des commandes du client
async function chargerHistoriqueClient() {
    const container = document.getElementById('client-orders-list');
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    // On cherche les commandes où l'ID utilisateur correspond à celui qui est connecté
    const { data: commandes, error } = await supabaseClient
        .from('commandes')
        .select('*')
        .eq('user_id', session.user.id) // <-- La sécurité est ici
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erreur historique:", error);
        container.innerHTML = "<p>Impossible de charger l'historique.</p>";
    } else {
        if (commandes.length === 0) {
            container.innerHTML = "<p style='text-align:center;'>Aucune commande pour le moment.</p>";
        } else {
            container.innerHTML = ""; // On vide le "Chargement..."
            
            commandes.forEach(cmd => {
                const date = new Date(cmd.created_at).toLocaleDateString('fr-FR');
                
                // Couleur du statut
                let color = "#666";
                if(cmd.statut.includes("Payé")) color = "green";
                if(cmd.statut.includes("Expédié")) color = "#007bff";

                container.innerHTML += `
                    <div style="background:white; padding:10px; margin-bottom:8px; border-radius:4px; border:1px solid #ddd; font-size:0.9em;">
                        <div style="display:flex; justify-content:space-between; font-weight:bold;">
                            <span>📅 ${date}</span>
                            <span>${cmd.total} €</span>
                        </div>
                        <div style="margin-top:5px; color:${color};">
                            Statut : ${cmd.statut}
                        </div>
                    </div>
                `;
            });
        }
    }
}

// --- BONUS : Touche "Entrée" pour se connecter ---

// On écoute le champ "Mot de passe"
const inputPassword = document.getElementById('password');
if (inputPassword) {
    inputPassword.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            // On empêche le comportement par défaut (rechargement de page)
            event.preventDefault();
            // On déclenche la connexion
            signIn();
        }
    });
}

// On écoute aussi le champ "Email" (pratique si le mot de passe est pré-rempli)
const inputEmail = document.getElementById('email');
if (inputEmail) {
    inputEmail.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            signIn();
        }
    });
}

// --- FONCTION : BANDEAU D'ANNONCE GLOBAL ---
document.addEventListener("DOMContentLoaded", function() {
    
    // Si on est sur la page Admin, on n'affiche pas le bandeau
    if (window.location.pathname.includes('admin.html')) return;

    // Le Texte
    const contenuFinal = "One Two Tree";

    // --- 2. CRÉATION DU BANDEAU (Code inchangé) ---
    const bandeau = document.createElement('div');
    
    bandeau.style.backgroundColor = "rgba(121, 70, 32, 0.73)"; 
    bandeau.style.color = "#000000";              
    bandeau.style.textAlign = "center";
    bandeau.style.padding = "10px";
    bandeau.style.fontSize = "2em";
    bandeau.style.fontWeight = "bold";
    bandeau.style.position = "relative";
    bandeau.style.zIndex = "9999";             
    bandeau.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    
    // On injecte le sandwich
    bandeau.innerHTML = contenuFinal;

    document.body.prepend(bandeau);
});

// --- GESTION DU CLIC À L'EXTÉRIEUR (VERSION ULTRA-SÉCURISÉE) ---
window.addEventListener('mousedown', function(event) {
    const modal = document.getElementById('cart-modal');
    const btn = document.getElementById('cart-btn');

    // On vérifie si le panier est affiché
    if (!modal || modal.style.display !== 'block') return;

    // Liste des classes et IDs qui appartiennent à Mondial Relay
    // On ajoute 'MR-Widget', 'leaflet', et les sélecteurs de recherche
    const isMondialRelay = event.target.closest('#Zone_Widget') || 
                           event.target.closest('.MR-Widget') || 
                           event.target.closest('.leaflet-container') ||
                           event.target.closest('.MR-Search');

    // On vérifie si on a cliqué dans le modal ou sur le bouton Panier
    const isInsideModal = modal.contains(event.target);
    const isCartBtn = btn.contains(event.target);

    // LOGIQUE : On ferme UNIQUEMENT si le clic est en dehors de TOUT
    if (!isInsideModal && !isCartBtn && !isMondialRelay) {
        console.log("Clic extérieur détecté : Fermeture du panier");
        modal.style.display = 'none';
    }
});