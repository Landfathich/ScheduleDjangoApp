import {Modal} from './modal.js';
import {showNotification} from '../notifications.js';

export class CancelLessonModal extends Modal {
    constructor(options) {
        const content = CancelLessonModal.generateContent();
        const footer = CancelLessonModal.generateFooter();

        super({
            modalId: 'cancel-lesson-modal',
            title: 'Отмена урока',
            subTitle: 'Обязательно согласовать с администратором',
            content,
            footer,
            size: 'small'
        });

        this.onConfirm = options.onConfirm;
        this.onCancel = options.onCancel;

        this.initElements();
        this.setupEventListeners();

        this.cancelled_by = null;
        this.cancel_reason = null;
        this.is_custom_reason = false;
        this.other_reason_text = '';
    }

    static generateContent() {
        return `
            <div class="cancel-options">
                <h3>По чьей причине отменяется урок?</h3>
                <div class="side-options">
                    <label class="option-card">
                        <input type="radio" name="cancel-side" value="teacher">
                        <div class="card-content">
                            <span class="icon">👨‍🏫</span>
                            <span class="text">Преподаватель</span>
                        </div>
                    </label>
                    <label class="option-card">
                        <input type="radio" name="cancel-side" value="student">
                        <div class="card-content">
                            <span class="icon">👨‍🎓</span>
                            <span class="text">Ученик</span>
                        </div>
                    </label>
                </div>
                
                <div class="reasons-section" style="display: none;">
                    <h3>Причина отмены</h3>
                    <div class="reason-options">
                        <select class="reason-select">
                            <option value="" disabled selected>Выберите причину</option>
                        </select>
                    </div>
                    <div class="other-reason-container" style="display: none; margin-top: 15px;">
                        <textarea class="other-reason-input" placeholder="Укажите причину отмены (минимум 5 символов)" rows="3"></textarea>
                        <div class="char-counter"><span class="current">0</span>/<span class="min">5</span> символов</div>
                    </div>
                </div>
            </div>
        `;
    }

    static generateFooter() {
        return `
            <button class="cancel-button">Закрыть</button>
            <button class="submit-button" disabled>Подтвердить отмену</button>
        `;
    }

    initElements() {
        this.sideOptions = this.modalElement.querySelectorAll('input[name="cancel-side"]');
        this.reasonsSection = this.modalElement.querySelector('.reasons-section');
        this.reasonSelect = this.modalElement.querySelector('.reason-select');
        this.otherReasonContainer = this.modalElement.querySelector('.other-reason-container');
        this.otherReasonInput = this.modalElement.querySelector('.other-reason-input');
        this.charCounter = this.modalElement.querySelector('.char-counter');
        this.currentCharCount = this.modalElement.querySelector('.char-counter .current');
        this.minCharCount = this.modalElement.querySelector('.char-counter .min');

        this.cancelButton = this.modalElement.querySelector('.cancel-button');
        this.submitButton = this.modalElement.querySelector('.submit-button');
    }

    setupEventListeners() {
        this.sideOptions.forEach(option => {
            option.addEventListener('change', (e) => {
                const selectedValue = e.target.value; // "teacher" или "student"
                const selectedLabel = e.target.closest('label').querySelector('.text').textContent;

                this.selectedSide = selectedValue;
                this.cancelled_by = selectedLabel;

                this.updateReasons();
                this.reasonsSection.style.display = 'block';
                this.checkFormValidity();
            });
        });

        this.reasonSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            this.is_custom_reason = e.target.value === 'other';
            this.cancel_reason = this.is_custom_reason ? '' : selectedOption.text;
            this.otherReasonContainer.style.display = this.is_custom_reason ? 'block' : 'none';
            this.checkFormValidity();
        });

        this.otherReasonInput.addEventListener('input', (e) => {
            this.other_reason_text = e.target.value;
            this.cancel_reason = this.other_reason_text;

            const count = this.other_reason_text.length;
            this.currentCharCount.textContent = count;
            this.charCounter.style.color = count < 5 ? 'var(--danger-color)' : 'var(--success-color)';

            this.checkFormValidity();
        });

        this.submitButton.addEventListener('click', () => {
            if (!this.isFormValid()) {
                showNotification('Пожалуйста, заполните все обязательные поля', 'error');
                return;
            }

            const cancelData = {
                cancelled_by: this.cancelled_by,
                cancel_reason: this.cancel_reason,
                is_custom_reason: this.is_custom_reason
            };

            if (this.onConfirm) {
                this.onConfirm(cancelData);
            }
            this.close();
        });

        this.cancelButton.addEventListener('click', () => {
            if (this.onCancel) {
                this.onCancel();
            }
            this.close();
        });
    }

    updateReasons() {
        this.reasonSelect.innerHTML = '<option value="" disabled selected>Выберите причину</option>';

        const reasons = this.selectedSide === 'teacher'
            ? [
                {value: 'illness', label: 'Болезнь преподавателя'},
                {value: 'emergency', label: 'Чрезвычайная ситуация'},
                {value: 'electricity', label: 'Отключение интернета/электричества'},
                {value: 'rest', label: 'Отгул'},
                {value: 'other', label: 'Другая причина'}
            ]
            : [
                {value: 'illness', label: 'Болезнь ученика'},
                {value: 'no_show', label: 'Ученик не явился'},
                {value: 'reschedule', label: 'Перенос урока'},
                {value: 'other', label: 'Другая причина'}
            ];

        reasons.forEach(reason => {
            const option = document.createElement('option');
            option.value = reason.value;
            option.textContent = reason.label;
            this.reasonSelect.appendChild(option);
        });

        this.selectedReason = null;
        this.otherReasonContainer.style.display = 'none';
        this.otherReasonInput.value = '';
        this.otherReasonText = '';
        this.currentCharCount.textContent = '0';
        this.charCounter.style.color = 'var(--danger-color)';
    }


    isFormValid() {
        if (!this.cancelled_by || !this.cancel_reason) return false;
        return !(this.is_custom_reason && this.other_reason_text.length < 5);
    }

    checkFormValidity() {
        this.submitButton.disabled = !this.isFormValid();
    }

    close() {
        super.close();
        this.selectedSide = null;
        this.selectedReason = null;
        this.otherReasonText = '';
        this.reasonsSection.style.display = 'none';
        this.otherReasonContainer.style.display = 'none';
        this.sideOptions.forEach(option => option.checked = false);
        this.reasonSelect.innerHTML = '<option value="" disabled selected>Выберите причину</option>';
        this.otherReasonInput.value = '';
        this.currentCharCount.textContent = '0';
        this.charCounter.style.color = 'var(--danger-color)';
        this.submitButton.disabled = true;
    }
}