import {DAYS_OF_WEEK} from "./utils.js";
import {showNotification} from "./notifications.js";
import {repository, scheduleState, settingsManager} from "./app.js";
import {WeekManager} from "./weekManager.js";
import {LessonManager} from "./lessonManager.js";

const LOGGING_ENABLED = false;
const LOG_PREFIX = '[CM]';

const logger = {
    log: (...args) => LOGGING_ENABLED && console.log(...args),
    error: (...args) => console.error(...args),
    warn: (...args) => console.warn(...args),
    trace: (...args) => LOGGING_ENABLED && console.trace(...args)
};

export class CalendarManager {
    constructor() {
        logger.log(`${LOG_PREFIX} constructor() - начал выполнение`);

        this.lessonManager = new LessonManager();
        this.weekManager = new WeekManager();
        this.openSlots = {};

        // Временные значения по умолчанию
        this.startHour = 6;
        this.endHour = 18;

        this.isInitializing = true;

        scheduleState.teacherId = currentTeacherId;
        scheduleState.userId = currentUserId;
        scheduleState.isAnother = false;

        this.setupEventListeners();

        logger.log(`${LOG_PREFIX} constructor() - завершил выполнение`);
    }

    // Новый метод для асинхронной инициализации
    async initialize() {
        logger.log(`${LOG_PREFIX} initialize() - начал выполнение`);

        // Применяем настройки из settingsManager
        await this.applyInitialSettings();

        // Загружаем расписание
        await this.loadSchedule();

        this.isInitializing = false;
        logger.log(`${LOG_PREFIX} initialize() - завершил выполнение`);
    }

    // Обновленный метод applyInitialSettings
    async applyInitialSettings() {
        logger.log(`${LOG_PREFIX} applyInitialSettings() - начал выполнение`);

        try {
            // Получаем настройки из settingsManager
            const workingHours = settingsManager.getWorkingHours();
            if (workingHours && workingHours.start !== undefined && workingHours.end !== undefined) {
                logger.log(`${LOG_PREFIX} applyInitialSettings() - применяем рабочие часы: ${workingHours.start}-${workingHours.end}`);
                this.startHour = workingHours.start;
                this.endHour = workingHours.end;
            } else {
                logger.log(`${LOG_PREFIX} applyInitialSettings() - настройки не найдены, используем значения по умолчанию: ${this.startHour}-${this.endHour}`);
            }
        } catch (error) {
            console.error(`${LOG_PREFIX} applyInitialSettings() - ошибка:`, error);
        }

        logger.log(`${LOG_PREFIX} applyInitialSettings() - завершил выполнение`);
    }

    setupEventListeners() {
        document.getElementById('prev-week').addEventListener('click', () => {
            if (settingsManager.isOpenWindowsMode) {
                showNotification("Недоступно в режиме выбора открытых окон", "error");
            } else {
                this.prevWeek();
            }
        });

        document.getElementById('next-week').addEventListener('click', () => {
            if (settingsManager.isOpenWindowsMode) {
                showNotification("Недоступно в режиме выбора открытых окон", "error");
            } else {
                this.nextWeek();
            }
        });

        document.getElementById('current-week').addEventListener('click', () => {
            if (settingsManager.isOpenWindowsMode) {
                showNotification("Недоступно в режиме выбора открытых окон", "error");
            } else {
                this.goToCurrentWeek();
            }
        });
    }

    prevWeek() {
        logger.log(`${LOG_PREFIX} prevWeek() - переключение на предыдущую неделю`);

        clearAllNotifications();

        this.weekManager.currentWeekOffset--;
        this.refreshCalendar();
    }

    nextWeek() {
        logger.log(`${LOG_PREFIX} nextWeek() - переключение на следующую неделю`);

        clearAllNotifications();

        this.weekManager.currentWeekOffset++;
        this.refreshCalendar();
    }

    goToCurrentWeek() {
        logger.log(`${LOG_PREFIX} goToCurrentWeek() - переход к текущей неделе`);
        if (this.weekManager.currentWeekOffset !== 0) {

            clearAllNotifications();

            this.weekManager.currentWeekOffset = 0;
            this.refreshCalendar();
        } else {
            logger.log(`${LOG_PREFIX} goToCurrentWeek() - уже на текущей неделе, пропускаем`);
        }
    }

    updateWorkingHours(start, end) {
        logger.log(`${LOG_PREFIX} updateWorkingHours() - обновление рабочих часов: ${start}-${end}`);

        this.startHour = start;
        this.endHour = end;

        if (!this.lessonManager.lessons) {
            console.warn("Расписание не загружено, но рабочие часы обновлены");
            return;
        }

        this.refreshCalendar();
    }

    async updateOpenSlots(openSlots) {
        try {
            await repository.updateOpenSlots(openSlots);
        } catch (error) {
            console.error("Ошибка при обновлении свободных слотов:", error);
            throw error;
        }
    }

    async loadSchedule(teacherId = currentTeacherId, userId = currentUserId, startDate = null, endDate = null) {
        logger.log(`${LOG_PREFIX} loadSchedule() - начал выполнение, teacherId: ${teacherId}`);

        try {
            const {start: weekStart, end: weekEnd} = this.weekManager.getWeekRange(this.weekManager.currentWeekOffset);
            const formatDate = (date) => date.toISOString().split('T')[0];
            const queryStartDate = startDate || formatDate(weekStart);
            const queryEndDate = endDate || formatDate(weekEnd);

            const effectiveTeacherId = teacherId || currentTeacherId;

            // Параллельная загрузка данных
            const [response, openSlots] = await Promise.all([
                repository.getLessons(effectiveTeacherId, queryStartDate, queryEndDate),
                repository.getOpenSlots(effectiveTeacherId)
            ]);

            console.log(`Lessons for teacher ${teacherId}: `, response);

            const lessons = this.processLessonResponse(response);
            const fakeLessons = this.generateFakeLessons(lessons);

            this.lessonManager.lessons = [...lessons, ...fakeLessons];
            this.openSlots = openSlots;

            logger.log(`${LOG_PREFIX} loadSchedule() - получено уроков: ${lessons.length}, сгенерировано fakeLessons: ${fakeLessons.length}`);

            // Всегда обновляем календарь после загрузки данных
            this.refreshCalendar();

        } catch (error) {
            console.error(`${LOG_PREFIX} loadSchedule() - ошибка:`, error);
            showNotification("Ошибка загрузки расписания", "error");
            this.lessonManager.lessons = [];
        }

        logger.log(`${LOG_PREFIX} loadSchedule() - завершил выполнение`);
    }

    refreshCalendar() {
        logger.log(`${LOG_PREFIX} refreshCalendar() - начал выполнение`);

        this.weekManager.updateHeaderDates();
        this.weekManager.updateWeekInfo();
        this.renderCalendar();

        logger.log(`${LOG_PREFIX} refreshCalendar() - завершил выполнение`);
    }

    renderCalendar() {
        this.generateTimeSlots();
        this.renderSchedule();
    }

    renderSchedule() {
        logger.log(`${LOG_PREFIX} renderSchedule() - начал выполнение`);

        this.clearSchedule();
        this.lessonManager.clearAllLessons();
        this.renderOpenSlots();
        this.renderLessons();

        logger.log(`${LOG_PREFIX} renderSchedule() - завершил выполнение`);
    }

    generateTimeSlots() {
        const timeColumn = document.querySelector('.time-column');
        const weekDays = document.querySelectorAll('.week-day');
        const now = new Date();
        const currentHour = now.getHours();
        const currentDayIndex = now.getDay();

        // Очищаем существующие слоты
        timeColumn.innerHTML = '';
        weekDays.forEach(day => day.innerHTML = '');

        // Генерируем слоты для каждого часа
        Array.from({length: this.endHour - this.startHour + 1}, (_, i) => this.startHour + i)
            .forEach(hour => {
                const formattedHour = `${String(hour).padStart(2, '0')}:00`;

                // Добавляем метку времени
                const timeElement = document.createElement('div');
                timeElement.className = 'time';
                timeElement.innerHTML = `<p>${formattedHour}</p>`;

                if (hour === currentHour) {
                    timeElement.classList.add('current-time-slot');
                }

                timeColumn.appendChild(timeElement);

                // Добавляем ячейки для дней
                weekDays.forEach((day, dayIndex) => {
                    const hourElement = document.createElement('div');
                    hourElement.className = 'hour';
                    hourElement.dataset.day = DAYS_OF_WEEK[dayIndex];
                    hourElement.dataset.hour = formattedHour;

                    if (hour === currentHour) {
                        hourElement.classList.add('current-hour-line');
                        if (dayIndex === currentDayIndex - 1) {
                            hourElement.classList.add('current-hour-active');
                        }
                    }

                    day.appendChild(hourElement);
                });
            });
    }

    renderOpenSlots() {
        if (!this.openSlots) {
            console.warn("openSlots не загружены");
            return;
        }

        // Очищаем предыдущие открытые окна
        document.querySelectorAll('.open-window, .current-hour, .current-hour-active').forEach(el => {
            el.classList.remove('open-window', 'current-hour', 'current-hour-active');
        });

        const now = new Date();
        const currentHour = now.getHours();

        // Рендерим открытые окна
        DAYS_OF_WEEK.forEach(day => {
            const dayElement = document.getElementById(day);
            if (!dayElement) {
                console.error("Элемент дня не найден:", day);
                return;
            }

            // Подсветка текущего часа
            if (currentHour >= this.startHour && currentHour <= this.endHour) {
                const hourElement = dayElement.children[currentHour - this.startHour];
                if (hourElement) {
                    hourElement.classList.add('current-hour');
                }
            }

            // Открытые окна
            const slots = this.openSlots[day] || [];
            slots.forEach(time => {
                const hour = parseInt(time.split(':')[0]);
                if (hour >= this.startHour && hour <= this.endHour) {
                    const hourElement = dayElement.children[hour - this.startHour];
                    if (hourElement) {
                        hourElement.classList.add('open-window');
                    }
                }
            });
        });

        // Особое выделение текущего дня
        const currentDayIndex = now.getDay();
        if (currentDayIndex > 0 && currentDayIndex <= DAYS_OF_WEEK.length) {
            const currentDayElement = document.getElementById(DAYS_OF_WEEK[currentDayIndex - 1]);
            if (currentDayElement && currentHour >= this.startHour && currentHour <= this.endHour) {
                const hourElement = currentDayElement.children[currentHour - this.startHour];
                if (hourElement) {
                    hourElement.classList.add('current-hour-active');
                }
            }
        }
    }

    renderLessons() {
        logger.log(`${LOG_PREFIX} renderLessons() - начал выполнение`);

        if (!Array.isArray(this.lessonManager.lessons)) {
            console.warn("Некорректные данные уроков");
            return;
        }

        const currentWeekDates = this.weekManager.getWeekDates(this.weekManager.currentWeekOffset)
            .map(date => date.toISOString().split('T')[0]);

        const lessonsByTimeSlot = this.groupLessonsByTimeSlot(currentWeekDates);
        this.renderGroupedLessons(lessonsByTimeSlot);
        this.showScheduleConflicts(lessonsByTimeSlot);

        logger.log(`${LOG_PREFIX} renderLessons() - завершил выполнение, обработано уроков: ${this.lessonManager.lessons?.length || 0}`);
    }

    processLessonResponse(response) {
        if (response && typeof response === 'object' && Array.isArray(response.results)) {
            return response.results;
        } else if (Array.isArray(response)) {
            return response;
        } else {
            console.warn('Unexpected response format, initializing empty lessons');
            return [];
        }
    }

    generateFakeLessons(lessons) {
        const fakeLessons = [];
        const today = new Date();
        const endDateGeneration = new Date();
        endDateGeneration.setDate(today.getDate() + 30);

        lessons.forEach(lesson => {
            if (lesson.lesson_type === 'recurring' &&
                lesson.schedule &&
                lesson.schedule.length > 0 &&
                lesson.status === 'scheduled') {

                const generatedLessons = this.lessonManager.generateFutureLessons(lesson, endDateGeneration);
                const uniqueFakeLessons = generatedLessons.filter((fake, index, self) =>
                        index === self.findIndex(f =>
                            f.date === fake.date && f.time === fake.time
                        )
                );

                fakeLessons.push(...uniqueFakeLessons);
            }
        });

        return fakeLessons;
    }

    groupLessonsByTimeSlot(currentWeekDates) {
        const lessonsByTimeSlot = {};

        this.lessonManager.lessons.forEach(lesson => {
            try {
                if (!currentWeekDates.includes(lesson.date)) return;

                const lessonDate = new Date(lesson.date);
                const dayOfWeek = this.weekManager.getDayOfWeek(lessonDate);
                const hour = parseInt(lesson.time.split(':')[0]);
                const timeSlotKey = `${dayOfWeek}_${hour}`;

                if (!lessonsByTimeSlot[timeSlotKey]) {
                    lessonsByTimeSlot[timeSlotKey] = [];
                }
                lessonsByTimeSlot[timeSlotKey].push(lesson);

            } catch (error) {
                console.error('Ошибка группировки уроков:', error);
            }
        });

        return lessonsByTimeSlot;
    }

    renderGroupedLessons(lessonsByTimeSlot) {
        Object.entries(lessonsByTimeSlot).forEach(([timeSlotKey, lessons]) => {
            try {
                const [dayOfWeek, hour] = timeSlotKey.split('_');
                const numericHour = parseInt(hour);

                const dayElement = document.getElementById(dayOfWeek);
                if (!dayElement) return;

                const hourElement = dayElement.children[numericHour - this.startHour];
                if (!hourElement) return;

                hourElement.innerHTML = '';
                this.renderLessonsInTimeSlot(hourElement, lessons);

            } catch (error) {
                console.error('Ошибка рендеринга ячейки:', error);
            }
        });
    }

    renderLessonsInTimeSlot(hourElement, lessons) {
        const hasScheduledLesson = lessons.some(lesson => lesson.status === 'scheduled');
        const hasConflict = lessons.length > 1 && hasScheduledLesson;

        if (lessons.length === 1) {
            hourElement.innerHTML = this.lessonManager.createLessonHTML(lessons[0]);
        } else {
            lessons.forEach((lesson, index) => {
                hourElement.innerHTML += this.lessonManager.createLessonHTML(
                    lesson, true, index, lessons.length
                );
            });

            if (hasConflict) {
                hourElement.classList.add('has-conflict');
                hourElement.title = `Конфликт расписания: ${lessons.length} урока в одно время`;
            } else {
                hourElement.classList.remove('has-conflict');
                hourElement.title = `Несколько уроков: ${lessons.length} урока (все обработаны)`;
            }
        }
    }

    showScheduleConflicts(lessonsByTimeSlot) {
        logger.log(`${LOG_PREFIX} showScheduleConflicts() - начал выполнение`);

        const conflicts = Object.entries(lessonsByTimeSlot)
            .filter(([_, lessons]) => {
                const hasScheduledLesson = lessons.some(lesson => lesson.status === 'scheduled');
                return lessons.length > 1 && hasScheduledLesson;
            })
            .map(([timeSlotKey, lessons]) => {
                const [dayOfWeek, hour] = timeSlotKey.split('_');
                const scheduledLessons = lessons.filter(lesson => lesson.status === 'scheduled');

                return {
                    day: dayOfWeek,
                    hour: parseInt(hour),
                    totalCount: lessons.length,
                    scheduledCount: scheduledLessons.length,
                    lessons: lessons
                };
            });

        if (conflicts.length > 0) {
            const conflictMessage = `Обнаружено ${conflicts.length} конфликт(ов) в расписании`;
            showNotification(conflictMessage, "error", 5000);
            logger.log('Конфликты расписания:', conflicts);
        }

        logger.log(`${LOG_PREFIX} showScheduleConflicts() - завершил выполнение, найдено конфликтов: ${conflicts.length}`);
    }

    clearSchedule() {
        document.querySelectorAll('.week-day .hour').forEach(hour => {
            if (!hour.querySelector('.lesson')) {
                hour.className = 'hour';
                hour.innerHTML = '';
            }
        });
    }

    updateOpenWindowsOnly() {
        console.log(`${LOG_PREFIX} updateOpenWindowsOnly() - обновление только открытых окон`);

        // Пропускаем если инициализация
        if (this.isInitializing) {
            console.log(`${LOG_PREFIX} updateOpenWindowsOnly() - пропущено из-за инициализации`);
            return;
        }

        if (!this.lessonManager.lessons) {
            console.warn("Расписание не загружено");
            return;
        }

        // Обновляем только открытые окна, не трогая уроки
        this.renderOpenSlots();

        console.log(`${LOG_PREFIX} updateOpenWindowsOnly() - завершил выполнение`);
    }
}