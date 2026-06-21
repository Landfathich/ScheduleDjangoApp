class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        this.headerSwitch = document.getElementById('theme-switch-header');
        if (this.headerSwitch) {
            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
            this.headerSwitch.checked = (theme === 'dark');
            this.headerSwitch.addEventListener('change', () => this.handleHeaderToggle());
        }

        this.themeSwitch = document.getElementById('theme-switch');
        if (this.themeSwitch) {
            this.syncSwitchWithTheme();
            this.themeSwitch.addEventListener('change', () => this.handleModalToggle());
        }

        requestAnimationFrame(() => {
            document.documentElement.classList.remove('theme-no-transition');
        });

        this.observeThemeChanges();
    }

    setTheme(theme, saveToStorage = true) {
        document.documentElement.setAttribute('data-theme', theme);
        if (saveToStorage) localStorage.setItem('theme', theme);
        this.syncAllSwitches(theme);
    }

    syncAllSwitches(theme) {
        const isDark = theme === 'dark';
        if (this.themeSwitch) this.themeSwitch.checked = isDark;
        if (this.headerSwitch) this.headerSwitch.checked = isDark;
        const icon = document.getElementById('theme-slider-icon');
    }

    syncSwitchWithTheme() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        this.themeSwitch.checked = (theme === 'dark');
    }

    handleModalToggle() {
        const theme = this.themeSwitch.checked ? 'dark' : 'light';
        this.setTheme(theme, true);
        this.saveThemeToServer(theme);
    }

    handleHeaderToggle() {
        const theme = this.headerSwitch.checked ? 'dark' : 'light';
        this.setTheme(theme, true);
        this.saveThemeToServer(theme);
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
            body: new URLSearchParams({theme}).toString(),
        }).catch(e => console.error('Ошибка сохранения темы:', e));
    }

    observeThemeChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    const theme = document.documentElement.getAttribute('data-theme');
                    if (theme) {
                        localStorage.setItem('theme', theme);
                        // Не вызываем syncAllSwitches — observer срабатывает и при загрузке
                        if (this.themeSwitch) this.themeSwitch.checked = (theme === 'dark');
                        if (this.headerSwitch) this.headerSwitch.checked = (theme === 'dark');
                    }
                }
            });
        });
        observer.observe(document.documentElement, {attributes: true});
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});