/**
 * Application Configuration
 */

export const APP_CONFIG = {
    // API Configuration
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "",

    // Business Rules
    AUTO_APPROVAL_THRESHOLD: 10000,
    APPROVER_ROLES: ['Manager', 'Finance', 'Procurement'],

    // UI/UX Constants
    MIN_CLASSIFY_LENGTH: 3,
    DEBOUNCE_DELAY_MS: 800,
    
    // Formatting
    CURRENCY_LOCALE: 'en-IN',
    CURRENCY_SYMBOL: '₹'
};
