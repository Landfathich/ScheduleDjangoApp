import {CalendarManager} from "./calendarManager.js";
import {SettingsManager} from "./settingsManager.js";
import {TeachersModal} from "./modals/teachersModal.js";
import {PaymentsModal} from "./modals/paymentsModal.js";
import {updateCounter} from "./utils.js";
import {showNotification} from "./notifications.js";
import {LessonModal} from "./modals/lessonModal.js";
import {Repository} from "./repository.js";
import {BalanceAlertModal} from "./modals/balanceAlertModal.js";

export const scheduleState = {
    isAnother: false,
    teacherId: currentTeacherId,
    userId: currentUserId
};

export const repository = new Repository();
export const settingsManager = new SettingsManager();
export const calendarManager = new CalendarManager();

// Главная функция инициализации
export async function initApp() {
    console.log('Starting app initialization...');

    // Инициализируем все последовательно
    await settingsManager.loadSettingsFromServer();
    await calendarManager.initialize();

    // Настраиваем функционал
    setupAdminTools();
    setupContextMenu();
    setupLessonModal();

    console.log('App initialized successfully');
}

function setupAdminTools() {
    if (!userData.isAdmin) return;

    console.log("Setting up admin tools");

    document.getElementById('teachers-button').addEventListener('click', () => {
        new TeachersModal().open();
    });

    document.getElementById("payments-button").addEventListener('click', () => {
        new PaymentsModal().open();
    });

    document.getElementById("balance-alert-button").addEventListener('click', () => {
        new BalanceAlertModal().open();
    });

    // Загружаем счетчики
    loadCounters();
}

async function loadCounters() {
    const [lowBalanceClientsCount, paymentsCount] = await Promise.all([
        repository.loadLowBalanceClientsCount(),
        repository.loadPaymentsCount()
    ]);

    updateCounter('balance-alert-counter', lowBalanceClientsCount);
    updateCounter('payments-counter', paymentsCount);
}

function setupLessonModal() {
    window.openLessonModal = (lessonData) => {
        if (settingsManager.isOpenWindowsMode) {
            showNotification("Недоступно в режиме выбора открытых окон", "error");
        } else {
            new LessonModal().open(lessonData);
        }
    };
}

function setupContextMenu() {
    const customContextMenu = document.createElement('div');
    customContextMenu.id = 'custom-context-menu';
    customContextMenu.style.display = 'none';
    customContextMenu.innerHTML = `
        <div class="menu-item" data-action="refresh">🔄 Обновить расписание</div>
    `;
    document.body.appendChild(customContextMenu);

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        customContextMenu.style.display = 'block';
        customContextMenu.style.left = `${e.pageX}px`;
        customContextMenu.style.top = `${e.pageY}px`;
    });

    document.addEventListener('click', (e) => {
        if (e.button !== 2) customContextMenu.style.display = 'none';
    });

    customContextMenu.addEventListener('click', (e) => {
        const menuItem = e.target.closest('.menu-item');
        if (menuItem?.dataset.action === 'refresh') {
            calendarManager.loadSchedule(scheduleState.teacherId, scheduleState.userId);
        }
        customContextMenu.style.display = 'none';
    });
}