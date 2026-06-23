const sidebar = document.getElementById('left-sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');
const mobileBtn = document.getElementById('mobile-menu-btn');
const overlay = document.getElementById('sidebar-overlay');

function openSidebar() {
    sidebar.classList.remove('collapsed');
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
    document.body.style.overflow = '';

    if (window.innerWidth > 768) {
        // Синхронизируем с состоянием десктопа
        if (document.documentElement.classList.contains('sidebar-collapsed')) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
        }
    }
}

if (!sidebar) {
    // Сайдбар отсутствует
} else {
    // Десктоп: сворачивание
    if (toggleBtn) {
        if (document.documentElement.classList.contains('sidebar-collapsed')) {
            sidebar.classList.add('collapsed');
        }

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const collapsed = sidebar.classList.contains('collapsed');
            document.body.style.paddingLeft = collapsed ? '60px' : '240px';
            localStorage.setItem('sidebarCollapsed', collapsed);
            if (collapsed) {
                document.documentElement.classList.add('sidebar-collapsed');
            } else {
                document.documentElement.classList.remove('sidebar-collapsed');
            }
        });
    }

    // Мобилка
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    document.querySelectorAll('.sidebar-item').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
}