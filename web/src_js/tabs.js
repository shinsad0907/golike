// tabs.js - Tab navigation functionality

class TabManager {
    constructor() {
        this.currentTab = 'accounts';
        this.init();
    }

    init() {
        this.bindEvents();
        this.showTab('accounts'); // Show default tab
    }

    bindEvents() {
        // Tab button click events
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.showTab(tabName);
            });
        });

        // Close modal events
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });

        // Modal background click to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    if (modal.style.display !== 'none') {
                        this.closeModal(modal);
                    }
                });
            }
        });
    }

    showTab(tabName) {
        // Update current tab
        this.currentTab = tabName;

        // Hide all tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        // Show selected tab pane
        const targetPane = document.getElementById(`${tabName}-tab`);
        if (targetPane) {
            targetPane.classList.add('active');
        }

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        // Load tab-specific data
        this.loadTabData(tabName);

        // Hide all context menus when switching tabs
        this.hideAllContextMenus();

        console.log(`Switched to tab: ${tabName}`);
    }

    loadTabData(tabName) {
        switch (tabName) {
            case 'accounts':
                this.loadAccountsData();
                break;
            case 'facebook':
                this.loadFacebookData();
                break;
            case 'runner':
                this.loadRunnerData();
                break;
        }
    }

    loadAccountsData() {
        // Load GoLike accounts data
        if (window.golikeFunctions) {
            window.golikeFunctions.loadGoLikeAccounts();
        }
    }

    loadFacebookData() {
        // Load Facebook accounts data
        if (window.golikeFunctions) {
            window.golikeFunctions.loadGoLikeAccountsForSelect();
        }
    }

    loadRunnerData() {
        // Load runner data
        if (window.golikeFunctions) {
            window.golikeFunctions.loadRunnerStats();
            window.golikeFunctions.loadRunnerAccounts();
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Focus first input
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            // Clear form data
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            } else {
                // Clear individual inputs
                modal.querySelectorAll('input, textarea, select').forEach(input => {
                    if (input.type !== 'checkbox' && input.type !== 'radio') {
                        input.value = '';
                    } else if (input.type === 'checkbox') {
                        input.checked = false;
                    }
                });
            }
        }
    }

    hideAllContextMenus() {
        document.querySelectorAll('.context-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }

    getCurrentTab() {
        return this.currentTab;
    }

    // Utility methods for UI updates
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <tr>
                    <td colspan="10" class="loading">
                        <i class="fas fa-spinner"></i><br>
                        Đang tải dữ liệu...
                    </td>
                </tr>
            `;
        }
    }

    showEmpty(containerId, message = 'Không có dữ liệu') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h4>${message}</h4>
                        <p>Nhấn nút thêm để bắt đầu</p>
                    </td>
                </tr>
            `;
        }
    }

    showError(containerId, error) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i>
                        <h4 style="color: #dc3545;">Lỗi khi tải dữ liệu</h4>
                        <p>${error}</p>
                    </td>
                </tr>
            `;
        }
    }

    updateCounter(elementId, count) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = count;
        }
    }

    animateCounter(elementId, targetCount, duration = 1000) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startCount = parseInt(element.textContent) || 0;
        const increment = (targetCount - startCount) / (duration / 16);
        let currentCount = startCount;

        const timer = setInterval(() => {
            currentCount += increment;
            if ((increment > 0 && currentCount >= targetCount) || 
                (increment < 0 && currentCount <= targetCount)) {
                currentCount = targetCount;
                clearInterval(timer);
            }
            element.textContent = Math.floor(currentCount);
        }, 16);
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Position notification
        this.positionNotification(notification);

        // Auto remove
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.removeNotification(notification);
        });
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    positionNotification(notification) {
        const notifications = document.querySelectorAll('.notification');
        const index = Array.from(notifications).indexOf(notification);
        notification.style.cssText = `
            position: fixed;
            top: ${20 + (index * 60)}px;
            right: 20px;
            background: #2d2d2d;
            color: #fff;
            padding: 12px 16px;
            border-radius: 6px;
            border-left: 4px solid #007bff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 3000;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 300px;
            animation: slideInRight 0.3s ease;
        `;
    }

    removeNotification(notification) {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            // Reposition remaining notifications
            document.querySelectorAll('.notification').forEach((notif, index) => {
                notif.style.top = `${20 + (index * 60)}px`;
            });
        }, 300);
    }

    // Progress bar methods
    showProgress(containerId, progress = 0) {
        const container = document.getElementById(containerId);
        if (container) {
            let progressBar = container.querySelector('.progress-bar');
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';
                progressBar.innerHTML = '<div class="progress-fill"></div>';
                container.appendChild(progressBar);
            }
            
            const fill = progressBar.querySelector('.progress-fill');
            fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
    }

    hideProgress(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const progressBar = container.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.remove();
            }
        }
    }
}

// Create global tab manager instance
window.tabManager = new TabManager();

// Add CSS for notifications animation
const notificationCSS = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = notificationCSS;
document.head.appendChild(style);

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabManager;
}