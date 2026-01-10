// config.js - SIMPLIFIED VERSION
console.log('Loading config.js...');

// Hardcode your Supabase values directly here for now
const SUPABASE_CONFIG = {
    url: 'https://xlrobutyqqfuqujzbnvi.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhscm9idXR5cXFmdXF1anpibnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTMyMTIsImV4cCI6MjA4MzU4OTIxMn0.6Yqb0Fdd1cFuNhrweXWELH5iwz5qh03Dw8vnRKiIyLA'
};

const APP_CONFIG = {
    appName: 'Workout Tracker',
    version: '1.0.0',
    localStoragePrefix: 'wt_',
    apiUrl: 'http://localhost:3000'  // Backend URL
};

// Make available globally
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.APP_CONFIG = APP_CONFIG;

console.log('✅ Config loaded');
console.log('Supabase URL:', SUPABASE_CONFIG.url.substring(0, 30) + '...');
console.log('API URL:', APP_CONFIG.apiUrl);

// Dispatch event to let other scripts know config is ready
document.dispatchEvent(new CustomEvent('configLoaded'));