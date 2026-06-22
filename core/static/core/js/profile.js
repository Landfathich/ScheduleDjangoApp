document.addEventListener('DOMContentLoaded', function () {
    console.log("rest")
    // Проверяем, определены ли userData
    if (typeof userData === 'undefined') {
        console.warn('userData not defined. Please add the script block to template.');
        return;
    }

    console.log('Profile page loaded for user:', userData.username);

    // Переключение табов
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const targetTab = this.getAttribute('data-tab');

            // Убираем активные классы
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // Добавляем активные классы
            this.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');

            // Обновляем текущую вкладку в userData
            userData.currentTab = targetTab;

            // Загружаем данные для активного таба
            loadTabData(targetTab);
        });
    });

    function loadTabData(tabName) {
        const contentElement = document.querySelector(`#${tabName}-tab .loading-state`);
        if (!contentElement) return;

        console.log(`Loading data for tab: ${tabName}`);

        // Здесь будет AJAX загрузка данных для каждого таба
        switch (tabName) {
            case 'teaching':
                loadTeachingData();
                break;
            case 'finance':
                if (userData.isAdmin || userData.teacherId) {
                    loadFinanceData();
                }
                break;
            case 'activity':
                if (userData.isAdmin) {
                    loadActivityData();
                }
                break;
        }
    }

    // Синхронизация темы и акцентного цвета
    const themeRadios = document.querySelectorAll('input[name="appearance_theme"]');
    const accentRadios = document.querySelectorAll('input[name="accent_color"]');

// Установить текущие значения
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const currentAccent = document.documentElement.getAttribute('data-accent') || 'green';

    themeRadios.forEach(r => r.checked = r.value === currentTheme);
    accentRadios.forEach(r => r.checked = r.value === currentAccent);

// Обработчики
    themeRadios.forEach(r => {
        r.addEventListener('change', () => {
            const theme = r.value;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            saveAppearanceSetting('theme', theme);
        });
    });

    accentRadios.forEach(r => {
        r.addEventListener('change', () => {
            const color = r.value;
            document.documentElement.setAttribute('data-accent', color);
            localStorage.setItem('accentColor', color);
            saveAppearanceSetting('accent_color', color);
        });
    });

    function saveAppearanceSetting(key, value) {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        if (!csrfToken) return;
        const body = new URLSearchParams();
        body.append(key, value);
        fetch('/update-user-settings/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken,
            },
            body: body.toString(),
        }).catch(e => console.error('Ошибка сохранения:', e));
    }

    function loadTeachingData() {
        // Заглушка для загрузки данных преподавания
        setTimeout(() => {
            const element = document.querySelector('#teaching-tab .loading-state');
            if (element) {
                element.innerHTML = '<p>Всё еще пусто.</p>';
            }
        }, 7000);
    }

    function loadFinanceData() {
        // Заглушка для загрузки финансовых данных
        setTimeout(() => {
            const element = document.querySelector('#finance-tab .loading-state');
            if (element) {
                element.innerHTML = '<p>Всё еще пусто.</p>';
            }
        }, 7000);
    }

    function loadActivityData() {
        // Заглушка для загрузки данных активности
        setTimeout(() => {
            const element = document.querySelector('#activity-tab .loading-state');
            if (element) {
                element.innerHTML = '<p>Всё еще пусто.</p>';
            }
        }, 7000);
    }

    // Автоматически загружаем данные для активного таба при загрузке страницы
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
        loadTabData(activeTab.getAttribute('data-tab'));
    }
});