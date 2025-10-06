/**
 * Cookie Check Manager
 * Quản lý việc kiểm tra Instagram cookies
 */
class CookieCheckManager {
    constructor(instagramManager) {
        this.manager = instagramManager;
        this.isChecking = false;
        this.progressModal = null;
        this.init();
    }

    init() {
        console.log('Initializing Cookie Check Manager...');
        this.setupButtons();
        this.createProgressModal();
    }

    setupButtons() {
        // Nút kiểm tra đã chọn
        const checkSelectedBtn = document.getElementById('check-selected-cookies-btn');
        if (checkSelectedBtn) {
            checkSelectedBtn.addEventListener('click', () => {
                this.checkSelectedCookies();
            });
        }

        // Context menu - check single
        document.addEventListener('click', (e) => {
            const contextItem = e.target.closest('.context-item[data-action="check-ig"]');
            if (contextItem) {
                // Tìm row được right-click
                const contextMenu = document.getElementById('instagram-context-menu');
                const row = document.querySelector('#instagram-tbody tr:hover');
                if (row) {
                    this.checkSingleCookie(row);
                }
            }
        });
    }

    createProgressModal() {
        // Tạo modal hiển thị progress khi check batch
        const modal = document.createElement('div');
        modal.className = 'check-progress';
        modal.id = 'check-progress-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="check-progress-header">
                <h4><i class="fas fa-tasks"></i> Kiểm tra Cookie</h4>
                <button class="btn-close-progress">×</button>
            </div>
            <div class="check-progress-body">
                <div class="check-progress-bar">
                    <div class="check-progress-fill" style="width: 0%"></div>
                </div>
                <div class="check-progress-text">
                    <span id="progress-current">0</span> / <span id="progress-total">0</span>
                </div>
                <div class="check-progress-stats">
                    <span class="stat-live">✅ Live: <strong id="stat-live">0</strong></span>
                    <span class="stat-die">❌ Die: <strong id="stat-die">0</strong></span>
                    <span class="stat-error">⚠️ Error: <strong id="stat-error">0</strong></span>
                </div>
                <div class="check-progress-log" id="check-progress-log"></div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.progressModal = modal;

        // Close button
        modal.querySelector('.btn-close-progress').addEventListener('click', () => {
            this.hideProgressModal();
        });
    }

    showProgressModal() {
        if (this.progressModal) {
            this.progressModal.style.display = 'block';
            this.progressModal.querySelector('.check-progress-fill').style.width = '0%';
            this.progressModal.querySelector('#progress-current').textContent = '0';
            this.progressModal.querySelector('#progress-total').textContent = '0';
            this.progressModal.querySelector('#stat-live').textContent = '0';
            this.progressModal.querySelector('#stat-die').textContent = '0';
            this.progressModal.querySelector('#stat-error').textContent = '0';
            this.progressModal.querySelector('#check-progress-log').innerHTML = '';
        }
    }

    hideProgressModal() {
        if (this.progressModal) {
            this.progressModal.style.display = 'none';
        }
    }

    updateProgress(data) {
        if (!this.progressModal) return;

        const current = data.current || 0;
        const total = data.total || 1;
        const percentage = (current / total) * 100;

        this.progressModal.querySelector('.check-progress-fill').style.width = percentage + '%';
        this.progressModal.querySelector('#progress-current').textContent = current;
        this.progressModal.querySelector('#progress-total').textContent = total;
        this.progressModal.querySelector('#stat-live').textContent = data.live_count || 0;
        this.progressModal.querySelector('#stat-die').textContent = data.die_count || 0;
        this.progressModal.querySelector('#stat-error').textContent = data.error_count || 0;

        // Add log entry
        const logContainer = this.progressModal.querySelector('#check-progress-log');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${data.status}`;
        logEntry.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-msg">IG ${data.ig_id}: ${data.status.toUpperCase()}</span>
        `;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    async checkSingleCookie(row) {
        if (this.isChecking) {
            this.manager.showNotification('Đang kiểm tra cookie khác, vui lòng đợi...', 'warning');
            return;
        }

        const igId = row.dataset.igId;
        const statusCell = row.querySelector('td:nth-child(6)');
        const originalStatus = statusCell.innerHTML;

        try {
            this.isChecking = true;
            
            // Hiển thị đang check
            statusCell.innerHTML = `
                <span class="status-checking">
                    <i class="fas fa-spinner fa-spin"></i> Đang kiểm tra...
                </span>
            `;

            // Lấy account data
            const account = this.getAccountById(igId);
            if (!account || !account.cookie) {
                throw new Error('Không tìm thấy cookie');
            }

            console.log(`Checking cookie for IG ID: ${igId}`);

            // Gọi backend check
            const result = await eel.check_instagram_cookie_single({
                ig_id: igId,
                cookie: account.cookie,
                proxy: account.proxy || null
            })();

            console.log('Check result:', result);

            // Cập nhật UI
            this.updateRowStatus(row, result);

            // Lưu kết quả vào file
            if (result.success && result.status !== 'error') {
                await this.saveCheckResult(igId, result);
            }

            // Thông báo
            const message = result.success 
                ? (result.status === 'live' 
                    ? `✅ Cookie LIVE - ${result.username || 'Unknown'}` 
                    : `❌ Cookie DIE - ${result.message}`)
                : `⚠️ Lỗi: ${result.message}`;
            
            this.manager.showNotification(message, result.status === 'live' ? 'success' : 'error');

        } catch (error) {
            console.error('Error checking cookie:', error);
            statusCell.innerHTML = originalStatus;
            this.manager.showNotification('Lỗi khi kiểm tra cookie: ' + error.message, 'error');
        } finally {
            this.isChecking = false;
        }
    }

    async checkSelectedCookies() {
        if (this.isChecking) {
            this.manager.showNotification('Đang kiểm tra, vui lòng đợi...', 'warning');
            return;
        }

        // Lấy tất cả checkbox đã chọn
        const checkedBoxes = document.querySelectorAll('#instagram-tbody input[type="checkbox"]:checked');
        
        if (checkedBoxes.length === 0) {
            this.manager.showNotification('Vui lòng chọn ít nhất 1 tài khoản để kiểm tra', 'warning');
            return;
        }

        if (!confirm(`Bạn muốn kiểm tra ${checkedBoxes.length} cookie Instagram?`)) {
            return;
        }

        try {
            this.isChecking = true;
            this.showProgressModal();

            // Tạo danh sách cookies
            const cookiesToCheck = [];
            const rowMap = new Map();

            checkedBoxes.forEach(checkbox => {
                const igId = checkbox.dataset.igId;
                const row = checkbox.closest('tr');
                const account = this.getAccountById(igId);
                
                if (account && account.cookie) {
                    cookiesToCheck.push({
                        ig_id: igId,
                        cookie: account.cookie,
                        proxy: account.proxy || null
                    });

                    rowMap.set(igId, row);

                    // Hiển thị đợi
                    const statusCell = row.querySelector('td:nth-child(6)');
                    statusCell.innerHTML = `
                        <span class="status-checking">
                            <i class="fas fa-clock"></i> Đợi...
                        </span>
                    `;
                }
            });

            console.log(`Starting batch check for ${cookiesToCheck.length} cookies`);

            // Set total trong progress modal
            this.progressModal.querySelector('#progress-total').textContent = cookiesToCheck.length;

            // Gọi backend batch check
            const batchResult = await eel.check_instagram_cookies_batch(cookiesToCheck)();

            console.log('Batch check completed:', batchResult);

            if (batchResult.success) {
                // Cập nhật từng row
                for (const result of batchResult.results) {
                    const row = rowMap.get(result.ig_id);
                    if (row) {
                        this.updateRowStatus(row, result);
                        
                        // Lưu kết quả
                        if (result.success && result.status !== 'error') {
                            await this.saveCheckResult(result.ig_id, result);
                        }
                    }
                }

                // Summary notification
                const summary = `
Hoàn thành kiểm tra ${batchResult.total} cookie:
✅ Live: ${batchResult.live_count}
❌ Die: ${batchResult.die_count}
⚠️ Error: ${batchResult.error_count}
                `.trim();
                
                this.manager.showNotification(summary, 'success');

                // Refresh stats
                this.manager.updateInstagramStats();

                // Tự động đóng modal sau 3 giây
                setTimeout(() => {
                    this.hideProgressModal();
                }, 3000);
            } else {
                throw new Error(batchResult.error || 'Lỗi không xác định');
            }

        } catch (error) {
            console.error('Error batch checking cookies:', error);
            this.manager.showNotification('Lỗi khi kiểm tra hàng loạt: ' + error.message, 'error');
            this.hideProgressModal();
        } finally {
            this.isChecking = false;
        }
    }

    updateRowStatus(row, result) {
        const statusCell = row.querySelector('td:nth-child(6)');
        const lastCheckCell = row.querySelector('td:nth-child(7)');
        
        if (result.success) {
            const isLive = result.status === 'live';
            const statusClass = isLive ? 'status-success' : 'status-error';
            const statusIcon = isLive ? 'check-circle' : 'times-circle';
            const statusText = isLive ? 'LIVE' : 'DIE';
            
            statusCell.innerHTML = `
                <span class="status ${statusClass}">
                    <i class="fas fa-${statusIcon}"></i> ${statusText}
                    ${result.username ? `<small>${result.username}</small>` : ''}
                </span>
            `;

            // Cập nhật last check time
            if (lastCheckCell && result.checked_at) {
                const checkTime = new Date(result.checked_at).toLocaleString('vi-VN');
                lastCheckCell.textContent = checkTime;
            }

            // Thêm class cho row
            row.classList.remove('checking', 'live-checked', 'die-checked');
            row.classList.add(isLive ? 'live-checked' : 'die-checked');
        } else {
            statusCell.innerHTML = `
                <span class="status status-error">
                    <i class="fas fa-exclamation-triangle"></i> Error
                </span>
            `;
            row.classList.remove('checking', 'live-checked', 'die-checked');
        }
    }

    getAccountById(igId) {
        if (!this.manager.selectedGolikeAccount || 
            !this.manager.selectedGolikeAccount.instagram_accounts) {
            return null;
        }
        
        return this.manager.selectedGolikeAccount.instagram_accounts.find(
            acc => acc.id === igId
        );
    }

    async saveCheckResult(igId, checkResult) {
        try {
            console.log(`Saving check result for IG ID: ${igId}`);
            
            const result = await eel.update_instagram_cookie_status(
                'data/manager-golike.json',
                igId,
                checkResult
            )();

            if (result.success) {
                // Cập nhật dữ liệu local
                this.manager.golikeAccounts = result.data;
                
                // Cập nhật selectedGolikeAccount
                this.manager.selectedGolikeAccount = this.manager.golikeAccounts.find(
                    acc => acc.id_account === this.manager.selectedGolikeAccount.id_account
                );

                console.log('Check result saved successfully');
            } else {
                console.error('Failed to save check result:', result.error);
            }
        } catch (error) {
            console.error('Error saving check result:', error);
        }
    }
}

// Callback function để nhận progress từ backend
window.update_cookie_check_progress = function(progress) {
    console.log('Cookie check progress:', progress);
    
    if (window.cookieCheckManager) {
        window.cookieCheckManager.updateProgress(progress);
    }
};

// Khởi tạo khi InstagramManager ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Waiting for Instagram Manager...');
    
    const checkManagerReady = setInterval(() => {
        if (window.instagramManager) {
            window.cookieCheckManager = new CookieCheckManager(window.instagramManager);
            console.log('✅ Cookie Check Manager initialized');
            clearInterval(checkManagerReady);
        }
    }, 100);
    
    // Timeout sau 10 giây
    setTimeout(() => {
        clearInterval(checkManagerReady);
        if (!window.cookieCheckManager) {
            console.error('❌ Failed to initialize Cookie Check Manager - Instagram Manager not found');
        }
    }, 10000);
});