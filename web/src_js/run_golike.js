// src_js/runner-treeview.js
class RunnerTreeView {
    constructor() {
        this.accounts = [];
        this.selectedAccounts = new Set();
        this.selectedInstagram = new Set();
        this.expandedNodes = new Set();
        this.isRunning = false;
        this.runningStats = {
            totalNVU: 0,
            totalBalance: 0,
            runningCount: 0,
            completedMissions: 0,
            totalEarnings: 0
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadAccountsData();
        setInterval(() => {
            this.updateStats();
            this.pollBackendStats();
        }, 2000);
    }

    async pollBackendStats() {
        if (!this.isRunning) return;
        
        try {
            const result = await eel.get_runner_status()();
            if (result.success) {
                if (!result.is_active && this.isRunning) {
                    this.stopRunnerFromBackend();
                }
            }
        } catch (error) {
            // Không log lỗi polling để tránh spam
        }
    }

    stopRunnerFromBackend() {
        this.isRunning = false;
        document.getElementById('start-runner-btn').disabled = false;
        document.getElementById('stop-runner-btn').disabled = true;
        
        this.runningStats.runningCount = 0;
        this.updateStats();
    }

    bindEvents() {
        // Header buttons
        const startBtn = document.getElementById('start-runner-btn');
        const stopBtn = document.getElementById('stop-runner-btn');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startRunner());
        }
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopRunner());
        }
        
        // TreeView actions
        const expandAllBtn = document.getElementById('expand-all-btn');
        const collapseAllBtn = document.getElementById('collapse-all-btn');
        const refreshBtn = document.getElementById('refresh-accounts-btn');
        
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => this.expandAll());
        }
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => this.collapseAll());
        }
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadAccountsData());
        }
        
        // Log actions
        const clearLogBtn = document.getElementById('clear-log-btn');
        const exportLogBtn = document.getElementById('export-log-btn');
        
        if (clearLogBtn) {
            clearLogBtn.addEventListener('click', () => this.clearLog());
        }
        if (exportLogBtn) {
            exportLogBtn.addEventListener('click', () => this.exportLog());
        }
        
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all-tree');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.selectAll(e.target.checked);
            });
        }
    }

    async loadAccountsData() {
        try {
            this.addLog('info', 'Đang tải dữ liệu tài khoản...');
            
            // Kiểm tra xem eel có tồn tại không
            if (typeof eel === 'undefined') {
                console.error('Eel không tồn tại - sử dụng dữ liệu mẫu');
                this.loadSampleData();
                return;
            }
            
            // Load data from manager-golike.json using eel function
            const result = await eel.read_json_file('data/manager-golike.json')();
            
            if (result && result.success) {
                this.accounts = result.data || [];
                this.renderTreeView();
                this.updateAccountStats();
                this.addLog('success', `Đã tải ${this.accounts.length} tài khoản GoLike`);
                
                if (this.accounts.length === 0) {
                    this.addLog('warning', 'Chưa có tài khoản GoLike nào. Vui lòng thêm tài khoản ở tab "QUẢN LÝ TK GOLIKE"');
                }
            } else {
                throw new Error(result ? result.error : 'Không nhận được phản hồi từ backend');
            }
            
        } catch (error) {
            console.error('Lỗi tải dữ liệu:', error);
            this.addLog('error', `Lỗi tải dữ liệu: ${error.message}`);
            // Fallback to sample data hoặc empty array
            this.loadSampleData();
        }
    }

    // Thêm method loadSampleData để test
    loadSampleData() {
        this.accounts = [
            {
                id: 'sample-1',
                name_account: 'Test Account',
                username_account: 'testuser',
                authorization: 'Bearer test',
                id_account: 'test123',
                status: 'ready',
                pending_coin: 1000,
                total_coin: 5000,
                instagram_accounts: [
                    {
                        id: 'ig-1',
                        instagram_username: 'testinstagram',
                        id_account_golike: 'ig123',
                        golike_account_id: 'sample-1',
                        status: 'ready',
                        cookie: '',
                        proxy: '',
                        created_at: new Date().toISOString()
                    }
                ]
            }
        ];
        this.renderTreeView();
        this.updateAccountStats();
        this.addLog('info', 'Đã tải dữ liệu mẫu để test');
    }

    renderTreeView() {
        const tbody = document.getElementById('tree-tbody');
        
        // Kiểm tra xem tbody có tồn tại không
        if (!tbody) {
            console.error('Không tìm thấy element #tree-tbody');
            this.addLog('error', 'Không tìm thấy bảng TreeView trong DOM');
            return;
        }

        // Clear existing content
        tbody.innerHTML = '';

        // Kiểm tra xem có accounts không
        if (!this.accounts || this.accounts.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fas fa-inbox"></i>
                    <br>
                    Chưa có tài khoản nào
                </td>
            `;
            tbody.appendChild(emptyRow);
            return;
        }

        console.log('Rendering tree view with accounts:', this.accounts.length);

        this.accounts.forEach((account, index) => {
            try {
                // Render parent row (GoLike account)
                const parentRow = this.createAccountRow(account);
                if (parentRow) {
                    tbody.appendChild(parentRow);
                    console.log(`Đã thêm tài khoản ${index + 1}: ${account.name_account}`);

                    // Render child rows (Instagram accounts)
                    if (account.instagram_accounts && Array.isArray(account.instagram_accounts)) {
                        account.instagram_accounts.forEach((igAccount, igIndex) => {
                            try {
                                const childRow = this.createInstagramRow(igAccount, account.id);
                                if (childRow) {
                                    tbody.appendChild(childRow);
                                    console.log(`  Đã thêm Instagram ${igIndex + 1}: @${igAccount.instagram_username}`);
                                } else {
                                    console.warn(`Không tạo được row cho Instagram: ${igAccount.instagram_username}`);
                                }
                            } catch (igError) {
                                console.error(`Lỗi tạo Instagram row cho ${igAccount.instagram_username}:`, igError);
                            }
                        });
                    }
                } else {
                    console.warn(`Không tạo được row cho account: ${account.name_account}`);
                }
            } catch (accountError) {
                console.error(`Lỗi tạo account row cho ${account.name_account}:`, accountError);
            }
        });

        console.log(`Đã render xong TreeView với ${tbody.children.length} rows`);
    }

    createAccountRow(account) {
        try {
            const row = document.createElement('tr');
            row.className = 'tree-parent';
            row.dataset.accountId = account.id;
            
            const isExpanded = this.expandedNodes.has(account.id);
            const igCount = account.instagram_accounts ? account.instagram_accounts.length : 0;
            
            row.innerHTML = `
                <td class="checkbox-col">
                    <input type="checkbox" class="account-checkbox" data-account-id="${account.id}">
                </td>
                <td class="tree-node">
                    <span class="tree-toggle ${isExpanded ? 'expanded' : ''}" data-account-id="${account.id}">
                        <i class="fas ${igCount > 0 ? (isExpanded ? 'fa-chevron-down' : 'fa-chevron-right') : 'fa-user'}"></i>
                    </span>
                    <span class="node-icon">
                        <i class="fas fa-user-circle"></i>
                    </span>
                    <span class="node-text">
                        <strong>${this.escapeHtml(account.name_account || 'Unknown')}</strong> (@${this.escapeHtml(account.username_account || 'unknown')})
                    </span>
                </td>
                <td>
                    <span class="status-indicator ${account.status || 'unknown'}"></span>
                    <span class="status-${account.status || 'unknown'}">${this.getStatusText(account.status || 'unknown')}</span>
                </td>
                <td class="text-right">
                    <span class="coin-value">${account.pending_coin || 0}</span>
                </td>
                <td class="text-right">
                    <span class="coin-value">${account.total_coin || 0}</span>
                </td>
                <td class="text-center">
                    <span class="ig-count">${igCount}</span>
                </td>
            `;

            // Add click event for expand/collapse
            const toggle = row.querySelector('.tree-toggle');
            if (toggle && igCount > 0) {
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleNode(account.id);
                });
                toggle.style.cursor = 'pointer';
            }

            // Add checkbox event
            const checkbox = row.querySelector('.account-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.handleAccountSelection(account.id, e.target.checked);
                });
            }

            return row;
        } catch (error) {
            console.error('Lỗi tạo account row:', error);
            return null;
        }
    }

    createInstagramRow(igAccount, parentId) {
        try {
            const row = document.createElement('tr');
            row.className = 'tree-child';
            row.dataset.parentId = parentId;
            row.dataset.igId = igAccount.id;
            row.style.display = this.expandedNodes.has(parentId) ? 'table-row' : 'none';

            const createdDate = igAccount.created_at ? 
                new Date(igAccount.created_at).toLocaleDateString('vi-VN') : 
                'N/A';

            row.innerHTML = `
                <td class="checkbox-col">
                    <input type="checkbox" class="ig-checkbox" data-ig-id="${igAccount.id}" data-parent-id="${parentId}">
                </td>
                <td class="tree-node child-node">
                    <span class="tree-indent"></span>
                    <span class="node-icon">
                        <i class="fab fa-instagram"></i>
                    </span>
                    <span class="node-text">
                        @${this.escapeHtml(igAccount.instagram_username || 'unknown')}
                    </span>
                </td>
                <td>
                    <span class="status-indicator ${igAccount.status || 'unknown'}"></span>
                    <span class="status-${igAccount.status || 'unknown'}">${this.getStatusText(igAccount.status || 'unknown')}</span>
                </td>
                <td colspan="3" class="ig-info">
                    <small class="text-muted">
                        ID: ${this.escapeHtml(igAccount.id_account_golike || 'N/A')} | 
                        Thêm: ${createdDate}
                    </small>
                </td>
            `;

            // Add checkbox event
            const checkbox = row.querySelector('.ig-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.handleInstagramSelection(igAccount.id, parentId, e.target.checked);
                });
            }

            return row;
        } catch (error) {
            console.error('Lỗi tạo Instagram row:', error);
            return null;
        }
    }

    // Thêm method để escape HTML
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    toggleNode(accountId) {
        const isExpanded = this.expandedNodes.has(accountId);
        
        if (isExpanded) {
            this.expandedNodes.delete(accountId);
        } else {
            this.expandedNodes.add(accountId);
        }
        
        // Update toggle icon
        const toggle = document.querySelector(`[data-account-id="${accountId}"].tree-toggle`);
        if (toggle) {
            const icon = toggle.querySelector('i');
            if (icon) {
                if (isExpanded) {
                    toggle.classList.remove('expanded');
                    icon.className = 'fas fa-chevron-right';
                } else {
                    toggle.classList.add('expanded');
                    icon.className = 'fas fa-chevron-down';
                }
            }
        }
        
        // Show/hide child rows
        const childRows = document.querySelectorAll(`[data-parent-id="${accountId}"]`);
        childRows.forEach(row => {
            row.style.display = isExpanded ? 'none' : 'table-row';
        });
    }

    expandAll() {
        this.accounts.forEach(account => {
            if (account.instagram_accounts && account.instagram_accounts.length > 0) {
                this.expandedNodes.add(account.id);
            }
        });
        this.renderTreeView();
        this.addLog('info', 'Đã mở rộng tất cả tài khoản');
    }

    collapseAll() {
        this.expandedNodes.clear();
        this.renderTreeView();
        this.addLog('info', 'Đã thu gọn tất cả tài khoản');
    }

    handleAccountSelection(accountId, checked) {
        if (checked) {
            this.selectedAccounts.add(accountId);
        } else {
            this.selectedAccounts.delete(accountId);
        }

        // Auto select/deselect all Instagram accounts of this GoLike account
        const account = this.accounts.find(acc => acc.id === accountId);
        if (account && account.instagram_accounts) {
            account.instagram_accounts.forEach(igAccount => {
                const igCheckbox = document.querySelector(`[data-ig-id="${igAccount.id}"]`);
                if (igCheckbox) {
                    igCheckbox.checked = checked;
                    this.handleInstagramSelection(igAccount.id, accountId, checked);
                }
            });
        }

        this.updateSelectionCount();
    }

    handleInstagramSelection(igId, parentId, checked) {
        const key = `${parentId}-${igId}`;
        if (checked) {
            this.selectedInstagram.add(key);
            console.log('Added Instagram:', key);
        } else {
            this.selectedInstagram.delete(key);
            console.log('Removed Instagram:', key);
        }

        // Check if parent should be selected
        const account = this.accounts.find(acc => acc.id === parentId);
        if (account && account.instagram_accounts) {
            const allSelected = account.instagram_accounts.every(igAccount => {
                return this.selectedInstagram.has(`${parentId}-${igAccount.id}`);
            });
            
            const parentCheckbox = document.querySelector(`[data-account-id="${parentId}"]`);
            if (parentCheckbox) {
                parentCheckbox.checked = allSelected;
                if (allSelected) {
                    this.selectedAccounts.add(parentId);
                } else {
                    this.selectedAccounts.delete(parentId);
                }
            }
        }

        this.updateSelectionCount();
        this.debugSelection();
    }

    selectAll(checked) {
        const accountCheckboxes = document.querySelectorAll('.account-checkbox');
        const igCheckboxes = document.querySelectorAll('.ig-checkbox');
        
        accountCheckboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const accountId = checkbox.dataset.accountId;
            this.handleAccountSelection(accountId, checked);
        });
        
        igCheckboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const igId = checkbox.dataset.igId;
            const parentId = checkbox.dataset.parentId;
            this.handleInstagramSelection(igId, parentId, checked);
        });
    }

    async startRunner() {
        if (this.selectedInstagram.size === 0) {
            this.addLog('error', 'Vui lòng chọn ít nhất một tài khoản Instagram để chạy');
            return;
        }

        this.isRunning = true;
        document.getElementById('start-runner-btn').disabled = true;
        document.getElementById('stop-runner-btn').disabled = false;

        // Reset stats khi bắt đầu
        this.runningStats = {
            totalNVU: 0,
            totalBalance: 0,
            runningCount: this.selectedInstagram.size,
            completedMissions: 0,
            totalEarnings: 0
        };

        const delay = parseInt(document.getElementById('runner-delay').value) || 3000;
        const taskType = document.getElementById('task-type').value || 'all';
        const threadCount = parseInt(document.getElementById('thread-count').value) || 1;
        const switch_account = parseInt(document.getElementById('switch-account-after').value) || 10;
        const stop_account = parseInt(document.getElementById('stop-account-after').value) || 50;

        this.addLog('success', `Bắt đầu chạy ${this.selectedInstagram.size} tài khoản Instagram với ${threadCount} luồng`);
        this.addLog('info', `Delay: ${delay/1000}s | Loại NVU: ${taskType}`);

        // Chuẩn bị dữ liệu JSON gửi về backend
        const runnerData = this.prepareRunnerData();
        
        const configData = {
            delay: delay,
            taskType: taskType,
            threadCount: threadCount,
            switch_account: switch_account,
            stop_account: stop_account,
            ...runnerData
        };

        try {
            this.addLog('info', 'Đang gửi dữ liệu về backend...');
            
            if (typeof eel !== 'undefined' && eel.receive_runner_data) {
                const result = await eel.receive_runner_data(JSON.stringify(configData))();
                
                if (result && result.success) {
                    this.addLog('success', result.message || 'Backend đã nhận dữ liệu thành công');
                    this.updateStats();
                } else {
                    throw new Error(result ? result.error : 'Không nhận được phản hồi từ backend');
                }
            } else {
                // Fallback - simulation mode
                this.addLog('warning', 'Chạy ở chế độ simulation (không có backend)');
                this.simulateRunning();
            }
            
        } catch (error) {
            console.error('Lỗi gửi dữ liệu:', error);
            this.addLog('error', `Lỗi gửi dữ liệu: ${error.message}`);
            this.stopRunner();
        }
    }

    debugSelection() {
        console.log('=== DEBUG SELECTION ===');
        console.log('Selected accounts:', Array.from(this.selectedAccounts));
        console.log('Selected Instagram:', Array.from(this.selectedInstagram));
        
        this.selectedInstagram.forEach(key => {
            const [parentId, igId] = key.split('-');
            const golikeAccount = this.accounts.find(acc => acc.id === parentId);
            const igAccount = golikeAccount?.instagram_accounts?.find(ig => ig.id === igId);
            
            console.log(`${key}:`, {
                golike: golikeAccount?.username_account,
                instagram: igAccount?.instagram_username
            });
        });
    }

    prepareRunnerData() {
        const golikeAccountsMap = new Map();

        this.selectedInstagram.forEach(key => {
            const [parentId, igId] = key.split('-');
            
            const golikeAccount = this.accounts.find(acc => acc.id === parentId);
            if (golikeAccount) {
                if (!golikeAccountsMap.has(parentId)) {
                    golikeAccountsMap.set(parentId, {
                        id: golikeAccount.id,
                        authorization: golikeAccount.authorization,
                        id_account: golikeAccount.id_account,
                        username_account: golikeAccount.username_account,
                        name_account: golikeAccount.name_account,
                        status: golikeAccount.status,
                        pending_coin: golikeAccount.pending_coin || 0,
                        total_coin: golikeAccount.total_coin || 0,
                        instagram_accounts: []
                    });
                }

                const igAccount = golikeAccount.instagram_accounts?.find(ig => ig.id === igId);
                if (igAccount) {
                    const currentGolikeData = golikeAccountsMap.get(parentId);
                    currentGolikeData.instagram_accounts.push({
                        id: igAccount.id,
                        username: igAccount.instagram_username,
                        id_account_golike: igAccount.id_account_golike,
                        golike_account_id: igAccount.golike_account_id,
                        status: igAccount.status,
                        cookie: igAccount.cookie || '',
                        proxy: igAccount.proxy || '',
                        created_at: igAccount.created_at
                    });
                }
            }
        });

        const golikeAccounts = Array.from(golikeAccountsMap.values());
        const totalInstagramAccounts = golikeAccounts.reduce((sum, acc) => 
            sum + acc.instagram_accounts.length, 0
        );

        this.addLog('info', `Đã chuẩn bị ${golikeAccounts.length} tài khoản GoLike và ${totalInstagramAccounts} tài khoản Instagram`);
        
        console.log('Selected Instagram keys:', Array.from(this.selectedInstagram));
        console.log('Prepared data structure:', { golike_accounts: golikeAccounts });
        
        golikeAccounts.forEach(golike => {
            console.log(`GoLike: ${golike.username_account} có ${golike.instagram_accounts.length} Instagram accounts:`, 
                golike.instagram_accounts.map(ig => ig.username));
        });
        
        return {
            golike_accounts: golikeAccounts
        };
    }

    updateRunnerLogFromBackend(message) {
        this.addLog('info', message);
    }

    async stopRunner() {
        try {
            if (typeof eel !== 'undefined' && eel.stop_runner) {
                const result = await eel.stop_runner()();
                
                if (result && result.success) {
                    this.addLog('success', 'Đã gửi lệnh dừng về backend');
                } else {
                    this.addLog('error', `Lỗi dừng runner: ${result ? result.error : 'Không có phản hồi'}`);
                }
            }
        } catch (error) {
            console.error('Lỗi kết nối backend:', error);
            this.addLog('error', `Lỗi kết nối backend: ${error.message}`);
        }
        
        this.isRunning = false;
        document.getElementById('start-runner-btn').disabled = false;
        document.getElementById('stop-runner-btn').disabled = true;
        
        this.runningStats.runningCount = 0;
        this.updateStats();
        
        this.addLog('warning', 'Đã dừng chạy GoLike');
    }

    simulateRunning() {
        if (!this.isRunning) return;

        const randomNVU = Math.floor(Math.random() * 5) + 1;
        const randomBalance = Math.floor(Math.random() * 1000) + 100;
        
        this.runningStats.totalNVU += randomNVU;
        this.runningStats.totalBalance += randomBalance;
        
        this.addLog('success', `[Simulation] Hoàn thành ${randomNVU} NVU, thu nhập: +${randomBalance}đ`);
        this.updateStats();

        setTimeout(() => this.simulateRunning(), 3000);
    }

    updateStats() {
        const totalGolikeAccounts = this.accounts.length;
        const totalInstagramAccounts = this.accounts.reduce((sum, acc) => {
            return sum + (acc.instagram_accounts ? acc.instagram_accounts.length : 0);
        }, 0);
        
        const totalAccountsEl = document.getElementById('runner-total-accounts');
        const runningEl = document.getElementById('runner-running');
        const nvuEl = document.getElementById('runner-nvu');
        const balanceEl = document.getElementById('runner-balance');
        
        if (totalAccountsEl) totalAccountsEl.textContent = totalInstagramAccounts;
        if (runningEl) runningEl.textContent = this.runningStats.runningCount;
        if (nvuEl) nvuEl.textContent = this.runningStats.totalNVU;
        if (balanceEl) balanceEl.textContent = this.formatCurrency(this.runningStats.totalBalance);
    }

    updateStatsFromBackend(data) {
        if (data.totalNVU !== undefined) {
            this.runningStats.totalNVU = data.totalNVU;
        }
        if (data.totalBalance !== undefined) {
            this.runningStats.totalBalance = data.totalBalance;
        }
        if (data.runningCount !== undefined) {
            this.runningStats.runningCount = data.runningCount;
        }
        if (data.completedMissions !== undefined) {
            this.runningStats.completedMissions = data.completedMissions;
        }
        if (data.totalEarnings !== undefined) {
            this.runningStats.totalEarnings = data.totalEarnings;
        }
        
        this.updateStats();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0
        }).format(amount);
    }

    updateAccountStats() {
        const totalAccounts = this.accounts.length;
        const totalInstagram = this.accounts.reduce((sum, acc) => {
            return sum + (acc.instagram_accounts ? acc.instagram_accounts.length : 0);
        }, 0);
        
        const totalAccountsEl = document.getElementById('runner-total-accounts');
        if (totalAccountsEl) {
            totalAccountsEl.textContent = totalInstagram;
        }
    }

    updateSelectionCount() {
        const selectedCount = this.selectedInstagram.size;
        this.addLog('info', `Đã chọn ${selectedCount} tài khoản Instagram`);
    }

    getStatusText(status) {
        const statusMap = {
            'ready': 'Sẵn sàng',
            'active': 'Hoạt động',
            'running': 'Đang chạy',
            'error': 'Lỗi',
            'pending': 'Chờ xử lý',
            'inactive': 'Không hoạt động',
            'unknown': 'Không xác định'
        };
        return statusMap[status] || status;
    }

    addLog(type, message) {
        const logContent = document.getElementById('log-content');
        if (!logContent) {
            console.error('Không tìm thấy element #log-content');
            return;
        }
        
        const timestamp = new Date().toLocaleTimeString('vi-VN');
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-message">${this.escapeHtml(message)}</span>
        `;
        
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
        
        this.parseLogForStats(message);
        
        const entries = logContent.querySelectorAll('.log-entry');
        if (entries.length > 1000) {
            entries[0].remove();
        }
    }

    parseLogForStats(message) {
        // Parse "Hoàn thành nhiệm vụ #X"
        const missionMatch = message.match(/Hoàn thành nhiệm vụ #(\d+)/);
        if (missionMatch) {
            this.runningStats.totalNVU = Math.max(this.runningStats.totalNVU, parseInt(missionMatch[1]));
        }
        
        // Parse "Thu nhập: +XXXđ | Tổng: XXXđ"
        const earningsMatch = message.match(/Thu nhập: \+(\d+)đ \| Tổng: (\d+)đ/);
        if (earningsMatch) {
            const currentEarning = parseInt(earningsMatch[1]);
            const totalEarning = parseInt(earningsMatch[2]);
            this.runningStats.totalBalance = totalEarning;
            this.runningStats.completedMissions++;
        }
        
        // Parse "Đã dừng tài khoản"
        if (message.includes('Đã dừng tài khoản') || message.includes('Hoàn thành') && message.includes('nhiệm vụ cho tài khoản')) {
            this.runningStats.runningCount = Math.max(0, this.runningStats.runningCount - 1);
        }
        
        this.updateStats();
    }

    updateRunnerStatsFromBackend(statsData) {
        if (statsData) {
            this.updateStatsFromBackend(statsData);
        }
    }

    clearLog() {
        const logContent = document.getElementById('log-content');
        if (logContent) {
            logContent.innerHTML = `
                <div class="log-entry info">
                    <span class="log-time">[${new Date().toLocaleTimeString('vi-VN')}]</span>
                    <span class="log-message">Log đã được xóa</span>
                </div>
            `;
        }
    }

    exportLog() {
        const logEntries = document.querySelectorAll('.log-entry');
        let logText = 'GoLike Manager Pro - Log Export\n';
        logText += '=====================================\n\n';
        
        logEntries.forEach(entry => {
            const timeEl = entry.querySelector('.log-time');
            const messageEl = entry.querySelector('.log-message');
            if (timeEl && messageEl) {
                const time = timeEl.textContent;
                const message = messageEl.textContent;
                logText += `${time} ${message}\n`;
            }
        });
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `golike-log-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.addLog('info', 'Đã export log thành công');
    }
}

// Window functions để gọi từ backend
window.updateRunnerStats = function(statsData) {
    if (window.runnerTreeView) {
        window.runnerTreeView.updateRunnerStatsFromBackend(statsData);
    }
};

window.updateRunnerLog = function(message) {
    if (window.runnerTreeView) {
        window.runnerTreeView.updateRunnerLogFromBackend(message);
    }
};

// Khởi tạo khi DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra xem các elements cần thiết có tồn tại không
    const requiredElements = [
        'tree-tbody',
        'log-content',
        'start-runner-btn',
        'stop-runner-btn'
    ];
    
    let missingElements = [];
    requiredElements.forEach(id => {
        if (!document.getElementById(id)) {
            missingElements.push(id);
        }
    });
    
    if (missingElements.length > 0) {
        console.error('Thiếu các elements:', missingElements);
        console.error('TreeView không thể khởi tạo do thiếu elements trong DOM');
        return;
    }
    
    // Khởi tạo TreeView
    window.runnerTreeView = new RunnerTreeView();
    console.log('RunnerTreeView đã được khởi tạo thành công');
});

// Expose cho eel
if (typeof eel !== 'undefined') {
    eel.expose(window.updateRunnerStats, 'update_runner_stats');
    eel.expose(window.updateRunnerLog, 'update_runner_log');
}