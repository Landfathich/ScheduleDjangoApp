class SimpleKanban {
    constructor() {
        this.draggedTask = null;
        this.modal = document.getElementById('taskModal');
        this.init();
    }

    init() {
        console.log('Simple Kanban initialized');
        this.bindEvents();
        this.bindModalEvents();
        this.bindImagePreview();
        this.bindImageViewer();

        // Показываем подсказку для мобильных
        if (this.isTouchDevice()) {
            const hint = document.createElement('div');
            hint.className = 'mobile-hint';
            hint.innerHTML = '💡 Нажмите и удерживайте задачу для перемещения';
            hint.style.cssText = 'text-align: center; padding: 10px; font-size: 14px; color: #666; background: #f8f9fa; border-radius: 4px; margin: 10px 0;';

            const kanbanBoard = document.querySelector('.kanban-board');
            if (kanbanBoard) {
                kanbanBoard.parentNode.insertBefore(hint, kanbanBoard);
            }
        }
    }

    bindModalEvents() {
        // Кнопка создания задачи
        document.getElementById('createTaskBtn').addEventListener('click', () => {
            this.openModal();
        });

        // Закрытие модального окна
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        // Клик вне модального окна
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Сохранение задачи
        document.getElementById('saveTaskBtn').addEventListener('click', () => {
            this.saveTask();
        });

        // Удаление задачи
        document.getElementById('deleteTaskBtn').addEventListener('click', () => {
            this.deleteTask();
        });
    }

    openModal(taskId = null) {
        const form = document.getElementById('taskForm');
        const modalTitle = document.getElementById('modalTitle');
        const deleteBtn = document.getElementById('deleteTaskBtn');

        if (taskId) {
            // Режим редактирования
            modalTitle.textContent = 'Редактировать задачу';
            deleteBtn.style.display = 'block';
            this.loadTaskData(taskId);
        } else {
            // Режим создания
            modalTitle.textContent = 'Создать задачу';
            deleteBtn.style.display = 'none';
            form.reset();
            document.getElementById('taskId').value = '';
        }

        this.modal.style.display = 'block';
    }

    closeModal() {
        this.modal.style.display = 'none';

        // Очищаем поле файла
        const fileInput = document.querySelector('input[name="image"]');
        fileInput.value = ''; // Это сбросит выбранный файл

        // Также скрываем превью
        const currentImageDiv = document.getElementById('currentImage');
        currentImageDiv.style.display = 'none';
    }

    async loadTaskData(taskId) {
        try {
            const response = await fetch(`/tasks/get-task-data/${taskId}/`);
            const task = await response.json();

            document.querySelector('input[name="title"]').value = task.title;
            document.querySelector('textarea[name="description"]').value = task.description || '';
            document.querySelector('select[name="assignee"]').value = task.assignee || '';
            document.getElementById('taskId').value = taskId;

            // Показываем текущее изображение если оно есть
            this.displayCurrentImage(task.image_url);
        } catch (error) {
            console.error('Error loading task data:', error);
        }
    }

    displayCurrentImage(imageUrl) {
        const currentImageDiv = document.getElementById('currentImage');
        const imagePreview = document.getElementById('imagePreview');
        const deleteCheckbox = document.getElementById('deleteImageCheckbox');

        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.cssText = 'max-width: 200px; max-height: 150px; border: 1px solid #ccc; cursor: pointer;';
            img.addEventListener('click', () => {
                this.viewFullImage(imageUrl);
            });

            imagePreview.innerHTML = '';
            imagePreview.appendChild(img);
            currentImageDiv.style.display = 'block';
            deleteCheckbox.style.display = 'block';
            deleteCheckbox.checked = false;
        } else {
            currentImageDiv.style.display = 'none';
            deleteCheckbox.style.display = 'none';
        }
    }

    viewFullImage(imageUrl) {
        document.getElementById('fullSizeImage').src = imageUrl;
        document.getElementById('imageViewModal').style.display = 'block';
    }

    closeImageView() {
        document.getElementById('imageViewModal').style.display = 'none';
    }

    bindImagePreview() {
        const fileInput = document.querySelector('input[name="image"]');
        fileInput.addEventListener('change', (e) => {
            this.previewSelectedImage(e.target.files[0]);
        });
    }

    previewSelectedImage(file) {
        const imagePreview = document.getElementById('imagePreview');
        const currentImageDiv = document.getElementById('currentImage');

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 150px; border: 1px solid #ccc; margin-top: 5px;">`;
                currentImageDiv.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            // Если файл не выбран, но есть текущее изображение - оставляем его
            const taskId = document.getElementById('taskId').value;
            if (taskId) {
                // Перезагружаем исходное изображение задачи
                this.loadTaskData(taskId);
            } else {
                currentImageDiv.style.display = 'none';
            }
        }
    }

    bindImageViewer() {
        // Закрытие модалки просмотра
        document.getElementById('closeImageView').addEventListener('click', () => {
            this.closeImageView();
        });

        // Клик вне изображения для закрытия
        document.getElementById('imageViewModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('imageViewModal')) {
                this.closeImageView();
            }
        });
    }


    async saveTask() {
        const form = document.getElementById('taskForm');
        const formData = new FormData(form);
        const taskId = document.getElementById('taskId').value;
        const projectId = document.getElementById('projectId').value;

        // Добавляем project_id к данным
        formData.append('project', projectId);

        // Добавляем значение чекбокса удаления изображения
        const deleteCheckbox = document.getElementById('deleteImageCheckbox');
        if (deleteCheckbox.checked) {
            formData.append('delete_image', 'true');
        }

        try {
            const url = taskId ? `/tasks/edit/${taskId}/` : '/tasks/create/';
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            if (response.ok) {
                window.location.reload();
            } else {
                alert('Ошибка при сохранении задачи');
            }
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Ошибка при сохранении задачи');
        }
    }

    async deleteTask() {
        const taskId = document.getElementById('taskId').value;

        if (!confirm('Вы уверены, что хотите удалить эту задачу?')) {
            return;
        }

        try {
            const response = await fetch(`/tasks/delete/${taskId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            if (response.ok) {
                window.location.reload();
            } else {
                alert('Ошибка при удалении задачи');
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Ошибка при удалении задачи');
        }
    }

    bindEvents() {
        // Определяем тип устройства
        if (this.isTouchDevice()) {
            this.bindTouchEvents();
        } else {
            this.bindDragEvents();
        }

        // Обработчик клика по карточке задачи (общий для всех устройств)
        document.addEventListener('click', (e) => {
            // Исключаем клики по кнопкам редактирования
            if (e.target.classList.contains('edit-link') || e.target.closest('.edit-link')) {
                return;
            }

            const taskCard = e.target.closest('.task-card');
            if (taskCard) {
                const taskId = taskCard.dataset.taskId;
                this.openModal(taskId);
            }
        });

        // Обработчики для кнопок редактирования (карандаши)
        document.querySelectorAll('.edit-link').forEach(editBtn => {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskCard = e.target.closest('.task-card');
                if (taskCard) {
                    const taskId = taskCard.dataset.taskId;
                    this.openModal(taskId);
                }
            });
        });
    }

// Добавьте этот метод для определения touch-устройств
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    bindDragEvents() {
        // Ваш текущий drag & drop код
        document.querySelectorAll('.task-card').forEach(card => {
            this.makeDraggable(card);
        });

        document.querySelectorAll('.task-list').forEach(column => {
            this.makeDroppable(column);
        });
    }

    bindTouchEvents() {
        // Долгое нажатие для выбора задачи
        document.querySelectorAll('.task-card').forEach(card => {
            let pressTimer;

            card.addEventListener('touchstart', (e) => {
                pressTimer = setTimeout(() => {
                    this.showMoveOptions(card);
                }, 500); // 0.5 секунды
            });

            card.addEventListener('touchend', (e) => {
                clearTimeout(pressTimer);
            });

            card.addEventListener('touchmove', (e) => {
                clearTimeout(pressTimer);
            });
        });
    }

    showMoveOptions(taskCard) {
        const taskId = taskCard.dataset.taskId;
        const currentStatus = taskCard.closest('.task-list').dataset.status;

        // Получаем все доступные статусы из колонок на доске
        const statusColumns = document.querySelectorAll('.kanban-column');
        let statusOptions = '';

        statusColumns.forEach(column => {
            const statusKey = column.querySelector('.task-list').dataset.status;
            const columnHeader = column.querySelector('.column-header');
            // Берем весь текст кроме счетчика
            const statusName = columnHeader.childNodes[0].textContent.trim();
            const isCurrent = statusKey === currentStatus;

            statusOptions += `
            <button class="status-option ${isCurrent ? 'current-status' : ''}" 
                    data-status="${statusKey}" 
                    ${isCurrent ? 'disabled' : ''}>
                ${statusName}
                ${isCurrent ? ' (текущий)' : ''}
            </button>
        `;
        });

        // Создаем модальное окно для выбора статуса
        const modal = document.createElement('div');
        modal.className = 'move-modal';
        modal.innerHTML = `
        <div class="move-modal-content">
            <h4>Переместить задачу</h4>
            ${statusOptions}
            <button class="cancel-move">Отмена</button>
        </div>
    `;

        document.body.appendChild(modal);

        // Добавляем небольшую задержку перед добавлением обработчиков
        setTimeout(() => {
            // Обработчики для кнопок статусов
            modal.querySelectorAll('.status-option').forEach(btn => {
                if (!btn.disabled) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const newStatus = btn.dataset.status;
                        this.moveTaskToStatus(taskId, newStatus, taskCard);
                        modal.remove();
                    });

                    // Также добавляем обработчик touchend для мобильных
                    btn.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const newStatus = btn.dataset.status;
                        this.moveTaskToStatus(taskId, newStatus, taskCard);
                        modal.remove();
                    });
                }
            });

            modal.querySelector('.cancel-move').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                modal.remove();
            });

            modal.querySelector('.cancel-move').addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                modal.remove();
            });

            // Закрытие по клику вне модального окна
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });

            modal.addEventListener('touchend', (e) => {
                if (e.target === modal) {
                    e.preventDefault();
                    modal.remove();
                }
            });
        }, 50); // Небольшая задержка в 50мс
    }

    async moveTaskToStatus(taskId, newStatus, taskCard) {
        try {
            const formData = new FormData();
            formData.append('task_id', taskId);
            formData.append('new_status', newStatus);
            formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);

            const response = await fetch('/tasks/update-status/', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                // Перемещаем карточку визуально
                const targetColumn = document.querySelector(`[data-status="${newStatus}"]`);
                if (targetColumn) {
                    targetColumn.appendChild(taskCard);
                    this.updateColumnCounters();
                }
            } else {
                console.error('Error moving task:', data.error);
                alert('Ошибка при перемещении задачи');
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('Ошибка при перемещении задачи');
        }
    }

    makeDraggable(element) {
        element.addEventListener('dragstart', (e) => {
            this.draggedTask = element;
            element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', element.dataset.taskId);
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
            this.draggedTask = null;
        });
    }

    makeDroppable(element) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!this.draggedTask) return;

            const newStatus = element.dataset.status;
            const taskId = this.draggedTask.dataset.taskId;

            element.appendChild(this.draggedTask);
            this.updateTaskStatus(taskId, newStatus);
            this.updateColumnCounters();
        });
    }

    updateColumnCounters() {
        document.querySelectorAll('.kanban-column').forEach(column => {
            const taskList = column.querySelector('.task-list');
            const taskCount = taskList.querySelectorAll('.task-card').length;
            const counter = column.querySelector('.column-count');
            if (counter) {
                counter.textContent = taskCount;
            }
        });
    }

    async updateTaskStatus(taskId, newStatus) {
        try {
            const formData = new FormData();
            formData.append('task_id', taskId);
            formData.append('new_status', newStatus);
            formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);

            const response = await fetch('/tasks/update-status/', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                console.log(`✓ Task ${taskId} status updated to ${newStatus}`);
            } else {
                console.error('✗ Error updating task:', data.error);
            }
        } catch (error) {
            console.error('✗ Network error:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    new SimpleKanban();
});