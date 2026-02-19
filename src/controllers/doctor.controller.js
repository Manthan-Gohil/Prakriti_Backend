const doctorService = require('../services/doctor.service');
const { successResponse } = require('../utils/helpers');

class DoctorController {
    /**
     * GET /api/doctors
     * List all doctors with search, filter, sort, pagination.
     * Query: ?search=&specialty=&minFee=&maxFee=&sortBy=&order=&page=&limit=
     */
    async listDoctors(req, res, next) {
        try {
            const result = await doctorService.listDoctors(req.query);
            return successResponse(res, 'Doctors fetched.', result);
        } catch (error) { next(error); }
    }

    /**
     * GET /api/doctors/:id
     * Get full doctor details + available slots.
     * Query: ?date=2026-02-20
     */
    async getDoctorById(req, res, next) {
        try {
            const result = await doctorService.getDoctorById(req.params.id, req.query.date);
            return successResponse(res, 'Doctor details fetched.', result);
        } catch (error) { next(error); }
    }

    /**
     * GET /api/doctors/:id/slots
     * Get slots for a doctor on a specific date.
     * Query: ?date=2026-02-20
     */
    async getDoctorSlots(req, res, next) {
        try {
            const result = await doctorService.getDoctorSlots(req.params.id, req.query.date);
            return successResponse(res, 'Slots fetched.', result);
        } catch (error) { next(error); }
    }

    /**
     * POST /api/doctors/:id/book
     * Book a slot. Body: { slotId, notes? }
     */
    async bookSlot(req, res, next) {
        try {
            const { slotId, notes } = req.body;
            if (!slotId) {
                return res.status(400).json({ success: false, message: 'slotId is required.' });
            }
            const booking = await doctorService.bookSlot(req.user.id, req.params.id, slotId, notes);
            return successResponse(res, 'Slot booked successfully!', { booking }, null, 201);
        } catch (error) { next(error); }
    }

    /**
     * GET /api/doctors/bookings/my
     * Get all bookings for the authenticated user.
     * Query: ?status=CONFIRMED
     */
    async getMyBookings(req, res, next) {
        try {
            const bookings = await doctorService.getUserBookings(req.user.id, req.query.status);
            return successResponse(res, 'Bookings fetched.', { bookings });
        } catch (error) { next(error); }
    }

    /**
     * PATCH /api/doctors/bookings/:bookingId/cancel
     * Cancel a booking.
     */
    async cancelBooking(req, res, next) {
        try {
            const booking = await doctorService.cancelBooking(req.user.id, req.params.bookingId);
            return successResponse(res, 'Booking cancelled.', { booking });
        } catch (error) { next(error); }
    }
}

module.exports = new DoctorController();
