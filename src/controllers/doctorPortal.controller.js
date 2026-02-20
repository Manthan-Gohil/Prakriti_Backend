const doctorPortalService = require('../services/doctorPortal.service');
const { successResponse, errorResponse } = require('../utils/helpers');

class DoctorPortalController {
    // ─── AUTH ─────────────────────────────────────
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return errorResponse(res, 'Email and password are required.', 400);
            }
            const result = await doctorPortalService.doctorLogin(email, password);
            return successResponse(res, 'Login successful.', result);
        } catch (error) { next(error); }
    }

    async register(req, res, next) {
        try {
            const { email, password, name, specialty } = req.body;
            if (!email || !password) {
                return errorResponse(res, 'Email and password are required.', 400);
            }
            const result = await doctorPortalService.doctorRegister(email, password, name, specialty);
            return successResponse(res, 'Portal account created.', result, null, 201);
        } catch (error) { next(error); }
    }

    async getMe(req, res, next) {
        try {
            const result = await doctorPortalService.getDashboard(req.doctor.id);
            return successResponse(res, 'Doctor profile fetched.', { doctor: result.doctor });
        } catch (error) { next(error); }
    }

    // ─── DASHBOARD ────────────────────────────────
    async dashboard(req, res, next) {
        try {
            const result = await doctorPortalService.getDashboard(req.doctor.id);
            return successResponse(res, 'Dashboard loaded.', result);
        } catch (error) { next(error); }
    }

    // ─── BOOKINGS ─────────────────────────────────
    async getBookings(req, res, next) {
        try {
            const result = await doctorPortalService.getDoctorBookings(req.doctor.id, req.query);
            return successResponse(res, 'Bookings fetched.', result);
        } catch (error) { next(error); }
    }

    async updateBookingStatus(req, res, next) {
        try {
            const { status } = req.body;
            if (!status) return errorResponse(res, 'Status is required.', 400);
            const booking = await doctorPortalService.updateBookingStatus(
                req.doctor.id, req.params.bookingId, status.toUpperCase()
            );
            return successResponse(res, 'Booking status updated.', { booking });
        } catch (error) { next(error); }
    }

    // ─── PATIENTS ─────────────────────────────────
    async getPatients(req, res, next) {
        try {
            const result = await doctorPortalService.getDoctorPatients(req.doctor.id, req.query);
            return successResponse(res, 'Patients fetched.', result);
        } catch (error) { next(error); }
    }

    // ─── SLOTS ────────────────────────────────────
    async getSlots(req, res, next) {
        try {
            const result = await doctorPortalService.getSlots(req.doctor.id, req.query.date);
            return successResponse(res, 'Slots fetched.', result);
        } catch (error) { next(error); }
    }

    async createSlots(req, res, next) {
        try {
            const { date, dates, startHour, endHour, duration } = req.body;
            if (!startHour || !endHour) {
                return errorResponse(res, 'startHour and endHour are required.', 400);
            }
            let result;
            if (dates && Array.isArray(dates)) {
                result = await doctorPortalService.createBulkSlots(
                    req.doctor.id, dates, parseInt(startHour), parseInt(endHour), parseInt(duration) || 30
                );
            } else if (date) {
                result = await doctorPortalService.createSlots(
                    req.doctor.id, date, parseInt(startHour), parseInt(endHour), parseInt(duration) || 30
                );
            } else {
                return errorResponse(res, 'date or dates[] is required.', 400);
            }
            return successResponse(res, 'Slots created.', result, null, 201);
        } catch (error) { next(error); }
    }

    async toggleSlot(req, res, next) {
        try {
            const { isActive } = req.body;
            const slot = await doctorPortalService.toggleSlot(
                req.doctor.id, req.params.slotId, isActive
            );
            return successResponse(res, 'Slot updated.', { slot });
        } catch (error) { next(error); }
    }

    async deleteSlot(req, res, next) {
        try {
            await doctorPortalService.deleteSlot(req.doctor.id, req.params.slotId);
            return successResponse(res, 'Slot deleted.');
        } catch (error) { next(error); }
    }

    // ─── MEET LINK ────────────────────────────────
    async generateMeetLink(req, res, next) {
        try {
            const result = await doctorPortalService.generateMeetLink(
                req.doctor.id, req.params.bookingId
            );
            return successResponse(res, 'Meet link generated.', result);
        } catch (error) { next(error); }
    }

    // ─── ANALYTICS ────────────────────────────────
    async getAnalytics(req, res, next) {
        try {
            const result = await doctorPortalService.getAnalytics(
                req.doctor.id, req.query.range || '30d'
            );
            return successResponse(res, 'Analytics fetched.', result);
        } catch (error) { next(error); }
    }

    // ─── PROFILE ──────────────────────────────────
    async updateProfile(req, res, next) {
        try {
            const doctor = await doctorPortalService.updateProfile(req.doctor.id, req.body);
            return successResponse(res, 'Profile updated.', { doctor });
        } catch (error) { next(error); }
    }
}

module.exports = new DoctorPortalController();
