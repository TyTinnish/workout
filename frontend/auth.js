// Wait for config to load
document.addEventListener('configLoaded', () => {
    console.log('🔐 Starting Workout Tracker Auth...');
    
    // Check if Supabase is loaded
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase not loaded. Check script order in HTML.');
        showErrorMessage('Supabase library not loaded. Please refresh the page.');
        return;
    }
    
    // Get config from window object
    const SUPABASE_CONFIG = window.SUPABASE_CONFIG;
    const APP_CONFIG = window.APP_CONFIG;
    
    if (!SUPABASE_CONFIG || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
        console.error('❌ Supabase config not found. Check config.js');
        showErrorMessage('Configuration error. Please check console.');
        return;
    }
    
    console.log('✅ Supabase config loaded from environment');
    
    // Initialize Supabase
    const supabaseClient = supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey,
        {
            auth: {
                storageKey: 'workout-tracker-auth',
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        }
    );

    class SupabaseAuth {
        constructor() {
            this.currentUser = null;
            this.session = null;
            this.userProfile = null;
            this.supabase = supabaseClient;
            this.init();
        }
        
        async init() {
            console.log('🔐 Initializing auth...');
            
            // Setup event listeners first
            this.setupEventListeners();
            
            // Check for existing session
            try {
                const { data: { session }, error } = await this.supabase.auth.getSession();
                
                if (error) {
                    console.error('Session error:', error);
                    this.showAuth();
                    return;
                }
                
                if (session) {
                    console.log('✅ Found existing session');
                    this.session = session;
                    this.currentUser = session.user;
                    await this.loadUserProfile();
                    this.showApp();
                } else {
                    console.log('ℹ️ No session found');
                    this.showAuth();
                }
            } catch (error) {
                console.error('Init error:', error);
                this.showAuth();
            }
            
            // Listen for auth state changes
            this.supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event);
                
                if (session) {
                    this.session = session;
                    this.currentUser = session.user;
                    await this.loadUserProfile();
                    this.showApp();
                    
                    if (event === 'SIGNED_IN') {
                        const name = this.userProfile?.name || this.currentUser.email?.split('@')[0] || 'User';
                        this.showMessage(`Welcome back, ${name}!`, 'success', 'app');
                    }
                } else {
                    this.session = null;
                    this.currentUser = null;
                    this.userProfile = null;
                    this.showAuth();
                    
                    if (event === 'SIGNED_OUT') {
                        this.showMessage('Logged out successfully', 'info', 'auth');
                    }
                }
            });
        }
        
        setupEventListeners() {
            // Tab switching
            document.querySelectorAll('.auth-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const tabName = e.target.dataset.tab;
                    this.switchTab(tabName);
                });
            });
            
            // Form switching links
            const switchToRegister = document.querySelector('.switch-to-register');
            const switchToLogin = document.querySelector('.switch-to-login');
            
            if (switchToRegister) {
                switchToRegister.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchTab('register');
                });
            }
            
            if (switchToLogin) {
                switchToLogin.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchTab('login');
                });
            }
            
            // Form submissions
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleLogin();
                });
            }
            
            if (registerForm) {
                registerForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleRegister();
                });
            }
            
            // Logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    this.handleLogout();
                });
            }
            
            console.log('✅ Event listeners setup complete');
        }
        
        switchTab(tabName) {
            // Update active tab
            document.querySelectorAll('.auth-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            
            // Update active form
            document.querySelectorAll('.auth-form').forEach(form => {
                form.classList.toggle('active', form.id === `${tabName}Form`);
            });
            
            // Focus first input in active form
            setTimeout(() => {
                const activeForm = document.querySelector('.auth-form.active');
                if (activeForm) {
                    const firstInput = activeForm.querySelector('input');
                    if (firstInput) firstInput.focus();
                }
            }, 100);
        }
        
        async handleLogin() {
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            
            if (!emailInput || !passwordInput) {
                this.showMessage('Login form not found', 'error', 'auth');
                return;
            }
            
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            
            if (!email || !password) {
                this.showMessage('Please fill in all fields', 'error', 'auth');
                return;
            }
            
            try {
                this.showMessage('Logging in...', 'info', 'auth');
                this.setLoading(true, 'login');
                
                const { data, error } = await this.supabase.auth.signInWithPassword({
                    email,
                    password
                });
                
                if (error) {
                    if (error.message.includes('Invalid login credentials')) {
                        throw new Error('Invalid email or password');
                    } else if (error.message.includes('Email not confirmed')) {
                        throw new Error('Please confirm your email first');
                    } else {
                        throw error;
                    }
                }
                
                this.session = data.session;
                this.currentUser = data.user;
                await this.loadUserProfile();
                
                // Clear form
                emailInput.value = '';
                passwordInput.value = '';
                
                this.showMessage('Login successful!', 'success', 'auth');
                
            } catch (error) {
                console.error('Login error:', error);
                this.showMessage(error.message || 'Login failed. Please try again.', 'error', 'auth');
            } finally {
                this.setLoading(false, 'login');
            }
        }
        
        async handleRegister() {
            const nameInput = document.getElementById('registerName');
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');
            const confirmPasswordInput = document.getElementById('registerConfirmPassword');
            
            if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
                this.showMessage('Registration form not found', 'error', 'auth');
                return;
            }
            
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            // Validation
            if (!name || !email || !password || !confirmPassword) {
                this.showMessage('Please fill in all fields', 'error', 'auth');
                return;
            }
            
            if (password !== confirmPassword) {
                this.showMessage('Passwords do not match', 'error', 'auth');
                return;
            }
            
            if (password.length < 6) {
                this.showMessage('Password must be at least 6 characters', 'error', 'auth');
                return;
            }
            
            if (!this.isValidEmail(email)) {
                this.showMessage('Please enter a valid email address', 'error', 'auth');
                return;
            }
            
            try {
                this.showMessage('Creating account...', 'info', 'auth');
                this.setLoading(true, 'register');
                
                const { data, error } = await this.supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name: name
                        },
                        emailRedirectTo: window.location.origin
                    }
                });
                
                if (error) {
                    if (error.message.includes('already registered')) {
                        throw new Error('Email already registered. Please login instead.');
                    } else {
                        throw error;
                    }
                }
                
                if (data.user?.identities?.length === 0) {
                    this.showMessage('Email already registered. Please login instead.', 'error', 'auth');
                    return;
                }
                
                this.showMessage(
                    '🎉 Registration successful! Please check your email to confirm your account.',
                    'success', 
                    'auth'
                );
                
                // Clear form
                nameInput.value = '';
                emailInput.value = '';
                passwordInput.value = '';
                confirmPasswordInput.value = '';
                
                // Switch to login tab after a delay
                setTimeout(() => {
                    this.switchTab('login');
                }, 3000);
                
            } catch (error) {
                console.error('Registration error:', error);
                this.showMessage(error.message || 'Registration failed. Please try again.', 'error', 'auth');
            } finally {
                this.setLoading(false, 'register');
            }
        }
        
        setLoading(isLoading, formType) {
            const form = document.getElementById(`${formType}Form`);
            if (!form) return;
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const spinner = submitBtn?.querySelector('.loading-spinner');
            
            if (submitBtn && spinner) {
                submitBtn.disabled = isLoading;
                spinner.style.display = isLoading ? 'inline-block' : 'none';
            }
        }
        
        async loadUserProfile() {
            if (!this.currentUser) return;
            
            console.log('Loading profile for user:', this.currentUser.id);
            
            try {
                const { data, error } = await this.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', this.currentUser.id)
                    .single();
                
                if (error) {
                    console.log('Profile load error:', error);
                    
                    // Profile might not exist yet - try to fetch from API to trigger creation
                    if (error.code === 'PGRST116' || error.message.includes('No rows found')) {
                        console.log('Profile not found in direct query, trying API...');
                        await this.createUserProfileViaAPI();
                    } else {
                        console.warn('Profile load warning:', error.message);
                        // Try API as fallback
                        await this.createUserProfileViaAPI();
                    }
                } else {
                    this.userProfile = data;
                    console.log('Profile loaded:', data.email);
                }
            } catch (error) {
                console.error('Profile load error:', error);
                // Silently fail and try API
                await this.createUserProfileViaAPI();
            }
        }

        async createUserProfileViaAPI() {
            if (!this.currentUser || !this.session) return;
            
            try {
                console.log('Creating profile via API...');
                
                const response = await fetch(`${window.APP_CONFIG?.apiUrl || 'http://localhost:3000/api'}/profile`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const profile = await response.json();
                    this.userProfile = profile;
                    console.log('✅ Profile created via API:', profile.email);
                } else {
                    const errorData = await response.json();
                    console.error('API profile creation failed:', errorData);
                    
                    // Show user-friendly error
                    if (errorData.code === 'MISSING_TABLE') {
                        this.showMessage(
                            'Database setup required. Please contact administrator.',
                            'error',
                            'app'
                        );
                    }
                }
            } catch (error) {
                console.error('API profile creation error:', error);
            }
        }

        async createUserProfile() {
            if (!this.currentUser) return;
            
            try {
                console.log('Creating profile directly...');
                
                const { data, error } = await this.supabase
                    .from('profiles')
                    .insert([{
                        id: this.currentUser.id,
                        name: this.currentUser.user_metadata?.name || 
                            this.currentUser.email?.split('@')[0] || 
                            'User',
                        email: this.currentUser.email,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])
                    .select()
                    .single();
                
                if (error) {
                    console.error('Direct profile creation error:', error);
                    
                    // If direct creation fails, try API
                    await this.createUserProfileViaAPI();
                } else {
                    this.userProfile = data;
                    console.log('✅ Profile created directly:', data.email);
                }
            } catch (error) {
                console.error('Create profile error:', error);
                // Try API as fallback
                await this.createUserProfileViaAPI();
            }
        }
        
        async handleLogout() {
            try {
                this.showMessage('Logging out...', 'info', 'app');
                const { error } = await this.supabase.auth.signOut();
                if (error) throw error;
                
                this.session = null;
                this.currentUser = null;
                this.userProfile = null;
                
                this.showMessage('Logged out successfully', 'info', 'auth');
                
            } catch (error) {
                console.error('Logout error:', error);
                this.showMessage('Logout failed', 'error', 'auth');
            }
        }
        
        showApp() {
            const authModal = document.getElementById('authModal');
            const userProfile = document.getElementById('userProfile');
            const appContainer = document.getElementById('appContainer');
            
            if (authModal) authModal.style.display = 'none';
            if (userProfile) userProfile.style.display = 'block';
            if (appContainer) appContainer.style.display = 'block';
            
            // Update profile info
            if (this.currentUser) {
                const name = this.userProfile?.name || 
                            this.currentUser.user_metadata?.name || 
                            this.currentUser.email?.split('@')[0] || 
                            'User';
                const email = this.currentUser.email || 'user@example.com';
                
                const userNameElement = document.getElementById('userName');
                const userEmailElement = document.getElementById('userEmail');
                const avatarElement = document.querySelector('.profile-avatar');
                
                if (userNameElement) userNameElement.textContent = name;
                if (userEmailElement) userEmailElement.textContent = email;
                
                if (avatarElement) {
                    avatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&bold=true&size=128`;
                }
                
                // Trigger custom event for workout tracker
                const authEvent = new CustomEvent('authStateChanged', { 
                    detail: { 
                        user: this.currentUser,
                        profile: this.userProfile,
                        session: this.session
                    } 
                });
                document.dispatchEvent(authEvent);
            }
        }
        
        showAuth() {
            const authModal = document.getElementById('authModal');
            const userProfile = document.getElementById('userProfile');
            const appContainer = document.getElementById('appContainer');
            
            if (authModal) authModal.style.display = 'flex';
            if (userProfile) userProfile.style.display = 'none';
            if (appContainer) appContainer.style.display = 'none';
            
            // Clear forms
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            
            if (loginForm) loginForm.reset();
            if (registerForm) registerForm.reset();
            
            // Switch to login tab by default
            setTimeout(() => {
                this.switchTab('login');
            }, 100);
        }
        
        showMessage(text, type, location = 'auth') {
            // Remove any existing messages
            const selector = location === 'auth' ? '.auth-content' : '.container';
            const container = document.querySelector(selector);
            
            if (!container) return;
            
            // Remove existing messages
            const existingMessages = container.querySelectorAll('.message');
            existingMessages.forEach(msg => msg.remove());
            
            // Create message element
            const message = document.createElement('div');
            message.className = `message message-${type}`;
            message.textContent = text;
            
            // Add to container
            container.prepend(message);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 5000);
        }
        
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        getCurrentUser() {
            return this.currentUser;
        }
        
        getUserProfile() {
            return this.userProfile;
        }
        
        getSession() {
            return this.session;
        }
        
        isAuthenticated() {
            return this.currentUser !== null;
        }
        
        getAuthHeaders() {
            if (!this.session) return {};
            
            return {
                'Authorization': `Bearer ${this.session.access_token}`,
                'Content-Type': 'application/json'
            };
        }
    }

    // Initialize auth system
    window.supabaseAuth = new SupabaseAuth();
    window.supabaseClient = supabaseClient;
    
    console.log('✅ Auth system initialized');
});

// Helper function to show error message
function showErrorMessage(message) {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin: 20px;
            text-align: center;
            border: 1px solid #f5c6cb;
        `;
        errorDiv.innerHTML = `
            <strong>Error:</strong> ${message}<br>
            <small>Check browser console for details</small>
        `;
        authModal.querySelector('.auth-container').prepend(errorDiv);
    }
}