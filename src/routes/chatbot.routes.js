const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// The chatbot FastAPI service URL — set via env var on Render
const CHATBOT_SERVICE_URL = process.env.CHATBOT_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/chatbot/chat
 * Proxies the request to the FastAPI Dietician Chatbot service
 */
router.post('/chat', authenticate, async (req, res, next) => {
    try {
        const { dosha, message } = req.body;

        if (!dosha || !message) {
            return res.status(400).json({
                success: false,
                message: 'dosha and message are required',
            });
        }

        const userId = req.user.id || req.user.userId;

        // Dynamic import of node's native fetch (available in Node 18+)
        const response = await fetch(`${CHATBOT_SERVICE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: String(userId),
                dosha,
                message,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Chatbot service error:', response.status, errorText);
            return res.status(502).json({
                success: false,
                message: 'Chatbot service unavailable',
            });
        }

        const data = await response.json();

        return res.json({
            success: true,
            data: {
                response: data.response,
            },
        });
    } catch (error) {
        console.error('Chatbot proxy error:', error.message);

        // If the chatbot service is down entirely
        if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Chatbot service is not running',
            });
        }

        next(error);
    }
});

/**
 * GET /api/chatbot/health
 * Check if the chatbot microservice is alive
 */
router.get('/health', async (_req, res) => {
    try {
        const response = await fetch(`${CHATBOT_SERVICE_URL}/health`);
        const data = await response.json();
        return res.json({ success: true, data });
    } catch {
        return res.status(503).json({
            success: false,
            message: 'Chatbot service is not running',
        });
    }
});

module.exports = router;
