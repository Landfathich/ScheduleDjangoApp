class TaskModal {
    constructor() {
        this.modal = document.getElementById('taskModal');
        this.imageViewerModal = document.getElementById('imageViewerModal');

        if (!this.modal) {
            return;
        }

        this.bindEvents();
    }

    bindEvents() {
        const createButton = document.getElementById('createTaskBtn');

        if (createButton) {
            createButton.addEventListener('click', () => {
                this.openModal(
                    null,
                    createButton.dataset.defaultProject || null
                );
            });
        }

        const closeButton = this.modal.querySelector('.close');

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closeModal();
            });
        }

        const closeModalButton = this.modal.querySelector('.close-modal');

        if (closeModalButton) {
            closeModalButton.addEventListener('click', () => {
                this.closeModal();
            });
        }

        const saveButton = document.getElementById('saveTaskBtn');

        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveTask();
            });
        }

        const deleteButton = document.getElementById('deleteTaskBtn');

        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.deleteTask();
            });
        }

        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.closeModal();
            }

            if (event.target === this.imageViewerModal) {
                this.closeImageView();
            }
        });

        this.bindImagePreview();
        this.bindImageViewer();
    }

    openModal(taskId = null, defaultProjectId = null) {
        const form = document.getElementById('taskForm');

        if (!form) {
            return;
        }

        form.reset();

        document.getElementById('taskId').value = '';
        document.getElementById('modalTitle').textContent = 'Создать задачу';

        const currentImage = document.getElementById('currentImage');
        currentImage.style.display = 'none';

        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('deleteImageCheckbox').checked = false;

        const deleteButton = document.getElementById('deleteTaskBtn');
        deleteButton.style.display = 'none';

        this.hideTaskContext();

        if (defaultProjectId) {
            const projectSelect = document.getElementById('projectId');

            if (projectSelect) {
                projectSelect.value = defaultProjectId;
            }
        }

        this.modal.classList.add('show');

        if (taskId) {
            this.loadTaskData(taskId);
        }
    }

    closeModal() {
        this.modal.classList.remove('show');
    }

    async loadTaskData(taskId) {
        try {
            const response = await fetch(
                `/tasks/get-task-data/${taskId}/`
            );

            const task = await response.json();

            document.getElementById('taskId').value = taskId;
            document.getElementById('modalTitle').textContent = 'Редактировать задачу';

            document.querySelector('[name="title"]').value = task.title || '';
            document.querySelector('[name="description"]').value = task.description || '';

            document.querySelector('[name="assignee"]').value =
                task.assignee || '';

            document.getElementById('projectId').value =
                task.project || '';

            document.querySelector('[name="due_date"]').value =
                task.due_date || '';

            document.querySelector('[name="priority"]').value =
                task.priority || 'normal';

            this.displayTaskContext(task);

            if (task.image_url) {
                this.displayCurrentImage(task.image_url);
            }

            document.getElementById('deleteTaskBtn').style.display = 'inline-block';
        } catch (error) {
            console.error('Ошибка загрузки задачи:', error);
        }
    }

    displayTaskContext(task) {
        const context = document.getElementById('taskContext');
        const projectContext = document.getElementById('taskProjectContext');
        const columnContext = document.getElementById('taskColumnContext');

        if (!task.project_name && !task.column_name) {
            context.style.display = 'none';
            return;
        }

        projectContext.textContent = task.project_name
            ? `Проект: ${task.project_name}`
            : '';

        columnContext.textContent = task.column_name
            ? `Колонка: ${task.column_name}`
            : '';

        context.style.display = 'block';
    }

    hideTaskContext() {
        const context = document.getElementById('taskContext');

        if (context) {
            context.style.display = 'none';
        }
    }

    displayCurrentImage(imageUrl) {
        const currentImage = document.getElementById('currentImage');
        const imagePreview = document.getElementById('imagePreview');

        currentImage.style.display = 'block';

        imagePreview.innerHTML = `
            <img
                src="${imageUrl}"
                alt=""
                style="max-width: 200px; max-height: 150px; cursor: pointer;"
                id="currentTaskImage"
            >
        `;

        const image = document.getElementById('currentTaskImage');

        image.addEventListener('click', () => {
            this.viewFullImage(imageUrl);
        });
    }

    viewFullImage(imageUrl) {
        const image = document.getElementById('fullImage');

        image.src = imageUrl;
        this.imageViewerModal.classList.add('show');
    }

    closeImageView() {
        this.imageViewerModal.classList.remove('show');
    }

    bindImageViewer() {
        const closeButton = document.querySelector('.close-image-viewer');

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closeImageView();
            });
        }
    }

    bindImagePreview() {
        const input = document.querySelector('[name="image"]');

        if (!input) {
            return;
        }

        input.addEventListener('change', (event) => {
            this.previewSelectedImage(event);
        });
    }

    previewSelectedImage(event) {
        const file = event.target.files[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const currentImage = document.getElementById('currentImage');
            const imagePreview = document.getElementById('imagePreview');

            currentImage.style.display = 'block';

            imagePreview.innerHTML = `
                <img
                    src="${e.target.result}"
                    alt=""
                    style="max-width: 200px; max-height: 150px;"
                >
            `;
        };

        reader.readAsDataURL(file);
    }

    async saveTask() {
        const form = document.getElementById('taskForm');
        const formData = new FormData(form);
        const taskId = document.getElementById('taskId').value;

        const url = taskId
            ? `/tasks/edit/${taskId}/`
            : '/tasks/create/';

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.closeModal();
                window.location.reload();
                return;
            }

            console.error('Ошибка сохранения:', result.errors || result.error);
        } catch (error) {
            console.error('Ошибка запроса:', error);
        }
    }

    async deleteTask() {
        const taskId = document.getElementById('taskId').value;

        if (!taskId) {
            return;
        }

        if (!confirm('Удалить задачу?')) {
            return;
        }

        try {
            const response = await fetch(
                `/tasks/delete/${taskId}/`,
                {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': this.getCsrfToken()
                    }
                }
            );

            const result = await response.json();

            if (result.success) {
                this.closeModal();
                window.location.reload();
                return;
            }

            console.error('Ошибка удаления:', result.error);
        } catch (error) {
            console.error('Ошибка запроса:', error);
        }
    }

    getCsrfToken() {
        const input = document.querySelector(
            '#taskForm input[name="csrfmiddlewaretoken"]'
        );

        return input ? input.value : '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.taskModal = new TaskModal();
});