require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const profileRoutes = require('./src/routes/profile.routes');
const assessmentRoutes = require('./src/routes/assessment.routes');
const mealPlanRoutes = require('./src/routes/mealPlan.routes');
const foodRoutes = require('./src/routes/food.routes');
const foodRecognitionRoutes = require('./src/routes/foodRecognition.routes');
const trackingRoutes = require('./src/routes/tracking.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const wellnessRoutes = require('./src/routes/wellness.routes');
const n8nRoutes = require('./src/routes/n8n.routes');
const doctorRoutes = require('./src/routes/doctor.routes');
const chatbotRoutes = require('./src/routes/chatbot.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (required for Render, Railway, etc. behind reverse proxies)
app.set('trust proxy', 1);

// ──────────────────────────────────────────────
// MIDDLEWARE
// ──────────────────────────────────────────────

// Security
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { success: false, message: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth-specific stricter rate limit
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many auth attempts. Please try again later.' },
});
app.use('/api/auth/', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ──────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
    res.json({
        success: true,
        message: '🌿 Prakriti AI API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/food-recognition', foodRecognitionRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/n8n', n8nRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/chatbot', chatbotRoutes);

// ──────────────────────────────────────────────
// ERROR HANDLING
// ──────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ──────────────────────────────────────────────
// START SERVER
// ──────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🌿 ═══════════════════════════════════════════`);
    console.log(`   Prakriti AI Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API Base: http://localhost:${PORT}/api`);
    console.log(`🌿 ═══════════════════════════════════════════\n`);
});

module.exports = app;
