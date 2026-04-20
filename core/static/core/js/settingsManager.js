import * as utils from "./utils.js";
import {showNotification} from "./notifications.js";
import {calendarManager, scheduleState} from "./app.js";
import {createLogger} from "./logger.js";

const logger = createLogger('[SettingsManager]');
logger.disable()

export class SettingsManager {
    constructor() {
        // Инициализация состояний
        this.isOpenWindowsMode = false;
        this.openWindowStates = {};
        this.startHour = 6;
        this.endHour = 18;

        // Инициализация DOM элементов
        this.initializeDOMElements();

        // Инициализация localStorage
        this.initializeLocalStorage();

        // Настройка событий и опций
        this.setupEventListeners();
        this.initializeTimeOptions();
    }

    initializeLocalStorage() {
        logger.log('🔄 Инициализация localStorage');

        // Рабочие часы
        const savedWorkingHours = localStorage.getItem('workingHours');
        if (savedWorkingHours) {
            try {
                const {start, end} = JSON.parse(savedWorkingHours);
                if (this.isValidWorkingHours(start, end)) {
                    this.startHour = start;
                    this.endHour = end;
                }
            } catch (e) {
                logger.error('Ошибка парсинга рабочих часов из localStorage:', e);
            }
        }
    }

    initializeDOMElements() {
        logger.log('🔄 Инициализация DOM элементов');

        this.modal = document.getElementById('settings-modal');
        this.startHourSelect = document.getElementById('start-hour');
        this.endHourSelect = document.getElementById('end-hour');
        this.closeButton = this.modal?.querySelector('.close');
        this.cancelButton = this.modal?.querySelector('.cancel-button');
        this.submitButton = this.modal?.querySelector('.submit-button');
        this.themeSwitch = document.getElementById('theme-switch');
        this.openWindowsButton = document.getElementById('set-open-windows');
        this.openWindowsControls = document.getElementById('open-windows-controls');

        if (!this.modal || !this.startHourSelect || !this.endHourSelect) {
            logger.error('Не найдены необходимые DOM элементы для SettingsManager');
            throw new Error('Required DOM elements not found');
        }
    }

    applyLocalSettings() {
        logger.log('🔄 Применяем настройки из localStorage');

        const savedWorkingHours = localStorage.getItem('workingHours');
        if (savedWorkingHours) {
            try {
                const {start, end} = JSON.parse(savedWorkingHours);
                if (this.isValidWorkingHours(start, end)) {
                    this.startHour = start;
                    this.endHour = end;
                    logger.log(`🕐 Применили рабочие часы из localStorage: ${start}-${end}`);
                    return {start, end};
                }
            } catch (e) {
                logger.error('Ошибка парсинга рабочих часов из localStorage:', e);
            }
        }
        return null;
    }

    getWorkingHours() {
        return {
            start: this.startHour,
            end: this.endHour
        };
    }

    async loadSettingsFromServer() {
        logger.log('🔄 loadSettingsFromServer() - начал выполнение');
        try {
            const response = await fetch('/get-user-settings/');
            const data = await response.json();
            logger.log('📥 Данные настроек получены:', data);

            // Синхронизация темы (только синхронизация переключателя, без применения)
            if (data.theme && this.themeSwitch) {
                this.themeSwitch.checked = data.theme === 'dark';
            }

            // Синхронизация рабочих часов
            if (data.workingHours) {
                const {start, end} = data.workingHours;
                if (this.isValidWorkingHours(start, end)) {
                    logger.log(`🕐 Рабочие часы с сервера: ${start}-${end}`);
                    const savedHours = localStorage.getItem('workingHours');
                    const savedData = savedHours ? JSON.parse(savedHours) : null;

                    if (!savedData || savedData.start !== start || savedData.end !== end) {
                        this.startHour = start;
                        this.endHour = end;
                        localStorage.setItem('workingHours', JSON.stringify({start, end}));
                    }
                }
            }
            logger.log('✅ Загрузка настроек завершена');
        } catch (error) {
            logger.error('❌ Ошибка загрузки настроек:', error);
        }
    }

    async saveSettingsToServer(settings) {
        function getCsrfToken() {
            return document.querySelector('[name=csrfmiddlewaretoken]').value;
        }

        try {
            const response = await fetch('/update-user-settings/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: new URLSearchParams(settings).toString(),
            });
            const data = await response.json();
            logger.log('Настройки сохранены:', data);
        } catch (error) {
            logger.error('Ошибка при сохранении настроек:', error);
            throw error;
        }
    }

    isValidWorkingHours(startHour, endHour) {
        return (
            !isNaN(startHour) &&
            !isNaN(endHour) &&
            startHour >= 0 &&
            endHour <= 23 &&
            startHour < endHour
        );
    }

    initializeTimeOptions() {
        if (!this.startHourSelect || !this.endHourSelect) {
            logger.error('Элементы startHourSelect или endHourSelect не найдены');
            return;
        }

        this.startHourSelect.innerHTML = '';
        this.endHourSelect.innerHTML = '';

        Array.from({length: 24}, (_, i) => {
            const hour = String(i).padStart(2, '0');
            const time = `${hour}:00`;
            this.startHourSelect.add(new Option(time, i));
            this.endHourSelect.add(new Option(time, i));
        });
    }

    open() {
        if (!this.startHourSelect || !this.endHourSelect || !this.modal) {
            logger.error('Не найдены необходимые элементы DOM');
            return;
        }

        this.startHourSelect.value = calendarManager.startHour;
        this.endHourSelect.value = calendarManager.endHour;

        // Синхронизируем переключатель темы с текущей темой
        if (this.themeSwitch) {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            this.themeSwitch.checked = (currentTheme === 'dark');
        }

        this.modal.classList.add('visible');
        this.modal.style.display = 'block';
        this.resetModalScroll();
    }

    resetModalScroll() {
        const modalContent = this.modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        } else {
            logger.warn('Элемент .modal-content не найден');
        }
    }

    addHourClickHandlers() {
        this.hourClickHandler = (event) => {
            if (event.target.classList.contains('open-window-checkbox')) {
                return;
            }
            if (event.target.closest('.lesson')) {
                return;
            }

            const hourElement = event.currentTarget;
            const checkbox = hourElement.querySelector('.open-window-checkbox');
            checkbox.checked = !checkbox.checked;
            const changeEvent = new Event('change');
            checkbox.dispatchEvent(changeEvent);
        };

        document.querySelectorAll('.hour').forEach(hour => {
            hour.addEventListener('click', this.hourClickHandler);
        });
    }

    removeHourClickHandlers() {
        document.querySelectorAll('.hour').forEach(hour => {
            hour.removeEventListener('click', this.hourClickHandler);
        });
        this.hourClickHandler = null;
    }

    close() {
        this.modal.classList.remove('visible');
        this.modal.style.display = 'none';
    }

    setupEventListeners() {
        document.getElementById('settings-button').addEventListener('click', () => {
            if (this.isOpenWindowsMode) {
                showNotification("Недоступно в режиме выбора открытых окон", "error");
            } else {
                this.open();
            }
        });

        this.closeButton.onclick = () => this.close();
        this.cancelButton.onclick = () => this.close();

        document.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        this.submitButton.onclick = (e) => this.handleSubmit(e);

        // Обработчик темы удалён — теперь управляется из theme.js

        this.openWindowsButton.onclick = (e) => {
            e.preventDefault();
            this.toggleOpenWindows();
            utils.closeConfirmationModal();
        };

        const saveOpenWindowsButton = document.getElementById('save-open-windows');
        if (saveOpenWindowsButton) {
            saveOpenWindowsButton.onclick = () => utils.showConfirmationModal({
                    text: "Вы уверены, что хотите изменить открытые окна?",
                    onConfirm: () => this.applyOpenSlotsUpdate(),
                    onCancel: () => this.turnOffOpenWindowsMode()
                }
            );
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        const startHour = parseInt(this.startHourSelect.value);
        const endHour = parseInt(this.endHourSelect.value);

        if (!this.isValidWorkingHours(startHour, endHour)) {
            alert('Время начала должно быть меньше времени окончания');
            return;
        }

        localStorage.setItem('workingHours', JSON.stringify({start: startHour, end: endHour}));

        this.saveSettingsToServer({
            working_hours_start: startHour,
            working_hours_end: endHour,
        })
            .then(() => {
                logger.log('Рабочие часы успешно сохранены');
                calendarManager.updateWorkingHours(startHour, endHour);
                this.close();
            })
            .catch((error) => {
                logger.error('Ошибка при сохранении рабочих часов:', error);
                alert('Ошибка при сохранении рабочих часов');
            });
    }

    applyOpenSlotsUpdate() {
        const newOpenSlots = {
            "monday": [], "tuesday": [], "wednesday": [], "thursday": [],
            "friday": [], "saturday": [], "sunday": []
        };

        document.querySelectorAll('.hour.open-window').forEach((hourElement) => {
            const day = hourElement.getAttribute('data-day');
            const hour = hourElement.getAttribute('data-hour');
            if (!newOpenSlots[day]) {
                newOpenSlots[day] = [];
            }
            newOpenSlots[day].push(hour);
        });

        const currentOpenSlots = calendarManager.openSlots;
        const isChanged = JSON.stringify(newOpenSlots) !== JSON.stringify(currentOpenSlots);

        if (!isChanged) {
            logger.log('Открытые окна не изменились');
            showNotification("Открытые окна не изменились", "info");
            this.turnOffOpenWindowsMode();
            return;
        }

        calendarManager.openSlots = newOpenSlots;

        calendarManager.updateOpenSlots(calendarManager.openSlots)
            .then(() => {
                console.log('Открытые слоты успешно обновлены');
                showNotification("Открытые окна успешно сохранены", "success");
            })
            .catch((error) => {
                console.error('Ошибка при обновлении открытых окон:', error);
                showNotification("Ошибка при обновлении открытых окон", "error");
            })
            .finally(() => {
                this.turnOffOpenWindowsMode();
            });
    }

    toggleOpenWindows() {
        if (scheduleState.isAnother) {
            showNotification("Можно изменять только свои открытые окна", "error")
            return
        }

        logger.log("Режим настройки окон переключен");
        this.isOpenWindowsMode = !this.isOpenWindowsMode;

        if (this.openWindowsControls) {
            const isVisible = this.openWindowsControls.style.display === 'block';
            this.openWindowsControls.style.display = isVisible ? 'none' : 'block';
        }

        this.addCheckboxesToHours();

        if (this.isOpenWindowsMode) {
            this.addHourClickHandlers();
            this.updateSelectedCount();
        } else {
            this.removeHourClickHandlers();
        }

        this.updateSelectedCount();
        this.close();

        const cancelButton = document.getElementById('cancel-open-windows');
        if (cancelButton) {
            cancelButton.onclick = () => this.turnOffOpenWindowsMode();
        }
    }

    turnOffOpenWindowsMode() {
        this.removeHourClickHandlers();

        document.querySelectorAll('.open-window-checkbox').forEach((checkbox) => {
            checkbox.remove();
        });

        document.querySelectorAll('.hour').forEach(hour => hour.classList.remove('open-window-mode'));

        const selectedCountPanel = document.getElementById('selected-count');
        if (selectedCountPanel) {
            selectedCountPanel.style.display = 'none';
        }

        this.isOpenWindowsMode = false;
        this.openWindowsControls.style.display = 'none';

        calendarManager.updateOpenWindowsOnly();
    }

    addCheckboxesToHours() {
        const hourElements = document.querySelectorAll('.hour');
        hourElements.forEach((hourElement) => {
            const day = hourElement.getAttribute('data-day');
            const hour = hourElement.getAttribute('data-hour');

            const existingCheckbox = hourElement.querySelector('.open-window-checkbox');
            if (existingCheckbox) {
                existingCheckbox.remove();
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'open-window-checkbox';
            checkbox.checked = hourElement.classList.contains('open-window');

            hourElement.appendChild(checkbox);

            if (this.isOpenWindowsMode) {
                hourElement.classList.add('open-window-mode');
            } else {
                hourElement.classList.remove('open-window-mode');
            }

            checkbox.addEventListener('change', () => {
                hourElement.classList.toggle('open-window', checkbox.checked);

                if (!this.openWindowStates[day]) {
                    this.openWindowStates[day] = [];
                }

                if (checkbox.checked) {
                    if (!this.openWindowStates[day].includes(hour)) {
                        this.openWindowStates[day].push(hour);
                    }
                } else {
                    this.openWindowStates[day] = this.openWindowStates[day].filter(h => h !== hour);
                }

                this.updateSelectedCount();
            });
        });

        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const countElement = document.getElementById('count');
        const selectedCountPanel = document.getElementById('selected-count');

        if (!countElement || !selectedCountPanel) {
            logger.error('Элементы count или selected-count не найдены');
            return;
        }

        const openWindowElements = document.querySelectorAll('.hour.open-window');
        const selectedCount = openWindowElements.length;

        countElement.textContent = selectedCount.toString();
        selectedCountPanel.style.display = selectedCount > 0 ? 'block' : 'none';

        logger.log(`Обновлен счетчик: ${selectedCount} открытых окон`);
        // Инициализация состояний
        this.isOpenWindowsMode = false;
        this.openWindowStates = {};
        this.startHour = 6;
        this.endHour = 18;

        // Инициализация DOM элементов
        this.initializeDOMElements();
    }
}