const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');

const AUTH_DIR = path.join(__dirname, 'auth_info');

/**
 * File-based auth state per user session.
 * Each user gets their own subfolder under auth_info/
 */
async function useMongoAuthState(userId) {
    const userAuthDir = path.join(AUTH_DIR, userId);
    if (!fs.existsSync(userAuthDir)) {
        fs.mkdirSync(userAuthDir, { recursive: true });
    }
    return await useMultiFileAuthState(userAuthDir);
}

/**
 * Clear auth files for a specific user session.
 */
function clearAuthState(userId) {
    const userAuthDir = path.join(AUTH_DIR, userId);
    if (fs.existsSync(userAuthDir)) {
        fs.rmSync(userAuthDir, { recursive: true, force: true });
    }
}

module.exports = { useMongoAuthState, clearAuthState };
