export const DEEPSEEK_API_KEY = 'sk-57296132bf1f493098940ca486566929';
export const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1';

// Google Gemini API Configuration
export const GEMINI_API_KEY = 'AIzaSyCxuiKOSVG-MuDmsX6ygLTfu04QI4jz270';
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// API Configuration object - disabled (using local models only)
export const API_CONFIG = {
    BASE_URL: GEMINI_API_URL,
    API_KEY: 'your-api-key-here',
    PROVIDER: 'gemini' // 'gemini' or 'deepseek'
};