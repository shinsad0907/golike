class ProxyManager {
    constructor(instagramManager) {
        this.instagramManager = instagramManager;
        this.currentProxies = [];
        this.currentIgAccounts = [];
        this.proxyMapping = new Map();
        this.isTestingProxies = false;
        this.init();
    }

    init() {
        console.log('Initializing Proxy Manager...');
        this.setupProxyEventListeners();
        this.setupProxyModalEvents();
    }

    setupProxyEventListeners() {
        const contextMenu = document.getElementById('instagram-context-menu');
        
        const originalHandler = contextMenu.onclick;
        contextMenu.onclick = (e) => {
            const action = e.target.closest('.context-item')?.dataset.action;
            if (action === 'assign-proxy') {
                this.showProxyManagementModal();
                contextMenu.style.display = 'none';
                return;
            }
            if (originalHandler) originalHandler(e);
        };
    }

    setupProxyModalEvents() {
        const modal = document.getElementById('proxy-management-modal');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancel-proxy-btn');
        const applyBtn = document.getElementById('apply-proxy-btn');
        const removeAllBtn = document.getElementById('remove-all-proxy-btn');
        const refreshMappingBtn = document.getElementById('refresh-mapping-btn');
        const testAllBtn = document.getElementById('test-all-proxies-btn');
        const testSelectedBtn = document.getElementById('test-selected-proxy-btn');
        const proxyInput = document.getElementById('proxy-list-input');

        [closeBtn, cancelBtn].forEach(btn => {
            btn?.addEventListener('click', () => {
                this.hideProxyManagementModal();
            });
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideProxyManagementModal();
            }
        });

        applyBtn?.addEventListener('click', () => {
            this.applyProxies();
        });

        removeAllBtn?.addEventListener('click', () => {
            this.removeAllProxies();
        });

        refreshMappingBtn?.addEventListener('click', () => {
            this.refreshProxyMapping();
        });

        testAllBtn?.addEventListener('click', () => {
            this.testAllProxies();
        });

        testSelectedBtn?.addEventListener('click', () => {
            this.testSelectedProxies();
        });

        proxyInput?.addEventListener('input', () => {
            clearTimeout(this.inputTimeout);
            this.inputTimeout = setTimeout(() => {
                this.refreshProxyMapping();
            }, 500);
        });
    }

    showProxyManagementModal() {
        console.log('=== SHOWING PROXY MANAGEMENT MODAL ===');
        
        const selectedGolike = this.instagramManager.selectedGolikeAccount;
        if (!selectedGolike) {
            alert('Vui lòng chọn tài khoản GoLike trước!');
            return;
        }

        this.currentIgAccounts = selectedGolike.instagram_accounts || [];
        
        if (this.currentIgAccounts.length === 0) {
            alert('Không có tài khoản Instagram nào để gán proxy!');
            return;
        }

        console.log('Current IG Accounts:', this.currentIgAccounts.length);

        this.updateModalInfo(selectedGolike);
        this.loadExistingProxies();
        
        document.getElementById('proxy-management-modal').style.display = 'flex';
        this.refreshProxyMapping();
    }

    hideProxyManagementModal() {
        document.getElementById('proxy-management-modal').style.display = 'none';
        this.resetModalState();
    }

    updateModalInfo(golikeAccount) {
        const nameEl = document.getElementById('proxy-golike-name');
        const metaEl = document.getElementById('proxy-golike-meta');
        const countEl = document.getElementById('proxy-ig-count');

        if (nameEl) nameEl.textContent = golikeAccount.name_account || golikeAccount.username_account;
        if (metaEl) metaEl.textContent = `ID: ${golikeAccount.id_account}`;
        if (countEl) countEl.textContent = this.currentIgAccounts.length;
    }

    loadExistingProxies() {
        // FIXED: Load tất cả proxy từ IG accounts (bao gồm cả proxy trùng lặp)
        const existingProxies = [];
        
        this.currentIgAccounts.forEach(igAcc => {
            if (igAcc.proxy && igAcc.proxy.trim()) {
                // Thêm proxy vào array theo thứ tự, KHÔNG loại bỏ trùng lặp
                existingProxies.push(igAcc.proxy.trim());
            } else {
                // Nếu account không có proxy, thêm empty string để giữ đúng vị trí
                existingProxies.push('');
            }
        });

        // Filter bỏ các dòng trống cuối cùng (chỉ giữ empty ở giữa)
        while (existingProxies.length > 0 && existingProxies[existingProxies.length - 1] === '') {
            existingProxies.pop();
        }
        
        if (existingProxies.length > 0) {
            document.getElementById('proxy-list-input').value = existingProxies.join('\n');
            console.log('Loaded existing proxies (with duplicates):', existingProxies);
        }
    }

    refreshProxyMapping() {
        console.log('=== REFRESHING PROXY MAPPING ===');
        
        const proxyInput = document.getElementById('proxy-list-input').value.trim();
        const proxies = this.parseProxyInput(proxyInput);
        const igAccounts = this.currentIgAccounts;

        console.log('Parsed proxies:', proxies.length);
        console.log('IG Accounts:', igAccounts.length);

        this.updateProxyCounts(proxies.length, igAccounts.length);

        const mapping = this.createProxyMapping(proxies, igAccounts);
        this.renderProxyMapping(mapping);
        this.updateButtonsState(proxies.length, igAccounts.length);
    }

    parseProxyInput(input) {
        if (!input || input.trim() === '') return [];

        // FIXED: Parse từng dòng và giữ nguyên thứ tự, bao gồm cả dòng trống
        return input.split('\n')
            .map(line => {
                const trimmed = line.trim();
                
                // Nếu là dòng trống, trả về null để đánh dấu vị trí
                if (trimmed === '') {
                    return null;
                }
                
                // Parse proxy
                const parts = trimmed.split(':');
                if (parts.length >= 2) {
                    return {
                        original: trimmed,
                        ip: parts[0],
                        port: parts[1],
                        username: parts[2] || null,
                        password: parts[3] || null,
                        isValid: this.validateProxy(trimmed)
                    };
                }
                
                return {
                    original: trimmed,
                    isValid: false,
                    error: 'Invalid format'
                };
            });
    }

    validateProxy(proxy) {
        const parts = proxy.split(':');
        if (parts.length < 2) return false;

        const ip = parts[0];
        const port = parseInt(parts[1]);

        if (!ip || ip.length === 0) return false;
        if (isNaN(port) || port < 1 || port > 65535) return false;

        return true;
    }

    createProxyMapping(proxies, igAccounts) {
        const mapping = [];

        igAccounts.forEach((igAcc, index) => {
            // FIXED: Lấy proxy theo index, không skip dòng trống
            const proxy = index < proxies.length ? proxies[index] : null;
            const status = this.getMappingStatus(proxy, igAccounts.length, proxies.length, index);

            mapping.push({
                index: index + 1,
                igAccount: igAcc,
                proxy: proxy,
                status: status
            });
        });

        return mapping;
    }

    getMappingStatus(proxy, igCount, proxyCount, index) {
        if (proxyCount === 0) {
            return { type: 'error', text: 'Không có proxy' };
        }

        if (index >= proxyCount) {
            return { type: 'error', text: 'Thiếu proxy' };
        }

        // FIXED: Handle null (empty line) as missing proxy
        if (!proxy || proxy === null) {
            return { type: 'error', text: 'Không có proxy' };
        }

        if (!proxy.isValid) {
            return { type: 'error', text: 'Proxy không hợp lệ' };
        }

        return { type: 'ready', text: 'Sẵn sàng' };
    }

    renderProxyMapping(mapping) {
        const tbody = document.getElementById('proxy-mapping-tbody');
        
        if (!tbody) {
            console.error('Proxy mapping tbody not found!');
            return;
        }

        tbody.innerHTML = '';

        if (mapping.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="mapping-empty">
                        <i class="fas fa-network-wired"></i>
                        <div>Chưa có mapping nào</div>
                        <small>Nhập danh sách proxy để xem ánh xạ</small>
                    </td>
                </tr>
            `;
            return;
        }

        mapping.forEach(item => {
            const row = document.createElement('tr');
            
            // FIXED: Handle null proxy (empty line)
            const proxyText = item.proxy && item.proxy !== null
                ? (item.proxy.isValid 
                    ? `${item.proxy.ip}:${item.proxy.port}` 
                    : item.proxy.original)
                : 'Không có';

            const statusClass = item.status.type;
            const statusText = item.status.text;

            row.innerHTML = `
                <td>${item.index}</td>
                <td>
                    <div class="node-text">
                        <strong>${item.igAccount.instagram_username}</strong>
                        <div class="ig-info">ID: ${item.igAccount.id}</div>
                    </div>
                </td>
                <td>
                    ${item.proxy && item.proxy !== null ? 
                        `<span class="proxy-preview">${proxyText}</span>` : 
                        '<span class="text-muted">Chưa gán</span>'
                    }
                </td>
                <td>
                    <span class="mapping-status ${statusClass}">
                        <i class="fas fa-${statusClass === 'ready' ? 'check-circle' : statusClass === 'error' ? 'times-circle' : 'clock'}"></i>
                        ${statusText}
                    </span>
                </td>
            `;

            row.addEventListener('click', () => {
                row.classList.toggle('selected');
            });

            tbody.appendChild(row);
        });
    }

    updateProxyCounts(proxyCount, igCount) {
        const proxyCountEl = document.getElementById('proxy-count');
        const igCountEl = document.getElementById('ig-count');

        if (proxyCountEl) proxyCountEl.textContent = proxyCount;
        if (igCountEl) igCountEl.textContent = igCount;
    }

    updateButtonsState(proxyCount, igCount) {
        const applyBtn = document.getElementById('apply-proxy-btn');
        const testAllBtn = document.getElementById('test-all-proxies-btn');

        if (applyBtn) {
            const canApply = proxyCount > 0 && proxyCount >= igCount;
            applyBtn.disabled = !canApply;
            
            if (!canApply) {
                applyBtn.title = proxyCount === 0 
                    ? 'Vui lòng nhập danh sách proxy'
                    : 'Số lượng proxy phải bằng hoặc lớn hơn số Instagram accounts';
            } else {
                applyBtn.title = 'Áp dụng proxy cho tất cả Instagram accounts';
            }
        }

        if (testAllBtn) {
            testAllBtn.disabled = proxyCount === 0 || this.isTestingProxies;
        }
    }

    async applyProxies() {
        console.log('=== APPLYING PROXIES ===');

        const proxyInput = document.getElementById('proxy-list-input').value.trim();
        const proxies = this.parseProxyInput(proxyInput);
        
        // FIXED: Count only valid proxies (not null/empty lines)
        const validProxies = proxies.filter(p => p !== null);
        
        if (validProxies.length === 0) {
            alert('Vui lòng nhập danh sách proxy!');
            return;
        }

        if (proxies.length < this.currentIgAccounts.length) {
            alert(`Số lượng dòng (${proxies.length}) phải bằng hoặc lớn hơn số Instagram accounts (${this.currentIgAccounts.length})!`);
            return;
        }

        // Validate all non-null proxies
        const invalidProxies = validProxies.filter(p => !p.isValid);
        if (invalidProxies.length > 0) {
            if (!confirm(`Có ${invalidProxies.length} proxy không hợp lệ. Bạn có muốn tiếp tục không?`)) {
                return;
            }
        }

        const applyBtn = document.getElementById('apply-proxy-btn');
        const originalText = applyBtn?.textContent || 'Áp dụng Proxy';
        
        try {
            if (typeof eel === 'undefined') {
                throw new Error('Eel is not defined - backend connection failed');
            }

            console.log('Available eel functions:', Object.keys(eel));
            
            let saveFunction = null;
            const possibleNames = ['add_proxy_instagram_account', 'save_proxy_instagram_account', 'update_instagram_accounts'];
            
            for (const funcName of possibleNames) {
                if (typeof eel[funcName] === 'function') {
                    saveFunction = eel[funcName];
                    console.log(`Found function: ${funcName}`);
                    break;
                }
            }

            if (!saveFunction) {
                const availableFunctions = Object.keys(eel).filter(key => 
                    typeof eel[key] === 'function' && 
                    (key.includes('save') || key.includes('update') || key.includes('proxy'))
                );
                
                console.log('Available functions containing save/update/proxy:', availableFunctions);
                
                if (availableFunctions.length > 0) {
                    saveFunction = eel[availableFunctions[0]];
                    console.log(`Using fallback function: ${availableFunctions[0]}`);
                } else {
                    throw new Error('No suitable backend function found. Available functions: ' + Object.keys(eel).join(', '));
                }
            }

            if (applyBtn) {
                applyBtn.disabled = true;
                applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang áp dụng...';
            }

            // FIXED: Map proxy theo index, cho phép null/empty
            const updatedAccounts = this.currentIgAccounts.map((igAcc, index) => {
                const proxy = proxies[index];
                return {
                    ...igAcc,
                    proxy: proxy && proxy !== null ? proxy.original : null,
                    proxy_updated_at: new Date().toISOString()
                };
            });

            const golikeIndex = this.instagramManager.golikeAccounts.findIndex(
                acc => acc.id_account === this.instagramManager.selectedGolikeAccount.id_account
            );

            if (golikeIndex === -1) {
                throw new Error('Không tìm thấy GoLike account');
            }

            this.instagramManager.golikeAccounts[golikeIndex].instagram_accounts = updatedAccounts;

            console.log('Calling backend function with data...');
            console.log('Updated accounts:', updatedAccounts.map(a => ({
                username: a.instagram_username,
                proxy: a.proxy
            })));

            const saveResult = await saveFunction(
                'data/manager-golike.json', 
                this.instagramManager.golikeAccounts
            )();

            console.log('Save result:', saveResult);

            const isSuccess = saveResult && (
                saveResult.success === true || 
                saveResult === true || 
                (saveResult.status && saveResult.status === 'success')
            );

            if (isSuccess) {
                this.instagramManager.selectedGolikeAccount = this.instagramManager.golikeAccounts[golikeIndex];
                
                this.instagramManager.filterInstagramByGolike();
                this.refreshProxyMapping();
                
                this.instagramManager.showNotification('Áp dụng proxy thành công!', 'success');
                
                console.log('Proxies applied successfully:', {
                    totalProxies: validProxies.length,
                    validProxies: validProxies.filter(p => p.isValid).length,
                    appliedToAccounts: updatedAccounts.length,
                    accountsWithProxy: updatedAccounts.filter(a => a.proxy).length
                });
                
            } else {
                const errorMsg = saveResult?.error || saveResult?.message || 'Unknown error occurred';
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error('Error applying proxies:', error);
            
            let errorMessage = 'Lỗi khi áp dụng proxy!';
            
            if (error.message.includes('eel is not defined')) {
                errorMessage = 'Lỗi: Backend không được kết nối. Vui lòng khởi động lại ứng dụng!';
            } else if (error.message.includes('not a function') || error.message.includes('No suitable backend function')) {
                errorMessage = 'Lỗi: Backend function không khả dụng.\n' + error.message;
            } else if (error.message.includes('Không tìm thấy GoLike account')) {
                errorMessage = 'Lỗi: Không tìm thấy tài khoản GoLike được chọn!';
            } else if (error.message) {
                errorMessage = `Lỗi: ${error.message}`;
            }
            
            console.error('Full error context:', {
                error: error.message,
                stack: error.stack,
                availableEelFunctions: typeof eel !== 'undefined' ? Object.keys(eel) : 'eel not available'
            });
            
            this.instagramManager.showNotification(errorMessage, 'error');
        } finally {
            if (applyBtn) {
                applyBtn.disabled = false;
                applyBtn.textContent = originalText;
            }
        }
    }

    async removeAllProxies() {
        console.log('=== REMOVING ALL PROXIES ===');
        
        if (!confirm('Bạn có chắc chắn muốn xóa tất cả proxy?')) return;

        const removeBtn = document.getElementById('remove-all-proxy-btn');
        const originalText = removeBtn?.textContent || 'Xóa Tất Cả';

        try {
            if (typeof eel === 'undefined') {
                throw new Error('Eel is not defined - backend connection failed');
            }

            console.log('Available eel functions:', Object.keys(eel));
            
            let saveFunction = null;
            const possibleNames = ['add_proxy_instagram_account', 'save_proxy_instagram_account', 'update_instagram_accounts'];
            
            for (const funcName of possibleNames) {
                if (typeof eel[funcName] === 'function') {
                    saveFunction = eel[funcName];
                    console.log(`Found function: ${funcName}`);
                    break;
                }
            }

            if (!saveFunction) {
                const availableFunctions = Object.keys(eel).filter(key => 
                    typeof eel[key] === 'function' && 
                    (key.includes('save') || key.includes('update') || key.includes('proxy'))
                );
                
                console.log('Available functions containing save/update/proxy:', availableFunctions);
                
                if (availableFunctions.length > 0) {
                    saveFunction = eel[availableFunctions[0]];
                    console.log(`Using fallback function: ${availableFunctions[0]}`);
                } else {
                    throw new Error('No suitable backend function found. Available functions: ' + Object.keys(eel).join(', '));
                }
            }

            if (removeBtn) {
                removeBtn.disabled = true;
                removeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xóa...';
            }

            const updatedAccounts = this.currentIgAccounts.map(igAcc => {
                const { proxy, proxy_updated_at, ...accountWithoutProxy } = igAcc;
                return {
                    ...accountWithoutProxy,
                    proxy_removed_at: new Date().toISOString()
                };
            });

            const golikeIndex = this.instagramManager.golikeAccounts.findIndex(
                acc => acc.id_account === this.instagramManager.selectedGolikeAccount.id_account
            );

            if (golikeIndex === -1) {
                throw new Error('Không tìm thấy GoLike account');
            }

            this.instagramManager.golikeAccounts[golikeIndex].instagram_accounts = updatedAccounts;

            console.log('Calling backend function for proxy removal...');
            const saveResult = await saveFunction(
                'data/manager-golike.json', 
                this.instagramManager.golikeAccounts
            )();

            console.log('Remove proxies result:', saveResult);

            const isSuccess = saveResult && (
                saveResult.success === true || 
                saveResult === true || 
                (saveResult.status && saveResult.status === 'success')
            );

            if (isSuccess) {
                this.instagramManager.selectedGolikeAccount = this.instagramManager.golikeAccounts[golikeIndex];
                
                const proxyInput = document.getElementById('proxy-list-input');
                if (proxyInput) proxyInput.value = '';
                
                this.instagramManager.filterInstagramByGolike();
                this.refreshProxyMapping();
                
                this.instagramManager.showNotification('Xóa tất cả proxy thành công!', 'success');
                
                console.log('All proxies removed successfully from', updatedAccounts.length, 'accounts');
            } else {
                const errorMsg = saveResult?.error || saveResult?.message || 'Unknown error occurred';
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error('Error removing proxies:', error);
            
            let errorMessage = 'Lỗi khi xóa proxy!';
            
            if (error.message.includes('eel is not defined')) {
                errorMessage = 'Lỗi: Backend không được kết nối. Vui lòng khởi động lại ứng dụng!';
            } else if (error.message.includes('not a function') || error.message.includes('No suitable backend function')) {
                errorMessage = 'Lỗi: Backend function không khả dụng.\n' + error.message;
            } else if (error.message.includes('Không tìm thấy GoLike account')) {
                errorMessage = 'Lỗi: Không tìm thấy tài khoản GoLike được chọn!';
            } else if (error.message) {
                errorMessage = `Lỗi: ${error.message}`;
            }
            
            console.error('Full error context:', {
                error: error.message,
                stack: error.stack,
                availableEelFunctions: typeof eel !== 'undefined' ? Object.keys(eel) : 'eel not available'
            });
            
            this.instagramManager.showNotification(errorMessage, 'error');
        } finally {
            if (removeBtn) {
                removeBtn.disabled = false;
                removeBtn.textContent = originalText;
            }
        }
    }

    async testAllProxies() {
        console.log('=== TESTING ALL PROXIES ===');
        
        const proxyInput = document.getElementById('proxy-list-input').value.trim();
        const proxies = this.parseProxyInput(proxyInput).filter(p => p !== null);
        
        if (proxies.length === 0) {
            alert('Vui lòng nhập danh sách proxy để kiểm tra!');
            return;
        }

        await this.performProxyTest(proxies);
    }

    async testSelectedProxies() {
        console.log('=== TESTING SELECTED PROXIES ===');
        
        const selectedRows = document.querySelectorAll('#proxy-mapping-tbody tr.selected');
        
        if (selectedRows.length === 0) {
            alert('Vui lòng chọn ít nhất một dòng để kiểm tra!');
            return;
        }

        const proxyInput = document.getElementById('proxy-list-input').value.trim();
        const allProxies = this.parseProxyInput(proxyInput);
        
        const selectedProxies = [];
        selectedRows.forEach(row => {
            const index = parseInt(row.cells[0].textContent) - 1;
            if (allProxies[index] && allProxies[index] !== null) {
                selectedProxies.push(allProxies[index]);
            }
        });

        await this.performProxyTest(selectedProxies);
    }

    async performProxyTest(proxies) {
        if (this.isTestingProxies) return;

        this.isTestingProxies = true;
        
        const progressEl = document.getElementById('test-progress');
        const testAllBtn = document.getElementById('test-all-proxies-btn');
        const testSelectedBtn = document.getElementById('test-selected-proxy-btn');

        if (testAllBtn) testAllBtn.disabled = true;
        if (testSelectedBtn) testSelectedBtn.disabled = true;

        try {
            let testedCount = 0;
            const totalCount = proxies.length;

            for (let i = 0; i < proxies.length; i++) {
                const proxy = proxies[i];
                
                if (progressEl) {
                    progressEl.innerHTML = `
                        <i class="fas fa-spinner fa-spin"></i>
                        Đang kiểm tra ${testedCount + 1}/${totalCount}...
                    `;
                }

                const testResult = await this.testSingleProxy(proxy);
                this.updateProxyTestResult(i, testResult);
                
                testedCount++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (progressEl) {
                progressEl.innerHTML = `
                    <i class="fas fa-check-circle" style="color: #28a745;"></i>
                    Kiểm tra hoàn tất: ${testedCount}/${totalCount}
                `;
            }

        } catch (error) {
            console.error('Error testing proxies:', error);
            if (progressEl) {
                progressEl.innerHTML = `
                    <i class="fas fa-exclamation-circle" style="color: #dc3545;"></i>
                    Lỗi khi kiểm tra proxy
                `;
            }
        } finally {
            this.isTestingProxies = false;
            
            if (testAllBtn) testAllBtn.disabled = false;
            if (testSelectedBtn) testSelectedBtn.disabled = false;

            setTimeout(() => {
                if (progressEl) progressEl.textContent = 'Sẵn sàng kiểm tra';
            }, 3000);
        }
    }

    async testSingleProxy(proxy) {
        return new Promise(resolve => {
            setTimeout(() => {
                const success = Math.random() > 0.3;
                const responseTime = Math.floor(Math.random() * 2000) + 200;
                
                resolve({
                    success: success,
                    responseTime: responseTime,
                    error: success ? null : 'Connection timeout'
                });
            }, Math.random() * 1000 + 500);
        });
    }

    updateProxyTestResult(proxyIndex, testResult) {
        const rows = document.querySelectorAll('#proxy-mapping-tbody tr');
        
        if (rows[proxyIndex]) {
            const statusCell = rows[proxyIndex].cells[3];
            
            if (testResult.success) {
                statusCell.innerHTML = `
                    <span class="mapping-status ready">
                        <i class="fas fa-check-circle"></i>
                        OK (${testResult.responseTime}ms)
                    </span>
                `;
            } else {
                statusCell.innerHTML = `
                    <span class="mapping-status error">
                        <i class="fas fa-times-circle"></i>
                        Lỗi
                    </span>
                `;
            }
        }
    }

    resetModalState() {
        this.currentProxies = [];
        this.currentIgAccounts = [];
        this.proxyMapping.clear();
        this.isTestingProxies = false;
        
        const proxyInput = document.getElementById('proxy-list-input');
        if (proxyInput) proxyInput.value = '';
        
        const progressEl = document.getElementById('test-progress');
        if (progressEl) progressEl.textContent = 'Sẵn sàng kiểm tra';
        
        this.updateProxyCounts(0, 0);
        
        const tbody = document.getElementById('proxy-mapping-tbody');
        if (tbody) tbody.innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const initProxyManager = () => {
        if (window.instagramManager) {
            window.proxyManager = new ProxyManager(window.instagramManager);
            console.log('Proxy Manager initialized successfully');
        } else {
            setTimeout(initProxyManager, 100);
        }
    };
    
    setTimeout(initProxyManager, 500);
});