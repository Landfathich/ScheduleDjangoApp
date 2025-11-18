export class LessonManager {
    constructor() {
        this.lessons = [];
        this.displayedLessons = new Set();
    }

    generateFutureLessons(lesson, endDate) {
        const weekdayMapping = {
            'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 0
        };

        const fakeLessons = [];
        const originalDate = new Date(lesson.date + 'T' + lesson.time);
        originalDate.setSeconds(0, 0);

        function formatTime(date) {
            return date.toTimeString().slice(0, 8);
        }

        lesson.schedule.forEach(scheduleItem => {
            const targetWeekday = weekdayMapping[scheduleItem.day.toLowerCase()];
            const [hours, minutes] = scheduleItem.time.split(':').map(Number);

            // Начинаем генерировать со времени на час позже оригинального урока
            let currentDate = new Date(originalDate);
            currentDate.setHours(currentDate.getHours() + 1);

            while (currentDate <= endDate) {
                if (currentDate.getDay() === targetWeekday) {
                    const lessonDate = new Date(currentDate);
                    lessonDate.setHours(hours, minutes, 0, 0);

                    // Добавляем урок, если он в будущем
                    if (lessonDate > originalDate) {
                        fakeLessons.push({
                            ...lesson,
                            id: `fake_${lesson.id}_${lessonDate.getTime()}`,
                            date: lessonDate.toISOString().split('T')[0],
                            time: formatTime(lessonDate),
                            is_future: true,
                            original_lesson_id: lesson.id
                        });
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });

        return fakeLessons;
    }

    createLessonHTML(lesson, isMultiple = false, index = 0, total = 1) {
        const lessonTypeClass = {
            'recurring': 'permanent',
            'demo': 'demo',
            'single': 'one-time'
        }[lesson.lesson_type];

        const statusClass = {
            'completed': 'completed',
            'canceled': 'cancelled',
            'scheduled': 'scheduled'
        }[lesson.status];

        const lessonIcon = {
            'recurring': '🔄',
            'demo': '🎯',
            'single': '1️⃣'
        }[lesson.lesson_type];

        const typeLabel = {
            'recurring': 'Постоянный',
            'demo': 'Вводный',
            'single': 'Разовый'
        }[lesson.lesson_type];

        const isFuture = lesson.is_future;
        const clickHandler = isFuture
            ? 'event.preventDefault(); window.showNotification(\'Это запланированный урок\', \'info\')'
            : `window.openLessonModal(${JSON.stringify(lesson).replace(/"/g, '&quot;')})`;

        const isUnreliable = !lesson.is_reliable && !isFuture && statusClass === 'scheduled';

        // Базовые классы
        let classes = `lesson ${lessonTypeClass} ${statusClass}`;
        if (isFuture) classes += ' future';
        if (isUnreliable) classes += ' unreliable';
        if (isMultiple) classes += ' multiple';

        // Стили для множественного отображения
        const multipleStyles = isMultiple ?
            `style="z-index: ${total - index}; overflow: hidden;"` :
            '';

        return `
        <div class="${classes}" 
             data-lesson-id="${lesson.id}"
             data-status="${lesson.status || 'scheduled'}"
             onclick="${clickHandler}"
             ${multipleStyles}>
            
            ${lesson.balance !== undefined ? `
                <div class="balance-badge" 
                     data-balance="${lesson.balance < 0 ? '-' : lesson.balance}"
                     title="${lesson.balance < 0 ? 'Отрицательный баланс' : 'Остаток уроков'}">
                    ${lesson.balance}
                </div>
            ` : ''}
            
            ${isUnreliable ? '<div class="unreliable-badge" title="Ненадёжный урок \nУрок может быть отменен">⚠️</div>' : ''}
            
            ${isMultiple ? `
                <div class="multiple-lesson-content">
                    <span class="lesson-icon">${lessonIcon}</span>
                    <span class="student-name">${lesson.student_name}</span>
                    ${index === 0 && total > 1 ? `
                        <span class="lesson-count">+${total - 1}</span>
                    ` : ''}
                </div>
            ` : `
                <h4>${lessonIcon} ${typeLabel} урок</h4>
                <p>👩‍🎓 ${lesson.student_name}</p>
                <p>📚 ${lesson.course}</p>
            `}
        </div>
    `;
    }

    clearAllLessons() {
        this.displayedLessons.clear();
        document.querySelectorAll('.week-day .hour').forEach(hourElement => {
            hourElement.innerHTML = '';
            hourElement.classList.remove('has-lesson');
        });
    }

    getLessonsForDay(dayDate) {
        const dateStr = dayDate.toISOString().split('T')[0];
        return this.lessons.filter(lesson => lesson.date === dateStr);
    }
}