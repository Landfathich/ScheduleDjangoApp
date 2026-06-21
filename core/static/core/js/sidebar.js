const sidebar = document.getElementById('left-sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');

// Восстановить состояние из localStorage
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