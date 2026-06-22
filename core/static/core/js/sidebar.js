const sidebar = document.getElementById('left-sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');

if (!sidebar || !toggleBtn) {
    // Сайдбар отсутствует
} else {
    // Синхронизируем класс collapsed с html.sidebar-collapsed
    if (document.documentElement.classList.contains('sidebar-collapsed')) {
        sidebar.classList.add('collapsed');
    }

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const collapsed = sidebar.classList.contains('collapsed');
        document.body.style.paddingLeft = collapsed ? '60px' : '240px';
        localStorage.setItem('sidebarCollapsed', collapsed);
        // Синхронизируем html
        if (collapsed) {
            document.documentElement.classList.add('sidebar-collapsed');
        } else {
            document.documentElement.classList.remove('sidebar-collapsed');
        }
    });

    document.querySelectorAll('.sidebar-item').forEach(link => {
        link.addEventListener('click', () => {
            sidebar.style.transition = 'none';
        });
    });

    window.addEventListener('pageshow', () => {
        sidebar.style.transition = '';
    });
}