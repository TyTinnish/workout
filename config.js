// config.js - FINAL SECURE VERSION
console.log('Loading config.js...');

// Configuration loaded securely from server or environment
const APP_CONFIG = {
    appName: 'Workout Tracker',
    version: '1.0.0',
    localStoragePrefix: 'wt_',
    // These will be loaded dynamically
    apiUrl: '',
    supabaseUrl: '',
    supabaseAnonKey: ''
};

// Try to load config from server first (most secure)
async function loadConfigFromServer() {
    try {
        const response = await fetch('http://localhost:3000/api/public-config');
        if (response.ok) {
            const serverConfig = await response.json();
            console.log('✅ Loaded config securely from server');
            window.APP_CONFIG = { ...APP_CONFIG, ...serverConfig };
            return true;
        }
    } catch (error) {
        console.log('⚠️ Server config not available:', error.message);
    }
    return false;
}

// Development fallback - SET THESE FOR LOCAL TESTING
function loadDevelopmentConfig() {
    console.log('⚠️ Using development configuration');
    window.APP_CONFIG = {
        ...APP_CONFIG,
        apiUrl: 'http://localhost:3000',
        // ⚠️ TEMPORARY: Add your Supabase credentials here for testing
        // ⚠️ REMOVE before deploying to production
        supabaseUrl: 'https://xlrobutyqqfuqujzbnvi.supabase.co',
        supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhscm9idXR5cXFmdXF1anpibnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTMyMTIsImV4cCI6MjA4MzU4OTIxMn0.6Yqb0Fdd1cFuNhrweXWELH5iwz5qh03Dw8vnRKiIyLA'
    };
}

// Main config loader
async function loadConfig() {
    console.log('🔄 Loading configuration...');
    
    // Try server first, then fallback
    const loadedFromServer = await loadConfigFromServer();
    
    if (!loadedFromServer) {
        loadDevelopmentConfig();
    }
    
    console.log('✅ Config loaded successfully');
    console.log('📡 API URL:', window.APP_CONFIG.apiUrl);
    console.log('🔗 Supabase URL:', window.APP_CONFIG.supabaseUrl ? 'Configured' : 'Not configured');
    
    // Dispatch event to let other scripts know config is ready
    document.dispatchEvent(new CustomEvent('configLoaded'));
}

// Start loading config when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfig);
} else {
    loadConfig();
}