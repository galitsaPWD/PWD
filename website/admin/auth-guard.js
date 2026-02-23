// Auth Guard for Protected Pages
(function () {
    async function checkSession() {
        if (!window.supabase) {
            console.error('Supabase client not found');
            return;
        }

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                console.log('No active session. Redirecting to login...');
                window.location.href = '../index.html';
                return;
            }

            // Verify Role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, first_name, last_name')
                .eq('id', session.user.id)
                .single();

            if (profileError || !profile || profile.role !== 'admin') {
                console.error('Unauthorized: Admin access required');

                if (profile && profile.role === 'cashier') {
                    window.location.href = '../cashier/collections.html';
                } else {
                    await supabase.auth.signOut();
                    window.location.href = '../index.html';
                }
                return;
            }

            console.log('Admin session verified:', session.user.email);
            window.authUser = session.user;
            window.userProfile = profile;
        } catch (err) {
            console.error('Auth verification failed:', err);
            window.location.href = '../index.html';
        }
    }

    // Listen for auth changes
    if (window.supabase) {
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                window.location.href = '../index.html';
            }
        });
    }

    // Run check based on readyState
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkSession);
    } else {
        checkSession();
    }
})();

