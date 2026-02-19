const express = require('express');
const { authenticate } = require('../middleware/auth');
const doctorController = require('../controllers/doctor.controller');

const router = express.Router();

// ──── PUBLIC (no auth needed) ────────────────
// List all doctors (search, filter, sort, paginate)
router.get('/', doctorController.listDoctors);

// Get full doctor details + schedule
router.get('/bookings/my', authenticate, doctorController.getMyBookings);

// Get doctor by ID (with slots for a date)
router.get('/:id', doctorController.getDoctorById);

// Get slots for a doctor on a date
router.get('/:id/slots', doctorController.getDoctorSlots);

// ──── AUTHENTICATED ──────────────────────────
// Book a slot
router.post('/:id/book', authenticate, doctorController.bookSlot);

// Cancel a booking
router.patch('/bookings/:bookingId/cancel', authenticate, doctorController.cancelBooking);

module.exports = router;
