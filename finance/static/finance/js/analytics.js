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

function toggleFinanceDetails() {
    const details = document.getElementById('financeDetails');
    const button = document.getElementById('toggleFinanceBtn');

    if (details.classList.contains('hidden')) {
        details.classList.remove('hidden');
        button.classList.add('expanded');
        button.innerHTML = '<span class="toggle-icon">▼</span> Скрыть детализацию';
    } else {
        details.classList.add('hidden');
        button.classList.remove('expanded');
        button.innerHTML = '<span class="toggle-icon">▼</span> Показать детализацию';
    }
}

function toggleTeachersDetails() {
    const details = document.getElementById('teachersDetails');
    const button = document.getElementById('toggleTeachersBtn');

    if (details.classList.contains('hidden')) {
        details.classList.remove('hidden');
        button.classList.add('expanded');
        button.innerHTML = '<span class="toggle-icon">▼</span> Скрыть детализацию';

        if (details.querySelector('.loading-text')) {
            loadTeachersDetails();
        }
    } else {
        details.classList.add('hidden');
        button.classList.remove('expanded');
        button.innerHTML = '<span class="toggle-icon">▼</span> Показать детализацию';
    }
}

function loadTeachersDetails() {
    fetch('/stats/teachers-load-details/')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('teachersDetails');
            if (data.teachers && data.teachers.length > 0) {
                let html = '<div class="teachers-list">';
                data.teachers.forEach(teacher => {
                    html += `
                        <div class="teacher-detail-item">
                            <span class="teacher-detail-name">${teacher.name}</span>
                            <div class="teacher-detail-bar">
                                <div class="teacher-detail-fill" style="width: ${teacher.load_percentage}%"></div>
                            </div>
                            <span class="teacher-detail-percent">${teacher.load_percentage}%</span>
                        </div>
                    `;
                });
                html += '</div>';
                container.innerHTML = html;
            } else {
                container.innerHTML = '<p class="loading-text">Нет данных о преподавателях</p>';
            }
        })
        .catch(error => {
            const container = document.getElementById('teachersDetails');
            container.innerHTML = '<p class="loading-text">Ошибка загрузки данных</p>';
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

// Функции для отладки
function loadIncomeDetails() {
    fetch('/stats/income-details/')
        .then(response => response.json())
        .then(data => {
            document.getElementById('debugDetails').innerHTML = data.html;
        })
        .catch(error => {
            document.getElementById('debugDetails').innerHTML = '<p style="color: red;">Ошибка загрузки</p>';
        });
}

function loadTeacherPayments() {
    fetch('/stats/teacher-payments-details/')
        .then(response => response.json())
        .then(data => {
            document.getElementById('debugDetails').innerHTML = data.html;
        })
        .catch(error => {
            document.getElementById('debugDetails').innerHTML = '<p style="color: red;">Ошибка загрузки</p>';
        });
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