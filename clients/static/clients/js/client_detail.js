document.querySelectorAll('.client-detail-status-select').forEach(select => {
    select.addEventListener('change', function () {
        const clientId = this.dataset.clientId;
        const formData = new FormData();

        formData.append('status', this.value);

        fetch('/clients/' + clientId + '/status/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        }).then(response => response.json()).then(data => {
            if (data.status !== 'ok') {
                this.value = this.dataset.current;
            } else {
                this.dataset.current = this.value;
            }
        });
    });
});