// Enhanced Authentication System with Backup Features
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.usersKey = 'workoutTracker_users';
        this.currentUserKey = 'workoutTracker_currentUser';
        this.backupKey = 'workoutTracker_backup';
        this.init();
    }
    
    init() {
        // Load current user from localStorage
        const savedUser = localStorage.getItem(this.currentUserKey);
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }
        
        this.setupEventListeners();
        this.checkAuthState();
        this.setupBackupReminder();
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
        document.querySelector('.switch-to-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchTab('register');
        });
        
        document.querySelector('.switch-to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchTab('login');
        });
        
        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Backup button
        document.getElementById('backupBtn')?.addEventListener('click', () => {
            this.handleBackup();
        });
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
    }
    
    handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showMessage('Please fill in all fields', 'error', 'auth');
            return;
        }
        
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === this.hashPassword(password));
        
        if (!user) {
            this.showMessage('Invalid email or password', 'error', 'auth');
            return;
        }
        
        this.loginUser(user);
    }
    
    handleRegister() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
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
        
        // Check if user already exists
        const users = this.getUsers();
        if (users.some(u => u.email === email)) {
            this.showMessage('Email already registered', 'error', 'auth');
            return;
        }
        
        // Create new user
        const newUser = {
            id: Date.now(),
            name,
            email,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString()
        };
        
        // Save user
        users.push(newUser);
        localStorage.setItem(this.usersKey, JSON.stringify(users));
        
        // Auto login
        this.loginUser(newUser);
        this.showMessage('Account created successfully!', 'success', 'auth');
    }
    
    loginUser(user) {
        this.currentUser = {
            id: user.id,
            name: user.name,
            email: user.email
        };
        
        localStorage.setItem(this.currentUserKey, JSON.stringify(this.currentUser));
        this.checkAuthState();
        this.showMessage(`Welcome back, ${user.name}!`, 'success', 'app');
        this.updateLastBackupTime();
    }
    
    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem(this.currentUserKey);
        this.checkAuthState();
        this.showMessage('Logged out successfully', 'info', 'auth');
    }
    
    handleBackup() {
        if (window.workoutTracker) {
            window.workoutTracker.exportData();
            this.updateLastBackupTime();
            this.showMessage('Backup created successfully!', 'success', 'app');
        }
    }
    
    setupBackupReminder() {
        // Check if backup is needed (older than 7 days)
        const lastBackup = localStorage.getItem(this.backupKey);
        if (lastBackup) {
            const lastBackupDate = new Date(lastBackup);
            const daysSinceBackup = Math.floor((Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysSinceBackup >= 7) {
                this.showMessage(`⚠️ It's been ${daysSinceBackup} days since your last backup. Export your data!`, 'error', 'app');
            }
        }
    }
    
    updateLastBackupTime() {
        localStorage.setItem(this.backupKey, new Date().toISOString());
    }
    
    getUsers() {
        const usersJson = localStorage.getItem(this.usersKey);
        return usersJson ? JSON.parse(usersJson) : [];
    }
    
    hashPassword(password) {
        // Simple hash for demo - IN PRODUCTION use bcrypt or similar
        return btoa(password); // Base64 encoding (NOT secure for production)
    }
    
    checkAuthState() {
        const authModal = document.getElementById('authModal');
        const userProfile = document.getElementById('userProfile');
        const appContainer = document.getElementById('appContainer');
        
        if (this.currentUser) {
            // User is logged in
            authModal.style.display = 'none';
            userProfile.style.display = 'block';
            appContainer.style.display = 'block';
            
            // Update profile info
            document.getElementById('userName').textContent = this.currentUser.name;
            document.getElementById('userEmail').textContent = this.currentUser.email;
            document.querySelector('.profile-avatar').src = 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.name)}&background=667eea&color=fff`;
            
            // Trigger custom event for workout tracker
            document.dispatchEvent(new CustomEvent('authStateChanged', { 
                detail: { user: this.currentUser } 
            }));
        } else {
            // User is not logged in
            authModal.style.display = 'flex';
            userProfile.style.display = 'none';
            appContainer.style.display = 'none';
            
            // Clear forms
            document.getElementById('loginForm')?.reset();
            document.getElementById('registerForm')?.reset();
        }
    }
    
    showMessage(text, type, location = 'auth') {
        // Remove any existing messages
        const existingMessages = document.querySelectorAll(`.${location}-message`);
        existingMessages.forEach(msg => msg.remove());
        
        // Create message element
        const message = document.createElement('div');
        message.className = `message ${location}-message message-${type}`;
        message.textContent = text;
        
        // Add to appropriate container
        let container;
        if (location === 'auth') {
            container = document.querySelector('.auth-content');
        } else {
            container = document.querySelector('.container');
        }
        
        if (container) {
            container.insertBefore(message, container.firstChild);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (message.parentNode === container) {
                    message.remove();
                }
            }, 5000);
        }
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    isAuthenticated() {
        return this.currentUser !== null;
    }
}

// Initialize auth system
window.authSystem = new AuthSystem();