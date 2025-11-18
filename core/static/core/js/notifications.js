let notificationQueue = [];
let isNotificationShowing = false;
let notificationTimer = null;
let currentNotificationData = null;

export function showNotification(message, type = 'info') {
    notificationQueue.push({message, type});

    if (!isNotificationShowing) {
        showNextNotification();
    } else {
        updateNotificationBadge();
    }
}

export function clearAllNotifications() {
    console.log('Clearing all notifications from queue');

    // Мгновенная очистка без анимаций
    if (notificationTimer) {
        clearTimeout(notificationTimer);
        notificationTimer = null;
    }

    // Очищаем очередь
    notificationQueue = [];

    // Сбрасываем флаги
    isNotificationShowing = false;
    currentNotificationData = null;

    // Мгновенно скрываем уведомление без анимации
    const notification = document.getElementById('notification');
    if (notification) {
        notification.style.display = 'none';
        notification.classList.remove('notification-appear', 'notification-pop');

        // Сбрасываем прогресс-бар
        const progressBar = notification.querySelector('.notification-progress');
        if (progressBar) {
            resetProgressBar(progressBar);
        }

        // Сбрасываем обработчики
        document.getElementById('hide-button').onclick = null;
        document.getElementById('hide-all-button').onclick = null;

        // Удаляем бейдж
        const oldBadge = notification.querySelector('.notification-counter-badge');
        if (oldBadge) {
            oldBadge.remove();
        }
    }

    console.log('All notifications cleared');
}

function showNextNotification() {
    if (notificationQueue.length === 0) {
        isNotificationShowing = false;
        currentNotificationData = null;
        return;
    }

    isNotificationShowing = true;
    currentNotificationData = notificationQueue[0];

    const notification = document.getElementById('notification');
    const notificationText = notification.querySelector('.notification-text');
    const progressBar = notification.querySelector('.notification-progress');
    const hideAllButton = document.getElementById('hide-all-button');
    const hideButton = document.getElementById('hide-button');

    // Сбрасываем классы анимации
    notification.classList.remove('notification-appear', 'notification-pop');

    // Очищаем старый бейдж
    const oldBadge = notification.querySelector('.notification-counter-badge');
    if (oldBadge) {
        oldBadge.remove();
    }

    // Устанавливаем класс типа уведомления
    notification.className = 'notification';
    notification.classList.add(currentNotificationData.type);

    notificationText.textContent = currentNotificationData.message;
    updateNotificationBadge();

    // Сбрасываем прогресс-бар ПЕРЕД показом уведомления
    resetProgressBar(progressBar);

    notification.style.display = 'block';
    notification.style.zIndex = '1001';

    // Обработчики для кнопок действий
    const handleHide = () => {
        clearTimeout(notificationTimer);
        hideNotificationAndShowNext(notification);
    };

    const handleHideAll = () => {
        clearTimeout(notificationTimer);
        notificationQueue = [notificationQueue[0]];
        updateNotificationBadge();
        hideNotificationAndShowNext(notification);
    };

    hideButton.onclick = handleHide;
    hideAllButton.onclick = handleHideAll;

    // Анимация появления
    requestAnimationFrame(() => {
        notification.classList.add('notification-appear');

        // Запускаем прогресс-бар ПОСЛЕ появления уведомления
        requestAnimationFrame(() => {
            startProgressBar(progressBar);
        });
    });

    // Таймер автоматического скрытия
    notificationTimer = setTimeout(() => {
        hideNotificationAndShowNext(notification);
    }, 3000);
}

function updateNotificationBadge() {
    if (!isNotificationShowing || !currentNotificationData) return;

    const notification = document.getElementById('notification');
    const hideAllButton = document.getElementById('hide-all-button');

    const remainingCount = notificationQueue.length - 1;

    // Удаляем старый бейдж
    const oldBadge = notification.querySelector('.notification-counter-badge');
    if (oldBadge) {
        oldBadge.remove();
    }

    // Показываем/скрываем кнопку "Скрыть все" и бейдж
    if (remainingCount > 0) {
        hideAllButton.style.display = 'block';
        createNotificationCounterBadge(notification, remainingCount, currentNotificationData.type);
    } else {
        hideAllButton.style.display = 'none';
    }
}

function createNotificationCounterBadge(notification, count, type) {
    const badge = document.createElement('div');
    badge.className = `notification-counter-badge ${type} pulse floating`;
    badge.textContent = `${count}`;

    const notificationContent = notification.querySelector('.notification-content');
    notificationContent.appendChild(badge);
}

function startProgressBar(progressBar) {
    // Принудительно сбрасываем transition перед запуском анимации
    progressBar.style.transition = 'none';
    progressBar.style.transform = 'scaleX(1)';

    // Даем браузеру время применить сброс
    requestAnimationFrame(() => {
        progressBar.style.transition = 'transform 3s linear';
        progressBar.style.transform = 'scaleX(0)';
    });
}

function hideNotificationAndShowNext(notification) {
    const progressBar = notification.querySelector('.notification-progress');

    // Останавливаем анимацию прогресс-бара
    progressBar.style.transition = 'none';

    notification.classList.remove('notification-appear');
    notification.classList.add('notification-pop');

    setTimeout(() => {
        notification.style.display = 'none';
        notification.classList.remove('notification-pop');

        // Полностью сбрасываем прогресс-бар
        resetProgressBar(progressBar);

        notificationQueue.shift();
        currentNotificationData = null;

        // Сбрасываем обработчики
        document.getElementById('hide-button').onclick = null;
        document.getElementById('hide-all-button').onclick = null;

        showNextNotification();
    }, 400);
}

function resetProgressBar(progressBar) {
    // Полный сброс прогресс-бара
    progressBar.style.transition = 'none';
    progressBar.style.transform = 'scaleX(1)';
    progressBar.style.opacity = '1';

    // Принудительный reflow для гарантии применения стилей
    void progressBar.offsetWidth;
}

// Экспортируем функцию для глобального использования
window.showNotification = showNotification;
window.clearAllNotifications = clearAllNotifications;