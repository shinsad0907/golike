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
        console.log('🚀 Instagram Manager Starting...');
        await this.loadGolikeAccounts();
        this.setupEventListeners();
        this.updateInstagramTable();
        this.updateInstagramStats();
        console.log('✅ Instagram Manager Ready');
    }

    async loadGolikeAccounts() {
        try {
            const result = await eel.read_json_file('data/manager-golike.json')();
            if (result.success) {
                this.golikeAccounts = result.data || [];
                this.populateGolikeSelect();
                console.log(`✅ Loaded ${this.golikeAccounts.length} GoLike accounts`);
            } else {
                console.error('❌ Failed to load GoLike accounts:', result.error);
            }
        } catch (error) {
            console.error('❌ Error loading GoLike accounts:', error);
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
        const previewBtn = document.getElementById('preview-instagram-btn');
        
        const cookieTextarea = document.getElementById('modal-ig-cookie');
        const proxyTextarea = document.getElementById('modal-ig-proxy');

        // Real-time counting
        cookieTextarea.addEventListener('input', () => {
            this.updateCounts();
        });

        proxyTextarea.addEventListener('input', () => {
            this.updateCounts();
        });

        // Preview button
        previewBtn.addEventListener('click', () => {
            this.showPreview();
        });

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

        // Lưu Instagram accounts (bulk)
        saveBtn.addEventListener('click', () => {
            this.saveBulkInstagramAccounts();
        });
    }

    updateCounts() {
        const cookieText = document.getElementById('modal-ig-cookie').value.trim();
        const proxyText = document.getElementById('modal-ig-proxy').value.trim();
        
        const cookies = cookieText.split('\n').filter(line => line.trim());
        const proxies = proxyText.split('\n').filter(line => line.trim());
        
        const cookieCount = cookies.length;
        const proxyCount = proxies.length;
        
        document.getElementById('cookie-count').textContent = cookieCount;
        document.getElementById('proxy-count').textContent = proxyCount;
        document.getElementById('footer-cookie-count').textContent = cookieCount;
        document.getElementById('footer-proxy-count').textContent = proxyCount;
        
        const warning = document.getElementById('proxy-warning');
        const matchInfo = document.getElementById('match-info');
        const saveBtn = document.getElementById('save-instagram-btn');
        
        if (cookieCount > 0 && proxyCount > 0) {
            if (cookieCount === proxyCount) {
                warning.style.display = 'none';
                matchInfo.classList.remove('mismatch');
                saveBtn.disabled = false;
            } else {
                warning.style.display = 'inline';
                matchInfo.classList.add('mismatch');
                saveBtn.disabled = true;
            }
        } else {
            warning.style.display = 'none';
            matchInfo.classList.remove('mismatch');
            saveBtn.disabled = true;
        }
    }

    showPreview() {
        const cookieText = document.getElementById('modal-ig-cookie').value.trim();
        const proxyText = document.getElementById('modal-ig-proxy').value.trim();
        
        const cookies = cookieText.split('\n').filter(line => line.trim());
        const proxies = proxyText.split('\n').filter(line => line.trim());
        
        if (cookies.length === 0 || cookies.length !== proxies.length) {
            alert('Vui lòng nhập đủ cookie và proxy với số lượng bằng nhau!');
            return;
        }
        
        // Log preview gọn gàng
        console.log('═══════════════════════════════════');
        console.log('📋 PREVIEW INSTAGRAM ACCOUNTS');
        console.log('═══════════════════════════════════');
        console.log(`📌 GoLike: ${this.selectedGolikeAccount.username_account}`);
        console.log(`📌 Authorization: ${this.selectedGolikeAccount.authorization.substring(0, 30)}...`);
        console.log(`📌 Số lượng: ${cookies.length} accounts`);
        console.log('───────────────────────────────────');
        
        const previewSection = document.getElementById('preview-section');
        const previewTbody = document.getElementById('preview-tbody');
        const previewCount = document.getElementById('preview-count');
        
        previewTbody.innerHTML = '';
        previewCount.textContent = cookies.length;
        
        cookies.forEach((cookie, index) => {
            const proxy = proxies[index];
            const row = document.createElement('tr');
            
            // Log từng cặp cookie-proxy
            console.log(`${index + 1}. Cookie: ${cookie.substring(0, 40)}... | Proxy: ${proxy}`);
            
            const isValidCookie = cookie.includes('sessionid') || cookie.length > 50;
            const isValidProxy = proxy.includes(':');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <div class="preview-cookie" title="${cookie}">
                        ${cookie.substring(0, 60)}${cookie.length > 60 ? '...' : ''}
                    </div>
                </td>
                <td>
                    <div class="preview-proxy">${proxy}</div>
                </td>
                <td>
                    <span class="preview-status ${isValidCookie && isValidProxy ? 'valid' : 'invalid'}">
                        <i class="fas fa-${isValidCookie && isValidProxy ? 'check-circle' : 'exclamation-circle'}"></i>
                        ${isValidCookie && isValidProxy ? 'OK' : 'Lỗi'}
                    </span>
                </td>
            `;
            
            previewTbody.appendChild(row);
        });
        
        console.log('═══════════════════════════════════\n');
        previewSection.style.display = 'block';
    }

    // Cập nhật hàm saveBulkInstagramAccounts
    async saveBulkInstagramAccounts() {
        console.log('=== ADDING INSTAGRAM ACCOUNTS ===');
        
        const cookieText = document.getElementById('modal-ig-cookie').value.trim();
        const proxyText = document.getElementById('modal-ig-proxy').value.trim();
        
        const cookies = cookieText.split('\n').filter(line => line.trim());
        const proxies = proxyText.split('\n').filter(line => line.trim());
        
        if (cookies.length === 0 || cookies.length !== proxies.length) {
            alert('Vui lòng nhập đủ cookie và proxy với số lượng bằng nhau!');
            return;
        }
        
        // Chỉ log thông tin cần thiết
        console.log(`📌 GoLike Account: ${this.selectedGolikeAccount.username_account} (ID: ${this.selectedGolikeAccount.id_account})`);
        console.log(`📌 Authorization: ${this.selectedGolikeAccount.authorization.substring(0, 50)}...`);
        console.log(`📌 Số lượng IG sẽ thêm: ${cookies.length}`);
        console.log('─────────────────────────────────');
        
        // Tạo danh sách Instagram accounts mới
        const newInstagramAccounts = [];
        cookies.forEach((cookie, index) => {
            const newInstagram = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + index,
                id_account_golike: Math.floor(Math.random() * 900000) + 100000,
                instagram_username: `IG_${Date.now()}_${index}`,
                status: 'active',
                created_at: new Date().toISOString(),
                last_check: null,
                cookie: cookie.trim(),
                proxy: proxies[index].trim()
            };
            
            // Log từng cặp cookie-proxy
            console.log(`✅ IG #${index + 1}:`);
            console.log(`   Cookie: ${cookie.trim().substring(0, 60)}...`);
            console.log(`   Proxy: ${proxies[index].trim()}`);
            
            newInstagramAccounts.push(newInstagram);
        });
        
        console.log('─────────────────────────────────');
        console.log(`✅ Tổng cộng đã thêm: ${newInstagramAccounts.length} accounts`);
        
        try {
            // CHỈ GỬI DATA CẦN THIẾT
            const dataToSave = {
                golike_account_id: this.selectedGolikeAccount.id_account,
                golike_username: this.selectedGolikeAccount.username_account,
                golike_authorization: this.selectedGolikeAccount.authorization,
                new_instagram_accounts: newInstagramAccounts
            };
            
            console.log('📤 Sending to Python:', {
                golike_account_id: dataToSave.golike_account_id,
                golike_username: dataToSave.golike_username,
                count: dataToSave.new_instagram_accounts.length
            });
            
            const saveResult = await eel.update_instagram_accounts(dataToSave)();
            
            if (saveResult.success) {
                // Reload lại GoLike accounts sau khi lưu thành công
                await this.loadGolikeAccounts();
                
                // Tìm lại selected account
                this.selectedGolikeAccount = this.golikeAccounts.find(
                    acc => acc.id_account === this.selectedGolikeAccount.id_account
                );
                
                this.hideAddInstagramModal();
                this.filterInstagramByGolike();
                this.updateInstagramStats();
                this.showNotification(`✅ Đã thêm ${newInstagramAccounts.length} tài khoản Instagram!`, 'success');
                console.log('✅ Lưu file thành công!');
            } else {
                throw new Error(saveResult.error);
            }
        } catch (error) {
            console.error('❌ Lỗi khi lưu:', error);
            this.showNotification('Lỗi khi lưu Instagram accounts!', 'error');
        }
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
        // document.getElementById('modal-ig-username').value = '';
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

        const cookieText = document.getElementById('modal-ig-cookie').value.trim();
        const proxyText = document.getElementById('modal-ig-proxy').value.trim();

        const cookies = cookieText.split('\n').filter(line => line.trim());
        const proxies = proxyText.split('\n').filter(line => line.trim());

        if (this.isEditMode && this.editingAccountId) {
            // EDIT MODE - chỉ 1 account
            if (cookies.length !== 1 || proxies.length !== 1) {
                alert('Chế độ sửa chỉ được 1 cookie và 1 proxy!');
                return;
            }

            const dataToUpdate = {
                golike_account_id: this.selectedGolikeAccount.id_account,
                instagram_id: this.editingAccountId,
                cookie: cookies[0].trim(),
                proxy: proxies[0].trim(),
                updated_at: new Date().toISOString()
            };

            console.log('📤 Update IG account:', dataToUpdate.instagram_id);
            console.log(`   Cookie: ${dataToUpdate.cookie.substring(0, 50)}...`);
            console.log(`   Proxy: ${dataToUpdate.proxy}`);

            try {
                const saveResult = await eel.update_instagram_accounts(dataToSave)();
                
                if (saveResult.success) {
                    await this.loadGolikeAccounts();
                    this.selectedGolikeAccount = this.golikeAccounts.find(
                        acc => acc.id_account === this.selectedGolikeAccount.id_account
                    );
                    
                    this.hideAddInstagramModal();
                    this.filterInstagramByGolike();
                    this.updateInstagramStats();
                    this.showNotification('✅ Cập nhật thành công!', 'success');
                    console.log('✅ Updated successfully');
                } else {
                    throw new Error(saveResult.error);
                }
            } catch (error) {
                console.error('❌ Update error:', error);
                this.showNotification('Lỗi khi cập nhật!', 'error');
            }
        } else {
            // ADD MODE - gọi hàm bulk add
            this.saveBulkInstagramAccounts();
        }
    }

    editInstagramAccount(igAccount) {
        console.log(`✏️ Edit IG: ${igAccount.instagram_username}`);
        
        this.isEditMode = true;
        this.editingAccountId = igAccount.id;
        
        document.getElementById('modal-golike-info').value = 
            `${igAccount.golike_username} (ID: ${igAccount.golike_account_id})`;
        
        // Hiển thị cookie và proxy hiện tại trong console
        console.log(`   Current Cookie: ${(igAccount.cookie || '').substring(0, 50)}...`);
        console.log(`   Current Proxy: ${igAccount.proxy || 'N/A'}`);
        
        // Fill form với cookie hiện tại (1 dòng)
        document.getElementById('modal-ig-cookie').value = igAccount.cookie || '';
        document.getElementById('modal-ig-proxy').value = igAccount.proxy || '';
        
        document.getElementById('add-instagram-modal').style.display = 'flex';
    }

    async deleteInstagramAccount(igId) {
        if (!confirm('Bạn có chắc chắn muốn xóa Instagram account này?')) return;

        console.log(`🗑️ Delete IG: ${igId}`);

        try {
            // CHỈ GỬI ID CẦN XÓA
            const dataToDelete = {
                golike_account_id: this.selectedGolikeAccount.id_account,
                instagram_id: igId
            };

            console.log('📤 Deleting:', dataToDelete);

            const saveResult = await eel.delete_instagram_account(
                'data/manager-golike.json',
                dataToDelete
            )();
            
            if (saveResult.success) {
                await this.loadGolikeAccounts();
                this.selectedGolikeAccount = this.golikeAccounts.find(
                    acc => acc.id_account === this.selectedGolikeAccount.id_account
                );
                
                this.filterInstagramByGolike();
                this.updateInstagramStats();
                this.showNotification('✅ Xóa thành công!', 'success');
                console.log('✅ Deleted successfully');
            } else {
                throw new Error(saveResult.error);
            }
        } catch (error) {
            console.error('❌ Delete error:', error);
            this.showNotification('Lỗi khi xóa!', 'error');
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
            this.updateInstagramTable([]);
            return;
        }

        console.log(`📌 Filter IG for: ${this.selectedGolikeAccount.username_account}`);
        
        const instagramAccounts = this.selectedGolikeAccount.instagram_accounts || [];
        const enrichedAccounts = instagramAccounts.map(igAcc => ({
            ...igAcc,
            golike_account_id: this.selectedGolikeAccount.id_account,
            golike_username: this.selectedGolikeAccount.username_account
        }));
        
        console.log(`   Found ${enrichedAccounts.length} Instagram accounts`);
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
