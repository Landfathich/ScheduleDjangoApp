import {createLogger} from "./logger.js";

const logger = createLogger('[Repository]');
logger.disable()

export class Repository {
    constructor() {
        this.csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        this.currentUserId = currentUserId;
        this.currentTeacherId = currentTeacherId;

        if (typeof currentUserId === 'undefined') {
            throw new Error('currentUserId is not defined! Check script loading order');
        }

        // Настройки задержек
        this.enableDelays = true;
        this.delayTimes = {
            getLessons: 5000,
            getOpenSlots: 5000
        };
    }

    // Базовый метод для GET запросов
    async _get(url, options = {}) {
        const response = await fetch(url, {
            method: 'GET',
            headers: {'Content-Type': 'application/json', ...options.headers},
            credentials: 'include',
            ...options
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || error.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    // Базовый метод для POST/PUT запросов с CSRF
    async _send(method, url, data = {}, options = {}) {
        const csrfToken = this.csrfToken || this.getCookie('csrftoken');
        if (!csrfToken) {
            throw new Error('CSRF token not found');
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers
            },
            credentials: 'include',
            body: JSON.stringify(data),
            ...options
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || error.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    // Вспомогательный метод для задержки
    async _delay(ms, methodName) {
        if (this.enableDelays && ms > 0) {
            logger.log(`⏳ Задержка ${methodName}: ${ms}ms`);
            await new Promise(resolve => setTimeout(resolve, ms));
            logger.log(`✅ Задержка ${methodName} завершена`);
        }
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // === LESSONS ===
    async getLessons(teacherId = null, startDate = null, endDate = null) {
        logger.log('🔄 getLessons() - начал выполнение');

        await this._delay(this.delayTimes.getLessons, 'getLessons');

        const params = new URLSearchParams();
        if (teacherId !== null && !isNaN(teacherId)) {
            params.append('teacher_id', parseInt(teacherId).toString());
        }

        const response = await this._get(`/lessons/?${params.toString()}`);
        logger.log('✅ getLessons() - завершил выполнение');
        return response;
    }

    async completeLesson(lessonId, lessonData = {}) {
        if (!lessonId) throw new Error('Lesson ID is required');

        const payload = {
            lesson_topic: lessonData.topic || null,
            lesson_notes: lessonData.notes || null,
            homework: lessonData.homework || null
        };

        return await this._send('POST', `/api/complete-lesson/${lessonId}/`, payload);
    }

    async cancelLesson(lessonId, reason) {
        if (!lessonId) throw new Error('Lesson ID is required');

        return await this._send('POST', `/api/cancel-lesson/${lessonId}/`, {
            cancelled_by: reason.cancelled_by,
            is_custom_reason: reason.is_custom_reason,
            cancel_reason: reason.cancel_reason
        });
    }

    async createLesson(date, time, teacherId, studentId, subject, lesson_type) {
        const requiredFields = {date, time, teacherId, studentId, subject, lesson_type};
        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        return await this._send('POST', '/api/create-lesson/', {
            date, time, teacher_id: teacherId, student_id: studentId, subject, lesson_type
        });
    }

// === OPEN SLOTS ===
    async getOpenSlots(teacherId = this.currentTeacherId) {
        logger.log('🔄 getOpenSlots() - начал выполнение');

        await this._delay(this.delayTimes.getOpenSlots, 'getOpenSlots');

        const data = await this._get(`/api/open-slots/${teacherId}/`);
        logger.log(`Open slots for teacher ${teacherId}:`, data.weekly_open_slots);

        logger.log('✅ getOpenSlots() - завершил выполнение');
        return data.weekly_open_slots;
    }

    async updateOpenSlots(openSlots) {
        const data = await this._send('PUT', `/api/open-slots/${this.currentTeacherId}/update/`, {
            weekly_open_slots: openSlots
        });
        return data.weekly_open_slots;
    }

// === TEACHERS ===
    async getTeachers() {
        return await this._get('/teachers/');
    }

// === CLIENTS ===
    async loadLowBalanceClients() {
        try {
            const data = await this._get('/api/clients/low-balance/');
            logger.log('Received clients data:', data);
            return data;
        } catch (error) {
            logger.error('Error fetching low balance clients:', error);
            return {status: 'error', clients: []};
        }
    }

    async loadLowBalanceClientsCount() {
        const data = await this._get('/api/clients/low-balance-count/');
        return data.count;
    }

// === PAYMENTS ===
    async loadPaymentsCount() {
        const data = await this._get('/api/payments-count/');
        return data.count;
    }
}