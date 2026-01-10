// config.js - UPDATED SECURE VERSION
console.log('Loading config.js...');

// Configuration loaded from environment or default values
// Supabase config will be loaded from environment variables at runtime
// or from server endpoint for security

const APP_CONFIG = {
    appName: 'Workout Tracker',
    version: '1.0.0',
    localStoragePrefix: 'wt_',
    // This will be set when we load config from server
    apiUrl: '',
    supabaseUrl: '',
    supabaseAnonKey: ''
};

// Initialize with empty values for now
window.APP_CONFIG = APP_CONFIG;

// Function to load config securely from server
async function loadConfig() {
    try {
        // Try to load config from server first (more secure)
        const response = await fetch('/api/public-config');
        if (response.ok) {
            const serverConfig = await response.json();
            console.log('Loaded config from server:', serverConfig);
            
            // Merge server config with defaults
            window.APP_CONFIG = {
                ...APP_CONFIG,
                ...serverConfig
            };
        } else {
            // Fallback to direct Supabase config (less secure)
            console.warn('Server config not available, using fallback');
            window.APP_CONFIG = {
                ...APP_CONFIG,
                apiUrl: 'http://localhost:3000',
                // In production, these should come from environment variables
                // or be loaded from a secure endpoint
                supabaseUrl: '',
                supabaseAnonKey: ''
            };
        }
    } catch (error) {
        console.error('Failed to load config:', error);
        // Fallback for development
        window.APP_CONFIG = {
            ...APP_CONFIG,
            apiUrl: 'http://localhost:3000'
        };
    }
    
    console.log('✅ Config loaded');
    console.log('API URL:', window.APP_CONFIG.apiUrl);
    
    // Dispatch event to let other scripts know config is ready
    document.dispatchEvent(new CustomEvent('configLoaded'));
}

// Start loading config when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfig);
} else {
    loadConfig();
}