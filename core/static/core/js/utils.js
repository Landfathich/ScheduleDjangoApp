export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const MONTH_NAMES = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

export function formatDate(date) {
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

export function showConfirmationModal({
                                          text,
                                          onConfirm,
                                          onCancel,
                                          inputConfig = null
                                      }) {
    const confirmationModal = document.getElementById('confirmation-modal');
    if (!confirmationModal) return;

    const confirmationText = document.getElementById('confirmation-text');
    confirmationText.innerHTML = text;

    const inputContainer = document.getElementById('input-container');
    let inputElement = null;

    if (inputConfig) {
        inputContainer.innerHTML = '';

        inputElement = document.createElement(inputConfig.type === 'textarea' ? 'textarea' : 'input');
        inputElement.placeholder = inputConfig.placeholder || '';
        inputElement.required = inputConfig.required || false;

        if (inputConfig.type === 'number') {
            inputElement.type = 'number';
            inputElement.min = inputConfig.min || '';
            inputElement.max = inputConfig.max || '';
        }

        inputContainer.appendChild(inputElement);
        inputContainer.style.display = 'block';
    } else {
        inputContainer.style.display = 'none';
    }

    confirmationModal.style.display = 'block';
    confirmationModal.style.zIndex = '10001';

    document.getElementById('confirm-change').onclick = () => {
        if (inputConfig?.required && (!inputElement || !inputElement.value.trim())) {
            alert(inputConfig.errorMessage || 'Поле обязательно для заполнения');
            return;
        }

        const inputValue = inputElement ? inputElement.value : null;
        onConfirm(inputValue);
        closeConfirmationModal();
    };

    document.getElementById('cancel-change').onclick = () => {
        onCancel?.();
        closeConfirmationModal();
    };
}

export function closeConfirmationModal() {
    const confirmationModal = document.getElementById('confirmation-modal');
    if (confirmationModal) {
        confirmationModal.style.display = 'none';
    }
}

export function updateCounter(
    elementId,
    count,
    {
        colorNormal = '#4285f4',
        colorAlert = '#cc0000',
        alertThreshold = 3,
        maxDisplay = 9
    } = {}
) {
    const counter = document.getElementById(elementId);
    if (!counter) return;

    if (count > 0) {
        counter.textContent = count > maxDisplay ? `${maxDisplay}+` : count;
        counter.style.display = 'flex';
        counter.style.backgroundColor = count >= alertThreshold ? colorAlert : colorNormal;
    } else {
        counter.style.display = 'none';
    }
}