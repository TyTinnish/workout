// auth.js - UPDATED VERSION
console.log('Loading auth.js...');

// Global auth instance
let authInstance = null;

// Wait for config and Supabase to load
function initializeAuth() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase not loaded yet');
        setTimeout(initializeAuth, 100);
        return;
    }
    
    if (!window.SUPABASE_CONFIG) {
        console.error('Config not loaded yet');
        setTimeout(initializeAuth, 100);
        return;
    }
    
    console.log('Initializing auth...');
    
    // Initialize Supabase client
    const supabaseClient = supabase.createClient(
        window.SUPABASE_CONFIG.url,
        window.SUPABASE_CONFIG.anonKey,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                storage: window.localStorage,
                detectSessionInUrl: false
            }
        }
    );
    
    class SimpleAuth {
        constructor() {
            this.supabase = supabaseClient;
            this.currentUser = null;
            this.session = null;
            this.init();
        }
        
        async init() {
            console.log('Checking for existing session...');
            
            try {
                // Check existing session
                const { data: { session }, error } = await this.supabase.auth.getSession();
                
                if (error) {
                    console.error('Session error:', error);
                    this.showAuth();
                    return;
                }
                
                if (session) {
                    console.log('Found existing session for user:', session.user.email);
                    this.session = session;
                    this.currentUser = session.user;
                    this.showApp();
                    
                    // IMPORTANT: Dispatch event immediately
                    this.dispatchAuthEvent();
                } else {
                    console.log('No session found');
                    this.showAuth();
                }
                
                // Listen for auth changes
                this.supabase.auth.onAuthStateChange((event, session) => {
                    console.log('Auth state changed:', event);
                    
                    if (session) {
                        this.session = session;
                        this.currentUser = session.user;
                        this.showApp();
                        
                        // Dispatch event on login
                        this.dispatchAuthEvent();
                        
                        if (event === 'SIGNED_IN') {
                            const name = this.currentUser.user_metadata?.name || 
                                        this.currentUser.email?.split('@')[0] || 
                                        'User';
                            this.showMessage(`Welcome back, ${name}!`, 'success', 'app');
                        }
                    } else {
                        this.session = null;
                        this.currentUser = null;
                        this.showAuth();
                        
                        if (event === 'SIGNED_OUT') {
                            this.showMessage('Logged out successfully', 'info', 'auth');
                        }
                    }
                });
                
                this.setupEventListeners();
                
            } catch (error) {
                console.error('Auth init error:', error);
                this.showAuth();
            }
        }
        
        dispatchAuthEvent() {
            // Dispatch custom event for workout tracker
            const event = new CustomEvent('authStateChanged', {
                detail: { 
                    user: this.currentUser,
                    session: this.session 
                }
            });
            document.dispatchEvent(event);
            console.log('Dispatched authStateChanged event');
        }
        
        setupEventListeners() {
            // Login form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.handleLogin();
                });
            }
            
            // Register form
            const registerForm = document.getElementById('registerForm');
            if (registerForm) {
                registerForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.handleRegister();
                });
            }
            
            // Logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    this.handleLogout();
                });
            }
            
            // Tab switching
            document.querySelectorAll('.auth-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const tabName = e.target.dataset.tab;
                    this.switchTab(tabName);
                });
            });
            
            // Switch to register
            const switchToRegister = document.querySelector('.switch-to-register');
            if (switchToRegister) {
                switchToRegister.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchTab('register');
                });
            }
            
            // Switch to login
            const switchToLogin = document.querySelector('.switch-to-login');
            if (switchToLogin) {
                switchToLogin.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchTab('login');
                });
            }
            
            console.log('Event listeners setup complete');
        }
        
        async handleLogin() {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                this.showMessage('Please fill in all fields', 'error', 'auth');
                return;
            }
            
            try {
                this.showMessage('Logging in...', 'info', 'auth');
                
                const { data, error } = await this.supabase.auth.signInWithPassword({
                    email,
                    password
                });
                
                if (error) {
                    if (error.message.includes('Invalid login credentials')) {
                        throw new Error('Invalid email or password');
                    }
                    throw error;
                }
                
                this.currentUser = data.user;
                this.session = data.session;
                
                // Clear form
                document.getElementById('loginForm').reset();
                
                this.showMessage('Login successful!', 'success', 'auth');
                
                // Dispatch event
                this.dispatchAuthEvent();
                
            } catch (error) {
                console.error('Login error:', error);
                this.showMessage(error.message || 'Login failed', 'error', 'auth');
            }
        }
        
        async handleRegister() {
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
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
            
            try {
                this.showMessage('Creating account...', 'info', 'auth');
                
                // Get current origin (where the app is hosted)
                const siteUrl = window.location.origin;
                
                const { data, error } = await this.supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { name },
                        emailRedirectTo: `${siteUrl}/`
                    }
                });
                
                if (error) {
                    if (error.message.includes('already registered')) {
                        throw new Error('Email already registered');
                    }
                    throw error;
                }
                
                // Show different message based on whether email confirmation is required
                if (data.user?.identities?.length === 0) {
                    this.showMessage('Email already registered. Please login instead.', 'error', 'auth');
                    return;
                }
                
                // Check if email confirmation is enabled
                if (data.user && data.user.identities && data.user.identities.length > 0) {
                    this.showMessage(
                        'Registration successful! Please check your email to confirm your account.',
                        'success', 
                        'auth'
                    );
                } else {
                    this.showMessage(
                        'Registration successful! You can now login.',
                        'success', 
                        'auth'
                    );
                }
                
                // Clear form and switch to login
                document.getElementById('registerForm').reset();
                setTimeout(() => this.switchTab('login'), 2000);
                
            } catch (error) {
                console.error('Registration error:', error);
                this.showMessage(error.message || 'Registration failed', 'error', 'auth');
            }
        }
        
        async handleLogout() {
            try {
                this.showMessage('Logging out...', 'info', 'app');
                await this.supabase.auth.signOut();
                this.currentUser = null;
                this.session = null;
                this.showMessage('Logged out successfully', 'info', 'auth');
            } catch (error) {
                console.error('Logout error:', error);
                this.showMessage('Logout failed', 'error', 'auth');
            }
        }
        
        switchTab(tabName) {
            // Update tabs
            document.querySelectorAll('.auth-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            
            // Update forms
            document.querySelectorAll('.auth-form').forEach(form => {
                form.classList.toggle('active', form.id === `${tabName}Form`);
            });
        }
        
        showApp() {
            console.log('Showing app UI');
            
            const authModal = document.getElementById('authModal');
            const userProfile = document.getElementById('userProfile');
            const appContainer = document.getElementById('appContainer');
            
            if (authModal) authModal.style.display = 'none';
            if (userProfile) userProfile.style.display = 'block';
            if (appContainer) appContainer.style.display = 'block';
            
            // Update user info
            if (this.currentUser) {
                const name = this.currentUser.user_metadata?.name || 
                            this.currentUser.email?.split('@')[0] || 
                            'User';
                const email = this.currentUser.email;
                
                const userNameElement = document.getElementById('userName');
                const userEmailElement = document.getElementById('userEmail');
                
                if (userNameElement) userNameElement.textContent = name;
                if (userEmailElement) userEmailElement.textContent = email;
                
                // Update avatar
                const avatar = document.querySelector('.profile-avatar');
                if (avatar) {
                    avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`;
                }
                
                console.log('Updated user info:', name, email);
            }
        }
        
        showAuth() {
            console.log('Showing auth UI');
            
            const authModal = document.getElementById('authModal');
            const userProfile = document.getElementById('userProfile');
            const appContainer = document.getElementById('appContainer');
            
            if (authModal) authModal.style.display = 'flex';
            if (userProfile) userProfile.style.display = 'none';
            if (appContainer) appContainer.style.display = 'none';
            
            // Reset forms and default to login tab
            document.getElementById('loginForm').reset();
            document.getElementById('registerForm').reset();
            this.switchTab('login');
        }
        
        showMessage(text, type, location = 'auth') {
            const container = location === 'auth' ? 
                document.querySelector('.auth-content') : 
                document.querySelector('.container');
            
            if (!container) return;
            
            // Remove existing messages
            const existing = container.querySelectorAll('.message');
            existing.forEach(msg => msg.remove());
            
            // Create message
            const message = document.createElement('div');
            message.className = `message message-${type}`;
            message.textContent = text;
            
            container.prepend(message);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 5000);
        }
        
        getCurrentUser() {
            return this.currentUser;
        }
        
        async getSession() {
            if (!this.session) {
                const { data } = await this.supabase.auth.getSession();
                this.session = data.session;
            }
            return this.session;
        }
        
        isAuthenticated() {
            return this.currentUser !== null;
        }
    }
    
    // Initialize and expose
    authInstance = new SimpleAuth();
    window.supabaseAuth = authInstance;
    window.supabaseClient = supabaseClient;
    
    console.log('✅ Auth initialized');
    
    // Check if workout tracker needs to be notified
    if (authInstance.currentUser) {
        setTimeout(() => authInstance.dispatchAuthEvent(), 100);
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}