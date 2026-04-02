const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = 3001;
const BACKEND_URL = 'http://localhost:8001/api';
const sessions = new Map();
const qrCodes = new Map();
const logger = pino({ level: 'info' });
const confirmationTimers = new Map(); // Track 30-min delayed confirmations

// Ensure auth_info directory exists
const AUTH_DIR = path.join(__dirname, 'auth_info');
if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function startSession(userId) {
    if (sessions.has(userId)) {
        const existingSock = sessions.get(userId);
        if (existingSock && existingSock.user) {
            return { success: true, message: 'Session already connected' };
        }
        // Session exists but not connected - clean up stale session
        sessions.delete(userId);
        qrCodes.delete(userId);
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

        // Listen for incoming/outgoing messages to detect .appointment trigger
        sock.ev.on('messages.upsert', async (m) => {
            if (!m.messages || m.messages.length === 0) return;
            
            for (const msg of m.messages) {
                // Get message text from various message types
                const text = msg.message?.conversation 
                    || msg.message?.extendedTextMessage?.text 
                    || '';
                
                if (!text) continue;
                
                // Check for .appointment trigger (case-insensitive)
                if (text.toLowerCase().startsWith('.appointment')) {
                    const chatJid = msg.key.remoteJid;
                    // Extract phone number from JID (remove @s.whatsapp.net)
                    const chatPhone = chatJid ? chatJid.replace('@s.whatsapp.net', '').replace('@g.us', '') : '';
                    const fromMe = msg.key.fromMe || false;
                    
                    logger.info(`Appointment trigger detected from user ${userId} in chat ${chatPhone}`);
                    
                    try {
                        await axios.post(`${BACKEND_URL}/whatsapp/auto-appointment`, {
                            user_id: userId,
                            chat_phone: chatPhone,
                            message_text: text,
                            from_me: fromMe
                        });
                        logger.info(`Auto-appointment request sent for user ${userId}`);
                    } catch (error) {
                        logger.error(`Failed to create auto-appointment: ${error?.message || error}`);
                    }
                }
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
        return { success: false, message: 'Session not found. Please set up WhatsApp first.' };
    }

    if (!sock.user) {
        return { success: false, message: 'WhatsApp session is not fully connected. Please re-scan the QR code.' };
    }

    try {
        // Format phone number to international WhatsApp format
        let cleaned = phoneNumber.replace(/[^0-9+]/g, '');
        
        // Handle + prefix
        if (cleaned.startsWith('+')) {
            cleaned = cleaned.substring(1);
        }
        
        // Handle South African local numbers (starting with 0) -> add country code 27
        if (cleaned.startsWith('0') && cleaned.length === 10) {
            cleaned = '27' + cleaned.substring(1);
        }
        
        const formattedNumber = cleaned + '@s.whatsapp.net';
        
        logger.info(`Attempting to send message from ${userId} to ${formattedNumber}`);
        await sock.sendMessage(formattedNumber, { text: message });
        logger.info(`Message sent from ${userId} to ${phoneNumber}`);
        
        return { success: true, message: 'Message sent successfully' };
    } catch (error) {
        const errorMsg = error?.message || error?.toString() || 'Unknown WhatsApp send error';
        logger.error(`Error sending message from ${userId}: ${errorMsg}`);
        return { success: false, message: errorMsg };
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

// Delayed confirmation message (called by backend after 30 min)
app.post('/send-delayed-confirmation', async (req, res) => {
    const { userId, phoneNumber, message, delayMs } = req.body;
    
    if (!userId || !phoneNumber || !message) {
        return res.status(400).json({ error: 'userId, phoneNumber, and message are required' });
    }
    
    const delay = delayMs || (30 * 60 * 1000); // Default 30 minutes
    const timerId = `${userId}-${phoneNumber}-${Date.now()}`;
    
    logger.info(`Scheduling confirmation to ${phoneNumber} in ${delay/1000}s`);
    
    const timer = setTimeout(async () => {
        const result = await sendMessage(userId, phoneNumber, message);
        logger.info(`Delayed confirmation sent to ${phoneNumber}: ${result.success ? 'OK' : result.message}`);
        confirmationTimers.delete(timerId);
    }, delay);
    
    confirmationTimers.set(timerId, timer);
    
    res.json({ success: true, message: `Confirmation scheduled in ${delay/1000} seconds`, timerId });
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
