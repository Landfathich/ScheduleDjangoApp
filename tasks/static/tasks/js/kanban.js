// Простой drag & drop для канбана
class SimpleKanban {
    constructor() {
        this.draggedTask = null;
        this.init();
    }

    init() {
        console.log('Simple Kanban initialized');
        this.bindEvents();
        this.bindClickEvents();
    }

    bindClickEvents() {
        // Обработчик клика по карточке задачи
        document.addEventListener('click', (e) => {
            const taskCard = e.target.closest('.task-card');
            if (taskCard && !e.target.closest('.edit-link')) {
                const taskId = taskCard.dataset.taskId;
                window.location.href = `/tasks/edit/${taskId}/`;
            }
        });
    }

    bindEvents() {
        // Сделать задачи перетаскиваемыми
        document.querySelectorAll('.task-card').forEach(card => {
            this.makeDraggable(card);
        });

        // Сделать колонки принимающими
        document.querySelectorAll('.task-list').forEach(column => {
            this.makeDroppable(column);
        });
    }

    makeDraggable(element) {
        element.addEventListener('dragstart', (e) => {
            this.draggedTask = element;
            element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            // КРИТИЧЕСКИ ВАЖНО: устанавливаем данные для переноса
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

            console.log(`Moving task ${taskId} to ${newStatus}`); // Для отладки

            // Перемещаем задачу визуально
            element.appendChild(this.draggedTask);

            // Обновляем статус в БД
            this.updateTaskStatus(taskId, newStatus);

            // Обновляем счетчики
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

            console.log('Sending request to update task status...'); // Для отладки

            const response = await fetch('/tasks/update-status/', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                console.log(`✓ Task ${taskId} status updated to ${newStatus}`);
            } else {
                console.error('✗ Error updating task:', data.error);
                // TODO: вернуть задачу обратно в исходную колонку при ошибке
            }
        } catch (error) {
            console.error('✗ Network error:', error);
            // TODO: вернуть задачу обратно в исходную колонку при ошибке
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    new SimpleKanban();
});