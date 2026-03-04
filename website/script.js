// Unified Login Logic
console.log('Script.js loaded');
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    initializePasswordToggle();
    initializeForm();
});

// === PASSWORD TOGGLE ===
function initializePasswordToggle() {
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');

    console.log('Password toggle element:', passwordToggle);
    console.log('Password input element:', passwordInput);

    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            console.log('Password toggle clicked');
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';

            // Update SVG icon
            const svg = passwordToggle.querySelector('svg');
            if (svg) {
                if (isPassword) {
                    // Show eye-slash icon
                    svg.innerHTML = `
                        <path d="M1 9C1 9 4 3 9 3C14 3 17 9 17 9C17 9 14 15 9 15C4 15 1 9 1 9Z" stroke="currentColor" stroke-width="1.5" />
                        <path d="M14.85 3.15L3.15 14.85" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    `;
                } else {
                    // Show eye icon
                    svg.innerHTML = `
                        <path d="M1 9C1 9 4 3 9 3C14 3 17 9 17 9C17 9 14 15 9 15C4 15 1 9 1 9Z" stroke="currentColor" stroke-width="1.5" />
                        <circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5" />
                    `;
                }
            }
        });
    }
}

// === FORM HANDLING ===
function initializeForm() {
    const form = document.getElementById('loginForm');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });
}

// === NOTIFICATION SYSTEM ===
// Using shared showNotification from shared/utils.js

// === LOGIN LOGIC (SUPABASE AUTH) ===
async function handleLogin() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const button = document.querySelector('.submit-btn'); // Assuming class 'submit-btn'
    const originalText = button.innerHTML;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    try {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

        // 1. Authenticate with Supabase
        const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;
        if (!user) throw new Error("Login failed. No user returned.");

        // 2. Fetch User Profile & Role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, first_name, last_name')
            .eq('id', user.id)
            .single();

        // 2a. ADMIN FALLBACK (For first-time setup only)
        // If profile doesn't exist but login worked, and it's the specific admin email, create it.
        // SECURITY NOTE: In production, remove this or secure it.
        /* 
        if (profileError && profileError.code === 'PGRST116') {
             // Handle missing profile logic here if needed, or error out.
             console.warn("Profile not found. If this is the master admin, please insert profile manually or run setup.");
        }
        */

        if (profileError || !profile) {
            console.error('Profile fetch error:', profileError);
            throw new Error('User profile not found. Contact administrator.');
        }

        // 3. Store Role for Session (Optional, mostly relied on token)
        sessionStorage.setItem('userRole', profile.role);

        // 4. Redirect based on Role
        // 4. Redirect based on Role
        switch (profile.role) {
            case 'admin':
                showNotification(`Welcome back, ${profile.first_name || 'Admin'}!`, 'success');
                setTimeout(() => window.location.href = 'admin/dashboard.html', 800);
                break;
            case 'cashier':
                showNotification(`Welcome back, ${profile.first_name || 'Cashier'}!`, 'success');
                setTimeout(() => window.location.href = 'cashier/collections.html', 800);
                break;
            case 'reader':
                showNotification('Access Denied. Please use the Meter Reader Mobile App.', 'error');
                await supabase.auth.signOut();
                button.disabled = false;
                button.innerHTML = originalText;
                return;
            default:
                showNotification('Unknown role. Access denied.', 'error');
                await supabase.auth.signOut();
                button.disabled = false;
                button.innerHTML = originalText;
        }

    } catch (error) {
        console.error('Login Error:', error);
        showNotification(error.message || 'Invalid email or password', 'error');
        button.disabled = false;
        button.innerHTML = originalText;
    }
}
