import * as utils from "./utils.js";
import {showNotification} from "./notifications.js";
import {calendarManager, scheduleState} from "./app.js";

export class SettingsManager {
    constructor() {
        this.isOpenWindowsMode = false; // Флаг для отслеживания состояния выбора открытых окон
        this.openWindowStates = {}; // Объект для хранения состояния чекбоксов

        // Добавляем свойства для рабочих часов
        this.startHour = 6; // значение по умолчанию
        this.endHour = 18;  // значение по умолчанию


        this.modal = document.getElementById('settings-modal');
        this.startHourSelect = document.getElementById('start-hour');
        this.endHourSelect = document.getElementById('end-hour');
        this.closeButton = this.modal.querySelector('.close');
        this.cancelButton = this.modal.querySelector('.cancel-button');
        this.submitButton = this.modal.querySelector('.submit-button');
        this.themeSwitch = document.getElementById('theme-switch');
        this.openWindowsButton = document.getElementById('set-open-windows');
        this.openWindowsControls = document.getElementById('open-windows-controls');

        // Загружаем сохраненные настройки
        this.loadSettingsFromServer();

        // Настройка событий и инициализация
        this.setupEventListeners();
        this.initializeTimeOptions();
    }

    getWorkingHours() {
        return {
            start: this.startHour,
            end: this.endHour
        };
    }

    async loadSettingsFromServer() {
        try {
            const response = await fetch('/get-user-settings/');
            const data = await response.json();

            if (data.theme) {
                document.documentElement.setAttribute('data-theme', data.theme);
                this.themeSwitch.checked = data.theme === 'dark';
            }
            if (data.workingHours) {
                const {start, end} = data.workingHours;
                if (this.isValidWorkingHours(start, end)) {
                    // Сохраняем настройки, но НЕ вызываем calendarManager
                    this.startHour = start;
                    this.endHour = end;
                    console.log(`SettingsManager: loaded working hours ${start}-${end}`);
                }
            }
        } catch (error) {
            console.error('Ошибка при загрузке настроек:', error);
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
            console.log('Настройки сохранены:', data);
        } catch (error) {
            console.error('Ошибка при сохранении настроек:', error);
            throw error;
        }
    }

    isValidWorkingHours(startHour, endHour) {
        return (
            !isNaN(startHour) && // Проверяем, что startHour — число
            !isNaN(endHour) && // Проверяем, что endHour — число
            startHour >= 0 && // Начальный час не меньше 0
            endHour <= 23 && // Конечный час не больше 23
            startHour < endHour // Начальный час меньше конечного
        );
    }

    initializeTimeOptions() {
        if (!this.startHourSelect || !this.endHourSelect) {
            console.error('Элементы startHourSelect или endHourSelect не найдены');
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
            console.error('Не найдены необходимые элементы DOM');
            return;
        }

        this.startHourSelect.value = calendarManager.startHour;
        this.endHourSelect.value = calendarManager.endHour;

        this.modal.classList.add('visible'); // Добавляем класс для видимости
        this.modal.style.display = 'block';

        this.resetModalScroll();
    }

    resetModalScroll() {
        const modalContent = this.modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        } else {
            console.warn('Элемент .modal-content не найден');
        }
    }

    addHourClickHandlers() {
        this.hourClickHandler = (event) => {
            // Если кликнули по чекбоксу - ничего не делаем, он сам обработает клик
            if (event.target.classList.contains('open-window-checkbox')) {
                return;
            }

            // Если кликнули по уроку - не переключаем чекбокс
            if (event.target.closest('.lesson')) {
                return;
            }

            const hourElement = event.currentTarget;
            const checkbox = hourElement.querySelector('.open-window-checkbox');

            // Переключаем состояние чекбокса
            checkbox.checked = !checkbox.checked;

            // Вызываем обработчик изменения чекбокса
            const changeEvent = new Event('change');
            checkbox.dispatchEvent(changeEvent);
        };

        document.querySelectorAll('.hour').forEach(hour => {
            hour.addEventListener('click', this.hourClickHandler);
        });
    }

    removeHourClickHandlers() {
        // Удаляем обработчики со всех часов
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

        this.themeSwitch.addEventListener('change', () => {
            const theme = this.themeSwitch.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            this.saveSettingsToServer({theme});
        });

        this.openWindowsButton.onclick = (e) => {
            e.preventDefault();
            this.toggleOpenWindows();
            utils.closeConfirmationModal();
        };

        // Обработчик для кнопки "Сохранить открытые окна"
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

        // Сохраняем настройки на сервере
        this.saveSettingsToServer({
            working_hours_start: startHour,
            working_hours_end: endHour,
        })
            .then(() => {
                console.log('Рабочие часы успешно сохранены');
                calendarManager.updateWorkingHours(startHour, endHour); // Обновляем календарь
                this.close();
            })
            .catch((error) => {
                console.error('Ошибка при сохранении рабочих часов:', error);
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
            console.log('Открытые окна не изменились');
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

        console.log("Режим настройки окон переключен");
        this.isOpenWindowsMode = !this.isOpenWindowsMode;

        if (this.openWindowsControls) {
            const isVisible = this.openWindowsControls.style.display === 'block';
            this.openWindowsControls.style.display = isVisible ? 'none' : 'block';
        }

        this.addCheckboxesToHours();

        // Добавляем или удаляем обработчики кликов
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

            // Удаляем старый чекбокс, если есть
            const existingCheckbox = hourElement.querySelector('.open-window-checkbox');
            if (existingCheckbox) {
                existingCheckbox.remove();
            }

            // Создаем новый видимый чекбокс
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'open-window-checkbox';
            checkbox.checked = hourElement.classList.contains('open-window');

            hourElement.appendChild(checkbox);

            // Добавляем/убираем режим редактирования
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
            console.error('Элементы count или selected-count не найдены');
            return;
        }

        // Считаем актуальное количество открытых окон из DOM
        const openWindowElements = document.querySelectorAll('.hour.open-window');
        const selectedCount = openWindowElements.length;

        countElement.textContent = selectedCount.toString();
        selectedCountPanel.style.display = selectedCount > 0 ? 'block' : 'none';

        console.log(`Обновлен счетчик: ${selectedCount} открытых окон`);
    }
}