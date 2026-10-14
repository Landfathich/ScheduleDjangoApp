document.querySelectorAll('.client-detail-status-select').forEach(select => {
    const modal = document.getElementById('statusReasonModal');
    const reasonSelect = document.getElementById('statusReasonSelect');
    const reasonTitle = document.getElementById('statusReasonTitle');
    const cancelButton = document.getElementById('statusReasonCancel');
    const confirmButton = document.getElementById('statusReasonConfirm');

    let pendingStatus = null;

    const statusLabels = {
        lead: 'Лид',
        active: 'Активный',
        paused: 'На паузе',
        inactive: 'Ушедший',
        rejected: 'Отказ'
    };

    const reasons = {
        rejected: [
            ['too_expensive', 'Дорого'],
            ['other_school', 'Выбрали другую школу'],
            ['format_not_suitable', 'Не подошёл формат'],
            ['changed_mind', 'Передумали'],
            ['could_not_contact', 'Не удалось связаться'],
            ['lesson_not_liked', 'Не понравился вводный урок'],
            ['other', 'Другое']
        ],
        inactive: [
            ['stopped_lessons', 'Перестали заниматься'],
            ['lost_interest', 'Потеряли интерес к занятиям'],
            ['did_not_want_to_continue', 'Не захотели продолжать обучение'],
            ['too_expensive', 'Дорого'],
            ['other_school', 'Выбрали другую школу'],
            ['format_not_suitable', 'Не подошёл формат'],
            ['life_circumstances', 'Жизненные обстоятельства'],
            ['long_break', 'Длительный перерыв без планов вернуться'],
            ['other', 'Другое']
        ],
        paused: [
            ['vacation', 'Отпуск / каникулы'],
            ['temporary_circumstances', 'Временные обстоятельства'],
            ['financial_difficulties', 'Финансовые трудности'],
            ['temporary_loss_of_interest', 'Временная потеря интереса'],
            ['other', 'Другое']
        ]
    };

    function sendStatus(status, reason = '') {
        const clientId = select.dataset.clientId;
        const formData = new FormData();

        formData.append('status', status);
        formData.append('reason', reason);

        fetch('/clients/' + clientId + '/status/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        }).then(response => response.json().then(data => {
            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.error || 'Не удалось изменить статус.');
            }
            return data;
        }))
            .then(() => {
                select.dataset.current = status;
            })
            .catch(error => {
                select.value = select.dataset.current;
                alert(error.message);
            });
    }

    function openConfirmModal(status) {
        pendingStatus = status;

        const currentStatus = select.dataset.current;
        const currentLabel = statusLabels[currentStatus] || currentStatus;
        const newLabel = statusLabels[status] || status;
        const needsReason = status === 'rejected' || status === 'inactive';
        const hasOptionalReason = status === 'paused';

        reasonTitle.textContent =
            'Изменить статус: ' + currentLabel + ' → ' + newLabel + '?';

        reasonSelect.innerHTML = '';

        if (needsReason || hasOptionalReason) {
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = needsReason
                ? 'Выберите причину'
                : 'Причина (необязательно)';
            reasonSelect.appendChild(placeholder);

            reasons[status].forEach(([value, label]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                reasonSelect.appendChild(option);
            });

            reasonSelect.style.display = '';
        } else {
            reasonSelect.style.display = 'none';
        }

        modal.classList.remove('hidden');
    }

    function closeConfirmModal() {
        pendingStatus = null;
        reasonSelect.value = '';
        reasonSelect.style.display = '';
        modal.classList.add('hidden');
        select.value = select.dataset.current;
    }

    select.addEventListener('change', function () {
        if (this.value === this.dataset.current) {
            return;
        }

        openConfirmModal(this.value);
    });

    cancelButton.addEventListener('click', closeConfirmModal);

    modal.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeConfirmModal();
        }
    });

    confirmButton.addEventListener('click', function () {
        if (!pendingStatus) {
            return;
        }

        const status = pendingStatus;
        const reason = reasonSelect.value;

        if ((status === 'rejected' || status === 'inactive') && !reason) {
            alert('Выберите причину изменения статуса.');
            return;
        }

        modal.classList.add('hidden');
        pendingStatus = null;
        reasonSelect.value = '';

        sendStatus(status, reason);
    });
});

const balanceOperationModal = document.getElementById('balanceOperationModal');

if (balanceOperationModal) {
    const openButton = document.getElementById('balanceOperationOpen');
    const cancelButton = document.getElementById('balanceOperationCancel');
    const form = document.getElementById('balanceOperationForm');
    const operationType = document.getElementById('balanceOperationType');
    const hint = document.getElementById('balanceOperationHint');
    const error = document.getElementById('balanceOperationError');
    const submitButton = document.getElementById('balanceOperationSubmit');

    function updateBalanceHint() {
        hint.textContent = operationType.value === 'correction'
            ? 'Укажите новый итоговый баланс клиента.'
            : 'Укажите количество уроков.';
    }

    function closeBalanceModal() {
        balanceOperationModal.classList.add('hidden');
        form.reset();
        error.textContent = '';
        updateBalanceHint();
    }

    openButton.addEventListener('click', function () {
        error.textContent = '';
        updateBalanceHint();
        balanceOperationModal.classList.remove('hidden');
    });

    cancelButton.addEventListener('click', closeBalanceModal);

    balanceOperationModal.addEventListener('click', function (event) {
        if (event.target === balanceOperationModal) {
            closeBalanceModal();
        }
    });

    operationType.addEventListener('change', updateBalanceHint);

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        error.textContent = '';

        const statusSelect = document.querySelector('.client-detail-status-select');

        if (!statusSelect) {
            error.textContent = 'Не удалось определить клиента.';
            return;
        }

        const clientId = statusSelect.dataset.clientId;
        const formData = new FormData(form);

        submitButton.disabled = true;

        fetch('/clients/' + clientId + '/balance-operation/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
            .then(response => response.json().then(data => {
                if (!response.ok || data.status !== 'ok') {
                    throw new Error(data.error || 'Не удалось создать операцию.');
                }
                return data;
            }))
            .then(() => {
                window.location.reload();
            })
            .catch(err => {
                error.textContent = err.message;
            })
            .finally(() => {
                submitButton.disabled = false;
            });
    });

    updateBalanceHint();
}