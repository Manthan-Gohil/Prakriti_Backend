const express = require('express');
const { authenticateDoctor } = require('../middleware/doctorAuth');
const controller = require('../controllers/doctorPortal.controller');

const router = express.Router();

// ─── PUBLIC AUTH ──────────────────────────────
router.post('/auth/login', controller.login);
router.post('/auth/register', controller.register);

// ─── PROTECTED (Doctor Auth) ─────────────────
router.get('/me', authenticateDoctor, controller.getMe);
router.get('/dashboard', authenticateDoctor, controller.dashboard);
router.put('/profile', authenticateDoctor, controller.updateProfile);

// Bookings management
router.get('/bookings', authenticateDoctor, controller.getBookings);
router.patch('/bookings/:bookingId/status', authenticateDoctor, controller.updateBookingStatus);

// Patients
router.get('/patients', authenticateDoctor, controller.getPatients);

// Slots
router.get('/slots', authenticateDoctor, controller.getSlots);
router.post('/slots', authenticateDoctor, controller.createSlots);
router.patch('/slots/:slotId', authenticateDoctor, controller.toggleSlot);
router.delete('/slots/:slotId', authenticateDoctor, controller.deleteSlot);

// Video / Meet link
router.post('/bookings/:bookingId/meet', authenticateDoctor, controller.generateMeetLink);

// Analytics
router.get('/analytics', authenticateDoctor, controller.getAnalytics);

module.exports = router;
