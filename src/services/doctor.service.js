const prisma = require('../config/database');

class DoctorService {
    /**
     * List doctors with search, filter, and pagination.
     * Query params: search, specialty, minFee, maxFee, sortBy, order, page, limit
     */
    async listDoctors(query = {}) {
        const {
            search,
            specialty,
            minFee,
            maxFee,
            sortBy = 'rating',
            order = 'desc',
            page = 1,
            limit = 10,
        } = query;

        const where = { isAvailable: true };

        // Search by name, specialty, location, qualification
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { specialty: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } },
                { qualification: { contains: search, mode: 'insensitive' } },
                { education: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Filter by specialty (exact match, case-insensitive)
        if (specialty) {
            where.specialty = { equals: specialty, mode: 'insensitive' };
        }

        // Filter by consultation fee range
        if (minFee || maxFee) {
            where.consultationFee = {};
            if (minFee) where.consultationFee.gte = parseInt(minFee);
            if (maxFee) where.consultationFee.lte = parseInt(maxFee);
        }

        // Allowed sort fields
        const allowedSorts = ['rating', 'consultationFee', 'experienceYears', 'name', 'createdAt'];
        const sortField = allowedSorts.includes(sortBy) ? sortBy : 'rating';
        const sortOrder = order === 'asc' ? 'asc' : 'desc';

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [doctors, total] = await Promise.all([
            prisma.doctor.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    specialty: true,
                    education: true,
                    imageUrl: true,
                    consultationFee: true,
                    experienceYears: true,
                    rating: true,
                    totalRatings: true,
                    location: true,
                    languages: true,
                    gender: true,
                    isAvailable: true,
                },
                orderBy: { [sortField]: sortOrder },
                skip,
                take,
            }),
            prisma.doctor.count({ where }),
        ]);

        // Get all unique specialties for filter dropdown
        const specialties = await prisma.doctor.findMany({
            where: { isAvailable: true },
            select: { specialty: true },
            distinct: ['specialty'],
            orderBy: { specialty: 'asc' },
        });

        return {
            doctors,
            specialties: specialties.map((s) => s.specialty),
            pagination: {
                total,
                page: parseInt(page),
                limit: take,
                totalPages: Math.ceil(total / take),
            },
        };
    }

    /**
     * Get full doctor details + available slots for a date.
     */
    async getDoctorById(doctorId, dateStr) {
        const doctor = await prisma.doctor.findUnique({
            where: { id: doctorId },
            include: {
                _count: { select: { bookings: true } },
            },
        });

        if (!doctor) {
            const err = new Error('Doctor not found.');
            err.statusCode = 404;
            throw err;
        }

        // Default to today if no date provided
        const targetDate = dateStr ? new Date(dateStr) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const slots = await prisma.doctorSlot.findMany({
            where: {
                doctorId,
                slotDate: {
                    gte: targetDate,
                    lt: nextDay,
                },
                isActive: true,
            },
            orderBy: { startTime: 'asc' },
            select: {
                id: true,
                slotDate: true,
                startTime: true,
                endTime: true,
                duration: true,
                isBooked: true,
            },
        });

        // Get available dates (next 7 days with slots)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 7);

        const availableDates = await prisma.doctorSlot.findMany({
            where: {
                doctorId,
                slotDate: { gte: today, lt: weekLater },
                isActive: true,
                isBooked: false,
            },
            select: { slotDate: true },
            distinct: ['slotDate'],
            orderBy: { slotDate: 'asc' },
        });

        return {
            doctor,
            slots,
            availableDates: availableDates.map((d) => d.slotDate),
        };
    }

    /**
     * Get slots for a doctor on a specific date.
     */
    async getDoctorSlots(doctorId, dateStr) {
        const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
        if (!doctor) {
            const err = new Error('Doctor not found.');
            err.statusCode = 404;
            throw err;
        }

        const targetDate = dateStr ? new Date(dateStr) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const slots = await prisma.doctorSlot.findMany({
            where: {
                doctorId,
                slotDate: { gte: targetDate, lt: nextDay },
                isActive: true,
            },
            orderBy: { startTime: 'asc' },
            select: {
                id: true,
                slotDate: true,
                startTime: true,
                endTime: true,
                duration: true,
                isBooked: true,
            },
        });

        return { doctorId, date: targetDate, slots };
    }

    /**
     * Book a slot for the authenticated user.
     */
    async bookSlot(userId, doctorId, slotId, notes) {
        // Use a transaction to prevent double-booking
        return prisma.$transaction(async (tx) => {
            // 1. Find & lock the slot
            const slot = await tx.doctorSlot.findUnique({
                where: { id: slotId },
            });

            if (!slot) {
                const err = new Error('Slot not found.');
                err.statusCode = 404;
                throw err;
            }

            if (slot.doctorId !== doctorId) {
                const err = new Error('Slot does not belong to this doctor.');
                err.statusCode = 400;
                throw err;
            }

            if (slot.isBooked) {
                const err = new Error('This slot is already booked. Please choose another time.');
                err.statusCode = 409;
                throw err;
            }

            // Check slot is not in the past
            if (slot.startTime < new Date()) {
                const err = new Error('Cannot book a slot in the past.');
                err.statusCode = 400;
                throw err;
            }

            // 2. Check if user already has a booking with this doctor on same date
            const existingBooking = await tx.booking.findFirst({
                where: {
                    userId,
                    doctorId,
                    status: 'CONFIRMED',
                    slot: {
                        slotDate: slot.slotDate,
                    },
                },
            });

            if (existingBooking) {
                const err = new Error('You already have a booking with this doctor on this date.');
                err.statusCode = 409;
                throw err;
            }

            // 3. Mark slot as booked
            await tx.doctorSlot.update({
                where: { id: slotId },
                data: { isBooked: true },
            });

            // 4. Create booking
            const booking = await tx.booking.create({
                data: {
                    userId,
                    doctorId,
                    slotId,
                    notes: notes || null,
                    status: 'CONFIRMED',
                },
                include: {
                    doctor: {
                        select: { name: true, specialty: true, consultationFee: true },
                    },
                    slot: {
                        select: { slotDate: true, startTime: true, endTime: true },
                    },
                },
            });

            return booking;
        });
    }

    /**
     * Get all bookings for the authenticated user.
     */
    async getUserBookings(userId, status) {
        const where = { userId };
        if (status) {
            where.status = status.toUpperCase();
        }

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                doctor: {
                    select: {
                        id: true,
                        name: true,
                        specialty: true,
                        imageUrl: true,
                        consultationFee: true,
                        location: true,
                    },
                },
                slot: {
                    select: {
                        slotDate: true,
                        startTime: true,
                        endTime: true,
                        duration: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return bookings;
    }

    /**
     * Cancel a booking (only if it's CONFIRMED and belongs to the user).
     */
    async cancelBooking(userId, bookingId) {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            const err = new Error('Booking not found.');
            err.statusCode = 404;
            throw err;
        }

        if (booking.userId !== userId) {
            const err = new Error('You can only cancel your own bookings.');
            err.statusCode = 403;
            throw err;
        }

        if (booking.status !== 'CONFIRMED') {
            const err = new Error(`Cannot cancel a booking with status: ${booking.status}`);
            err.statusCode = 400;
            throw err;
        }

        // Transaction: update booking status + free the slot
        return prisma.$transaction(async (tx) => {
            const updated = await tx.booking.update({
                where: { id: bookingId },
                data: { status: 'CANCELLED' },
                include: {
                    doctor: { select: { name: true, specialty: true } },
                    slot: { select: { slotDate: true, startTime: true, endTime: true } },
                },
            });

            // Free the slot
            await tx.doctorSlot.update({
                where: { id: booking.slotId },
                data: { isBooked: false },
            });

            return updated;
        });
    }
}

module.exports = new DoctorService();
