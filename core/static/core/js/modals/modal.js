export class Modal {
    constructor(options = {}) {
        // Параметры по умолчанию
        this.options = {
            title: 'Модальное окно',
            subTitle: '',
            content: '',
            footer: '',
            closeOnOutsideClick: true,
            modalClass: '',
            modalContentClass: '',
            headerElements: [],
            ...options
        };

        // Создаем элементы
        this.modalElement = this.#createModalElement();
        this.#setupEventListeners();
    }

    // Приватный метод создания DOM-элемента
    #createModalElement() {
        const modal = document.createElement('div');
        modal.className = `modal ${this.options.modalClass}`;

        const modalContent = document.createElement('div');
        modalContent.className = `modal-content ${this.options.modalContentClass}`;

        // Header
        const header = this.#createHeader();
        // Body
        const body = this.#createBody();
        // Footer
        const footer = this.#createFooter();

        modalContent.append(header, body, footer);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);
        return modal;
    }

    #createHeader() {
        const header = document.createElement('div');
        header.className = 'modal-header';

        const title = document.createElement('h3');
        title.textContent = this.options.title;

        let subTitle = null;
        if (this.options.subTitle) {
            subTitle = document.createElement('h4');
            subTitle.textContent = this.options.subTitle;
            subTitle.className = 'modal-subtitle';
            // Добавляем специальный класс, когда есть подзаголовок
            header.classList.add('has-subtitle');
        }

        const closeBtn = document.createElement('span');
        closeBtn.className = 'close';
        closeBtn.innerHTML = '&times;';

        // Добавляем кастомные элементы из options.headerElements
        const elementsContainer = document.createElement('div');
        elementsContainer.className = 'header-elements';
        this.options.headerElements.forEach(element => {
            elementsContainer.appendChild(element);
        });

        // Добавляем subTitle только если он был создан
        const headerElements = [title];
        if (subTitle) {
            headerElements.push(subTitle);
        }
        headerElements.push(elementsContainer, closeBtn);

        header.append(...headerElements);
        return header;
    }

    #createBody() {
        const body = document.createElement('div');
        body.className = 'modal-body';

        if (typeof this.options.content === 'string') {
            body.innerHTML = this.options.content;
        } else if (this.options.content instanceof HTMLElement) {
            body.appendChild(this.options.content);
        }

        return body;
    }

    #createFooter() {
        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        if (typeof this.options.footer === 'string') {
            footer.innerHTML = this.options.footer;
        } else if (this.options.footer instanceof HTMLElement) {
            footer.appendChild(this.options.footer);
        } else if (!this.options.footer) {
            footer.innerHTML = `
        <button class="cancel-button">Закрыть</button>
      `;
        }

        return footer;
    }

    #setupEventListeners() {
        // Закрытие по кнопке
        this.modalElement.querySelector('.close')?.addEventListener('click', () => this.close());
        this.modalElement.querySelector('.cancel-button')?.addEventListener('click', () => this.close());

        // Закрытие по клику вне модалки
        if (this.options.closeOnOutsideClick) {
            this.modalElement.addEventListener('click', (e) => {
                if (e.target === this.modalElement) {
                    this.close();
                }
            });
        }
    }

    // Публичные методы
    open() {
        this.modalElement.style.display = 'block';
        document.body.style.overflow = 'hidden';
        return this;
    }

    close() {
        this.destroy()
        return this;
    }

    destroy() {
        this.modalElement.remove();
        return this;
    }

    updateContent(content) {
        const body = this.modalElement.querySelector('.modal-body');
        body.innerHTML = '';

        if (typeof content === 'string') {
            body.innerHTML = content;
        } else {
            body.appendChild(content);
        }

        return this;
    }

    getElement() {
        return this.modalElement;
    }
}