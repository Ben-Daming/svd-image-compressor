// 首页交互功能

document.addEventListener('DOMContentLoaded', function() {
    // 移动端导航菜单切换
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // 平滑滚动到锚点
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 70; 
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
            
            // 移动端关闭菜单
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    });

    // 导航栏滚动效果
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.1)'; 
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.05)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.05)'; 
            navbar.style.boxShadow = 'none';
        }
        
        lastScrollTop = scrollTop;
    });

    // 页面加载动画
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0.9'; 
                entry.target.style.transform = 'translateY(0)';
                entry.target.style.background = 'rgba(255, 255, 255, 0.05)';
                entry.target.style.backdropFilter = 'blur(10px)'; 
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // 观察需要动画的元素
    const animateElements = document.querySelectorAll('.feature-card, .timeline-item, .demo-description');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // SVD矩阵动画
    const matrices = document.querySelectorAll('.matrix');
    matrices.forEach((matrix, index) => {
        // 初始设置透明背景
        matrix.style.background = 'rgba(255, 255, 255, 0.1)';
        matrix.style.backdropFilter = 'blur(10px)';
        matrix.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        
        matrix.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1) rotate(5deg)';
            this.style.background = 'rgba(255, 255, 255, 0.2)'; /* 悬停时稍微增加不透明度 */
        });
        
        matrix.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1) rotate(0deg)';
            this.style.background = 'rgba(255, 255, 255, 0.1)'; 
        });
    });

    // 模拟压缩效果动画
    const compressedImg = document.querySelector('.compressed-img');
    if (compressedImg) {
        setInterval(() => {
            compressedImg.style.opacity = '0.3'; 
            setTimeout(() => {
                compressedImg.style.opacity = '0.7'; 
            }, 500);
        }, 3000);
    }

    // 添加粒子背景效果（可选）
    createParticleBackground();
});

// 创建粒子背景效果
function createParticleBackground() {
    const heroSection = document.querySelector('.hero-section');
    if (!heroSection) return;

    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles-container';
    particlesContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
    `;

    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: rgb(238, 203, 230);; 
            box-shadow: 0 0 5px rgb(247, 7, 191); /* 添加轻微发光效果 */
            border-radius: 50%;
            animation: float ${3 + Math.random() * 4}s ease-in-out infinite;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 3}s;
        `;
        particlesContainer.appendChild(particle);
    }

    heroSection.appendChild(particlesContainer);

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0%, 100% {
                transform: translateY(0px) translateX(0px);
            }
            50% {
                transform: translateY(-20px) translateX(10px);
            }
        }
    `;
    document.head.appendChild(style);
}

// 添加移动端导航菜单样式
const mobileNavStyle = document.createElement('style');
mobileNavStyle.textContent = `
    @media (max-width: 768px) {
        .nav-menu {
            position: fixed;
            top: 70px;
            left: -100%;
            width: 100%;
            height: calc(100vh - 70px);
            background: rgba(255, 255, 255, 0.1); /* 改为10%透明度 */
            backdrop-filter: blur(15px); /* 增加模糊效果 */
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            padding-top: 50px;
            transition: left 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.2); /* 添加轻微边框 */
        }
        
        .nav-menu.active {
            left: 0;
        }
        
        .nav-link {
            font-size: 1.2rem;
            padding: 15px 0;
            color: #333; /* 确保文字可见 */
            text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5); /* 添加文字阴影 */
        }
        
        .nav-toggle {
            background: rgba(255, 255, 255, 0.1); /* 菜单按钮透明背景 */
            border: 1px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
        }
        
        .nav-toggle span {
            background: #333; /* 确保线条可见 */
        }
        
        .nav-toggle.active span:nth-child(1) {
            transform: rotate(45deg) translate(6px, 6px);
        }
        
        .nav-toggle.active span:nth-child(2) {
            opacity: 0;
        }
        
        .nav-toggle.active span:nth-child(3) {
            transform: rotate(-45deg) translate(6px, -6px);
        }
    }
`;
document.head.appendChild(mobileNavStyle);

// 添加全局透明化功能
function makeElementsTransparent() {
    // 为所有动画元素添加透明背景
    const animateElements = document.querySelectorAll('.feature-card, .timeline-item, .demo-description');
    animateElements.forEach(el => {
        el.style.background = 'rgba(255, 255, 255, 0.05)';
        el.style.backdropFilter = 'blur(10px)';
        el.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease, background 0.3s ease';
        
        // 添加悬停效果
        el.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        
        el.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255, 255, 255, 0.05)';
        });
    });
}

// 在DOM加载完成后执行透明化
document.addEventListener('DOMContentLoaded', function() {
    // 执行透明化
    makeElementsTransparent();
});