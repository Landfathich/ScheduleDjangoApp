import {Modal} from './modal.js';
import {formatDate} from "../utils.js";
import {repository} from "../app.js";
import {TeachersModal} from "./teachersModal.js";

export class PaymentsModal extends Modal {
    constructor(options = {}) {
        super({
            title: 'Выплаты преподавателям',
            modalClass: 'payments-modal',
            ...options
        });

        this.loadPaymentsData();
        this.setupPaymentsEvents();
    }

    setupPaymentsEvents() {
        this.modalElement.addEventListener('click', async (e) => {
            if (e.target.id === 'generate-payments-btn') {
                await this.generatePayments();
            }
        });
    }

    async generatePayments() {
        const btn = this.modalElement.querySelector('#generate-payments-btn');
        try {
            btn.disabled = true;
            btn.textContent = 'Генерация...';

            const response = await fetch('/generate-payments/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': repository.csrfToken,
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (data.status === 'success') {
                showNotification("Выплаты успешно сгенерированы", "success");
                await this.loadPaymentsData(); // Автоматически загружаем обновленные данные
            } else {
                throw new Error(data.message || 'Ошибка генерации выплат');
            }
        } catch (error) {
            showNotification(error.message, "error");
            console.error('Ошибка генерации выплат:', error);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Сгенерировать выплаты';
        }
    }

    async loadPaymentsData() {
        try {
            const response = await fetch('/payments/');
            const data = await response.json();

            if (data.status === 'success') {
                this.displayPayments(data.payments);
            } else {
                throw new Error(data.message || 'Ошибка загрузки данных');
            }
        } catch (error) {
            this.updateContent(`
            <div class="payments-error">
                <p>Ошибка: ${error.message}</p>
                <button class="submit-button" id="retry-payments-btn">
                    Попробовать снова
                </button>
            </div>
        `);
        }
    }

    displayPayments(payments) {
        console.log(payments)
        if (!payments || payments.length === 0) {
            this.updateContent('<p class="no-payments">Нет данных о выплатах</p>');
            // Обновляем футер
            const footer = this.modalElement.querySelector('.modal-footer');
            footer.innerHTML = `
                <button class="generate-payments-btn" id="generate-payments-btn">
                    Сгенерировать выплаты
                </button>
            `;
            this.setupPaymentElements();
            return;
        }

        const paymentsHTML = payments.map(payment => `
                  <div class="form-group payment-item" data-payment-id="${payment.id}">
                      <div class="payment-row created-at-row">
                                <span class="payment-label">Сгенерировано:</span>
                                <span class="payment-value">${new Date(payment.created_at).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</span>
                      </div>
                      <div class="payment-row created-at-row">
                                <span class="payment-label">Оплатить до:</span>
                                <span class="payment-value">${new Date(payment.due_date).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })}</span>
                      </div>
                    <div class="payment-row">
                      <span class="payment-label">Преподаватель:</span>
                      <span class="payment-value"><button class="teacher-link" data-teacher-id="${payment.teacher_id}" data-user-id="${payment.user_id}">${payment.teacher}</button></span>
                    </div>
                    <div class="payment-row">
                      <span class="payment-label">Период:</span>
                      <span class="payment-value">${formatDate(new Date(payment.week_start))} - ${formatDate(new Date(payment.week_end))}</span>
                    </div>
                    <div class="payment-row">
              <span class="payment-label">Уроков:</span>
              <span class="payment-value lessons-count">
                <svg class="lesson-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
                ${payment.lessons}
              </span>
            </div>
        <div class="payment-row">
          <span class="payment-label">Сумма:</span>
          <span class="payment-value">${payment.amount} руб.</span>
        </div>
        <div class="payment-row">
          <span class="payment-label">Статус:</span>
          <span class="payment-status ${payment.is_paid ? 'paid' : 'unpaid'}">
            ${payment.is_paid ? 'Оплачено' : 'Не оплачено'}
          </span>
        </div>
        <div class="payment-row">
            <span>
                Сумма ${payment.amount} ${payment.currency}
            </span>
            <span>
            <button class="pay-btn" ${payment.is_paid ? 'disabled' : ''} data-payment-id="${payment.id}">
                        ${payment.is_paid ? '✓ Оплачено' : 'Оплатить'}
            </button>
        </div>
      </div>
    `).join('');

        this.updateContent(`
      <div class="payments-list">
        ${paymentsHTML}
      </div>
    `);

        // Обновляем футер
        const footer = this.modalElement.querySelector('.modal-footer');
        footer.innerHTML = `
            <button class="generate-payments-btn" id="generate-payments-btn">
                Сгенерировать выплаты
            </button>
    `;
        this.setupPaymentElements();
    }

    setupPaymentElements() {
        document.querySelectorAll('.pay-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const paymentId = e.target.dataset.paymentId;
                await this.processPayment(paymentId);
            });
        });

        const self = this;

        document.querySelector('.payments-list')?.addEventListener('click', function (e) {
            const teacherLink = e.target.closest('.teacher-link');
            if (teacherLink) {
                const teacherName = teacherLink.textContent
                console.log(teacherName)
                const teacherManager = new TeachersModal()
                const teacherId = teacherLink.getAttribute('data-teacher-id');
                const userId = teacherLink.getAttribute('data-user-id');
                self.close();
                teacherManager.showTeacherSchedule(teacherId, userId);
                teacherManager.showSchedulePanel(teacherName);

                // Опционально: добавить визуальную обратную связь
                teacherLink.classList.add('clicked');
                setTimeout(() => teacherLink.classList.remove('clicked'), 200);
            }
        });
    }

    async processPayment(paymentId) {
        // Находим кнопку по ID платежа
        const btn = document.querySelector(`button.pay-btn[data-payment-id="${paymentId}"]`);
        const payment = document.querySelector(`div.payment-item[data-payment-id="${paymentId}"]`);

        if (!payment) {
            console.error(`Платёж ${paymentId} не найден на экране`);
            return;
        }

        if (btn.disabled) {
            console.warn(`Платёж ${paymentId} уже обработан`);
            return;
        }

        if (!confirm('Вы уверены, что хотите провести оплату?')) {
            return;
        }

        try {
            // Блокируем кнопку
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Обработка...';

            // Отправляем запрос
            const response = await fetch(`/api/payments/${paymentId}/pay/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': repository.csrfToken,
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log("успех")
                // Обновляем кнопку
                btn.disabled = true;
                btn.innerHTML = '✓ Оплачено';
                btn.classList.add('paid');

                // Обновляем статус в интерфейсе
                const statusElement = payment.querySelector('.payment-status');
                if (statusElement) {
                    console.log("найдено")
                    statusElement.textContent = 'Оплачено';
                    statusElement.className = 'payment-status paid';
                } else {
                    console.log("Элементы не найдены, но платеж проведен")
                }

                showNotification('Платёж успешно проведён', 'success');
            } else {
                throw new Error(result.message || 'Неизвестная ошибка оплаты');
            }
        } catch (error) {
            console.error('Ошибка оплаты:', error);
            btn.disabled = false;
            btn.textContent = 'Оплатить';
            showNotification(error.message, 'error');
        }
    }
}