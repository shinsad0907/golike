// Cookie Manager for Instagram
class CookieManager {
    constructor() {
        this.cookieGroups = [];
        this.currentGroup = null;
        this.accounts = [];
        this.isEditMode = false;
        this.editingAccountId = null;
        this.init();
    }

    async init() {
        console.log('Initializing Cookie Manager...');
        await this.loadCookieGroups();
        this.setupEventListeners();
        this.updateCookieTreeview();
        this.updateCookieStats();
        console.log('Cookie Manager initialized');
    }

    async loadCookieGroups() {
        try {
            console.log('Loading Cookie Groups...');
            const result = await eel.read_json_file('dcookie-manager-ig.json')();
            if (result.success) {
                this.cookieGroups = result.data || [];
                this.populateGroupSelect();
                console.log('Cookie Groups loaded:', this.cookieGroups.length);
            } else {
                console.error('Failed to load Cookie Groups:', result.error);
            }
        } catch (error) {
            console.error('Error loading Cookie Groups:', error);
        }
    }

    populateGroupSelect() {
        const select = document.getElementById('group-select');
        select.innerHTML = `
            <option value="">Chọn nhóm tài khoản...</option>
            <option value="create-new">Tạo nhóm mới...</option>
        `;
        
        this.cookieGroups.forEach((group, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${group['name-groups']} (${(group['data-account'] || []).length} accounts)`;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        // Group selection
        document.getElementById('group-select').addEventListener('change', (e) => {
            const selectedIndex = e.target.value;
            if (selectedIndex === 'create-new') {
                this.showCreateGroupModal();
                e.target.value = '';
                return;
            }
            
            if (selectedIndex !== '') {
                this.currentGroup = this.cookieGroups[parseInt(selectedIndex)];
                this.loadAccountsForGroup();
            } else {
                this.currentGroup = null;
                this.accounts = [];
                this.updateCookieTreeview();
            }
            this.updateCookieStats();
        });

        // Button events
        document.getElementById('create-group-btn').addEventListener('click', () => {
            this.showCreateGroupModal();
        });

        document.getElementById('save-group-btn').addEventListener('click', () => {
            this.saveCurrentGroup();
        });

        // TreeView controls
        document.getElementById('expand-cookie-tree-btn').addEventListener('click', () => {
            this.expandAllTree();
        });

        document.getElementById('collapse-cookie-tree-btn').addEventListener('click', () => {
            this.collapseAllTree();
        });

        document.getElementById('refresh-cookie-tree-btn').addEventListener('click', () => {
            this.refreshCookieTree();
        });

        // Control buttons
        document.getElementById('open-selected-chrome-btn').addEventListener('click', () => {
            this.openSelectedChrome();
        });

        document.getElementById('check-cookie-btn').addEventListener('click', () => {
            this.checkSelectedCookies();
        });

        document.getElementById('update-cookie-btn').addEventListener('click', () => {
            this.updateSelectedCookies();
        });

        document.getElementById('delete-selected-btn').addEventListener('click', () => {
            this.deleteSelectedAccounts();
        });

        // Select all checkbox
        document.getElementById('select-all-cookie-tree').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('#cookie-tree-tbody input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        });

        // Setup modals
        this.setupModalEvents();
        
        // Setup context menu
        this.setupContextMenu();
    }

    setupModalEvents() {
        // Add Account Modal
        const addModal = document.getElementById('add-cookie-account-modal');
        const addCloseBtn = addModal.querySelector('.modal-close');
        const addCancelBtn = document.getElementById('cancel-cookie-account-btn');
        const addSaveBtn = document.getElementById('save-cookie-account-btn');

        [addCloseBtn, addCancelBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideAddAccountModal();
            });
        });

        addModal.addEventListener('click', (e) => {
            if (e.target === addModal) {
                this.hideAddAccountModal();
            }
        });

        addSaveBtn.addEventListener('click', () => {
            this.saveCookieAccount();
        });

        // Create Group Modal
        const groupModal = document.getElementById('create-group-modal');
        const groupCloseBtn = groupModal.querySelector('.modal-close');
        const groupCancelBtn = document.getElementById('cancel-group-modal-btn');
        const groupSaveBtn = document.getElementById('save-group-modal-btn');

        [groupCloseBtn, groupCancelBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideCreateGroupModal();
            });
        });

        groupModal.addEventListener('click', (e) => {
            if (e.target === groupModal) {
                this.hideCreateGroupModal();
            }
        });

        groupSaveBtn.addEventListener('click', () => {
            this.createNewGroup();
        });
    }

    setupContextMenu() {
        const contextMenu = document.getElementById('cookie-context-menu');
        let currentTarget = null;

        // Show context menu
        document.addEventListener('contextmenu', (e) => {
            const row = e.target.closest('#cookie-tree-tbody tr');
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

    // 1. Cập nhật handleContextAction method
    handleContextAction(action, row) {
        const accountId = row.dataset.accountId;
        const account = this.accounts.find(acc => acc.id === accountId);
        
        if (!account) return;

        switch (action) {
            case 'add-fb-account':
                this.showAddAccountModal('facebook');
                break;
            case 'add-ig-account':
                this.showAddAccountModal('instagram');
                break;
            case 'edit-account':
                this.editCookieAccount(account);
                break;
            case 'open-chrome':
                this.openChrome(account);
                break;
            case 'check-cookie':
                this.checkCookie(account);
                break;
            case 'assign-proxy-cookie':
                this.assignProxy(account);
                break;
            case 'export-account':
                this.exportAccount(account);
                break;
            case 'delete-account':
                this.deleteAccount(account);
                break;
        }
    }

    loadAccountsForGroup() {
        if (!this.currentGroup) {
            this.accounts = [];
            return;
        }

        // Load data-account from selected group
        this.accounts = (this.currentGroup['data-account'] || []).map((acc, index) => ({
            id: acc.id || `acc_${index}_${Date.now()}`,
            uid: acc.uid || '',
            pass: acc.pass || '',
            cookie: acc.cookie || '',
            proxy: acc.proxy || '',
            chrome_profile: acc.chrome_profile || '',
            status: acc.status || 'active',
            created_at: acc.created_at || new Date().toISOString()
        }));
        
        this.updateCookieTreeview();
    }

    // 5. Cập nhật updateCookieTreeview method để hiển thị cả FB và IG
    updateCookieTreeview() {
        console.log('Updating Cookie TreeView with', this.accounts.length, 'accounts');
        const tbody = document.getElementById('cookie-tree-tbody');
        
        if (!tbody) {
            console.error('Cookie tbody not found!');
            return;
        }
        
        tbody.innerHTML = '';

        if (this.accounts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center" style="padding: 40px; color: #666;">
                        <i class="fab fa-instagram" style="font-size: 48px; margin-bottom: 10px; display: block;"></i>
                        ${this.currentGroup ? 'Chưa có tài khoản nào trong nhóm này' : 'Chọn nhóm để xem tài khoản'}
                    </td>
                </tr>
            `;
            return;
        }

        this.accounts.forEach((account, index) => {
            const row = document.createElement('tr');
            row.dataset.accountId = account.id;
            
            row.innerHTML = `
                <td><input type="checkbox" data-account-id="${account.id}"></td>
                <td>${index + 1}</td>
                <td>
                    <div class="cookie-preview" title="${account.uid_fb || account.uid || ''}">${account.uid_fb || account.uid || 'Chưa có'}</div>
                </td>
                <td>
                    <div class="cookie-preview">${(account.pass_fb || account.pass) ? '********' : 'Chưa có'}</div>
                </td>
                <td>
                    <div class="cookie-preview" title="${account.cookie_fb || account.cookie || ''}">
                        ${(account.cookie_fb || account.cookie) ? (account.cookie_fb || account.cookie).substring(0, 30) + '...' : 'Chưa có'}
                    </div>
                </td>
                <td>
                    <div class="cookie-preview" title="${account.uid_ig || ''}">${account.uid_ig || 'Chưa có'}</div>
                </td>
                <td>
                    <div class="cookie-preview">${account.pass_ig ? '********' : 'Chưa có'}</div>
                </td>
                <td>
                    <div class="cookie-preview" title="${account.cookie_ig || ''}">
                        ${account.cookie_ig ? account.cookie_ig.substring(0, 30) + '...' : 'Chưa có'}
                    </div>
                </td>
                <td>
                    <div class="cookie-preview" title="${account.proxy || ''}">
                        ${account.proxy || 'Chưa có'}
                    </div>
                </td>
                <td>
                    <button class="chrome-btn" onclick="window.cookieManager.openChrome('${account.id}')" 
                            ${!account.chrome_profile ? 'disabled' : ''}>
                        <i class="fab fa-chrome"></i>
                        ${account.chrome_profile || 'Chưa có'}
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateCookieStats() {
        let totalAccounts = 0, activeCookies = 0, activeAccounts = 0, proxyCount = 0;
        
        if (this.accounts && this.accounts.length > 0) {
            totalAccounts = this.accounts.length;
            activeCookies = this.accounts.filter(acc => acc.cookie && acc.cookie.trim()).length;
            activeAccounts = this.accounts.filter(acc => acc.uid && acc.cookie).length;
            proxyCount = this.accounts.filter(acc => acc.proxy).length;
        }

        // Update stats display
        document.getElementById('total-fb-accounts').textContent = totalAccounts;
        document.getElementById('total-ig-accounts').textContent = activeCookies;
        document.getElementById('active-accounts').textContent = activeAccounts;
        document.getElementById('proxy-count').textContent = proxyCount;
    }

    showCreateGroupModal() {
        document.getElementById('group-name-input').value = '';
        document.getElementById('group-description-input').value = '';
        document.getElementById('create-group-modal').style.display = 'flex';
    }

    hideCreateGroupModal() {
        document.getElementById('create-group-modal').style.display = 'none';
    }

    async createNewGroup() {
        const groupName = document.getElementById('group-name-input').value.trim();
        const groupDescription = document.getElementById('group-description-input').value.trim();

        if (!groupName) {
            alert('Vui lòng nhập tên nhóm!');
            return;
        }

        const newGroup = {
            'name-groups': groupName,
            'description': groupDescription,
            'data-account': [],
            'created_at': new Date().toISOString()
        };

        this.cookieGroups.push(newGroup);
        
        try {
            await this.saveCookieGroups();
            this.populateGroupSelect();
            this.hideCreateGroupModal();
            
            // Auto select new group
            const newIndex = this.cookieGroups.length - 1;
            document.getElementById('group-select').value = newIndex;
            this.currentGroup = newGroup;
            this.loadAccountsForGroup();
            this.updateCookieStats();
            
            this.showNotification('Tạo nhóm thành công!', 'success');
        } catch (error) {
            console.error('Error creating group:', error);
            this.showNotification('Lỗi khi tạo nhóm!', 'error');
        }
    }

    showAddAccountModal(type = 'both') {
        if (!this.currentGroup) {
            alert('Vui lòng chọn nhóm trước!');
            return;
        }
        
        // Reset form
        document.getElementById('cookie-fb-uid').value = '';
        document.getElementById('cookie-fb-pass').value = '';
        document.getElementById('cookie-fb-cookie').value = '';
        document.getElementById('cookie-ig-uid').value = '';
        document.getElementById('cookie-ig-pass').value = '';
        document.getElementById('cookie-ig-cookie').value = '';
        document.getElementById('cookie-proxy').value = '';
        document.getElementById('cookie-chrome-profile').value = '';
        
        // Cập nhật title modal dựa trên type
        const modalTitle = document.getElementById('modal-title');
        if (type === 'facebook') {
            modalTitle.textContent = 'THÊM TÀI KHOẢN FACEBOOK';
        } else if (type === 'instagram') {
            modalTitle.textContent = 'THÊM TÀI KHOẢN INSTAGRAM';
        } else {
            modalTitle.textContent = 'THÊM TÀI KHOẢN';
        }
        
        document.getElementById('add-cookie-account-modal').style.display = 'flex';
        
        this.isEditMode = false;
        this.editingAccountId = null;
        this.currentAccountType = type;
    }

    hideAddAccountModal() {
        document.getElementById('add-cookie-account-modal').style.display = 'none';
        this.isEditMode = false;
        this.editingAccountId = null;
    }

    // 3. Cập nhật saveCookieAccount method để hỗ trợ cấu trúc mới
    async saveCookieAccount() {
        console.log('=== SAVING COOKIE ACCOUNT ===');
        console.log('Edit mode:', this.isEditMode);
        console.log('Editing ID:', this.editingAccountId);

        if (!this.currentGroup) {
            alert('Vui lòng chọn nhóm trước!');
            return;
        }

        // Lấy tất cả field values
        const fbUid = document.getElementById('cookie-fb-uid').value.trim();
        const fbPass = document.getElementById('cookie-fb-pass').value.trim();
        const fbCookie = document.getElementById('cookie-fb-cookie').value.trim();
        const igUid = document.getElementById('cookie-ig-uid').value.trim();
        const igPass = document.getElementById('cookie-ig-pass').value.trim();
        const igCookie = document.getElementById('cookie-ig-cookie').value.trim();
        const proxy = document.getElementById('cookie-proxy').value.trim();
        const chromeProfile = document.getElementById('cookie-chrome-profile').value.trim();

        // Validation - ít nhất phải có 1 trong 2 UID
        if (!fbUid && !igUid) {
            alert('Vui lòng nhập ít nhất một UID (Facebook hoặc Instagram)!');
            return;
        }

        // Find group in cookieGroups array
        const groupIndex = this.cookieGroups.findIndex(group => group === this.currentGroup);
        if (groupIndex === -1) {
            console.error('Group not found in cookieGroups');
            return;
        }

        // Ensure data-account array exists
        if (!this.cookieGroups[groupIndex]['data-account']) {
            this.cookieGroups[groupIndex]['data-account'] = [];
        }

        if (this.isEditMode && this.editingAccountId) {
            // EDIT MODE
            console.log('=== EDIT MODE ===');
            const accountIndex = this.cookieGroups[groupIndex]['data-account'].findIndex(acc => 
                acc.id === this.editingAccountId);
            
            if (accountIndex !== -1) {
                // Update existing account với cấu trúc mới
                this.cookieGroups[groupIndex]['data-account'][accountIndex] = {
                    ...this.cookieGroups[groupIndex]['data-account'][accountIndex],
                    uid: fbUid || igUid, // Primary UID (ưu tiên FB, không có thì IG)
                    pass: fbPass || igPass, // Primary password
                    cookie: fbCookie || igCookie, // Primary cookie
                    uid_fb: fbUid,
                    pass_fb: fbPass,
                    cookie_fb: fbCookie,
                    uid_ig: igUid,
                    pass_ig: igPass,
                    cookie_ig: igCookie,
                    proxy: proxy,
                    chrome_profile: chromeProfile,
                    updated_at: new Date().toISOString()
                };
                console.log('Updated existing account');
            }
        } else {
            // ADD MODE
            console.log('=== ADD MODE ===');
            
            // Check duplicate UID (check cả FB và IG)
            const existsUid = this.cookieGroups[groupIndex]['data-account'].some(acc => 
                acc.uid === fbUid || acc.uid === igUid || 
                acc.uid_fb === fbUid || acc.uid_ig === igUid);
            
            if (existsUid) {
                alert('UID này đã tồn tại trong nhóm!');
                return;
            }

            // Create new account với cấu trúc mới
            const newAccount = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                uid: fbUid || igUid, // Primary UID
                pass: fbPass || igPass, // Primary password
                cookie: fbCookie || igCookie, // Primary cookie
                uid_fb: fbUid,
                pass_fb: fbPass,
                cookie_fb: fbCookie,
                uid_ig: igUid,
                pass_ig: igPass,
                cookie_ig: igCookie,
                proxy: proxy,
                chrome_profile: chromeProfile,
                status: 'active',
                created_at: new Date().toISOString()
            };

            this.cookieGroups[groupIndex]['data-account'].push(newAccount);
            console.log('Added new account');
        }

        try {
            // Save to file
            await this.saveCookieGroups();
            
            // Update current group and accounts
            this.currentGroup = this.cookieGroups[groupIndex];
            this.loadAccountsForGroup();
            this.updateCookieStats();
            
            this.hideAddAccountModal();
            
            const message = this.isEditMode ? 'Cập nhật tài khoản thành công!' : 'Thêm tài khoản thành công!';
            this.showNotification(message, 'success');
        } catch (error) {
            console.error('Error saving account:', error);
            this.showNotification('Lỗi khi lưu tài khoản!', 'error');
        }
    }

    // 4. Cập nhật editCookieAccount method
    editCookieAccount(account) {
        console.log('=== EDIT COOKIE ACCOUNT ===');
        console.log('Account to edit:', account);
        
        this.isEditMode = true;
        this.editingAccountId = account.id;
        
        // Fill form with existing data (hỗ trợ cả cấu trúc cũ và mới)
        document.getElementById('cookie-fb-uid').value = account.uid_fb || (account.uid && !account.uid_ig ? account.uid : '') || '';
        document.getElementById('cookie-fb-pass').value = account.pass_fb || (account.pass && !account.pass_ig ? account.pass : '') || '';
        document.getElementById('cookie-fb-cookie').value = account.cookie_fb || (account.cookie && !account.cookie_ig ? account.cookie : '') || '';
        document.getElementById('cookie-ig-uid').value = account.uid_ig || '';
        document.getElementById('cookie-ig-pass').value = account.pass_ig || '';
        document.getElementById('cookie-ig-cookie').value = account.cookie_ig || '';
        document.getElementById('cookie-proxy').value = account.proxy || '';
        document.getElementById('cookie-chrome-profile').value = account.chrome_profile || '';
        
        document.getElementById('modal-title').textContent = 'CHỈNH SỬA TÀI KHOẢN';
        document.getElementById('add-cookie-account-modal').style.display = 'flex';
        console.log('Modal opened in EDIT mode');
    }

    

    async deleteAccount(account) {
        if (!confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) return;

        console.log('Deleting account:', account.id);

        const groupIndex = this.cookieGroups.findIndex(group => group === this.currentGroup);
        if (groupIndex !== -1 && this.cookieGroups[groupIndex]['data-account']) {
            // Remove account
            this.cookieGroups[groupIndex]['data-account'] = 
                this.cookieGroups[groupIndex]['data-account'].filter(acc => acc.id !== account.id);
        }

        try {
            await this.saveCookieGroups();
            
            this.currentGroup = this.cookieGroups[groupIndex];
            this.loadAccountsForGroup();
            this.updateCookieStats();
            
            this.showNotification('Xóa tài khoản thành công!', 'success');
        } catch (error) {
            console.error('Error deleting account:', error);
            this.showNotification('Lỗi khi xóa tài khoản!', 'error');
        }
    }

    async saveCookieGroups() {
        try {
            const result = await eel.write_json_file_groups('data/cookie-manager-ig.json', this.cookieGroups)();
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        } catch (error) {
            console.error('Error saving cookie groups:', error);
            throw error;
        }
    }

    async saveCurrentGroup() {
        if (!this.currentGroup) {
            alert('Vui lòng chọn nhóm để lưu!');
            return;
        }

        try {
            await this.saveCookieGroups();
            this.showNotification('Lưu nhóm thành công!', 'success');
        } catch (error) {
            console.error('Error saving current group:', error);
            this.showNotification('Lỗi khi lưu nhóm!', 'error');
        }
    }

    // Chrome operations
    async openChrome(accountId) {
        const account = this.accounts.find(acc => acc.id === accountId);
        if (!account || !account.chrome_profile) {
            this.showNotification('Tài khoản chưa có Chrome profile!', 'warning');
            return;
        }

        console.log('Opening Chrome for account:', account.chrome_profile);
        
        try {
            // Call backend to open Chrome with profile
            const result = await eel.open_chrome_profile(account.chrome_profile, account.proxy)();
            if (result.success) {
                this.showNotification('Đã mở Chrome thành công!', 'success');
            } else {
                this.showNotification('Lỗi khi mở Chrome: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error opening Chrome:', error);
            this.showNotification('Lỗi khi mở Chrome!', 'error');
        }
    }

    async openSelectedChrome() {
        const selectedCheckboxes = document.querySelectorAll('#cookie-tree-tbody input[type="checkbox"]:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Vui lòng chọn ít nhất một tài khoản!');
            return;
        }

        console.log('Opening Chrome for', selectedCheckboxes.length, 'accounts');
        
        for (const checkbox of selectedCheckboxes) {
            const accountId = checkbox.dataset.accountId;
            await this.openChrome(accountId);
            // Add delay between opens
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Cookie operations
    async checkCookie(account) {
        console.log('Checking cookie for account:', account.id);
        
        const row = document.querySelector(`#cookie-tree-tbody tr[data-account-id="${account.id}"]`);
        if (!row) return;
        
        // Visual feedback
        const originalContent = row.innerHTML;
        row.style.opacity = '0.6';
        
        try {
            // Call Python backend to check cookie
            const result = await eel.check_instagram_cookie(account.uid, account.cookie)();
            
            // Update account status based on result
            const groupIndex = this.cookieGroups.findIndex(group => group === this.currentGroup);
            if (groupIndex !== -1) {
                const accountIndex = this.cookieGroups[groupIndex]['data-account'].findIndex(acc => acc.id === account.id);
                if (accountIndex !== -1) {
                    this.cookieGroups[groupIndex]['data-account'][accountIndex].last_check = new Date().toISOString();
                    this.cookieGroups[groupIndex]['data-account'][accountIndex].status = result.success ? 'active' : 'inactive';
                }
            }
            
            await this.saveCookieGroups();
            this.loadAccountsForGroup();
            
            const message = result.success ? 'Cookie hoạt động tốt!' : 'Cookie đã hết hạn!';
            this.showNotification(message, result.success ? 'success' : 'warning');
        } catch (error) {
            row.innerHTML = originalContent;
            row.style.opacity = '1';
            console.error('Error checking cookie:', error);
            this.showNotification('Lỗi khi kiểm tra cookie!', 'error');
        }
    }

    async checkSelectedCookies() {
        const selectedCheckboxes = document.querySelectorAll('#cookie-tree-tbody input[type="checkbox"]:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Vui lòng chọn ít nhất một tài khoản!');
            return;
        }

        console.log('Checking cookies for', selectedCheckboxes.length, 'accounts');
        
        for (const checkbox of selectedCheckboxes) {
            const accountId = checkbox.dataset.accountId;
            const account = this.accounts.find(acc => acc.id === accountId);
            if (account) {
                await this.checkCookie(account);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    async updateSelectedCookies() {
        const selectedCheckboxes = document.querySelectorAll('#cookie-tree-tbody input[type="checkbox"]:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Vui lòng chọn ít nhất một tài khoản!');
            return;
        }

        console.log('Updating cookies for', selectedCheckboxes.length, 'accounts');
        this.showNotification('Đang cập nhật cookies...', 'info');
        
        // Call Python backend to update cookies
        for (const checkbox of selectedCheckboxes) {
            const accountId = checkbox.dataset.accountId;
            const account = this.accounts.find(acc => acc.id === accountId);
            if (account) {
                try {
                    const result = await eel.update_instagram_cookie(account.uid, account.pass)();
                    if (result.success) {
                        // Update cookie in data
                        const groupIndex = this.cookieGroups.findIndex(group => group === this.currentGroup);
                        if (groupIndex !== -1) {
                            const accountIndex = this.cookieGroups[groupIndex]['data-account'].findIndex(acc => acc.id === account.id);
                            if (accountIndex !== -1) {
                                this.cookieGroups[groupIndex]['data-account'][accountIndex].cookie = result.cookie;
                                this.cookieGroups[groupIndex]['data-account'][accountIndex].updated_at = new Date().toISOString();
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error updating cookie for account:', account.uid, error);
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        await this.saveCookieGroups();
        this.loadAccountsForGroup();
        this.showNotification('Cập nhật cookies thành công!', 'success');
    }

    async deleteSelectedAccounts() {
        const selectedCheckboxes = document.querySelectorAll('#cookie-tree-tbody input[type="checkbox"]:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Vui lòng chọn ít nhất một tài khoản!');
            return;
        }

        if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedCheckboxes.length} tài khoản đã chọn?`)) return;

        const accountIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.accountId);
        
        const groupIndex = this.cookieGroups.findIndex(group => group === this.currentGroup);
        if (groupIndex !== -1 && this.cookieGroups[groupIndex]['data-account']) {
            // Remove selected accounts
            this.cookieGroups[groupIndex]['data-account'] = 
                this.cookieGroups[groupIndex]['data-account'].filter(acc => !accountIds.includes(acc.id));
        }

        try {
            await this.saveCookieGroups();
            
            this.currentGroup = this.cookieGroups[groupIndex];
            this.loadAccountsForGroup();
            this.updateCookieStats();
            
            this.showNotification(`Đã xóa ${accountIds.length} tài khoản!`, 'success');
        } catch (error) {
            console.error('Error deleting accounts:', error);
            this.showNotification('Lỗi khi xóa tài khoản!', 'error');
        }
    }

    // TreeView controls
    expandAllTree() {
        console.log('Expanding all tree nodes...');
        // TreeView expand logic if needed
    }

    collapseAllTree() {
        console.log('Collapsing all tree nodes...');
        // TreeView collapse logic if needed
    }

    async refreshCookieTree() {
        console.log('Refreshing cookie tree...');
        await this.loadCookieGroups();
        this.loadAccountsForGroup();
        this.updateCookieStats();
        this.showNotification('Đã làm mới danh sách!', 'info');
    }

    // Utility methods
    assignProxy(account) {
        console.log('Assigning proxy for account:', account.id);
        // Open proxy assignment modal or interface
        this.showNotification('Tính năng gán proxy sẽ được phát triển!', 'info');
    }

    exportAccount(account) {
        console.log('Exporting account:', account.id);
        
        const exportData = {
            uid: account.uid,
            pass: account.pass,
            cookie: account.cookie,
            proxy: account.proxy,
            chrome_profile: account.chrome_profile
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type:'application/json'});
        
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(dataBlob);
        link.download = `instagram_account_${account.uid}_${Date.now()}.json`;
        link.click();
        
        this.showNotification('Đã xuất tài khoản thành công!', 'success');
    }

    showNotification(message, type = 'info') {
        console.log(`Notification [${type}]:`, message);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: ${type === 'warning' ? '#000' : '#fff'};
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            z-index: 3000;
            font-size: 12px;
            font-weight: 500;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span style="margin-left: 8px;">${message}</span>
        `;

        document.body.appendChild(notification);

        // Show
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Hide
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Bulk import accounts from text
    async importAccountsFromText(text) {
        if (!this.currentGroup) {
            alert('Vui lòng chọn nhóm trước!');
            return;
        }

        const lines = text.split('\n').filter(line => line.trim());
        const accounts = [];
        let errors = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Format: uid|pass|cookie
            const parts = line.split('|');
            if (parts.length >= 2) {
                const uid = parts[0].trim();
                const pass = parts[1].trim();
                const cookie = parts.length > 2 ? parts[2].trim() : '';

                if (uid && pass) {
                    // Check if UID already exists
                    const groupIndex = this.cookieGroups.findIndex(group => group === this.currentGroup);
                    const exists = this.cookieGroups[groupIndex]['data-account'].some(acc => acc.uid === uid);
                    
                    if (!exists) {
                        accounts.push({
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + i,
                            uid: uid,
                            pass: pass,
                            cookie: cookie,
                            proxy: '',
                            chrome_profile: '',
                            status: 'active',
                            created_at: new Date().toISOString()
                        });
                    } else {
                        errors.push(`UID ${uid} đã tồn tại`);
                    }
                } else {
                    errors.push(`Dòng ${i + 1}: Thiếu thông tin UID hoặc password`);
                }
            } else {
                errors.push(`Dòng ${i + 1}: Format không đúng (uid|pass|cookie)`);
            }
        }

        if (accounts.length > 0) {
            const groupIndex = this.cookieGroups.findIndex(group => group === this.currentGroup);
            this.cookieGroups[groupIndex]['data-account'].push(...accounts);
            
            try {
                await this.saveCookieGroups();
                this.currentGroup = this.cookieGroups[groupIndex];
                this.loadAccountsForGroup();
                this.updateCookieStats();
                
                let message = `Đã import ${accounts.length} tài khoản thành công!`;
                if (errors.length > 0) {
                    message += `\n${errors.length} lỗi: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`;
                }
                this.showNotification(message, 'success');
            } catch (error) {
                console.error('Error importing accounts:', error);
                this.showNotification('Lỗi khi import tài khoản!', 'error');
            }
        } else {
            this.showNotification('Không có tài khoản nào được import!', 'warning');
        }

        if (errors.length > 0) {
            console.log('Import errors:', errors);
        }
    }

    // Export all accounts in group
    exportAllAccounts() {
        if (!this.currentGroup || !this.accounts.length) {
            alert('Không có tài khoản nào để xuất!');
            return;
        }

        const exportData = this.accounts.map(acc => ({
            uid: acc.uid,
            pass: acc.pass,
            cookie: acc.cookie,
            proxy: acc.proxy,
            chrome_profile: acc.chrome_profile,
            status: acc.status,
            created_at: acc.created_at
        }));
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type:'application/json'});
        
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(dataBlob);
        link.download = `instagram_group_${this.currentGroup['name-groups']}_${Date.now()}.json`;
        link.click();
        
        this.showNotification(`Đã xuất ${this.accounts.length} tài khoản!`, 'success');
    }

    // Export as text format (uid|pass|cookie)
    exportAsText() {
        if (!this.currentGroup || !this.accounts.length) {
            alert('Không có tài khoản nào để xuất!');
            return;
        }

        const textData = this.accounts.map(acc => 
            `${acc.uid}|${acc.pass}|${acc.cookie || ''}`
        ).join('\n');
        
        const dataBlob = new Blob([textData], {type:'text/plain'});
        
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(dataBlob);
        link.download = `instagram_accounts_${this.currentGroup['name-groups']}_${Date.now()}.txt`;
        link.click();
        
        this.showNotification(`Đã xuất ${this.accounts.length} tài khoản dạng text!`, 'success');
    }
}

// Initialize Cookie Manager
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Cookie Manager...');
    window.cookieManager = new CookieManager();
});