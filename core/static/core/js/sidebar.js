const sidebar = document.getElementById('left-sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');

if (!sidebar || !toggleBtn) {
    // Сайдбар отсутствует на странице (например, логин)
} else {
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('collapsed');
        document.body.style.paddingLeft = '60px';
    }

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const collapsed = sidebar.classList.contains('collapsed');
        document.body.style.paddingLeft = collapsed ? '60px' : '240px';
        localStorage.setItem('sidebarCollapsed', collapsed);
    });

    // Отключаем анимацию при клике на ссылки, чтобы не мелькал
    document.querySelectorAll('.sidebar-item').forEach(link => {
        link.addEventListener('click', () => {
            sidebar.style.transition = 'none';
        });
    });

    // Восстанавливаем transition при возврате на страницу
    window.addEventListener('pageshow', () => {
        sidebar.style.transition = '';
    });
}