let currentConversationId = null;
let ws = null;
let currentUserId = null;
let currentUserName = '';

// Элементы DOM
let placeholderPanel, chatPanel, chatHeader, messagesArea, messageInput, sendBtn, conversationsList, searchInput,
    searchResults;

// Инициализация
function initChat(userId, userName, initialConversationId, initialOtherUser, initialMessages, totalUnread) {
    currentUserId = userId;
    currentUserName = userName;

    // Получаем элементы
    placeholderPanel = document.getElementById('placeholder-panel');
    chatPanel = document.getElementById('chat-panel');
    chatHeader = document.getElementById('chat-header');
    messagesArea = document.getElementById('messages-area');
    messageInput = document.getElementById('message-input');
    sendBtn = document.getElementById('send-btn');
    conversationsList = document.getElementById('conversations-list');
    searchInput = document.getElementById('user-search');
    searchResults = document.getElementById('search-results');

    // Навешиваем обработчики
    attachEventListeners();

    // Обновляем счётчик в хедере
    if (totalUnread !== undefined) {
        updateHeaderUnreadCount(totalUnread);
    }

    // Если есть начальный диалог, открываем его
    if (initialConversationId) {
        openConversation(initialConversationId, initialOtherUser);
        loadMessages(initialMessages);
    }
}

function attachEventListeners() {
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    // Клик по диалогам (делегирование)
    conversationsList.addEventListener('click', function (e) {
        const item = e.target.closest('.conversation-item');
        if (item) {
            const convId = parseInt(item.dataset.conversationId);
            const convName = item.querySelector('.conversation-name').textContent.replace(/[0-9]+/g, '').trim();
            openConversation(convId, convName);
        }
    });

    // Поиск
    let searchTimeout;
    searchInput.addEventListener('focus', () => loadUsers(''));
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadUsers(this.value.trim()), 300);
    });

    document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Кнопки назад/вперёд
    window.addEventListener('popstate', handlePopState);
}

function handlePopState(event) {
    const conversationId = event.state?.conversationId;
    if (conversationId) {
        fetch(`/chat/api/conversation/${conversationId}/`)
            .then(response => response.json())
            .then(data => {
                openConversation(conversationId, data.other_user_name);
            });
    } else {
        placeholderPanel.classList.remove('hidden');
        chatPanel.classList.add('hidden');
        if (ws) ws.close();
        currentConversationId = null;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

function addMessageToChat(content, senderId, senderName, timestamp, isSent = null) {
    const isSentMsg = (isSent !== null) ? isSent : (senderId === currentUserId);
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSentMsg ? 'message-sent' : 'message-received'}`;

    messageDiv.innerHTML = `
        <div class="message-bubble">${escapeHtml(content)}</div>
        <div class="message-info">
            ${!isSentMsg ? escapeHtml(senderName) + ' • ' : ''}
            ${timestamp}
        </div>
    `;

    messagesArea.appendChild(messageDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function loadMessages(messages) {
    messagesArea.innerHTML = '';
    if (messages.length === 0) {
        messagesArea.innerHTML = '<div class="empty-messages">Нет сообщений. Напишите что-нибудь!</div>';
    } else {
        messages.forEach(msg => {
            addMessageToChat(msg.content, msg.sender_id, msg.sender_name, msg.timestamp);
        });
    }
}

function updateConversationPreview(conversationId, message, senderName) {
    const convItem = document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`);
    if (!convItem) return;

    const previewDiv = convItem.querySelector('.conversation-preview');
    if (previewDiv) {
        const isOwnMessage = (senderName === currentUserName);
        const prefix = isOwnMessage ? 'Вы: ' : `${senderName}: `;
        previewDiv.textContent = prefix + message.substring(0, 30);
        if (message.length > 30) previewDiv.textContent += '...';
    }
}

function connectWebSocket(conversationId) {
    if (ws) {
        ws.close();
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/chat/${conversationId}/`;
    ws = new WebSocket(wsUrl);

    ws.onopen = function () {
        console.log('WebSocket подключен');
    };

    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);
        if (data.type === 'chat') {
            addMessageToChat(data.message, data.sender_id, data.username, formatTime());

            // Если сообщение от другого пользователя
            if (data.sender_id !== currentUserId) {
                // Обновляем предпросмотр в списке диалогов
                updateConversationPreview(currentConversationId, data.message, data.username);

                // Если это не текущий открытый чат, увеличиваем счётчик
                if (currentConversationId !== parseInt(data.conversation_id)) {
                    incrementConversationUnreadCount(currentConversationId);
                    updateTotalUnreadCount();
                }
            }
        }
    };

    ws.onerror = function (error) {
        console.error('WebSocket ошибка:', error);
    };

    ws.onclose = function () {
        console.log('WebSocket отключен');
    };
}

function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({'message': content}));
    messageInput.value = '';
    messageInput.style.height = 'auto';
}

function updateHeaderUnreadCount(count) {
    const chatNavLink = document.getElementById('chat-nav-link');
    if (!chatNavLink) return;

    const existingBadge = chatNavLink.querySelector('.chat-unread-total');
    if (existingBadge) {
        existingBadge.remove();
    }

    if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'chat-unread-total';
        badge.textContent = count;
        chatNavLink.appendChild(badge);
    }
}

function updateConversationUnreadCount(conversationId, newCount) {
    const convItem = document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`);
    if (!convItem) return;

    const nameDiv = convItem.querySelector('.conversation-name');
    const existingBadge = nameDiv.querySelector('.unread-badge');
    if (existingBadge) {
        existingBadge.remove();
    }

    if (newCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'unread-badge';
        badge.textContent = newCount;
        nameDiv.appendChild(badge);
    }
}

function incrementConversationUnreadCount(conversationId) {
    const convItem = document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`);
    if (!convItem) return;

    const nameDiv = convItem.querySelector('.conversation-name');
    const existingBadge = nameDiv.querySelector('.unread-badge');

    let currentCount = 0;
    if (existingBadge) {
        currentCount = parseInt(existingBadge.textContent) || 0;
        existingBadge.textContent = currentCount + 1;
    } else {
        const badge = document.createElement('span');
        badge.className = 'unread-badge';
        badge.textContent = '1';
        nameDiv.appendChild(badge);
    }
}

function updateTotalUnreadCount() {
    const badges = document.querySelectorAll('.conversation-item .unread-badge');
    let total = 0;
    badges.forEach(badge => {
        const count = parseInt(badge.textContent);
        if (!isNaN(count)) {
            total += count;
        }
    });
    updateHeaderUnreadCount(total);
}

function openConversation(conversationId, otherUserName) {
    if (currentConversationId === conversationId) return;

    currentConversationId = conversationId;

    // Обновляем URL
    const newUrl = `/chat/${conversationId}/`;
    window.history.pushState({conversationId: conversationId}, '', newUrl);

    // Обновляем активный элемент в списке
    document.querySelectorAll('.conversation-item').forEach(item => {
        if (parseInt(item.dataset.conversationId) === conversationId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Показываем панель чата
    placeholderPanel.classList.add('hidden');
    chatPanel.classList.remove('hidden');
    document.getElementById('chat-header-name').textContent = otherUserName;

    // Загружаем сообщения
    fetch(`/chat/api/messages/${conversationId}/`)
        .then(response => {
            if (!response.ok) throw new Error('Network error');
            return response.json();
        })
        .then(data => {
            loadMessages(data.messages);
            connectWebSocket(conversationId);

            // Отмечаем сообщения как прочитанные
            return fetch(`/chat/api/mark-read/${conversationId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                }
            });
        })
        .then(response => response.json())
        .then(data => {
            if (data.marked_count > 0) {
                // Удаляем бейдж у этого диалога в списке
                const convItem = document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`);
                if (convItem) {
                    const badge = convItem.querySelector('.unread-badge');
                    if (badge) {
                        badge.remove();
                    }
                }
                // Обновляем общий счётчик в хедере
                updateTotalUnreadCount();
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки сообщений:', error);
        });
}

function startNewChat(userId, userName) {
    fetch(`/chat/api/start/${userId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.conversation_id) {
                addConversationToList(data.conversation_id, userName);
                openConversation(data.conversation_id, userName);
            }
        });
}

function addConversationToList(conversationId, userName) {
    if (document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`)) {
        return;
    }

    const newItem = document.createElement('div');
    newItem.className = 'conversation-item';
    newItem.dataset.conversationId = conversationId;
    newItem.innerHTML = `
        <div class="conversation-name">${escapeHtml(userName)}</div>
        <div class="conversation-preview">Нет сообщений</div>
    `;

    const list = document.getElementById('conversations-list');
    const emptyState = list.querySelector('.empty-state');
    if (emptyState) {
        list.innerHTML = '';
    }
    list.insertBefore(newItem, list.firstChild);
}

function loadUsers(query = '') {
    fetch(`/chat/search/?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.users.length === 0) {
                searchResults.innerHTML = '<div style="padding: 12px; text-align: center; color: #6b7280;">Ничего не найдено</div>';
            } else {
                searchResults.innerHTML = data.users.map(user => `
                    <div class="user-result">
                        <div>
                            <strong>${escapeHtml(user.full_name || user.username)}</strong>
                        </div>
                        <button class="start-chat-btn" data-user-id="${user.id}" data-user-name="${escapeHtml(user.full_name || user.username)}">Написать</button>
                    </div>
                `).join('');
            }

            document.querySelectorAll('.start-chat-btn').forEach(btn => {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const userId = this.dataset.userId;
                    const userName = this.dataset.userName;
                    startNewChat(userId, userName);
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                });
            });

            searchResults.style.display = 'block';
        });
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}