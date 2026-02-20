const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class DoctorPortalService {
    // ─── AUTH ────────────────────────────────────
    async doctorLogin(email, password) {
        const doctor = await prisma.doctor.findUnique({ where: { email } });
        if (!doctor) {
            const err = new Error('Invalid email or password.');
            err.statusCode = 401;
            throw err;
        }
        if (!doctor.passwordHash) {
            const err = new Error('Doctor portal not set up. Please register first.');
            err.statusCode = 401;
            throw err;
        }
        const valid = await bcrypt.compare(password, doctor.passwordHash);
        if (!valid) {
            const err = new Error('Invalid email or password.');
            err.statusCode = 401;
            throw err;
        }
        await prisma.doctor.update({
            where: { id: doctor.id },
            data: { lastLoginAt: new Date(), isPortalActive: true },
        });
        const token = jwt.sign(
            { doctorId: doctor.id, role: 'doctor' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        return {
            token,
            doctor: {
                id: doctor.id,
                name: doctor.name,
                email: doctor.email,
                specialty: doctor.specialty,
                imageUrl: doctor.imageUrl,
            },
        };
    }

    async doctorRegister(email, password, name, specialty) {
        const existing = await prisma.doctor.findUnique({ where: { email } });

        let doctor;
        const passwordHash = await bcrypt.hash(password, 12);

        if (existing) {
            // Existing doctor row — just set up portal credentials
            if (existing.passwordHash) {
                const err = new Error('Portal account already exists. Please login.');
                err.statusCode = 409;
                throw err;
            }
            doctor = await prisma.doctor.update({
                where: { email },
                data: { passwordHash, isPortalActive: true, lastLoginAt: new Date() },
            });
        } else {
            // Brand-new doctor — create the record
            if (!name || !specialty) {
                const err = new Error('Name and specialty are required for new registration.');
                err.statusCode = 400;
                throw err;
            }
            doctor = await prisma.doctor.create({
                data: {
                    email,
                    name,
                    specialty,
                    passwordHash,
                    isPortalActive: true,
                    lastLoginAt: new Date(),
                },
            });
        }

        const token = jwt.sign(
            { doctorId: doctor.id, role: 'doctor' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        return {
            token,
            doctor: {
                id: doctor.id,
                name: doctor.name,
                email: doctor.email,
                specialty: doctor.specialty,
                imageUrl: doctor.imageUrl,
            },
        };
    }

    // ─── DASHBOARD ───────────────────────────────
    async getDashboard(doctorId) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(today);
        monthStart.setDate(monthStart.getDate() - 30);

        const [
            doctor,
            todayBookings,
            todaySlots,
            weekBookings,
            monthBookings,
            totalBookings,
            cancelledBookings,
            completedBookings,
            upcomingBookings,
        ] = await Promise.all([
            prisma.doctor.findUnique({
                where: { id: doctorId },
                select: {
                    id: true, name: true, email: true, specialty: true, imageUrl: true,
                    consultationFee: true, experienceYears: true, rating: true,
                    totalRatings: true, location: true, languages: true, bio: true,
                    education: true, qualification: true, gender: true, phone: true,
                    isAvailable: true, lastLoginAt: true,
                },
            }),
            prisma.booking.count({
                where: {
                    doctorId,
                    status: 'CONFIRMED',
                    slot: { slotDate: { gte: today, lt: tomorrow } },
                },
            }),
            prisma.doctorSlot.count({
                where: { doctorId, slotDate: { gte: today, lt: tomorrow }, isActive: true },
            }),
            prisma.booking.count({
                where: {
                    doctorId,
                    createdAt: { gte: weekStart },
                    status: { in: ['CONFIRMED', 'COMPLETED'] },
                },
            }),
            prisma.booking.count({
                where: {
                    doctorId,
                    createdAt: { gte: monthStart },
                    status: { in: ['CONFIRMED', 'COMPLETED'] },
                },
            }),
            prisma.booking.count({ where: { doctorId } }),
            prisma.booking.count({ where: { doctorId, status: 'CANCELLED' } }),
            prisma.booking.count({ where: { doctorId, status: 'COMPLETED' } }),
            prisma.booking.findMany({
                where: {
                    doctorId,
                    status: 'CONFIRMED',
                    slot: { startTime: { gte: new Date() } },
                },
                include: {
                    user: { select: { id: true, username: true, email: true } },
                    slot: { select: { slotDate: true, startTime: true, endTime: true } },
                },
                orderBy: { slot: { startTime: 'asc' } },
                take: 5,
            }),
        ]);

        // Revenue calc
        const fee = doctor?.consultationFee || 0;
        const weekRevenue = weekBookings * fee;
        const monthRevenue = monthBookings * fee;
        const totalRevenue = (totalBookings - cancelledBookings) * fee;

        return {
            doctor,
            stats: {
                todayBookings,
                todaySlots,
                weekBookings,
                monthBookings,
                totalBookings,
                cancelledBookings,
                completedBookings,
                weekRevenue,
                monthRevenue,
                totalRevenue,
            },
            upcomingBookings,
        };
    }

    // ─── BOOKINGS MANAGEMENT ─────────────────────
    async getDoctorBookings(doctorId, query = {}) {
        const { status, page = 1, limit = 20, date, search } = query;
        const where = { doctorId };

        if (status) where.status = status.toUpperCase();
        if (date) {
            const d = new Date(date);
            d.setUTCHours(0, 0, 0, 0);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            where.slot = { slotDate: { gte: d, lt: next } };
        }
        if (search) {
            where.user = {
                OR: [
                    { username: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true, username: true, email: true, avatarUrl: true,
                            healthProfile: {
                                select: { firstName: true, lastName: true, gender: true, phoneNumber: true },
                            },
                        },
                    },
                    slot: { select: { slotDate: true, startTime: true, endTime: true, duration: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            prisma.booking.count({ where }),
        ]);

        return {
            bookings,
            pagination: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
        };
    }

    // ─── PATIENTS ────────────────────────────────
    async getDoctorPatients(doctorId, query = {}) {
        const { page = 1, limit = 20, search } = query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Get unique patients who booked with this doctor
        const bookings = await prisma.booking.findMany({
            where: { doctorId },
            select: { userId: true },
            distinct: ['userId'],
        });
        const patientIds = bookings.map((b) => b.userId);

        const userWhere = { id: { in: patientIds } };
        if (search) {
            userWhere.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [patients, total] = await Promise.all([
            prisma.user.findMany({
                where: userWhere,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatarUrl: true,
                    createdAt: true,
                    healthProfile: {
                        select: {
                            firstName: true, lastName: true, dateOfBirth: true,
                            gender: true, phoneNumber: true, bloodGroup: true,
                        },
                    },
                    doshaProfile: {
                        select: {
                            prakritiVata: true, prakritiPitta: true, prakritiKapha: true, prakritiType: true,
                            vikritiVata: true, vikritiPitta: true, vikritiKapha: true, vikritiType: true,
                            isImbalanced: true,
                        },
                    },
                    bookings: {
                        where: { doctorId },
                        select: {
                            id: true, status: true, notes: true, createdAt: true, meetLink: true,
                            slot: { select: { slotDate: true, startTime: true, endTime: true } },
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where: userWhere }),
        ]);

        return {
            patients,
            pagination: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
        };
    }

    // ─── SLOT MANAGEMENT ─────────────────────────
    async getSlots(doctorId, dateStr) {
        const targetDate = dateStr ? new Date(dateStr) : new Date();
        targetDate.setUTCHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const slots = await prisma.doctorSlot.findMany({
            where: { doctorId, slotDate: { gte: targetDate, lt: nextDay } },
            include: {
                booking: {
                    select: {
                        id: true, status: true, notes: true, meetLink: true,
                        user: { select: { id: true, username: true, email: true } },
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        });

        return { date: targetDate, slots };
    }

    async createSlots(doctorId, date, startHour, endHour, duration = 30) {
        const slotDate = new Date(date);
        slotDate.setUTCHours(0, 0, 0, 0);

        const slots = [];
        let current = new Date(slotDate);
        current.setHours(startHour, 0, 0, 0);

        const endTime = new Date(slotDate);
        endTime.setHours(endHour, 0, 0, 0);

        while (current < endTime) {
            const end = new Date(current);
            end.setMinutes(end.getMinutes() + duration);
            if (end > endTime) break;
            slots.push({
                doctorId,
                slotDate,
                startTime: new Date(current),
                endTime: new Date(end),
                duration,
            });
            current = new Date(end);
        }

        if (slots.length === 0) {
            const err = new Error('No valid slots could be created for the given time range.');
            err.statusCode = 400;
            throw err;
        }

        // Remove existing non-booked slots for that date first
        await prisma.doctorSlot.deleteMany({
            where: { doctorId, slotDate, isBooked: false },
        });

        const created = await prisma.doctorSlot.createMany({ data: slots });
        return { created: created.count, date: slotDate };
    }

    async createBulkSlots(doctorId, dates, startHour, endHour, duration = 30) {
        const results = [];
        for (const date of dates) {
            const result = await this.createSlots(doctorId, date, startHour, endHour, duration);
            results.push(result);
        }
        return results;
    }

    async toggleSlot(doctorId, slotId, isActive) {
        const slot = await prisma.doctorSlot.findUnique({ where: { id: slotId } });
        if (!slot || slot.doctorId !== doctorId) {
            const err = new Error('Slot not found.');
            err.statusCode = 404;
            throw err;
        }
        if (slot.isBooked) {
            const err = new Error('Cannot modify a booked slot.');
            err.statusCode = 400;
            throw err;
        }
        return prisma.doctorSlot.update({
            where: { id: slotId },
            data: { isActive },
        });
    }

    async deleteSlot(doctorId, slotId) {
        const slot = await prisma.doctorSlot.findUnique({ where: { id: slotId } });
        if (!slot || slot.doctorId !== doctorId) {
            const err = new Error('Slot not found.');
            err.statusCode = 404;
            throw err;
        }
        if (slot.isBooked) {
            const err = new Error('Cannot delete a booked slot. Cancel the booking first.');
            err.statusCode = 400;
            throw err;
        }
        return prisma.doctorSlot.delete({ where: { id: slotId } });
    }

    // ─── UPDATE BOOKING STATUS ───────────────────
    async updateBookingStatus(doctorId, bookingId, status) {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking || booking.doctorId !== doctorId) {
            const err = new Error('Booking not found.');
            err.statusCode = 404;
            throw err;
        }
        const validTransitions = {
            CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
            COMPLETED: [],
            CANCELLED: [],
            NO_SHOW: [],
        };
        if (!validTransitions[booking.status]?.includes(status)) {
            const err = new Error(`Cannot change status from ${booking.status} to ${status}`);
            err.statusCode = 400;
            throw err;
        }
        return prisma.$transaction(async (tx) => {
            const updated = await tx.booking.update({
                where: { id: bookingId },
                data: { status },
                include: {
                    user: { select: { id: true, username: true, email: true } },
                    slot: { select: { slotDate: true, startTime: true, endTime: true } },
                },
            });
            if (status === 'CANCELLED' || status === 'NO_SHOW') {
                await tx.doctorSlot.update({
                    where: { id: booking.slotId },
                    data: { isBooked: false },
                });
            }
            return updated;
        });
    }

    // ─── GENERATE MEET LINK ─────────────────────
    async generateMeetLink(doctorId, bookingId) {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                doctor: { select: { name: true, email: true, specialty: true } },
                user: { select: { username: true, email: true } },
                slot: { select: { slotDate: true, startTime: true, endTime: true } },
            },
        });

        if (!booking || booking.doctorId !== doctorId) {
            const err = new Error('Booking not found.');
            err.statusCode = 404;
            throw err;
        }
        if (booking.status !== 'CONFIRMED') {
            const err = new Error('Can only generate meet link for confirmed bookings.');
            err.statusCode = 400;
            throw err;
        }

        // Generate unique meet room ID
        const roomId = `prakriti-${booking.id.slice(0, 8)}-${Date.now().toString(36)}`;
        const meetLink = `https://meet.jit.si/${roomId}`;

        // Update booking with meet link and patient email
        const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: {
                meetLink,
                patientEmail: booking.user.email,
            },
            include: {
                doctor: { select: { name: true, email: true, specialty: true } },
                user: { select: { username: true, email: true } },
                slot: { select: { slotDate: true, startTime: true, endTime: true } },
            },
        });

        return {
            booking: updated,
            meetLink,
            meetDetails: {
                roomId,
                doctorEmail: booking.doctor.email,
                patientEmail: booking.user.email,
                scheduledAt: booking.slot.startTime,
                duration: '30 minutes',
                instructions: 'Both doctor and patient can join using the meet link at the scheduled time.',
            },
        };
    }

    // ─── ANALYTICS ───────────────────────────────
    async getAnalytics(doctorId, range = '30d') {
        const now = new Date();
        const start = new Date();

        switch (range) {
            case '7d': start.setDate(now.getDate() - 7); break;
            case '30d': start.setDate(now.getDate() - 30); break;
            case '90d': start.setDate(now.getDate() - 90); break;
            case '6m': start.setMonth(now.getMonth() - 6); break;
            case '1y': start.setFullYear(now.getFullYear() - 1); break;
            default: start.setDate(now.getDate() - 30);
        }

        const [
            totalBookings,
            confirmedBookings,
            cancelledBookings,
            completedBookings,
            noShowBookings,
            uniquePatients,
            doctor,
            dailyBookings,
        ] = await Promise.all([
            prisma.booking.count({ where: { doctorId, createdAt: { gte: start } } }),
            prisma.booking.count({ where: { doctorId, status: 'CONFIRMED', createdAt: { gte: start } } }),
            prisma.booking.count({ where: { doctorId, status: 'CANCELLED', createdAt: { gte: start } } }),
            prisma.booking.count({ where: { doctorId, status: 'COMPLETED', createdAt: { gte: start } } }),
            prisma.booking.count({ where: { doctorId, status: 'NO_SHOW', createdAt: { gte: start } } }),
            prisma.booking.findMany({
                where: { doctorId, createdAt: { gte: start } },
                select: { userId: true },
                distinct: ['userId'],
            }),
            prisma.doctor.findUnique({
                where: { id: doctorId },
                select: { consultationFee: true, rating: true, totalRatings: true },
            }),
            // Daily breakdown - get bookings grouped by date
            prisma.booking.findMany({
                where: { doctorId, createdAt: { gte: start } },
                select: { createdAt: true, status: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        const fee = doctor?.consultationFee || 0;
        const effectiveBookings = confirmedBookings + completedBookings;

        // Build daily chart data
        const dailyMap = {};
        dailyBookings.forEach((b) => {
            const day = b.createdAt.toISOString().split('T')[0];
            if (!dailyMap[day]) dailyMap[day] = { date: day, bookings: 0, revenue: 0 };
            dailyMap[day].bookings++;
            if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
                dailyMap[day].revenue += fee;
            }
        });

        return {
            range,
            summary: {
                totalBookings,
                confirmedBookings,
                cancelledBookings,
                completedBookings,
                noShowBookings,
                uniquePatients: uniquePatients.length,
                totalRevenue: effectiveBookings * fee,
                avgRevenuePerDay: Math.round((effectiveBookings * fee) / Math.max(1, Object.keys(dailyMap).length)),
                cancellationRate: totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0,
                completionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0,
            },
            dailyData: Object.values(dailyMap),
            rating: { current: doctor?.rating, totalRatings: doctor?.totalRatings },
        };
    }

    // ─── UPDATE PROFILE ──────────────────────────
    async updateProfile(doctorId, data) {
        const allowedFields = [
            'name', 'specialty', 'description', 'education', 'qualification',
            'languages', 'bio', 'imageUrl', 'phone', 'gender', 'location',
            'consultationFee', 'experienceYears', 'isAvailable',
        ];
        const updateData = {};
        for (const key of allowedFields) {
            if (data[key] !== undefined) updateData[key] = data[key];
        }
        return prisma.doctor.update({
            where: { id: doctorId },
            data: updateData,
            select: {
                id: true, name: true, email: true, specialty: true, description: true,
                education: true, qualification: true, languages: true, bio: true,
                imageUrl: true, phone: true, gender: true, location: true,
                consultationFee: true, experienceYears: true, rating: true,
                totalRatings: true, isAvailable: true,
            },
        });
    }
}

module.exports = new DoctorPortalService();
