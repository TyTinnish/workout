// auth.js - SIMPLIFIED VERSION
console.log('Loading auth.js...');

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
                autoRefreshToken: true
            }
        }
    );
    
    // Simple auth class
    class SimpleAuth {
        constructor() {
            this.supabase = supabaseClient;
            this.currentUser = null;
            this.init();
        }
        
        async init() {
            console.log('Checking for existing session...');
            
            // Check existing session
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                console.log('Found existing session');
                this.currentUser = session.user;
                this.showApp();
            } else {
                console.log('No session found');
                this.showAuth();
            }
            
            // Listen for auth changes
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event);
                
                if (session) {
                    this.currentUser = session.user;
                    this.showApp();
                } else {
                    this.currentUser = null;
                    this.showAuth();
                }
            });
            
            this.setupEventListeners();
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
            document.querySelector('.switch-to-register')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab('register');
            });
            
            // Switch to login
            document.querySelector('.switch-to-login')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab('login');
            });
        }
        
        async handleLogin() {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                this.showMessage('Please fill in all fields', 'error', 'auth');
                return;
            }
            
            try {
                const { data, error } = await this.supabase.auth.signInWithPassword({
                    email,
                    password
                });
                
                if (error) throw error;
                
                this.currentUser = data.user;
                this.showMessage('Login successful!', 'success', 'auth');
                
            } catch (error) {
                console.error('Login error:', error);
                this.showMessage(error.message, 'error', 'auth');
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
            
            try {
                const { data, error } = await this.supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { name }
                    }
                });
                
                if (error) throw error;
                
                this.showMessage('Registration successful! Please check your email.', 'success', 'auth');
                
                // Clear form and switch to login
                document.getElementById('registerForm').reset();
                setTimeout(() => this.switchTab('login'), 2000);
                
            } catch (error) {
                console.error('Registration error:', error);
                this.showMessage(error.message, 'error', 'auth');
            }
        }
        
        async handleLogout() {
            await this.supabase.auth.signOut();
            this.showMessage('Logged out successfully', 'info', 'auth');
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
            document.getElementById('authModal').style.display = 'none';
            document.getElementById('userProfile').style.display = 'block';
            document.getElementById('appContainer').style.display = 'block';
            
            // Update user info
            if (this.currentUser) {
                const name = this.currentUser.user_metadata?.name || 
                            this.currentUser.email?.split('@')[0] || 
                            'User';
                const email = this.currentUser.email;
                
                document.getElementById('userName').textContent = name;
                document.getElementById('userEmail').textContent = email;
                
                // Update avatar
                const avatar = document.querySelector('.profile-avatar');
                if (avatar) {
                    avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`;
                }
                
                // Dispatch event for workout tracker
                document.dispatchEvent(new CustomEvent('authStateChanged', {
                    detail: { user: this.currentUser }
                }));
            }
        }
        
        showAuth() {
            document.getElementById('authModal').style.display = 'flex';
            document.getElementById('userProfile').style.display = 'none';
            document.getElementById('appContainer').style.display = 'none';
            
            // Reset forms
            document.getElementById('loginForm').reset();
            document.getElementById('registerForm').reset();
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
            setTimeout(() => message.remove(), 5000);
        }
        
        getCurrentUser() {
            return this.currentUser;
        }
        
        getSession() {
            return this.supabase.auth.getSession();
        }
        
        isAuthenticated() {
            return this.currentUser !== null;
        }
    }
    
    // Initialize and expose
    window.supabaseAuth = new SimpleAuth();
    window.supabaseClient = supabaseClient;
    
    console.log('✅ Auth initialized');
}

// Start initialization
document.addEventListener('DOMContentLoaded', initializeAuth);