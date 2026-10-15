class SimpleKanban {
    constructor() {
        this.draggedTask = null;
        this.columnModal = document.getElementById('columnModal');

        this.mobileMoveModal = document.getElementById('mobileMoveTaskModal');
        this.mobileMoveOptions = document.getElementById('mobileMoveTaskOptions');
        this.mobileMoveError = document.getElementById('mobileMoveTaskError');
        this.mobileMoveTaskCard = null;
        this.mobileMovePreviousFocus = null;
        this.mobileMoveInProgress = false;
        this.mobileMoveNeedsRelease = false;
        this.mobileMoveReleaseTimer = null;
        this.mobilePress = null;
        this.suppressTaskClick = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.bindColumnEvents();
        this.bindImageViewer();
        this.bindMobileMoveEvents();
        this.setupMobileHint();
    }

    bindEvents() {
        this.bindDragEvents();

        document.addEventListener('click', (event) => {
            const target = event.target instanceof Element
                ? event.target
                : event.target?.parentElement;

            if (!target) {
                return;
            }

            const taskCard = target.closest('.task-card');

            if (!taskCard || !window.taskModal) {
                return;
            }

            if (this.shouldSuppressTaskClick(taskCard)) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            window.taskModal.openModal(taskCard.dataset.taskId);
        });
    }

    bindDragEvents() {
        const taskCards = document.querySelectorAll('.task-card');
        const columns = document.querySelectorAll('.kanban-column');

        taskCards.forEach((card) => {
            // На сенсорных устройствах используем долгое нажатие,
            // чтобы не конфликтовать с нативным drag браузера.
            if (this.isCoarsePointer()) {
                card.draggable = false;
            }

            card.addEventListener('dragstart', (event) => {
                this.draggedTask = card;
                card.classList.add('dragging');

                if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData(
                        'text/plain',
                        card.dataset.taskId
                    );
                }
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
            column.addEventListener('dragover', (event) => {
                event.preventDefault();

                if (!this.draggedTask) {
                    return;
                }

                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', (event) => {
                if (!column.contains(event.relatedTarget)) {
                    column.classList.remove('drag-over');
                }
            });

            column.addEventListener('drop', (event) => {
                event.preventDefault();
                column.classList.remove('drag-over');

                if (!this.draggedTask) {
                    return;
                }

                const taskId = this.draggedTask.dataset.taskId;
                const newColumnId = column.dataset.columnId;

                this.updateTaskStatus(taskId, newColumnId);
            });
        });
    }

    async updateTaskStatus(taskId, newColumnId, options = {}) {
        const csrfToken = this.getCsrfToken();

        const fail = (message, error = null) => {
            console.error('Ошибка перемещения задачи:', error || message);

            if (options.showMobileError) {
                this.showMobileMoveError(message);
            }

            return false;
        };

        if (!taskId || !newColumnId) {
            return fail('Не удалось определить задачу или целевую колонку.');
        }

        try {
            const response = await fetch('/tasks/update-status/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrfToken
                },
                body: new URLSearchParams({
                    task_id: taskId,
                    new_column_id: newColumnId
                })
            });

            let result;

            try {
                result = await response.json();
            } catch (error) {
                return fail('Сервер вернул некорректный ответ.', error);
            }

            if (!response.ok || !result.success) {
                return fail(
                    result.error || 'Не удалось переместить задачу.'
                );
            }

            // Сохраняем прежнее поведение на ПК и синхронизируем
            // карточки и счётчики с сервером после перемещения.
            window.location.reload();
            return true;
        } catch (error) {
            return fail(
                'Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.',
                error
            );
        }
    }

    bindMobileMoveEvents() {
        if (!this.mobileMoveModal || !this.mobileMoveOptions) {
            return;
        }

        // Сбрасываем подавление клика при следующем физическом нажатии.
        // Это не позволяет случайно блокировать последующие обычные нажатия.
        document.addEventListener('pointerdown', () => {
            this.suppressTaskClick = null;
        }, true);

        document.querySelectorAll('.task-card').forEach((card) => {
            card.addEventListener('pointerdown', (event) => {
                if (
                    event.pointerType !== 'touch' &&
                    event.pointerType !== 'pen'
                ) {
                    return;
                }

                if (event.button !== 0) {
                    return;
                }

                const target = event.target instanceof Element
                    ? event.target
                    : event.target?.parentElement;

                if (
                    target?.closest(
                        'a, button, input, textarea, select, [contenteditable="true"]'
                    )
                ) {
                    return;
                }

                this.cancelMobilePress();

                const press = {
                    card,
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    triggered: false,
                    moved: false,
                    timer: null
                };

                this.mobilePress = press;

                press.timer = window.setTimeout(() => {
                    if (
                        this.mobilePress !== press ||
                        press.moved
                    ) {
                        return;
                    }

                    if (!this.showMoveOptions(card)) {
                        return;
                    }

                    press.triggered = true;

                    // Долгое нажатие не должно затем открывать редактор.
                    this.suppressTaskClick = {
                        card,
                        expiresAt: Date.now() + 1500
                    };

                    // Не обрабатываем click, который может возникнуть
                    // при отпускании пальца после появления модалки.
                    this.mobileMoveNeedsRelease = true;
                }, 550);
            });
        });

        document.addEventListener('pointermove', (event) => {
            const press = this.mobilePress;

            if (!press || event.pointerId !== press.pointerId) {
                return;
            }

            const deltaX = event.clientX - press.startX;
            const deltaY = event.clientY - press.startY;

            if (Math.hypot(deltaX, deltaY) > 10) {
                press.moved = true;

                if (press.timer) {
                    clearTimeout(press.timer);
                    press.timer = null;
                }
            }
        }, {passive: true});

        document.addEventListener('pointerup', (event) => {
            this.finishMobilePress(event);
        });

        document.addEventListener('pointercancel', (event) => {
            this.finishMobilePress(event);
        });

        this.mobileMoveModal.addEventListener('click', async (event) => {
            const target = event.target instanceof Element
                ? event.target
                : event.target?.parentElement;

            if (!target) {
                return;
            }

            // Игнорируем только click, возникший при отпускании пальца,
            // которым было открыто окно перемещения.
            if (this.mobileMoveNeedsRelease) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (target.closest('[data-mobile-move-close]')) {
                this.closeMobileMoveModal();
                return;
            }

            const option = target.closest('.mobile-move-modal__option');

            if (
                !option ||
                option.disabled ||
                !this.mobileMoveOptions.contains(option)
            ) {
                return;
            }

            await this.moveTaskToColumn(option.dataset.columnId);
        });

        document.addEventListener('keydown', (event) => {
            if (
                event.key === 'Escape' &&
                this.mobileMoveModal &&
                !this.mobileMoveModal.hidden
            ) {
                this.closeMobileMoveModal();
            }
        });
    }

    finishMobilePress(event) {
        const press = this.mobilePress;

        if (!press || event.pointerId !== press.pointerId) {
            return;
        }

        if (press.timer) {
            clearTimeout(press.timer);
        }

        this.mobilePress = null;

        if (press.triggered) {
            if (this.mobileMoveReleaseTimer) {
                clearTimeout(this.mobileMoveReleaseTimer);
            }

            // Даём браузеру завершить исходный pointer/click цикл.
            this.mobileMoveReleaseTimer = window.setTimeout(() => {
                this.mobileMoveNeedsRelease = false;
                this.mobileMoveReleaseTimer = null;
            }, 80);
        }
    }

    cancelMobilePress() {
        if (this.mobilePress?.timer) {
            clearTimeout(this.mobilePress.timer);
        }

        this.mobilePress = null;
    }

    shouldSuppressTaskClick(taskCard) {
        const suppression = this.suppressTaskClick;

        if (!suppression) {
            return false;
        }

        if (Date.now() > suppression.expiresAt) {
            this.suppressTaskClick = null;
            return false;
        }

        return suppression.card === taskCard;
    }

    showMoveOptions(taskCard) {
        if (!this.mobileMoveModal || !this.mobileMoveOptions) {
            return false;
        }

        const taskList = taskCard.closest('.task-list');
        const currentColumnId =
            taskList?.dataset.columnId ||
            taskCard.closest('.kanban-column')?.dataset.columnId;

        const columns = Array.from(
            document.querySelectorAll('.kanban-column')
        ).map((column) => {
            const nameElement = column.querySelector('.column-name');
            const columnId = column.dataset.columnId;

            return {
                id: columnId,
                name: nameElement?.textContent.trim() || '',
                element: column
            };
        }).filter((column) => column.id && column.name);

        if (!columns.length) {
            console.error('Не найдены колонки Kanban для перемещения задачи.');
            return false;
        }

        this.mobileMoveTaskCard = taskCard;
        this.mobileMovePreviousFocus = document.activeElement;

        this.mobileMoveOptions.replaceChildren();

        if (this.mobileMoveError) {
            this.mobileMoveError.textContent = '';
            this.mobileMoveError.hidden = true;
        }

        columns.forEach((column) => {
            const isCurrent = column.id === currentColumnId;
            const button = document.createElement('button');

            button.type = 'button';
            button.className = 'mobile-move-modal__option';
            button.dataset.columnId = column.id;
            button.textContent = isCurrent
                ? `${column.name} (текущая)`
                : column.name;

            if (isCurrent) {
                button.classList.add('is-current');
                button.disabled = true;
                button.setAttribute('aria-current', 'true');
            }

            this.mobileMoveOptions.appendChild(button);
        });

        this.mobileMoveModal.hidden = false;
        document.body.classList.add('mobile-move-modal-open');

        const dialog = this.mobileMoveModal.querySelector(
            '.mobile-move-modal__dialog'
        );

        if (dialog) {
            dialog.focus({preventScroll: true});
        }

        return true;
    }

    async moveTaskToColumn(columnId) {
        if (this.mobileMoveInProgress || !this.mobileMoveTaskCard) {
            return;
        }

        const taskId = this.mobileMoveTaskCard.dataset.taskId;

        if (!taskId || !columnId) {
            this.showMobileMoveError(
                'Не удалось определить задачу или целевую колонку.'
            );
            return;
        }

        const buttons = this.mobileMoveOptions.querySelectorAll('button');

        this.mobileMoveInProgress = true;
        this.mobileMoveModal.setAttribute('aria-busy', 'true');

        buttons.forEach((button) => {
            button.disabled = true;
        });

        if (this.mobileMoveError) {
            this.mobileMoveError.textContent = '';
            this.mobileMoveError.hidden = true;
        }

        const success = await this.updateTaskStatus(
            taskId,
            columnId,
            {showMobileError: true}
        );

        if (!success) {
            this.mobileMoveInProgress = false;
            this.mobileMoveModal.removeAttribute('aria-busy');

            buttons.forEach((button) => {
                if (!button.classList.contains('is-current')) {
                    button.disabled = false;
                }
            });
        }
    }

    showMobileMoveError(message) {
        if (!this.mobileMoveError) {
            return;
        }

        this.mobileMoveError.textContent = message;
        this.mobileMoveError.hidden = false;
    }

    closeMobileMoveModal() {
        if (!this.mobileMoveModal) {
            return;
        }

        this.mobileMoveModal.hidden = true;
        this.mobileMoveModal.removeAttribute('aria-busy');
        document.body.classList.remove('mobile-move-modal-open');

        this.mobileMoveTaskCard = null;
        this.mobileMoveInProgress = false;

        if (
            this.mobileMovePreviousFocus instanceof HTMLElement &&
            this.mobileMovePreviousFocus.isConnected
        ) {
            this.mobileMovePreviousFocus.focus({preventScroll: true});
        }

        this.mobileMovePreviousFocus = null;
    }

    bindColumnEvents() {
        const createColumnButton =
            document.getElementById('createColumnBtn');

        if (createColumnButton) {
            createColumnButton.addEventListener('click', () => {
                this.openCreateColumnModal();
            });
        }

        const closeButtons = document.querySelectorAll(
            '#closeColumnModal, #cancelColumnBtn'
        );

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

        const moveColumnLeftButton =
            document.getElementById('moveColumnLeftBtn');

        if (moveColumnLeftButton) {
            moveColumnLeftButton.addEventListener('click', () => {
                this.moveColumn('left');
            });
        }

        const moveColumnRightButton =
            document.getElementById('moveColumnRightBtn');

        if (moveColumnRightButton) {
            moveColumnRightButton.addEventListener('click', () => {
                this.moveColumn('right');
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

        document.querySelectorAll('.edit-column-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const columnId =
                    button.closest('.kanban-column')?.dataset.columnId;

                if (columnId) {
                    this.openColumnModal(columnId);
                }
            });
        });

        document.querySelectorAll('.delete-column').forEach((button) => {
            button.addEventListener('click', () => {
                const columnId = button.dataset.columnId;

                if (columnId) {
                    this.deleteColumn(columnId);
                }
            });
        });
    }

    async moveColumn(direction) {
        const columnId = document.getElementById('editColumnId')?.value;

        if (!columnId) {
            return;
        }

        const csrfToken = this.getCsrfToken();

        try {
            const response = await fetch('/tasks/move-column/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    column_id: columnId,
                    direction
                })
            });

            const result = await response.json();

            if (result.success) {
                window.location.reload();
                return;
            }

            console.error('Ошибка перемещения колонки:', result.error);
        } catch (error) {
            console.error('Ошибка запроса:', error);
        }
    }

    openCreateColumnModal() {
        const modal = document.getElementById('columnModal');

        if (!modal) {
            return;
        }

        document.getElementById('editColumnId').value = '';
        document.getElementById('columnName').value = '';
        document.getElementById('columnColor').value = '#cccccc';

        document.getElementById('columnModalTitle').textContent =
            'Создать колонку';

        document.getElementById('deleteColumnBtn').style.display = 'none';

        modal.classList.add('show');
    }

    async openColumnModal(columnId) {
        const modal = document.getElementById('columnModal');

        if (!modal) {
            return;
        }

        try {
            const response = await fetch(
                `/tasks/get-column-data/${columnId}/`
            );

            const data = await response.json();

            if (!data.success) {
                console.error('Ошибка загрузки колонки:', data.error);
                return;
            }

            document.getElementById('editColumnId').value = columnId;
            document.getElementById('columnName').value = data.name;
            document.getElementById('columnColor').value = data.color;

            document.getElementById('columnModalTitle').textContent =
                'Редактировать колонку';

            document.getElementById('deleteColumnBtn').style.display =
                'inline-block';

            modal.classList.add('show');
        } catch (error) {
            console.error('Ошибка загрузки колонки:', error);
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
            document.getElementById('editColumnId').value;

        const name =
            document.getElementById('columnName').value;

        const color =
            document.getElementById('columnColor').value;

        const projectId =
            document.getElementById('projectSelect')?.value;

        const csrfToken = this.getCsrfToken();

        const url = columnId
            ? '/tasks/update-column/'
            : '/tasks/create-column/';

        const payload = columnId
            ? {
                column_id: columnId,
                name,
                color
            }
            : {
                project_id: projectId,
                name,
                color
            };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                window.location.reload();
                return;
            }

            console.error('Ошибка сохранения колонки:', result.error);
        } catch (error) {
            console.error('Ошибка запроса:', error);
        }
    }

    async deleteColumnFromModal() {
        const columnId =
            document.getElementById('editColumnId')?.value;

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
            const response = await fetch('/tasks/delete-column/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    column_id: columnId
                })
            });

            const result = await response.json();

            if (result.success) {
                window.location.reload();
                return;
            }

            console.error('Ошибка удаления колонки:', result.error);
        } catch (error) {
            console.error('Ошибка запроса:', error);
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
        const hint = document.querySelector('.mobile-kanban-hint');

        if (!hint) {
            return;
        }

        hint.style.display = this.isCoarsePointer() ? 'block' : 'none';
    }

    isCoarsePointer() {
        if (typeof window.matchMedia !== 'function') {
            return false;
        }

        return (
            window.matchMedia('(pointer: coarse)').matches ||
            window.matchMedia('(hover: none)').matches
        );
    }

    getCsrfToken() {
        const input = document.querySelector(
            'input[name="csrfmiddlewaretoken"]'
        );

        if (input?.value) {
            return input.value;
        }

        const cookie = document.cookie
            .split('; ')
            .find((item) => item.startsWith('csrftoken='));

        return cookie
            ? decodeURIComponent(cookie.substring('csrftoken='.length))
            : '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SimpleKanban();
});