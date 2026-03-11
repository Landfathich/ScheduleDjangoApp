class SimpleKanban {
    constructor() {
        this.draggedTask = null;
        this.modal = document.getElementById('taskModal');
        this.columnModal = document.getElementById('columnModal');
        this.init();
    }

    init() {
        console.log('Simple Kanban initialized');
        this.bindEvents();
        this.bindModalEvents();
        this.bindImagePreview();
        this.bindImageViewer();
        this.bindColumnEvents();

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
        console.log('Binding modal events');

        try {
            // Проверяем, что все элементы существуют
            console.log('closeColumnModal:', document.getElementById('closeColumnModal'));
            console.log('cancelColumnBtn:', document.getElementById('cancelColumnBtn'));
            console.log('saveColumnBtn:', document.getElementById('saveColumnBtn'));
            console.log('columnModal:', this.columnModal);

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

            // Для модального окна колонки
            const closeColumnModal = document.getElementById('closeColumnModal');
            if (closeColumnModal) {
                closeColumnModal.addEventListener('click', () => {
                    console.log('Close button clicked');
                    this.closeColumnModal();
                });
            }

            // В bindModalEvents, после saveColumnBtn:
            const deleteColumnBtn = document.getElementById('deleteColumnBtn');
            if (deleteColumnBtn) {
                deleteColumnBtn.addEventListener('click', () => {
                    console.log('Delete column button clicked');
                    this.deleteColumnFromModal();
                });
            }

            // Вместо moveUpBtn/moveDownBtn
            const moveLeftBtn = document.getElementById('moveColumnLeftBtn');
            const moveRightBtn = document.getElementById('moveColumnRightBtn');

            if (moveLeftBtn) {
                moveLeftBtn.addEventListener('click', () => {
                    this.moveColumn('left');
                });
            }

            if (moveRightBtn) {
                moveRightBtn.addEventListener('click', () => {
                    this.moveColumn('right');
                });
            }

            const cancelColumnBtn = document.getElementById('cancelColumnBtn');
            if (cancelColumnBtn) {
                cancelColumnBtn.addEventListener('click', () => {
                    console.log('Cancel button clicked');
                    this.closeColumnModal();
                });
            }

            // В bindModalEvents, после остальных обработчиков
            const createColumnBtn = document.getElementById('createColumnBtn');
            if (createColumnBtn) {
                createColumnBtn.addEventListener('click', () => {
                    this.openCreateColumnModal();
                });
            }

            const saveColumnBtn = document.getElementById('saveColumnBtn');
            if (saveColumnBtn) {
                saveColumnBtn.addEventListener('click', () => {
                    console.log('Save button clicked');
                    this.saveColumn();
                });
            }

            window.addEventListener('click', (e) => {
                if (e.target === this.columnModal) {
                    console.log('Clicked outside column modal');
                    this.closeColumnModal();
                }
            });

            console.log('Column modal events bound successfully');
        } catch (error) {
            console.error('Error in bindModalEvents:', error);
        }
    }

    async moveColumn(direction) {
        const columnId = document.getElementById('editColumnId').value;
        const columnName = document.getElementById('columnName').value;

        console.log(`Moving column ${columnId} ${direction}`);

        try {
            const response = await fetch('/tasks/move-column/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                },
                body: JSON.stringify({
                    column_id: columnId,
                    direction: direction  // 'up' или 'down'
                })
            });

            const data = await response.json();
            if (data.success) {
                // Перезагружаем страницу чтобы увидеть новый порядок
                window.location.reload();
            } else {
                alert('Ошибка при перемещении колонки');
            }
        } catch (error) {
            console.error('Error moving column:', error);
            alert('Ошибка при перемещении колонки');
        }
    }

    openCreateColumnModal() {
        console.log('Opening create column modal');
        console.log('Project ID element:', document.getElementById('projectId'));
        console.log('Project ID value:', document.getElementById('projectId')?.value);

        // Очищаем форму
        document.getElementById('editColumnId').value = '';
        document.getElementById('columnName').value = '';
        document.getElementById('columnColor').value = '#336699';

        // Меняем заголовок
        document.getElementById('columnModalTitle').textContent = 'Создать новую колонку';

        // Прячем кнопку удаления
        const deleteBtn = document.getElementById('deleteColumnBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }

        // Прячем стрелки перемещения
        const moveControls = document.querySelector('#columnModal .modal-body > div:first-child');
        if (moveControls) {
            moveControls.style.display = 'none';
        }

        this.columnModal.style.display = 'block';
    }

    async deleteColumnFromModal() {
        const columnId = document.getElementById('editColumnId').value;
        const columnName = document.getElementById('columnName').value;

        // Получаем количество задач в колонке
        const column = document.querySelector(`.kanban-column[data-column-id="${columnId}"]`);
        const taskCount = column.querySelectorAll('.task-card').length;

        if (taskCount > 0) {
            alert(`Нельзя удалить колонку "${columnName}", в ней есть задачи (${taskCount} шт.)`);
            return;
        }

        if (!confirm(`Удалить колонку "${columnName}"?`)) {
            return;
        }

        try {
            const response = await fetch('/tasks/delete-column/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                },
                body: JSON.stringify({
                    column_id: columnId
                })
            });

            const data = await response.json();
            if (data.success) {
                // Удаляем колонку из DOM
                column.remove();
                this.closeColumnModal();
            } else {
                alert('Ошибка при удалении колонки');
            }
        } catch (error) {
            console.error('Error deleting column:', error);
            alert('Ошибка при удалении колонки');
        }
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

            // Автоматически выбираем текущего пользователя в селекторе исполнителя
            const assigneeSelect = document.querySelector('select[name="assignee"]');
            const currentUserId = document.getElementById('currentUserId')?.value;
            if (assigneeSelect && currentUserId) {
                assigneeSelect.value = currentUserId;
            }
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

    bindColumnEvents() {
        // Редактирование колонки
        document.querySelectorAll('.edit-column-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const column = e.target.closest('.kanban-column');
                const columnId = column.dataset.columnId;
                const columnName = column.querySelector('.column-name').textContent;

                // Получаем цвет из инлайн-стиля
                let columnColor = '#336699';
                const headerStyle = column.querySelector('.column-header').style.background;
                console.log('Header style:', headerStyle);

                if (headerStyle) {
                    // Сначала пробуем найти hex
                    const hexMatch = headerStyle.match(/#[A-Fa-f0-9]{6}/);
                    if (hexMatch && hexMatch[0]) {
                        columnColor = hexMatch[0];
                    } else {
                        // Ищем rgb()
                        const rgbMatch = headerStyle.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                        if (rgbMatch) {
                            const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
                            const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
                            const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
                            columnColor = `#${r}${g}${b}`;
                        }
                    }
                }

                console.log('Final column color:', columnColor);
                this.openColumnModal(columnId, columnName, columnColor);
            });
        });
    }

    openColumnModal(columnId, name, color) {
        console.log('openColumnModal called with:', columnId, name, color);

        document.getElementById('editColumnId').value = columnId || '';
        document.getElementById('columnName').value = name || '';

        // Убеждаемся, что цвет передан правильно
        const colorInput = document.getElementById('columnColor');
        if (color && color.match(/#[A-Fa-f0-9]{6}/)) {
            colorInput.value = color;
        } else {
            colorInput.value = '#336699'; // дефолтный синий
        }

        this.columnModal.style.display = 'block';
    }

    closeColumnModal() {
        this.columnModal.style.display = 'none';
    }

    async saveColumn() {
        const columnId = document.getElementById('editColumnId').value;
        const name = document.getElementById('columnName').value;
        const color = document.getElementById('columnColor').value;
        const projectId = document.getElementById('projectId').value;

        console.log('Saving column:', {columnId, name, color, projectId, isNew: !columnId});

        const isNew = !columnId;

        try {
            const url = isNew ? '/tasks/create-column/' : '/tasks/update-column/';
            console.log('Sending to URL:', url);
            console.log('Request body:', JSON.stringify({
                column_id: columnId,
                name: name,
                color: color,
                project_id: projectId
            }));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                },
                body: JSON.stringify({
                    column_id: columnId,
                    name: name,
                    color: color,
                    project_id: projectId
                })
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (data.success) {
                window.location.reload();
            } else {
                alert('Ошибка при сохранении колонки: ' + (data.error || 'неизвестная ошибка'));
            }
        } catch (error) {
            console.error('Error saving column:', error);
            alert('Ошибка при сохранении колонки');
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

            const newColumnId = element.dataset.columnId;  // Изменили с data-status на data-column-id
            const taskId = this.draggedTask.dataset.taskId;

            element.appendChild(this.draggedTask);
            this.updateTaskStatus(taskId, newColumnId);
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

    async updateTaskStatus(taskId, newColumnId) {
        try {
            const formData = new FormData();
            formData.append('task_id', taskId);
            formData.append('new_column_id', newColumnId);  // Изменили с new_status на new_column_id
            formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);

            const response = await fetch('/tasks/update-status/', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                console.log(`✓ Task ${taskId} moved to column ${newColumnId}`);
                this.updateColumnCounters();
            } else {
                console.error('✗ Error updating task:', data.error);
                // Если ошибка - возвращаем задачу на место
                window.location.reload(); // Простой способ откатить изменения
            }
        } catch (error) {
            console.error('✗ Network error:', error);
            window.location.reload();
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    new SimpleKanban();
});