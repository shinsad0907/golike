// golike-manager.js
class GoLikeManager {
    constructor() {
        this.accounts = [];
        this.currentEditingIndex = -1;
        this.dataFile = 'data/manager-golike.json';
        this.init();
    }

    async init() {
        await this.loadAccounts();
        this.bindEvents();
        this.updateStats();
    }

    bindEvents() {
        // Add account button
        document.getElementById('add-account-btn').addEventListener('click', () => {
            this.showAddModal();
        });

        // Modal events
        document.getElementById('save-account-btn').addEventListener('click', () => {
            this.saveAccount();
        });

        document.getElementById('cancel-account-btn').addEventListener('click', () => {
            this.hideModal();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.target.closest('#add-account-modal')) {
                    this.hideModal();
                }
            });
        });

        // Click outside modal to close
        document.getElementById('add-account-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal();
            }
        });

        // Select all checkbox
        document.getElementById('select-all-accounts').addEventListener('change', (e) => {
            this.selectAllAccounts(e.target.checked);
        });

        // Table row events
        this.bindTableEvents();
    }
    extractInstagramFromGolike() {
        console.log('Extracting Instagram accounts from GoLike accounts...');
        this.instagramAccounts = [];
        this.golikeAccounts.forEach(golikeAcc => {
            if (golikeAcc.instagram_accounts && Array.isArray(golikeAcc.instagram_accounts)) {
                golikeAcc.instagram_accounts.forEach(igAcc => {
                    if (!this.instagramAccounts.some(existing => existing.id === igAcc.id)) {
                        this.instagramAccounts.push({
                            ...igAcc,
                            golike_account_id: golikeAcc.id_account,
                            golike_username: golikeAcc.username_account
                        });
                    }
                });
            }
        });
        console.log('Extracted Instagram accounts:', this.instagramAccounts.length);

        // 👉 thêm dòng này để hiển thị ngay
        this.updateInstagramTable(this.instagramAccounts);
    }

    bindTableEvents() {
        const tbody = document.getElementById('accounts-tbody');
        tbody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;

            // Handle checkbox
            if (e.target.type === 'checkbox') {
                this.updateSelectAllState();
                return;
            }

            // Handle row selection
            if (!e.target.closest('.action-btn')) {
                this.toggleRowSelection(row);
            }
        });

        // Context menu
        tbody.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const row = e.target.closest('tr');
            if (row) {
                this.showContextMenu(e, row);
            }
        });
    }

    showAddModal(editIndex = -1) {
        this.currentEditingIndex = editIndex;
        const modal = document.getElementById('add-account-modal');
        const modalTitle = modal.querySelector('.modal-header h3');
        
        if (editIndex >= 0) {
            // Edit mode
            modalTitle.textContent = 'CHỈNH SỬA TÀI KHOẢN GOLIKE';
            const account = this.accounts[editIndex];
            document.getElementById('modal-cookie').value = account.authorization || '';
        } else {
            // Add mode
            modalTitle.textContent = 'THÊM TÀI KHOẢN GOLIKE';
            document.getElementById('modal-cookie').value = '';
        }

        modal.style.display = 'flex';
        // Focus first input
        setTimeout(() => {
            document.getElementById('modal-username').focus();
        }, 100);
    }

    hideModal() {
        document.getElementById('add-account-modal').style.display = 'none';
        this.currentEditingIndex = -1;
    }

    async saveAccount() {
        const authorization = document.getElementById('modal-cookie').value.trim();

        // Validation
        if (!authorization) {
            this.showNotification('Vui lòng nhập Authorization!', 'error');
            return;
        }

        const accountData = {
            id: this.currentEditingIndex >= 0 ? this.accounts[this.currentEditingIndex].id : Date.now().toString(),
            authorization: authorization,
            instagram_accounts: this.currentEditingIndex >= 0 ? this.accounts[this.currentEditingIndex].instagram_accounts || [] : []
        };

        try {
            if (this.currentEditingIndex >= 0) {
                // Update existing account
                this.accounts[this.currentEditingIndex] = accountData;
                this.showNotification('Cập nhật tài khoản thành công!', 'success');
            } else {
                // Add new account
                this.accounts.push(accountData);
                this.showNotification('Thêm tài khoản thành công!', 'success');
            }

            await this.saveAccountsToFile();
            this.renderTable();
            this.updateStats();
            this.hideModal();

        } catch (error) {
            console.error('Save account error:', error);
            this.showNotification('Lỗi khi lưu tài khoản!', 'error');
        }
    }

    async loadAccounts() {
        try {
            // Use Eel to read from JSON file
            if (typeof eel !== 'undefined' && eel.read_json_file) {
                const result = await eel.read_json_file(this.dataFile)();
                if (result.success) {
                    this.accounts = result.data || [];
                } else {
                    console.log('File not found or empty, starting with empty array');
                    this.accounts = [];
                }
            } else {
                // Fallback for development/testing
                console.log('Eel not available, using sample data');
                this.accounts = [];
            }
            this.renderTable();
        } catch (error) {
            console.error('Load accounts error:', error);
            this.accounts = [];
            this.showNotification('Lỗi khi tải dữ liệu!', 'error');
        }
    }

    async saveAccountsToFile() {
        try {
            // Use Eel to write to JSON file
            if (typeof eel !== 'undefined' && eel.write_json_file) {
                const result = await eel.write_json_file(this.dataFile, this.accounts)();
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save file');
                }
            } else {
                // Fallback for development/testing
                console.log('Eel not available, data would be saved to:', this.dataFile);
                console.log('Data:', this.accounts);
            }
            
            // Update other selects that depend on GoLike accounts
            this.updateAccountSelects();
        } catch (error) {
            console.error('Save accounts to file error:', error);
            throw error;
        }
    }

    renderTable() {
        const tbody = document.getElementById('accounts-tbody');
        if (!tbody) return;

        if (this.accounts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-users"></i>
                        <h4>Chưa có tài khoản nào</h4>
                        <p>Nhấn "Thêm tài khoản" để bắt đầu</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.accounts.map((account, index) => `
            <tr data-index="${index}">
                <td class="checkbox-col">
                    <input type="checkbox" class="account-checkbox" data-index="${index}">
                </td>
                <td>${index + 1}</td>
                <td>${account.id_account || 'N/A'}</td>
                <td>
                    <div class="cookie-display" title="${account.authorization}">
                        ${account.authorization ? account.authorization.substring(0, 30) + '...' : 'N/A'}
                    </div>
                </td>
                <td>${account.name_account || 'N/A'}</td>
                <td>${account.username_account || 'N/A'}</td>
                <td>${account.email_account || 'N/A'}</td>
                <td>${account.pending_coin || 'N/A'}</td>
                <td>${account.total_coin || 'N/A'}</td>
                <td>
                    <span class="badge badge-${this.getStatusClass(account.status)}">
                        ${this.getStatusText(account.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary action-btn" onclick="golikeManager.showAddModal(${index})" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger action-btn" onclick="golikeManager.deleteAccount(${index})" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getStatusClass(status) {
        switch (status) {
            case 'ready': return 'success';
            case 'running': return 'info';
            case 'error': return 'danger';
            case 'pending': return 'warning';
            default: return 'secondary';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'ready': return 'Sẵn sàng';
            case 'running': return 'Đang chạy';
            case 'error': return 'Lỗi';
            case 'pending': return 'Chờ xử lý';
            default: return 'Không xác định';
        }
    }

    async deleteAccount(index) {
        if (!confirm('Bạn có chắc muốn xóa tài khoản này?')) return;

        try {
            this.accounts.splice(index, 1);
            await this.saveAccountsToFile();
            this.renderTable();
            this.updateStats();
            this.showNotification('Xóa tài khoản thành công!', 'success');
        } catch (error) {
            console.error('Delete account error:', error);
            this.showNotification('Lỗi khi xóa tài khoản!', 'error');
        }
    }

    selectAllAccounts(checked) {
        document.querySelectorAll('.account-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
            const row = checkbox.closest('tr');
            if (checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }

    updateSelectAllState() {
        const checkboxes = document.querySelectorAll('.account-checkbox');
        const checkedBoxes = document.querySelectorAll('.account-checkbox:checked');
        const selectAllCheckbox = document.getElementById('select-all-accounts');
        
        if (checkedBoxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedBoxes.length === checkboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    toggleRowSelection(row) {
        const checkbox = row.querySelector('.account-checkbox');
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
        
        this.updateSelectAllState();
    }

    updateStats() {
        const totalElement = document.getElementById('total-mail');
        const successElement = document.getElementById('login-success');  
        const failElement = document.getElementById('login-fail');

        if (totalElement) {
            totalElement.textContent = this.accounts ? this.accounts.length : 0;
        }

        if (this.accounts && this.accounts.length > 0) {
            const successCount = this.accounts.filter(acc => acc.status === 'ready').length;
            const failCount = this.accounts.filter(acc => acc.status === 'error').length;
            
            if (successElement) successElement.textContent = successCount;
            if (failElement) failElement.textContent = failCount;
        } else {
            if (successElement) successElement.textContent = '0';
            if (failElement) failElement.textContent = '0';
        }
    }

    updateAccountSelects() {
        // Update GoLike account selects in other tabs
        const selects = [
            document.getElementById('golike-account-select'),
            document.getElementById('runner-account-select')
        ];

        selects.forEach(select => {
            if (!select) return;
            
            const currentValue = select.value;
            select.innerHTML = '<option value="">Chọn tài khoản GoLike...</option>';
            
            this.accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.username || 'N/A'} (${account.status})`;
                select.appendChild(option);
            });
            
            // Restore selection if possible
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }

    showContextMenu(event, row) {
        const contextMenu = document.getElementById('accounts-context-menu');
        const index = parseInt(row.dataset.index);
        
        // Position context menu
        contextMenu.style.display = 'block';
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';
        
        // Handle context menu clicks
        const handleContextClick = (e) => {
            const action = e.target.closest('.context-item')?.dataset.action;
            if (action) {
                switch (action) {
                    case 'edit':
                        this.showAddModal(index);
                        break;
                    case 'delete':
                        this.deleteAccount(index);
                        break;
                    case 'copy-cookie':
                        this.copyToClipboard(this.accounts[index].authorization);
                        break;
                    case 'refresh':
                        this.refreshAccount(index);
                        break;
                }
            }
            contextMenu.style.display = 'none';
            document.removeEventListener('click', handleContextClick);
        };
        
        setTimeout(() => {
            document.addEventListener('click', handleContextClick);
        }, 100);
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Đã copy authorization!', 'success');
        } catch (error) {
            console.error('Copy error:', error);
            this.showNotification('Lỗi khi copy!', 'error');
        }
    }

    refreshAccount(index) {
        // Implement refresh logic here
        this.showNotification('Đang refresh tài khoản...', 'info');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getSelectedAccounts() {
        const selected = [];
        document.querySelectorAll('.account-checkbox:checked').forEach(checkbox => {
            const index = parseInt(checkbox.dataset.index);
            selected.push(this.accounts[index]);
        });
        return selected;
    }

    // Export accounts to file
    async exportAccounts() {
        try {
            if (typeof eel !== 'undefined' && eel.export_accounts) {
                const result = await eel.export_accounts(this.accounts)();
                if (result.success) {
                    this.showNotification(`Đã export ${this.accounts.length} tài khoản!`, 'success');
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Fallback for development
                const dataStr = JSON.stringify(this.accounts, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                
                const exportFileDefaultName = 'golike-accounts.json';
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
                
                this.showNotification('Đã tải xuống file backup!', 'success');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Lỗi khi export!', 'error');
        }
    }

    // Import accounts from file
    async importAccounts(file) {
        try {
            if (typeof eel !== 'undefined' && eel.import_accounts) {
                const result = await eel.import_accounts(file)();
                if (result.success) {
                    this.accounts = [...this.accounts, ...result.data];
                    await this.saveAccountsToFile();
                    this.renderTable();
                    this.updateStats();
                    this.showNotification(`Đã import ${result.data.length} tài khoản!`, 'success');
                } else {
                    throw new Error(result.error);
                }
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Lỗi khi import!', 'error');
        }
    }

    // Bulk operations
    async deleteSelectedAccounts() {
        const selected = this.getSelectedAccounts();
        if (selected.length === 0) {
            this.showNotification('Vui lòng chọn tài khoản cần xóa!', 'warning');
            return;
        }

        if (!confirm(`Bạn có chắc muốn xóa ${selected.length} tài khoản đã chọn?`)) return;

        try {
            // Get indices to delete (reverse order to avoid index shifting)
            const indicesToDelete = [];
            document.querySelectorAll('.account-checkbox:checked').forEach(checkbox => {
                indicesToDelete.push(parseInt(checkbox.dataset.index));
            });
            indicesToDelete.sort((a, b) => b - a);

            // Delete accounts
            indicesToDelete.forEach(index => {
                this.accounts.splice(index, 1);
            });

            await this.saveAccountsToFile();
            this.renderTable();
            this.updateStats();
            this.showNotification(`Đã xóa ${indicesToDelete.length} tài khoản!`, 'success');
        } catch (error) {
            console.error('Delete selected error:', error);
            this.showNotification('Lỗi khi xóa tài khoản!', 'error');
        }
    }
}

// Initialize GoLike Manager
const golikeManager = new GoLikeManager();

// Hide context menu when clicking elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
        document.querySelectorAll('.context-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

// Add notification styles
const notificationStyles = `
<style>
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 6px;
    color: white;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 9999;
    min-width: 250px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
}

.notification-success {
    background: #28a745;
}

.notification-error {
    background: #dc3545;
}

.notification-info {
    background: #17a2b8;
}

.notification-warning {
    background: #ffc107;
    color: #000;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.cookie-display {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
}

.action-buttons {
    display: flex;
    gap: 4px;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', notificationStyles);