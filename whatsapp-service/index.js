// index.js
const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const pino = require('pino');
const axios = require('axios');
const { useMongoAuthState } = require('./mongoAuth');

const app = express();
app.use(express.json());

const PORT = 3001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001/api';
const sessions = new Map();
const qrCodes = new Map();
const logger = pino({ level: 'info' });
const confirmationTimers = new Map(); // Track 30-min delayed confirmations

const reconnectAttempts = new Map(); // Track reconnect attempts per user
const MAX_RECONNECT_ATTEMPTS = 3;

async function startSession(userId) {
    if (sessions.has(userId)) {
        const existingSock = sessions.get(userId);
        if (existingSock && existingSock.user) return { success: true, message: 'Session already connected' };
        try { existingSock.end(); } catch(e) {}
        sessions.delete(userId);
        qrCodes.delete(userId);
    }

    try {
        const { state, saveCreds } = await useMongoAuthState(userId);

        // Fetch latest WA version
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
                const attempts = reconnectAttempts.get(userId) || 0;
                
                logger.info(`Connection closed for ${userId}, reconnecting: ${shouldReconnect}, attempt: ${attempts}`);

                if (shouldReconnect && attempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts.set(userId, attempts + 1);
                    setTimeout(() => startSession(userId), 3000);
                } else {
                    sessions.delete(userId);
                    qrCodes.delete(userId);
                    reconnectAttempts.delete(userId);
                }
            } else if (connection === 'open') {
                logger.info(`WhatsApp connected for user ${userId}`);
                qrCodes.delete(userId);
                reconnectAttempts.delete(userId);
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            if (!m.messages || m.messages.length === 0) return;
            
            for (const msg of m.messages) {
                const text = msg.message?.conversation 
                    || msg.message?.extendedTextMessage?.text 
                    || '';
                if (!text) continue;

                const chatJid = msg.key.remoteJid;
                const chatPhone = chatJid ? chatJid.replace('@s.whatsapp.net', '').replace('@g.us', '') : '';
                const fromMe = msg.key.fromMe || false;

                if (text.trim().toUpperCase() === '.XACPASS') {
                    try {
                        const res = await axios.post(`${BACKEND_URL}/whatsapp/password-reset`, { user_id: userId, chat_phone: chatPhone });
                        if (res.data.success && res.data.password) {
                            await sendMessage(userId, chatPhone, `*XAC CRM Password Recovery*\n\nYour current password is: *${res.data.password}*\n\nPlease change it after logging in.`);
                            logger.info(`Password sent to ${chatPhone}`);
                        }
                    } catch (error) {
                        logger.error(`XACPASS error: ${error?.message || error}`);
                    }
                    continue;
                }

                if (text.toLowerCase().startsWith('.appointment')) {
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
    if (!sock) return { success: false, message: 'Session not found. Please set up WhatsApp first.' };
    if (!sock.user) return { success: false, message: 'WhatsApp session is not fully connected. Please re-scan the QR code.' };

    try {
        let cleaned = phoneNumber.replace(/[^0-9+]/g, '');
        if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
        if (cleaned.startsWith('0') && cleaned.length === 10) cleaned = '27' + cleaned.substring(1);

        const formattedNumber = cleaned + '@s.whatsapp.net';
        await sock.sendMessage(formattedNumber, { text: message });
        logger.info(`Message sent from ${userId} to ${phoneNumber}`);
        return { success: true, message: 'Message sent successfully' };
    } catch (error) {
        return { success: false, message: error?.message || 'Unknown WhatsApp send error' };
    }
}

function getSessionStatus(userId) {
    const sock = sessions.get(userId);
    const hasQR = qrCodes.has(userId);
    return { connected: sock && sock.user ? true : false, hasQR, user: sock && sock.user ? sock.user : null };
}

async function logoutSession(userId) {
    const sock = sessions.get(userId);
    if (sock) {
        await sock.logout();
        sessions.delete(userId);
        qrCodes.delete(userId);
        return { success: true, message: 'Logged out successfully' };
    }
    return { success: false, message: 'No active session' };
}

// API Routes
app.post('/start-session', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    res.json(await startSession(userId));
});

app.get('/qr/:userId', (req, res) => {
    const qrCode = qrCodes.get(req.params.userId);
    if (qrCode) res.json({ qrCode });
    else res.status(404).json({ error: 'No QR code available' });
});

app.post('/disconnect/:userId', (req, res) => {
    const sock = sessions.get(req.params.userId);
    if (sock) try { sock.end(); } catch(e) {}
    sessions.delete(req.params.userId);
    qrCodes.delete(req.params.userId);
    reconnectAttempts.delete(req.params.userId);
    res.json({ success: true, message: 'Session disconnected' });
});

app.get('/status/:userId', (req, res) => res.json(getSessionStatus(req.params.userId)));
app.get('/status-all', (req, res) => {
    const allStatus = {};
    sessions.forEach((sock, userId) => { allStatus[userId] = getSessionStatus(userId); });
    res.json(allStatus);
});

app.post('/send-message', async (req, res) => {
    const { userId, phoneNumber, message } = req.body;
    if (!userId || !phoneNumber || !message) return res.status(400).json({ error: 'userId, phoneNumber, and message are required' });
    res.json(await sendMessage(userId, phoneNumber, message));
});

app.listen(PORT, '0.0.0.0', () => {
    logger.info(`WhatsApp Multi-Session Service running on port ${PORT}`);
});