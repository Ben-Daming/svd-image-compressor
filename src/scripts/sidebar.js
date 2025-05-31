document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const menuToggle = document.getElementById('menuToggle');
    const closeSidebar = document.getElementById('closeSidebar');

    // 遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // 打开侧边栏
    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        if (window.innerWidth > 768) {
            mainContent.classList.add('shifted');
        }
        menuToggle.classList.add('hidden');
    }

    // 关闭侧边栏
    function closeSidebarFunc() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        mainContent.classList.remove('shifted');
        menuToggle.classList.remove('hidden');
    }

    // 事件监听
    menuToggle.addEventListener('click', openSidebar);
    closeSidebar.addEventListener('click', closeSidebarFunc);
    overlay.addEventListener('click', closeSidebarFunc);

    // ESC键关闭
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebarFunc();
        }
    });

    // 窗口大小改变时的处理
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            mainContent.classList.remove('shifted');
        } else if (sidebar.classList.contains('open')) {
            mainContent.classList.add('shifted');
        }
    });

    // 平滑滚动到锚点
    if (window.location.pathname.includes('svd-theory.html')) {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
});