document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.task-row').forEach((row) => {
        row.addEventListener('click', () => {
            const taskId = row.dataset.taskId;

            if (window.taskModal) {
                window.taskModal.openModal(taskId);
            }
        });
    });
});