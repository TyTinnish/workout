// config.js - Dynamic configuration loader
let SUPABASE_CONFIG = null;
let APP_CONFIG = null;

async function loadConfig() {
    try {
        // Try to load config from the backend API
        const response = await fetch('/api/public-config');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to load config from server`);
        }
        
        const config = await response.json();
        
        SUPABASE_CONFIG = {
            url: config.supabaseUrl,
            anonKey: config.supabaseAnonKey
        };

        APP_CONFIG = {
            appName: config.appName,
            version: config.version,
            localStoragePrefix: 'wt_',
            apiUrl: config.apiUrl
        };

        // Make available globally
        window.SUPABASE_CONFIG = SUPABASE_CONFIG;
        window.APP_CONFIG = APP_CONFIG;

        console.log('✅ Configuration loaded from backend API');
        console.log('📱 App:', APP_CONFIG.appName, 'v' + APP_CONFIG.version);
        console.log('🔗 API:', APP_CONFIG.apiUrl);
        console.log('🗄️ Supabase:', SUPABASE_CONFIG.url.substring(0, 30) + '...');
        
        // Dispatch event that config is ready
        document.dispatchEvent(new CustomEvent('configLoaded'));
        
    } catch (error) {
        console.error('❌ Failed to load config from backend:', error);
        
        // Fallback to environment-based config for development
        // This allows the frontend to work even if backend isn't running
        const apiPort = window.location.hostname === 'localhost' ? '3000' : window.location.port;
        const apiUrl = window.location.protocol + '//' + window.location.hostname + ':' + apiPort + '/api';
        
        // You can set these via a simple config object or environment variables
        // For now, using hardcoded fallback (you should replace these in production)
        SUPABASE_CONFIG = {
            url: window.SUPABASE_URL || 'https://xlrobutyqqfuqujzbnvi.supabase.co',
            anonKey: window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhscm9idXR5cXFmdXF1anpibnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTMyMTIsImV4cCI6MjA4MzU4OTIxMn0.6Yqb0Fdd1cFuNhrweXWELH5iwz5qh03Dw8vnRKiIyLA'
        };

        APP_CONFIG = {
            appName: 'Workout Tracker Pro',
            version: '2.0.0',
            localStoragePrefix: 'wt_',
            apiUrl: apiUrl
        };

        window.SUPABASE_CONFIG = SUPABASE_CONFIG;
        window.APP_CONFIG = APP_CONFIG;
        
        console.warn('⚠️ Using fallback configuration');
        console.warn('💡 Make sure the backend server is running at:', apiUrl);
        console.warn('💡 For production, ensure backend is accessible');
        
        document.dispatchEvent(new CustomEvent('configLoaded'));
    }
}

// Start loading config when page loads
document.addEventListener('DOMContentLoaded', loadConfig);

// If DOM is already loaded, load config immediately
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadConfig();
}