import {Modal} from './modal.js';
import {calendarManager, repository, scheduleState} from '../app.js';

export class TeachersModal extends Modal {
    constructor(options = {}) {
        const footer = TeachersModal.generateStaticFooter();
        super({
            title: 'Список учителей',
            modalClass: 'teachers-modal',
            footer: footer,
            ...options
        });

        this.initTeachersContent();
        this.setupTeachersEvents();
    }

    // Статический метод для генерации футера
    static generateStaticFooter() {
        return `
        <button class="styled-button" onclick="window.location.href='/users/'">
            Управление пользователями
        </button>
    `;
    }


    async initTeachersContent() {
        try {
            const response = await repository.getTeachers();
            this.teachers = response?.results || [];
            console.log(this.teachers)

            if (this.teachers.length === 0) {
                this.updateContent('<p class="no-teachers">Нет доступных учителей</p>');
                return;
            }

            this.displayTeachersList();
        } catch (error) {
            console.error('Error fetching teachers:', error);
            this.updateContent(`
        <div class="teachers-error">
          <p>Ошибка загрузки списка учителей</p>
          <button class="submit-button" id="retry-teachers-btn">
            Попробовать снова
          </button>
        </div>
      `);
        }
    }

    displayTeachersList() {
        const teachersHTML = this.teachers.map(teacher => {
            const displayInfo = teacher.name ||
                `ID:${teacher.id} ${teacher.user_email || 'Без данных'}`;

            // Формируем список курсов с иконками
            const coursesHTML = teacher.courses && teacher.courses.length > 0
                ? teacher.courses.map(course => {
                    const icon = course.cover_url
                        ? `<img src="${course.cover_url}" alt="${course.title}" class="course-icon">`
                        : `<div class="course-icon-placeholder">${course.title.charAt(0)}</div>`;

                    return `
                    <div class="teacher-course-with-icon" title="${course.title}">
                        ${icon}
                        <span class="course-title">${course.title}</span>
                    </div>
                `;
                }).join('')
                : '<span class="teacher-course none">Нет курсов</span>';

            return `
                        <div class="teacher-item">
                          <div class="teacher-info">
                            <strong>${displayInfo}</strong>
                            <div class="teacher-courses-grid">
                                ${coursesHTML}
                            </div>
                          </div>
                          <button class="submit-button teacher-schedule-btn" 
                                  data-teacher-id="${teacher.id}"
                                  data-user-id="${teacher.user}"
                                  data-teacher-name="${displayInfo}">
                            Расписание
                          </button>
                        </div>
                      `;
        }).join('');

        this.updateContent(`
          <div class="teachers-list">
            ${teachersHTML}
          </div>
        `);
    }

    setupTeachersEvents() {
        this.modalElement.addEventListener('click', (e) => {
            // Обработка кнопки "Расписание"
            if (e.target.classList.contains('teacher-schedule-btn')) {
                const teacherId = e.target.dataset.teacherId;
                const userId = e.target.dataset.userId;
                const teacherName = e.target.dataset.teacherName;
                this.close();
                this.showTeacherSchedule(teacherId, userId);
                this.showSchedulePanel(teacherName);
            }

            // Повторная попытка загрузки
            if (e.target.id === 'retry-teachers-btn') {
                this.initTeachersContent();
            }
        });
    }

    showTeacherSchedule(teacherId, userId) {
        scheduleState.isAnother = true;
        scheduleState.teacherId = teacherId
        scheduleState.userId = userId
        console.log(`Просмотр расписания для User с ID: ${userId}, TeacherId: ${teacherId}`);
        calendarManager.loadSchedule(teacherId, userId);
    }

    showSchedulePanel(teacherName) {
        const panel = document.getElementById('schedule-info-panel');
        const infoText = document.getElementById('schedule-info-text-name');

        if (panel && infoText) {
            infoText.textContent = teacherName;
            panel.style.display = 'flex';

            const toggleBtn = document.getElementById('toggle-schedule-panel');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', this.toggleSchedulePanel);
            }
        }
    }

    toggleSchedulePanel() {
        const panel = document.getElementById('schedule-info-panel');
        if (panel) {
            panel.classList.toggle('collapsed');

            const toggleBtn = document.getElementById('toggle-schedule-panel');
            if (toggleBtn) {
                toggleBtn.title = panel.classList.contains('collapsed') ? 'Развернуть' : 'Свернуть';
            }
        }
    }
}