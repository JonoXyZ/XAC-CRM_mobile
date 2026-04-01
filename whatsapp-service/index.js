const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = 3001;
const sessions = new Map();
const qrCodes = new Map();
const logger = pino({ level: 'info' });

// Ensure auth_info directory exists
const AUTH_DIR = path.join(__dirname, 'auth_info');
if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function startSession(userId) {
    if (sessions.has(userId)) {
        return { success: false, message: 'Session already running' };
    }

    try {
        const authPath = path.join(AUTH_DIR, userId);
        if (!fs.existsSync(authPath)) {
            fs.mkdirSync(authPath, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ['XAC CRM', 'Chrome', '120.0.0']
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    const qrCodeDataURL = await QRCode.toDataURL(qr);
                    qrCodes.set(userId, qrCodeDataURL);
                    logger.info(`QR Code generated for user ${userId}`);
                } catch (err) {
                    logger.error(`QR Code generation error for ${userId}:`, err);
                }
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.info(`Connection closed for ${userId}, reconnecting: ${shouldReconnect}`);

                if (shouldReconnect) {
                    setTimeout(() => startSession(userId), 3000);
                } else {
                    sessions.delete(userId);
                    qrCodes.delete(userId);
                }
            } else if (connection === 'open') {
                logger.info(`WhatsApp connected for user ${userId}`);
                qrCodes.delete(userId);
            }
        });

        sessions.set(userId, sock);
        return { success: true, message: 'Session started' };
    } catch (error) {
        logger.error(`Error starting session for ${userId}:`, error);
        return { success: false, message: error.message };
    }
}

async function sendMessage(userId, phoneNumber, message) {
    const sock = sessions.get(userId);
    
    if (!sock) {
        return { success: false, message: 'Session not found or not connected' };
    }

    try {
        // Format phone number (remove + and spaces, add @s.whatsapp.net)
        const formattedNumber = phoneNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        
        await sock.sendMessage(formattedNumber, { text: message });
        logger.info(`Message sent from ${userId} to ${phoneNumber}`);
        
        return { success: true, message: 'Message sent successfully' };
    } catch (error) {
        logger.error(`Error sending message from ${userId}:`, error);
        return { success: false, message: error.message };
    }
}

function getSessionStatus(userId) {
    const sock = sessions.get(userId);
    const hasQR = qrCodes.has(userId);
    
    return {
        connected: sock && sock.user ? true : false,
        hasQR: hasQR,
        user: sock && sock.user ? sock.user : null
    };
}

async function logoutSession(userId) {
    const sock = sessions.get(userId);
    
    if (sock) {
        await sock.logout();
        sessions.delete(userId);
        qrCodes.delete(userId);
        
        // Delete auth files
        const authPath = path.join(AUTH_DIR, userId);
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
        }
        
        return { success: true, message: 'Logged out successfully' };
    }
    
    return { success: false, message: 'No active session' };
}

// API Routes
app.post('/start-session', async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    
    const result = await startSession(userId);
    res.json(result);
});

app.get('/qr/:userId', (req, res) => {
    const { userId } = req.params;
    const qrCode = qrCodes.get(userId);
    
    if (qrCode) {
        res.json({ qrCode });
    } else {
        res.status(404).json({ error: 'No QR code available' });
    }
});

app.get('/status/:userId', (req, res) => {
    const { userId } = req.params;
    const status = getSessionStatus(userId);
    res.json(status);
});

app.get('/status-all', (req, res) => {
    const allStatus = {};
    sessions.forEach((sock, userId) => {
        allStatus[userId] = getSessionStatus(userId);
    });
    res.json(allStatus);
});

app.post('/send-message', async (req, res) => {
    const { userId, phoneNumber, message } = req.body;
    
    if (!userId || !phoneNumber || !message) {
        return res.status(400).json({ error: 'userId, phoneNumber, and message are required' });
    }
    
    const result = await sendMessage(userId, phoneNumber, message);
    res.json(result);
});

app.post('/logout', async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    
    const result = await logoutSession(userId);
    res.json(result);
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        activeSessions: sessions.size,
        timestamp: new Date().toISOString()
    });
});

// Auto-start sessions for existing auth files on startup
const existingAuthDirs = fs.readdirSync(AUTH_DIR).filter(dir => {
    const dirPath = path.join(AUTH_DIR, dir);
    return fs.statSync(dirPath).isDirectory();
});

if (existingAuthDirs.length > 0) {
    logger.info(`Found ${existingAuthDirs.length} existing sessions, starting...`);
    existingAuthDirs.forEach(userId => {
        setTimeout(() => startSession(userId), 2000);
    });
}

app.listen(PORT, '0.0.0.0', () => {
    logger.info(`WhatsApp Multi-Session Service running on port ${PORT}`);
});
