class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        // Применяем сохранённую тему при загрузке
        this.applySavedTheme();

        // Находим переключатель темы на странице (если есть)
        this.themeSwitch = document.getElementById('theme-switch');
        if (this.themeSwitch) {
            this.syncSwitchWithTheme();
            this.themeSwitch.addEventListener('change', () => this.handleThemeChange());
        }

        // Слушаем изменения темы из других источников (например, SettingsManager)
        this.observeThemeChanges();
    }

    applySavedTheme() {
        let theme = localStorage.getItem('theme');
        if (!theme) {
            theme = 'dark';
        }
        this.setTheme(theme, false);
    }

    setTheme(theme, saveToStorage = true) {
        document.documentElement.setAttribute('data-theme', theme);

        if (saveToStorage) {
            localStorage.setItem('theme', theme);
        }

        // Синхронизируем переключатель, если он есть
        if (this.themeSwitch) {
            this.themeSwitch.checked = (theme === 'dark');
        }
    }

    syncSwitchWithTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        this.themeSwitch.checked = (currentTheme === 'dark');
    }

    handleThemeChange() {
        const newTheme = this.themeSwitch.checked ? 'dark' : 'light';
        this.setTheme(newTheme, true);

        // Отправляем на сервер
        this.saveThemeToServer(newTheme);
    }

    saveThemeToServer(theme) {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        if (!csrfToken) return;

        fetch('/update-user-settings/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken,
            },
            body: new URLSearchParams({theme: theme}).toString(),
        }).catch(error => {
            console.error('Ошибка при сохранении темы:', error);
        });
    }

    observeThemeChanges() {
        // Наблюдаем за изменениями data-theme (например, из SettingsManager)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    const newTheme = document.documentElement.getAttribute('data-theme');
                    if (newTheme) {
                        localStorage.setItem('theme', newTheme);
                        if (this.themeSwitch) {
                            this.themeSwitch.checked = (newTheme === 'dark');
                        }
                    }
                }
            });
        });

        observer.observe(document.documentElement, {attributes: true});
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});