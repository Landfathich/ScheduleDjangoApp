import {Modal} from './modal.js';
import {repository} from "../app.js";

export class BalanceAlertModal extends Modal {
    constructor(options = {}) {
        super({
            title: 'Клиенты с низким балансом',
            modalClass: 'balance-alert-modal',
            modalContentClass: 'balance-alert-modal-content',
            ...options
        });

        this.loadClientsData();
        this.setupEvents();
    }

    setupEvents() {
        this.modalElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('contact-btn')) {
                this.handleContactClient(e.target.dataset.clientId);
            }
        });
    }

    async loadClientsData() {
        try {
            const data = await repository.loadLowBalanceClients();

            if (data && data.clients) {
                this.displayClients(data.clients);
            } else {
                console.error('Не удалось загрузить данные клиентов');
            }
        } catch (error) {
            console.error('Ошибка при загрузке клиентов:', error);
        }
    }

    displayClients(clients) {
        // Группируем клиентов по балансу
        const negativeBalance = clients.filter(c => c.balance < 0);
        const zeroBalance = clients.filter(c => c.balance === 0);
        const lowBalance = clients.filter(c => c.balance === 1);
        const warningBalance = clients.filter(c => c.balance === 2);


        const sections = [
            {
                title: '🟣 Отрицательный баланс',
                className: 'negative-balance',
                clients: negativeBalance,
                show: negativeBalance.length > 0
            },
            {
                title: '🔴 Нулевой баланс',
                clients: zeroBalance,
                className: 'zero-balance',
                show: zeroBalance.length > 0
            },
            {
                title: '🟠 Остался 1 урок',
                clients: lowBalance,
                className: 'low-balance',
                show: lowBalance.length > 0
            },
            {
                title: '🟡 Осталось 2 урока',
                clients: warningBalance,
                className: 'warning-balance',
                show: warningBalance.length > 0
            }
        ];

        const visibleSections = sections.filter(section => section.show);

        const sectionsHTML = visibleSections.map(section => `
            <div class="balance-section ${section.className}">
                <h3>${section.title} (${section.clients.length})</h3>
                ${section.clients.length > 0
            ? this.renderClientsList(section.clients)
            : '<p class="no-clients">Нет клиентов в этой категории</p>'
        }
            </div>
        `).join('');

        this.updateContent(`
            <div class="balance-alert-container horizontal-layout">
                ${sectionsHTML}
            </div>
        `);
    }

    renderClientsList(clients) {
        return clients.map(client => `
            <div class="client-card" data-client-id="${client.id}">
                <div class="client-info">
                    <h4>${client.name}${client.children && client.children.length > 0 ?
            ` (${client.children.map(child =>
                `<a href="/admin/core/student/${child.id}/change/" 
                               target="_blank" 
                               class="child-link"
                               title="Редактировать в админке">
                               ${child.name}
                            </a>`
            ).join(', ')})` :
            ''}</h4>
                    <div class="client-details">
                        ${client.balance < 0 ? `<p>Баланс: ${client.balance}</p>` : ''}
                        ${client.phone_note ? `<p>${client.phone_note}</p>` : ''}
                        ${client.phone ? `<p>${client.phone}</p>` : ''}
                    </div>
                </div>
                <div class="client-actions">
                    <button class="contact-btn" data-client-id="${client.id}">
                        Связаться
                    </button>
                    <a class="admin-link" data-target="_blank" title="Открыть в админке" href="/admin/core/client/${client.id}/change/">
                        ⚙️
                    </a>
                </div>
            </div>
        `).join('');

        /*<div className="client-details">
            <p>Телефон: ${client.parent_phone}</p>
            ${client.balance < 0 ? `<p>Баланс: ${client.balance}</p>` : ''}
            <p>Последняя оплата:
                ${client.last_payment_date ? formatDate(new Date(client.last_payment_date)) : 'нет данных'}</p>
            <p>Следующий урок:
                ${client.next_lesson_date ? formatDate(new Date(client.next_lesson_date)) : 'не запланирован'}</p>
        </div>*/
    }

    handleContactClient(clientId) {
        // Заглушка для обработки контакта с клиентом
        console.log(`Контактируем с клиентом ID: ${clientId}`);
        showNotification(`Отправлено уведомление родителю клиента ${clientId}`, 'success');

        // Здесь будет реальная логика связи:
        // 1. Можно открыть форму email/sms
        // 2. Или автоматически отправлять напоминание
    }
}