// Инициализация диаграммы занятости
function initTeachersChart(loadPercentage) {
    const ctx = document.getElementById('teachersChart');
    if (!ctx) return;

    const freePercentage = 100 - loadPercentage;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Занято', 'Свободно'],
            datasets: [{
                data: [loadPercentage, freePercentage],
                backgroundColor: ['#e74c3c', '#2ecc71'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            cutout: '70%',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

// Модальное окно расходов
function openExpenseModal() {
    document.getElementById('expenseModal').style.display = 'block';
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('input[name="expense_date"]').value = today;
}

function closeExpenseModal() {
    document.getElementById('expenseModal').style.display = 'none';
    document.getElementById('expenseForm').reset();
}

// Уведомления
function showNotification(message, type) {
    const notification = document.getElementById('expenseNotification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Обработка формы добавления расхода
function handleExpenseFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.textContent = 'Сохранение...';
        submitBtn.disabled = true;

        fetch('/stats/add-expense/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('✅ Расход успешно добавлен!', 'success');
                    closeExpenseModal();
                    setTimeout(() => location.reload(), 1000);
                } else {
                    showNotification('❌ Ошибка: ' + data.error, 'error');
                }
            })
            .catch(error => {
                showNotification('❌ Ошибка сети', 'error');
            })
            .finally(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });

    } catch (error) {
        showNotification('❌ Ошибка', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Закрытие модального окна при клике вне его
function handleModalClick(event) {
    const modal = document.getElementById('expenseModal');
    if (event.target === modal) {
        closeExpenseModal();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseFormSubmit);
    }

    // Вешаем обработчик на window для модального окна
    window.addEventListener('click', handleModalClick);

    if (typeof teachersLoadData !== 'undefined') {
        initTeachersChart(teachersLoadData);
    }
});