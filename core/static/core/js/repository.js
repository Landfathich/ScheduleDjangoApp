import {createLogger} from "./logger.js";

const logger = createLogger('[Repository]');
logger.disable()

export class Repository {
    constructor() {
        this.csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        this.currentUserId = currentUserId;
        this.currentTeacherId = currentTeacherId
        if (typeof currentUserId === 'undefined') {
            throw new Error('currentUserId is not defined! Check script loading order');
        }

        // Флаг для включения/выключения задержек для имитации работы сервера
        // Включает задержки только для некоторых методов этого класса
        this.enableDelays = true;
        this.delayTimes = {
            getLessons: 5000,
            getOpenSlots: 5000
        };
    }

    // Вспомогательный метод для задержки
    async _delay(ms, methodName) {
        if (this.enableDelays) {
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

    async getTeachers() {
        try {
            const response = await fetch('/teachers/', {
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Ошибка ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            logger.error("Ошибка при получении данных об учителях:", error);
            throw error;
        }
    }

    async getLessons(teacherId = null, startDate = null, endDate = null) {
        logger.log('🔄 getLessons() - начал выполнение');
        try {
            // Добавляем задержку
            await this._delay(this.delayTimes.getLessons, 'getLessons');

            const params = new URLSearchParams();

            if (teacherId !== null && !isNaN(teacherId)) {
                params.append('teacher_id', parseInt(teacherId).toString());
            }

            const response = await fetch(`/lessons/?${params.toString()}`, {
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to fetch lessons');
            }

            logger.log('✅ getLessons() - завершил выполнение');
            return await response.json();
        } catch (error) {
            logger.error('❌ getLessons() - ошибка:', error);
            throw error;
        }
    }

    async getOpenSlots(teacherId = this.currentTeacherId) {
        logger.log('🔄 getOpenSlots() - начал выполнение');
        try {
            // Добавляем задержку
            await this._delay(this.delayTimes.getOpenSlots, 'getOpenSlots');

            const response = await fetch(`/api/open-slots/${teacherId}/`);
            if (!response.ok) {
                throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            logger.log(`Open slots for teacher ${teacherId} (search by teacher id): `, data.weekly_open_slots);

            logger.log('✅ getOpenSlots() - завершил выполнение');
            return data.weekly_open_slots;
        } catch (error) {
            logger.error('❌ getOpenSlots() - ошибка:', error);
            throw error;
        }
    }

    async updateOpenSlots(openSlots) {
        try {
            const response = await fetch(`/api/open-slots/${this.currentTeacherId}/update/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                },
                body: JSON.stringify({weekly_open_slots: openSlots}),
            });

            if (!response.ok) {
                throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.weekly_open_slots;
        } catch (error) {
            logger.error("Ошибка при обновлении свободных слотов:", error);
            throw error;
        }
    }

    async completeLesson(lessonId, lessonData = {}) {
        try {
            if (!lessonId) {
                throw new Error('Lesson ID is required');
            }

            const csrfToken = this.getCookie('csrftoken');
            if (!csrfToken) {
                throw new Error('CSRF token not found');
            }

            const payload = {
                lesson_topic: lessonData.topic || null,
                lesson_notes: lessonData.notes || null,
                homework: lessonData.homework || null
            };

            const response = await fetch(`/api/complete-lesson/${lessonId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            logger.error('Ошибка при завершении урока:', error);
            throw error;
        }
    }

    async cancelLesson(lessonId, reason) {
        try {
            if (!lessonId) {
                throw new Error('Lesson ID is required');
            }

            const csrfToken = this.getCookie('csrftoken');
            if (!csrfToken) {
                throw new Error('CSRF token not found');
            }

            const response = await fetch(`/api/cancel-lesson/${lessonId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({
                    cancelled_by: reason.cancelled_by,
                    is_custom_reason: reason.is_custom_reason,
                    cancel_reason: reason.cancel_reason
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            logger.error('Ошибка при отмене урока:', error);
            throw error;
        }
    }

    async createLesson(date, time, teacherId, studentId, subject, lesson_type) {
        try {
            if (!date || !time || !teacherId || !studentId || !subject || !lesson_type) {
                throw new Error('Missing required fields');
            }

            const response = await fetch('/api/create-lesson/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                },
                body: JSON.stringify({
                    date: date,
                    time: time,
                    teacher_id: teacherId,
                    student_id: studentId,
                    subject: subject,
                    lesson_type: lesson_type
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
            }

            return responseData;
        } catch (error) {
            logger.error('Error creating lesson:', error);
            throw error;
        }
    }

    async loadLowBalanceClients() {
        try {
            const response = await fetch('/api/clients/low-balance/');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            logger.log('Received clients data:', data);

            return data;
        } catch (error) {
            logger.error('Error fetching low balance clients:', error);
            return {status: 'error', clients: []};
        }
    }

    async loadLowBalanceClientsCount() {
        const response = await fetch('/api/clients/low-balance-count/');
        const data = await response.json();
        return data.count
    }

    async loadPaymentsCount() {
        const response = await fetch('/api/payments-count/');
        const data = await response.json();
        return data.count
    }
}