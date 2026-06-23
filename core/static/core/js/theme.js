class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        requestAnimationFrame(() => {
            document.documentElement.classList.remove('theme-no-transition');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});