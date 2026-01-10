// auth.js - FINAL WORKING VERSION
console.log('Loading auth.js...');

// Global auth instance
let authInstance = null;

// Wait for config and Supabase to load
function initializeAuth() {
    console.log('🔄 Initializing authentication...');
    
    // Check for Supabase CDN
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase not loaded yet');
        setTimeout(initializeAuth, 100);
        return;
    }
    
    // Check if config is loaded
    if (!window.APP_CONFIG || !window.APP_CONFIG.apiUrl) {
        console.log('⏳ Waiting for config to load...');
        document.addEventListener('configLoaded', initializeAuth);
        return;
    }
    
    console.log('✅ Config loaded, checking Supabase credentials...');
    
    // Validate config
    if (!window.APP_CONFIG.supabaseUrl || !window.APP_CONFIG.supabaseAnonKey) {
        console.error('❌ Supabase credentials not configured');
        console.error('Please check your config.js or ensure server is running');
        
        // Show user-friendly error
        showConfigError();
        return;
    }
    
    console.log('🔐 Initializing Supabase client...');
    
    // Initialize Supabase client
    const supabaseClient = supabase.createClient(
        window.APP_CONFIG.supabaseUrl,
        window.APP_CONFIG.supabaseAnonKey,
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
            console.log('🔍 Checking for existing session...');
            
            try {
                // Check existing session
                const { data: { session }, error } = await this.supabase.auth.getSession();
                
                if (error) {
                    console.error('Session error:', error);
                    this.showAuth();
                    return;
                }
                
                if (session) {
                    console.log('✅ Found existing session for user:', session.user.email);
                    this.session = session;
                    this.currentUser = session.user;
                    this.showApp();
                    
                    // Dispatch event immediately
                    this.dispatchAuthEvent();
                } else {
                    console.log('👤 No session found, showing auth UI');
                    this.showAuth();
                }
                
                // Listen for auth changes
                this.supabase.auth.onAuthStateChange((event, session) => {
                    console.log('🔄 Auth state changed:', event);
                    
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
            console.log('📢 Dispatched authStateChanged event');
        }
        
        setupEventListeners() {
            console.log('🔗 Setting up event listeners...');
            
            // Login form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.handleLogin();
                });
                console.log('✅ Login form listener added');
            }
            
            // Register form
            const registerForm = document.getElementById('registerForm');
            if (registerForm) {
                registerForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.handleRegister();
                });
                console.log('✅ Register form listener added');
            }
            
            // Logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    this.handleLogout();
                });
                console.log('✅ Logout button listener added');
            }
            
            // Tab switching
            document.querySelectorAll('.auth-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const tabName = e.target.dataset.tab;
                    this.switchTab(tabName);
                });
            });
            console.log('✅ Tab switching listeners added');
            
            // Switch to register link
            const switchToRegister = document.querySelector('.switch-to-register');
            if (switchToRegister) {
                switchToRegister.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchTab('register');
                });
            }
            
            // Switch to login link
            const switchToLogin = document.querySelector('.switch-to-login');
            if (switchToLogin) {
                switchToLogin.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.switchTab('login');
                });
            }
            
            console.log('✅ All event listeners setup complete');
        }
        
        async handleLogin() {
            console.log('🔐 Handling login...');
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                this.showMessage('Please fill in all fields', 'error', 'auth');
                return;
            }
            
            try {
                this.showMessage('Logging in...', 'info', 'auth');
                console.log('Attempting login for:', email);
                
                const { data, error } = await this.supabase.auth.signInWithPassword({
                    email,
                    password
                });
                
                if (error) {
                    console.error('Login error:', error);
                    if (error.message.includes('Invalid login credentials')) {
                        throw new Error('Invalid email or password');
                    }
                    if (error.message.includes('Email not confirmed')) {
                        throw new Error('Please confirm your email first');
                    }
                    throw error;
                }
                
                this.currentUser = data.user;
                this.session = data.session;
                
                // Clear form
                document.getElementById('loginForm').reset();
                
                this.showMessage('Login successful!', 'success', 'auth');
                console.log('✅ Login successful for:', email);
                
                // Dispatch event
                this.dispatchAuthEvent();
                
            } catch (error) {
                console.error('Login failed:', error);
                this.showMessage(error.message || 'Login failed', 'error', 'auth');
            }
        }
        
        async handleRegister() {
            console.log('📝 Handling registration...');
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
                console.log('Attempting registration for:', email);
                
                // Get current origin
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
                    console.error('Registration error:', error);
                    if (error.message.includes('already registered')) {
                        throw new Error('Email already registered');
                    }
                    if (error.message.includes('User already registered')) {
                        throw new Error('Email already registered. Please login instead.');
                    }
                    throw error;
                }
                
                // Check registration result
                if (data.user?.identities?.length === 0) {
                    this.showMessage('Email already registered. Please login instead.', 'error', 'auth');
                    return;
                }
                
                // Show appropriate message
                if (data.user && data.user.identities && data.user.identities.length > 0) {
                    this.showMessage(
                        '✅ Registration successful! Please check your email to confirm your account.',
                        'success', 
                        'auth'
                    );
                    console.log('✅ Registration successful, email confirmation sent to:', email);
                } else {
                    this.showMessage(
                        '✅ Registration successful! You can now login.',
                        'success', 
                        'auth'
                    );
                    console.log('✅ Registration successful, no email confirmation required for:', email);
                }
                
                // Clear form and switch to login
                document.getElementById('registerForm').reset();
                setTimeout(() => this.switchTab('login'), 2000);
                
            } catch (error) {
                console.error('Registration failed:', error);
                this.showMessage(error.message || 'Registration failed', 'error', 'auth');
            }
        }
        
        async handleLogout() {
            try {
                this.showMessage('Logging out...', 'info', 'app');
                console.log('👋 Logging out user:', this.currentUser?.email);
                
                await this.supabase.auth.signOut();
                this.currentUser = null;
                this.session = null;
                
                this.showMessage('Logged out successfully', 'info', 'auth');
                console.log('✅ Logout successful');
                
            } catch (error) {
                console.error('Logout error:', error);
                this.showMessage('Logout failed', 'error', 'auth');
            }
        }
        
        switchTab(tabName) {
            console.log('🔄 Switching to tab:', tabName);
            
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
            console.log('🏋️ Showing app UI');
            
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
                
                console.log('👤 Updated user info:', name, email);
            }
        }
        
        showAuth() {
            console.log('🔐 Showing auth UI');
            
            const authModal = document.getElementById('authModal');
            const userProfile = document.getElementById('userProfile');
            const appContainer = document.getElementById('appContainer');
            
            if (authModal) authModal.style.display = 'flex';
            if (userProfile) userProfile.style.display = 'none';
            if (appContainer) appContainer.style.display = 'none';
            
            // Reset forms and default to login tab
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            
            if (loginForm) loginForm.reset();
            if (registerForm) registerForm.reset();
            
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
    
    console.log('✅ Auth system fully initialized');
    
    // Check if workout tracker needs to be notified
    if (authInstance.currentUser) {
        setTimeout(() => authInstance.dispatchAuthEvent(), 100);
    }
}

// Show config error to user
function showConfigError() {
    const authContent = document.querySelector('.auth-content');
    if (!authContent) return;
    
    // Remove existing messages
    const existing = authContent.querySelectorAll('.message');
    existing.forEach(msg => msg.remove());
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message message-error';
    errorDiv.innerHTML = `
        <strong>Configuration Error</strong><br>
        <small>Unable to connect to authentication service.</small><br>
        <small>Please ensure the backend server is running on port 3000.</small>
    `;
    
    authContent.prepend(errorDiv);
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}