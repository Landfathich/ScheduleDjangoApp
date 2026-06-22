class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        this.headerSwitch = document.getElementById('theme-switch-header');
        if (this.headerSwitch) {
            this.headerSwitch.addEventListener('change', () => this.toggleTheme());
        }

        this.themeSwitch = document.getElementById('theme-switch');
        if (this.themeSwitch) {
            this.themeSwitch.checked = (document.documentElement.getAttribute('data-theme') === 'dark');
            this.themeSwitch.addEventListener('change', () => this.toggleTheme());
        }

        requestAnimationFrame(() => {
            document.documentElement.classList.remove('theme-no-transition');
        });
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        this.syncSwitches(next);
        this.saveThemeToServer(next);
    }

    syncSwitches(theme) {
        const isDark = theme === 'dark';
        if (this.themeSwitch) this.themeSwitch.checked = isDark;
        if (this.headerSwitch) this.headerSwitch.checked = isDark;
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
            body: new URLSearchParams({ theme }).toString(),
        }).catch(e => console.error('Ошибка сохранения темы:', e));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});