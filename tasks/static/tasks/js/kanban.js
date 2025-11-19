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
    }

    async loadTaskData(taskId) {
        try {
            const response = await fetch(`/tasks/get-task-data/${taskId}/`);
            const task = await response.json();

            document.querySelector('input[name="title"]').value = task.title;
            document.querySelector('textarea[name="description"]').value = task.description || '';
            document.querySelector('select[name="assignee"]').value = task.assignee || '';
            document.getElementById('taskId').value = taskId;
        } catch (error) {
            console.error('Error loading task data:', error);
        }
    }

    async saveTask() {
        const form = document.getElementById('taskForm');
        const formData = new FormData(form);
        const taskId = document.getElementById('taskId').value;

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
        // Обработчик клика по карточке задачи
        document.addEventListener('click', (e) => {
            const taskCard = e.target.closest('.task-card');

            if (taskCard) {
                const taskId = taskCard.dataset.taskId;
                this.openModal(taskId);
            }
        });

        // Drag & drop
        document.querySelectorAll('.task-card').forEach(card => {
            this.makeDraggable(card);
        });

        document.querySelectorAll('.task-list').forEach(column => {
            this.makeDroppable(column);
        });
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