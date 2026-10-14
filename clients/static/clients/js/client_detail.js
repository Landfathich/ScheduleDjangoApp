document.querySelectorAll('.client-detail-status-select').forEach(select => {
    const modal = document.getElementById('statusReasonModal');
    const reasonSelect = document.getElementById('statusReasonSelect');
    const reasonTitle = document.getElementById('statusReasonTitle');
    const cancelButton = document.getElementById('statusReasonCancel');
    const confirmButton = document.getElementById('statusReasonConfirm');

    let pendingStatus = null;

    const reasons = {
        rejected: [
            ['too_expensive', 'Дорого'],
            ['other_school', 'Выбрали другую школу'],
            ['format_not_suitable', 'Не подошёл формат'],
            ['changed_mind', 'Передумали'],
            ['could_not_contact', 'Не удалось связаться'],
            ['other', 'Другое']
        ],
        inactive: [
            ['stopped_lessons', 'Перестали заниматься'],
            ['too_expensive', 'Дорого'],
            ['other_school', 'Выбрали другую школу'],
            ['format_not_suitable', 'Не подошёл формат'],
            ['life_circumstances', 'Переезд / обстоятельства'],
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
        }).then(response => response.json()).then(data => {
            if (data.status !== 'ok') {
                select.value = select.dataset.current;
            } else {
                select.dataset.current = status;
            }
        }).catch(() => {
            select.value = select.dataset.current;
        });
    }

    function openReasonModal(status) {
        pendingStatus = status;
        reasonSelect.innerHTML = '<option value="">Выберите причину</option>';

        reasons[status].forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            reasonSelect.appendChild(option);
        });

        reasonTitle.textContent = status === 'rejected'
            ? 'Почему лид отклонён?'
            : 'Почему клиент ушёл?';

        modal.classList.remove('hidden');
    }

    function closeReasonModal() {
        pendingStatus = null;
        reasonSelect.value = '';
        modal.classList.add('hidden');
        select.value = select.dataset.current;
    }

    select.addEventListener('change', function () {
        const newStatus = this.value;

        if (newStatus === 'rejected' || newStatus === 'inactive') {
            openReasonModal(newStatus);
            return;
        }

        sendStatus(newStatus);
    });

    cancelButton.addEventListener('click', closeReasonModal);

    confirmButton.addEventListener('click', function () {
        const reason = reasonSelect.value;

        if (!reason || !pendingStatus) {
            return;
        }

        const status = pendingStatus;

        modal.classList.add('hidden');
        pendingStatus = null;
        reasonSelect.value = '';

        sendStatus(status, reason);
    });

    const balanceOperationModal = document.getElementById('balanceOperationModal');

    if (balanceOperationModal) {
        const openButton = document.getElementById('balanceOperationOpen');
        const cancelButton = document.getElementById('balanceOperationCancel');
        const form = document.getElementById('balanceOperationForm');
        const operationType = document.getElementById('balanceOperationType');
        const amountInput = document.getElementById('balanceOperationAmount');
        const hint = document.getElementById('balanceOperationHint');
        const error = document.getElementById('balanceOperationError');
        const submitButton = document.getElementById('balanceOperationSubmit');
        const balanceElement = document.getElementById('clientBalance');

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

            const clientId = document.querySelector('.client-detail-status-select').dataset.clientId;
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
                    if (!response.ok) {
                        throw new Error(data.error || 'Не удалось создать операцию.');
                    }
                    return data;
                }))
                .then(data => {
                    if (data.status !== 'ok') {
                        throw new Error(data.error || 'Не удалось создать операцию.');
                    }

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
});
