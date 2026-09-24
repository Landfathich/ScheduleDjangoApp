let notifications = [];

async function loadNotifications() {
    const response = await fetch('/api/notifications/');
    const data = await response.json();

    notifications = data.results;

    renderNotifications();
}

function renderNotifications() {
    const container = document.getElementById('notifications-list');

    if (!notifications.length) {
        container.innerHTML = `
            <div class="notifications-empty">
                <div class="notifications-empty-title">
                    Уведомлений пока нет
                </div>
                <div class="notifications-empty-text">
                    Здесь появятся важные события, связанные с вами.
                </div>
            </div>
        `;

        return;
    }

    container.innerHTML = notifications.map(notification => `
        <button
            class="notification-item ${notification.is_read ? 'read' : 'unread'}"
            data-notification-id="${notification.id}"
            type="button"
        >
            <div class="notification-indicator"></div>

            <div class="notification-content">
                <div class="notification-top">
                    <strong>${escapeHtml(notification.title)}</strong>

                    ${notification.is_read
        ? '<span class="notification-status">Прочитано</span>'
        : '<span class="notification-status unread-status">Новое</span>'
    }
                </div>

                <p>${escapeHtml(notification.body)}</p>

                <small>
                    ${new Date(notification.created_at).toLocaleString('ru-RU')}
                </small>
            </div>
        </button>
    `).join('');

    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            openNotification(Number(item.dataset.notificationId));
        });
    });
}

async function openNotification(notificationId) {
    const notification = notifications.find(
        item => item.id === notificationId
    );

    if (!notification) {
        return;
    }

    if (!notification.is_read) {
        await markNotificationRead(notificationId);
    }

    const modal = document.getElementById('notification-modal');
    const content = document.getElementById('notification-modal-content');

    const taskUrl = extractTaskUrl(notification.body);

    content.innerHTML = `
        <div class="notification-modal-header">
            <span class="notification-modal-label">
                ${notification.is_read ? 'Уведомление' : 'Новое уведомление'}
            </span>

            <h3>${escapeHtml(notification.title)}</h3>

            <small>
                ${new Date(notification.created_at).toLocaleString('ru-RU')}
            </small>
        </div>

        <div class="notification-modal-body">
            ${escapeHtml(notification.body).replace(/\n/g, '<br>')}
        </div>

        ${taskUrl ? `
            <div class="notification-modal-actions">
                <a href="${taskUrl}" class="btn">
                    Открыть задачу
                </a>
            </div>
        ` : ''}
    `;

    modal.classList.add('show');

    renderNotifications();
}

async function markNotificationRead(notificationId) {
    await fetch(`/api/notifications/${notificationId}/mark_read/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        }
    });

    const notification = notifications.find(
        item => item.id === notificationId
    );

    if (notification) {
        notification.is_read = true;
    }
}

document.getElementById('mark-all-read').addEventListener('click', async () => {
    await fetch('/api/notifications/mark_all_read/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        }
    });

    notifications.forEach(notification => {
        notification.is_read = true;
    });

    renderNotifications();
});

document.querySelector('.notification-modal-close').addEventListener('click', () => {
    document.getElementById('notification-modal').classList.remove('show');
});

document.getElementById('notification-modal').addEventListener('click', event => {
    if (event.target.id === 'notification-modal') {
        event.currentTarget.classList.remove('show');
    }
});

function extractTaskUrl(body) {
    const match = body.match(/https?:\/\/[^\s]+/);

    return match ? match[0] : null;
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;

    return div.innerHTML;
}

function getCookie(name) {
    const cookies = document.cookie.split(';');

    for (const cookie of cookies) {
        const [key, value] = cookie.trim().split('=');

        if (key === name) {
            return decodeURIComponent(value);
        }
    }

    return '';
}

loadNotifications();