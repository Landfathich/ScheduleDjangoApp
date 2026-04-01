// core/static/core/js/notifications.js

class NotificationManager {
    constructor() {
        this.ws = null;
        this.init();
    }

    init() {
        if (!window.userIsAuthenticated) return;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/notifications/`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Notification WebSocket connected');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'new_message') {
                this.handleNewMessage(data);
            }
        };

        this.ws.onclose = () => {
            console.log('Notification WebSocket disconnected, reconnecting...');
            setTimeout(() => this.init(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('Notification WebSocket error:', error);
        };
    }

    handleNewMessage(data) {
        // Обновляем счётчик на кнопке "Чаты"
        const chatNavLink = document.getElementById('chat-nav-link');
        if (chatNavLink) {
            const existingBadge = chatNavLink.querySelector('.chat-unread-total');
            if (existingBadge) {
                existingBadge.textContent = data.unread_count;
            } else if (data.unread_count > 0) {
                const badge = document.createElement('span');
                badge.className = 'chat-unread-total';
                badge.textContent = data.unread_count;
                chatNavLink.appendChild(badge);
            }
        }

        // Если мы на странице чатов, обновим также список диалогов
        if (window.location.pathname.startsWith('/chat/')) {
            this.updateChatList(data);
        }

        // Показываем уведомление (если страница не активна)
        if (document.hidden) {
            this.showBrowserNotification(data);
        }
    }

    updateChatList(data) {
        // Обновляем предпросмотр диалога
        const convItem = document.querySelector(`.conversation-item[data-conversation-id="${data.conversation_id}"]`);
        if (convItem) {
            const previewDiv = convItem.querySelector('.conversation-preview');
            if (previewDiv) {
                previewDiv.textContent = `${data.sender_name}: ${data.message_preview}`;
            }

            // Обновляем счётчик
            const nameDiv = convItem.querySelector('.conversation-name');
            const existingBadge = nameDiv.querySelector('.unread-badge');
            if (existingBadge) {
                existingBadge.textContent = data.unread_count;
            } else if (data.unread_count > 0) {
                const badge = document.createElement('span');
                badge.className = 'unread-badge';
                badge.textContent = data.unread_count;
                nameDiv.appendChild(badge);
            }
        }
    }

    showBrowserNotification(data) {
        if (!("Notification" in window)) return;

        if (Notification.permission === "granted") {
            new Notification(`Новое сообщение от ${data.sender_name}`, {
                body: data.message_preview,
                icon: "/static/core/images/favicons/favicon-32x32.png"
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    if (window.userIsAuthenticated) {
        window.notificationManager = new NotificationManager();
    }
});