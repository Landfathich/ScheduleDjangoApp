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

});
