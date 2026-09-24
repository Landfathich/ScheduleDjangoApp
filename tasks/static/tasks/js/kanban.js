class SimpleKanban {
    constructor() {
        this.draggedTask = null;
        this.columnModal = document.getElementById('columnModal');

        this.init();
    }

    init() {
        this.bindEvents();
        this.bindColumnEvents();
        this.bindImageViewer();
        this.setupMobileHint();
    }

    bindEvents() {
        this.bindDragEvents();

        document.addEventListener('click', (e) => {
            if (
                e.target.classList.contains('edit-link') ||
                e.target.closest('.edit-link')
            ) {
                const taskCard = e.target.closest('.task-card');

                if (
                    taskCard &&
                    window.taskModal
                ) {
                    window.taskModal.openModal(
                        taskCard.dataset.taskId
                    );
                }

                return;
            }

            const taskCard = e.target.closest('.task-card');

            if (
                taskCard &&
                window.taskModal
            ) {
                window.taskModal.openModal(
                    taskCard.dataset.taskId
                );
            }
        });
    }

    bindDragEvents() {
        const taskCards = document.querySelectorAll('.task-card');
        const columns = document.querySelectorAll('.kanban-column');

        taskCards.forEach((card) => {
            card.addEventListener('dragstart', (e) => {
                this.draggedTask = card;
                card.classList.add('dragging');

                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData(
                    'text/plain',
                    card.dataset.taskId
                );
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                this.draggedTask = null;

                document.querySelectorAll('.kanban-column').forEach((column) => {
                    column.classList.remove('drag-over');
                });
            });
        });

        columns.forEach((column) => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();

                if (!this.draggedTask) {
                    return;
                }

                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', (e) => {
                if (!column.contains(e.relatedTarget)) {
                    column.classList.remove('drag-over');
                }
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();

                column.classList.remove('drag-over');

                if (!this.draggedTask) {
                    return;
                }

                const taskId = this.draggedTask.dataset.taskId;
                const newColumnId = column.dataset.columnId;

                this.updateTaskStatus(
                    taskId,
                    newColumnId
                );
            });
        });
    }

    async updateTaskStatus(taskId, newColumnId) {
        const csrfToken = this.getCsrfToken();

        try {
            const response = await fetch(
                '/tasks/update-status/',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': csrfToken
                    },
                    body: new URLSearchParams({
                        task_id: taskId,
                        new_column_id: newColumnId
                    })
                }
            );

            const result = await response.json();

            if (result.success) {
                window.location.reload();
                return;
            }

            console.error(
                'Ошибка перемещения задачи:',
                result.error
            );
        } catch (error) {
            console.error(
                'Ошибка запроса:',
                error
            );
        }
    }

    bindColumnEvents() {
        const createColumnButton =
            document.getElementById('createColumnBtn');

        if (createColumnButton) {
            createColumnButton.addEventListener('click', () => {
                this.openCreateColumnModal();
            });
        }

        const closeButtons =
            document.querySelectorAll('.close-column-modal');

        closeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                this.closeColumnModal();
            });
        });

        const saveColumnButton =
            document.getElementById('saveColumnBtn');

        if (saveColumnButton) {
            saveColumnButton.addEventListener('click', () => {
                this.saveColumn();
            });
        }

        const deleteColumnButton =
            document.getElementById('deleteColumnBtn');

        if (deleteColumnButton) {
            deleteColumnButton.addEventListener('click', () => {
                this.deleteColumnFromModal();
            });
        }

        const columnModal = document.getElementById('columnModal');

        if (columnModal) {
            window.addEventListener('click', (event) => {
                if (event.target === columnModal) {
                    this.closeColumnModal();
                }
            });
        }

        document.querySelectorAll('.edit-column').forEach((button) => {
            button.addEventListener('click', () => {
                const columnId = button.dataset.columnId;

                this.openColumnModal(columnId);
            });
        });

        document.querySelectorAll('.delete-column').forEach((button) => {
            button.addEventListener('click', () => {
                const columnId = button.dataset.columnId;

                this.deleteColumn(columnId);
            });
        });
    }

    openCreateColumnModal() {
        const modal = document.getElementById('columnModal');

        if (!modal) {
            return;
        }

        document.getElementById('columnId').value = '';
        document.getElementById('columnName').value = '';
        document.getElementById('columnColor').value = '#cccccc';

        document.getElementById('columnModalTitle').textContent =
            'Создать колонку';

        document.getElementById('deleteColumnBtn').style.display =
            'none';

        modal.classList.add('show');
    }

    async openColumnModal(columnId) {
        const modal = document.getElementById('columnModal');

        if (!modal) {
            return;
        }

        try {
            const response = await fetch(
                `/tasks/projects/column/${columnId}/`
            );

            const data = await response.json();

            if (!data.success) {
                return;
            }

            document.getElementById('columnId').value =
                columnId;

            document.getElementById('columnName').value =
                data.name;

            document.getElementById('columnColor').value =
                data.color;

            document.getElementById('columnModalTitle').textContent =
                'Редактировать колонку';

            document.getElementById('deleteColumnBtn').style.display =
                'inline-block';

            modal.classList.add('show');
        } catch (error) {
            console.error(
                'Ошибка загрузки колонки:',
                error
            );
        }
    }

    closeColumnModal() {
        const modal = document.getElementById('columnModal');

        if (modal) {
            modal.classList.remove('show');
        }
    }

    async saveColumn() {
        const columnId =
            document.getElementById('columnId').value;

        const name =
            document.getElementById('columnName').value;

        const color =
            document.getElementById('columnColor').value;

        const projectId =
            document.getElementById('projectId').value;

        const csrfToken = this.getCsrfToken();

        const url = columnId
            ? '/tasks/update-column/'
            : '/tasks/create-column/';

        const body = new URLSearchParams({
            column_id: columnId,
            project_id: projectId,
            name: name,
            color: color
        });

        try {
            const response = await fetch(
                url,
                {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type':
                            'application/x-www-form-urlencoded'
                    },
                    body: body
                }
            );

            const result = await response.json();

            if (result.success) {
                window.location.reload();
                return;
            }

            console.error(
                'Ошибка сохранения колонки:',
                result.error
            );
        } catch (error) {
            console.error(
                'Ошибка запроса:',
                error
            );
        }
    }

    async deleteColumnFromModal() {
        const columnId =
            document.getElementById('columnId').value;

        if (!columnId) {
            return;
        }

        await this.deleteColumn(columnId);
    }

    async deleteColumn(columnId) {
        if (!confirm('Удалить колонку?')) {
            return;
        }

        const csrfToken = this.getCsrfToken();

        try {
            const response = await fetch(
                '/tasks/delete-column/',
                {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type':
                            'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        column_id: columnId
                    })
                }
            );

            const result = await response.json();

            if (result.success) {
                window.location.reload();
                return;
            }

            console.error(
                'Ошибка удаления колонки:',
                result.error
            );
        } catch (error) {
            console.error(
                'Ошибка запроса:',
                error
            );
        }
    }

    bindImageViewer() {
        const imageViewer =
            document.getElementById('imageViewerModal');

        if (!imageViewer) {
            return;
        }

        const closeButton =
            imageViewer.querySelector('.close-image-viewer');

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                imageViewer.classList.remove('show');
            });
        }
    }

    setupMobileHint() {
        const hint =
            document.querySelector('.mobile-kanban-hint');

        if (!hint) {
            return;
        }

        if ('ontouchstart' in window) {
            hint.style.display = 'block';
        }
    }

    getCsrfToken() {
        const input =
            document.querySelector(
                'input[name="csrfmiddlewaretoken"]'
            );

        return input ? input.value : '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SimpleKanban();
});