// Instagram Manager - Fixed duplicate issue completely
class InstagramManager {
    constructor() {
        this.golikeAccounts = [];
        this.selectedGolikeAccount = null;
        this.instagramAccounts = [];
        this.isEditMode = false;
        this.editingAccountId = null;
        this.init();
    }

    async init() {
        console.log('Initializing Instagram Manager...');
        await this.loadGolikeAccounts();
        this.setupEventListeners();
        this.updateInstagramTable();
        this.updateInstagramStats();
        console.log('Instagram Manager initialized');
    }

    async loadGolikeAccounts() {
        try {
            console.log('Loading GoLike accounts...');
            const result = await eel.read_json_file('data/manager-golike.json')();
            if (result.success) {
                this.golikeAccounts = result.data || [];
                this.populateGolikeSelect();
                console.log('GoLike accounts loaded:', this.golikeAccounts.length);
            } else {
                console.error('Failed to load GoLike accounts:', result.error);
            }
        } catch (error) {
            console.error('Error loading GoLike accounts:', error);
        }
    }

    populateGolikeSelect() {
        const select = document.getElementById('golike-account-select');
        select.innerHTML = '<option value="">Chọn tài khoản GoLike...</option>';
        
        this.golikeAccounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id_account;
            option.textContent = `${account.username_account} (${account.name_account})`;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        // Chọn GoLike account
        document.getElementById('golike-account-select').addEventListener('change', (e) => {
            const selectedId = e.target.value;
            console.log('Selected GoLike account ID:', selectedId);
            
            if (selectedId) {
                this.selectedGolikeAccount = this.golikeAccounts.find(acc => acc.id_account.toString() === selectedId);
                console.log('Selected GoLike account:', this.selectedGolikeAccount);
                this.filterInstagramByGolike();
            } else {
                this.selectedGolikeAccount = null;
                this.updateInstagramTable([]);
            }
            this.updateInstagramStats();
        });

        // Thêm Instagram account
        document.getElementById('add-instagram-btn').addEventListener('click', () => {
            console.log('Add Instagram button clicked');
            if (!this.selectedGolikeAccount) {
                alert('Vui lòng chọn tài khoản GoLike trước!');
                return;
            }
            this.showAddInstagramModal();
        });

        // Modal events
        this.setupModalEvents();
        
        // Context menu
        this.setupContextMenu();

        // Select all checkbox
        document.getElementById('select-all-instagram').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('#instagram-tbody input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        });
    }

    setupModalEvents() {
        const modal = document.getElementById('add-instagram-modal');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancel-instagram-btn');
        const saveBtn = document.getElementById('save-instagram-btn');

        // Đóng modal
        [closeBtn, cancelBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideAddInstagramModal();
            });
        });

        // Click outside modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideAddInstagramModal();
            }
        });

        // Lưu Instagram account
        saveBtn.addEventListener('click', () => {
            this.saveInstagramAccount();
        });
    }

    setupContextMenu() {
        const contextMenu = document.getElementById('instagram-context-menu');
        let currentTarget = null;

        // Show context menu
        document.addEventListener('contextmenu', (e) => {
            const row = e.target.closest('#instagram-tbody tr');
            if (row) {
                e.preventDefault();
                currentTarget = row;
                
                contextMenu.style.display = 'block';
                contextMenu.style.left = e.pageX + 'px';
                contextMenu.style.top = e.pageY + 'px';
            }
        });

        // Hide context menu
        document.addEventListener('click', () => {
            contextMenu.style.display = 'none';
        });

        // Handle context menu actions
        contextMenu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-item')?.dataset.action;
            if (action && currentTarget) {
                this.handleContextAction(action, currentTarget);
            }
            contextMenu.style.display = 'none';
        });
    }

    handleContextAction(action, row) {
        const igId = row.dataset.igId;
        
        if (!this.selectedGolikeAccount || !this.selectedGolikeAccount.instagram_accounts) return;
        
        const igAccount = this.selectedGolikeAccount.instagram_accounts.find(ig => ig.id === igId);
        if (!igAccount) return;

        // Thêm golike info để edit
        igAccount.golike_account_id = this.selectedGolikeAccount.id_account;
        igAccount.golike_username = this.selectedGolikeAccount.username_account;

        switch (action) {
            case 'edit-ig':
                this.editInstagramAccount(igAccount);
                break;
            case 'delete-ig':
                this.deleteInstagramAccount(igId);
                break;
            case 'check-ig':
                this.checkInstagramAccount(igAccount);
                break;
        }
    }

    showAddInstagramModal() {
        console.log('Showing add Instagram modal for:', this.selectedGolikeAccount);
        document.getElementById('modal-golike-info').value = 
            `${this.selectedGolikeAccount.username_account} (${this.selectedGolikeAccount.name_account})`;
        document.getElementById('modal-ig-username').value = '';
        document.getElementById('modal-ig-cookie').value = '';
        
        document.getElementById('add-instagram-modal').style.display = 'flex';
        
        // Reset về chế độ thêm mới
        this.isEditMode = false;
        this.editingAccountId = null;
        console.log('Modal opened in ADD mode');
    }

    hideAddInstagramModal() {
        document.getElementById('add-instagram-modal').style.display = 'none';
        // Reset mode
        this.isEditMode = false;
        this.editingAccountId = null;
    }

    // FIX: Đơn giản hóa logic save và tránh duplicate hoàn toàn
    async saveInstagramAccount() {
        console.log('=== SAVING INSTAGRAM ACCOUNT ===');
        console.log('Edit mode:', this.isEditMode);
        console.log('Editing ID:', this.editingAccountId);

        const username = document.getElementById('modal-ig-username').value.trim();
        const cookie = document.getElementById('modal-ig-cookie').value.trim();

        if (!username || !cookie) {
            alert('Vui lòng nhập đầy đủ username và cookie!');
            return;
        }

        // Tìm GoLike account trong mảng gốc
        const golikeIndex = this.golikeAccounts.findIndex(acc => acc.id_account === this.selectedGolikeAccount.id_account);
        if (golikeIndex === -1) {
            console.error('GoLike account not found');
            return;
        }

        // Đảm bảo có mảng IG accounts
        if (!this.golikeAccounts[golikeIndex].instagram_accounts) {
            this.golikeAccounts[golikeIndex].instagram_accounts = [];
        }

        if (this.isEditMode && this.editingAccountId) {
            // EDIT MODE
            console.log('=== EDIT MODE ===');
            const igIndex = this.golikeAccounts[golikeIndex].instagram_accounts.findIndex(ig => ig.id === this.editingAccountId);
            if (igIndex !== -1) {
                // Chỉ update các field cần thiết
                this.golikeAccounts[golikeIndex].instagram_accounts[igIndex] = {
                    ...this.golikeAccounts[golikeIndex].instagram_accounts[igIndex],
                    instagram_username: username,
                    cookie: cookie,
                    updated_at: new Date().toISOString()
                };
                console.log('Updated existing Instagram account');
            }
        } else {
            // ADD MODE
            console.log('=== ADD MODE ===');
            
            // Kiểm tra duplicate username
            const exists = this.golikeAccounts[golikeIndex].instagram_accounts.some(ig =>
                ig.instagram_username === username
            );
            if (exists) {
                alert('Instagram account này đã tồn tại!');
                return;
            }

            // Tạo IG account mới
            const newInstagram = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                id_account_golike: Math.floor(Math.random() * 900000) + 100000,
                instagram_username: username,
                status: 'active',
                created_at: new Date().toISOString(),
                last_check: null,
                cookie: cookie
            };

            this.golikeAccounts[golikeIndex].instagram_accounts.push(newInstagram);
            console.log('Added new Instagram account');
        }

        try {
            // Chỉ lưu file manager-golike.json với dữ liệu đã update
            console.log('Saving to manager-golike.json...');
            const saveResult = await eel.update_instagram_accounts('data/manager-golike.json', this.golikeAccounts)();
            console.log('Save result:', saveResult);
            
            if (saveResult.success) {
                // Update selectedGolikeAccount để đồng bộ
                this.selectedGolikeAccount = this.golikeAccounts[golikeIndex];
                
                this.hideAddInstagramModal();
                this.filterInstagramByGolike(); // Refresh view
                this.updateInstagramStats();

                const message = this.isEditMode ? 'Cập nhật Instagram account thành công!' : 'Thêm Instagram account thành công!';
                this.showNotification(message, 'success');
            } else {
                throw new Error(saveResult.error);
            }
        } catch (error) {
            console.error('Error saving Instagram account:', error);
            this.showNotification('Lỗi khi lưu Instagram account!', 'error');
        }
    }

    async editInstagramAccount(igAccount) {
        console.log('=== EDIT INSTAGRAM ACCOUNT ===');
        console.log('Account to edit:', igAccount);
        
        this.isEditMode = true;
        this.editingAccountId = igAccount.id;
        
        console.log('Setting edit mode - ID:', this.editingAccountId);
        
        document.getElementById('modal-golike-info').value = 
            `${igAccount.golike_username} (ID: ${igAccount.golike_account_id})`;
        document.getElementById('modal-ig-username').value = igAccount.instagram_username;
        document.getElementById('modal-ig-cookie').value = igAccount.cookie || '';
        
        document.getElementById('add-instagram-modal').style.display = 'flex';
        console.log('Modal opened in EDIT mode for account:', igAccount.instagram_username);
    }

    async deleteInstagramAccount(igId) {
        if (!confirm('Bạn có chắc chắn muốn xóa Instagram account này?')) return;

        console.log('Deleting Instagram account:', igId);

        // Tìm và xóa trong GoLike gốc
        const golikeIndex = this.golikeAccounts.findIndex(acc => acc.id_account === this.selectedGolikeAccount?.id_account);
        if (golikeIndex !== -1 && this.golikeAccounts[golikeIndex].instagram_accounts) {
            // Lọc bỏ account cần xóa
            this.golikeAccounts[golikeIndex].instagram_accounts = 
                this.golikeAccounts[golikeIndex].instagram_accounts.filter(ig => ig.id !== igId);
        }

        try {
            // Lưu lại file
            const saveResult = await eel.delete_instagram_account('data/manager-golike.json', this.golikeAccounts)();
            
            if (saveResult.success) {
                // Update selectedGolikeAccount
                this.selectedGolikeAccount = this.golikeAccounts[golikeIndex];
                
                this.filterInstagramByGolike(); // Refresh view
                this.updateInstagramStats();
                this.showNotification('Xóa Instagram account thành công!', 'success');
            } else {
                throw new Error(saveResult.error);
            }
        } catch (error) {
            console.error('Error deleting Instagram account:', error);
            this.showNotification('Lỗi khi xóa Instagram account!', 'error');
        }
    }

    async checkInstagramAccount(igAccount) {
        console.log('Checking Instagram account:', igAccount.instagram_username);
        
        const row = document.querySelector(`#instagram-tbody tr[data-ig-id="${igAccount.id}"]`);
        if (!row) {
            console.error('Row not found for account:', igAccount.id);
            return;
        }
        
        const statusCell = row.querySelector('td:nth-child(6)');
        const originalStatus = statusCell.innerHTML;
        
        statusCell.innerHTML = '<span class="status-checking"><i class="fas fa-spinner fa-spin"></i> Đang kiểm tra...</span>';

        try {
            // Giả lập API check
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Tìm và update trong GoLike accounts
            const golikeIndex = this.golikeAccounts.findIndex(acc => acc.id_account === this.selectedGolikeAccount.id_account);
            if (golikeIndex !== -1 && this.golikeAccounts[golikeIndex].instagram_accounts) {
                const igIndex = this.golikeAccounts[golikeIndex].instagram_accounts.findIndex(ig => ig.id === igAccount.id);
                if (igIndex !== -1) {
                    this.golikeAccounts[golikeIndex].instagram_accounts[igIndex].last_check = new Date().toISOString();
                    this.golikeAccounts[golikeIndex].instagram_accounts[igIndex].status = 'active';
                }
            }
            
            // Lưu lại và refresh
            await eel.update_instagram_accounts('data/manager-golike.json', this.golikeAccounts)();
            this.selectedGolikeAccount = this.golikeAccounts[golikeIndex];
            this.filterInstagramByGolike();
            
            this.showNotification('Kiểm tra Instagram account thành công!', 'success');
        } catch (error) {
            statusCell.innerHTML = originalStatus;
            console.error('Error checking Instagram account:', error);
            this.showNotification('Lỗi khi kiểm tra Instagram account!', 'error');
        }
    }

    filterInstagramByGolike() {
        if (!this.selectedGolikeAccount) {
            console.log('No GoLike account selected');
            this.updateInstagramTable([]);
            return;
        }

        console.log('Filtering Instagram accounts for GoLike account:', this.selectedGolikeAccount.id_account);
        
        // Lấy trực tiếp từ selectedGolikeAccount.instagram_accounts
        const instagramAccounts = this.selectedGolikeAccount.instagram_accounts || [];
        
        // Thêm golike info để hiển thị
        const enrichedAccounts = instagramAccounts.map(igAcc => ({
            ...igAcc,
            golike_account_id: this.selectedGolikeAccount.id_account,
            golike_username: this.selectedGolikeAccount.username_account
        }));
        
        console.log('Filtered Instagram accounts:', enrichedAccounts.length);
        this.updateInstagramTable(enrichedAccounts);
    }

    updateInstagramTable(accounts = []) {
        console.log('Updating Instagram table with', accounts.length, 'accounts');
        const tbody = document.getElementById('instagram-tbody');
        
        if (!tbody) {
            console.error('Instagram tbody not found!');
            return;
        }
        
        tbody.innerHTML = '';

        if (accounts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center" style="padding: 40px; color: #666;">
                        <i class="fab fa-instagram" style="font-size: 48px; margin-bottom: 10px; display: block;"></i>
                        ${this.selectedGolikeAccount ? 'Không có tài khoản Instagram nào cho GoLike account này' : 'Chưa có tài khoản Instagram nào'}
                    </td>
                </tr>
            `;
            return;
        }

        accounts.forEach((account, index) => {
            const row = document.createElement('tr');
            row.dataset.igId = account.id;
            
            const statusClass = account.status === 'active' ? 'status-success' : 'status-error';
            const statusText = account.status === 'active' ? 'Hoạt động' : 'Lỗi';
            
            row.innerHTML = `
                <td><input type="checkbox" data-ig-id="${account.id}"></td>
                <td>${index + 1}</td>
                <td>${account.id_account_golike || 'N/A'}</td>
                <td>${account.instagram_username}</td>
                <td>
                    <div class="cookie-preview" title="${account.cookie || ''}">
                        ${(account.cookie || '').substring(0, 50)}${(account.cookie || '').length > 50 ? '...' : ''}
                    </div>
                </td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td>${account.created_at ? new Date(account.created_at).toLocaleString('vi-VN') : 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="window.instagramManager.editInstagramAccount(${JSON.stringify(account).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.instagramManager.deleteInstagramAccount('${account.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        console.log('Instagram table updated successfully');
    }

    updateInstagramStats() {
        let total, active, error;
        
        if (this.selectedGolikeAccount) {
            // Tính stats từ selectedGolikeAccount.instagram_accounts
            const accounts = this.selectedGolikeAccount.instagram_accounts || [];
            total = accounts.length;
            active = accounts.filter(ig => ig.status === 'active').length;
            error = accounts.filter(ig => ig.status === 'error').length;
        } else {
            // Không có GoLike account nào được chọn
            total = active = error = 0;
        }

        console.log('Instagram stats - Total:', total, 'Active:', active, 'Error:', error);

        const totalEl = document.getElementById('total-ig');
        const activeEl = document.getElementById('active-ig');
        const errorEl = document.getElementById('error-ig');
        
        if (totalEl) totalEl.textContent = total;
        if (activeEl) activeEl.textContent = active;
        if (errorEl) errorEl.textContent = error;
    }

    showNotification(message, type = 'info') {
        console.log(`Notification [${type}]:`, message);
        
        // Tạo notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Thêm vào body
        document.body.appendChild(notification);

        // Hiển thị
        setTimeout(() => notification.classList.add('show'), 100);

        // Ẩn sau 3 giây
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Khởi tạo khi DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Instagram Manager...');
    window.instagramManager = new InstagramManager();
});
// Proxy Manager Extension for Instagram Manager
