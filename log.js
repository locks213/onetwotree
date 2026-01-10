console.log("Supabase client:", supabaseClient);
if (supabaseClient) {
    supabaseClient.auth.getSession().then(session => {
        console.log("Session:", session);
    }).catch(err => console.error("Erreur session:", err));
}