class AdminDashboard {
    constructor() {
        this.socket = null;
        this.currentView = 'dashboard';
        this.agentId = 'agent_' + Math.random().toString(36).substr(2, 9);
        this.currentConversation = null;
        this.conversations = [];
        this.products = [];
        
        this.init();
    }

    init() {
        this.connectSocket();
        this.setupEventListeners();
        this.loadDashboardData();
        this.setupNavigation();
    }

    connectSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to admin dashboard');
            this.socket.emit('join_admin', { agentId: this.agentId });
        });

        this.socket.on('admin_joined', (data) => {
            console.log('Admin joined:', data);
        });

        this.socket.on('conversation_update', (data) => {
            this.handleConversationUpdate(data);
        });

        this.socket.on('new_message', (data) => {
            this.handleNewMessage(data);
        });

        this.socket.on('message_received', (message) => {
            if (this.currentConversation && this.currentConversation.id === message.conversationId) {
                this.displayMessageInModal(message);
            }
        });
    }

    setupEventListeners() {
        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.switchView(view);
            });
        });
        
        // Don't call settings methods here - let settings.js own the tab UI
        // this.setupSettingsTabs();
        // this.setupSettingsHandlers();

        // Search and filters
        document.getElementById('search-input')?.addEventListener('input', 
            this.debounce(() => this.loadConversations(), 500));
        
        document.getElementById('status-filter')?.addEventListener('change', 
            () => this.loadConversations());

        // Product form
        document.getElementById('product-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });
    }

    setupNavigation() {
        // Set up view switching
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                
                // Update active nav item
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Switch view
                this.switchView(view);
            });
        });
    }

    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.style.display = 'none';
        });

        // Show selected view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.style.display = 'block';
        }

        this.currentView = viewName;

        // Load data for specific views
        switch (viewName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'conversations':
                this.loadConversations();
                break;
            case 'products':
                this.loadProducts();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    async loadDashboardData() {
        try {
            const response = await fetch('/api/admin/dashboard');
            const data = await response.json();

            // Update stats
            document.getElementById('total-conversations').textContent = data.stats.totalConversations;
            document.getElementById('live-conversations').textContent = data.stats.liveConversations;
            document.getElementById('ai-active').textContent = data.stats.aiActiveCount;
            document.getElementById('agent-takeover').textContent = data.stats.agentTakeoverCount;
            document.getElementById('live-count').textContent = data.stats.liveConversations;

            // Update live conversations list
            this.displayLiveConversations(data.recentLive);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    displayLiveConversations(conversations) {
        const container = document.getElementById('live-conversations-list');
        
        if (conversations.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No live conversations</div>';
            return;
        }

        container.innerHTML = conversations.map(conv => `
            <div class="conversation-item" onclick="adminDashboard.openConversation('${conv.id}')">
                <div class="conversation-info">
                    <div class="customer-name">${conv.customerInfo.name || 'Anonymous'}</div>
                    <div class="conversation-meta">
                        <span>Email: ${conv.customerInfo.email || 'Not provided'}</span>
                        <span>Last: ${this.formatTime(conv.updatedAt)}</span>
                    </div>
                </div>
                <div class="conversation-status status-${conv.status}">${conv.status.replace('_', ' ')}</div>
            </div>
        `).join('');
    }

    async loadConversations(page = 1) {
        try {
            const searchTerm = document.getElementById('search-input')?.value || '';
            const statusFilter = document.getElementById('status-filter')?.value || '';
            
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });
            
            if (searchTerm) params.append('search', searchTerm);
            if (statusFilter) params.append('status', statusFilter);

            const response = await fetch(`/api/admin/conversations?${params}`);
            const data = await response.json();

            this.conversations = data.conversations;
            this.displayConversationsTable(data.conversations);
            this.displayPagination(data.pagination, 'conversations');

        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    displayConversationsTable(conversations) {
        const tbody = document.getElementById('conversations-tbody');
        
        if (conversations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No conversations found</td></tr>';
            return;
        }

        tbody.innerHTML = conversations.map(conv => `
            <tr>
                <td>
                    <div><strong>${conv.customerInfo.name || 'Anonymous'}</strong></div>
                    <div style="font-size: 12px; color: #666;">${conv.customerInfo.email || 'No email'}</div>
                </td>
                <td><span class="conversation-status status-${conv.status}">${conv.status.replace('_', ' ')}</span></td>
                <td>${conv.messageCount}</td>
                <td>${conv.agentId || '-'}</td>
                <td>${this.formatTime(conv.updatedAt)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="adminDashboard.openConversation('${conv.id}')">View</button>
                    ${conv.status === 'ai_active' ? 
                        `<button class="btn btn-sm btn-success" onclick="adminDashboard.quickTakeover('${conv.id}')">Take Over</button>` : 
                        ''
                    }
                </td>
            </tr>
        `).join('');
    }

    async openConversation(conversationId) {
        try {
            const response = await fetch(`/api/admin/conversations/${conversationId}`);
            const conversation = await response.json();

            this.currentConversation = conversation;
            
            // Update modal
            document.getElementById('chat-modal-title').textContent = 
                `${conversation.customerInfo.name || 'Anonymous'} - ${conversation.status}`;
            
            // Show/hide takeover button
            const takeoverBtn = document.getElementById('takeover-btn');
            if (conversation.status === 'ai_active') {
                takeoverBtn.style.display = 'block';
                takeoverBtn.textContent = 'Take Over';
            } else if (conversation.status === 'agent_takeover' && conversation.agentId === this.agentId) {
                takeoverBtn.style.display = 'none';
                document.getElementById('agent-input-container').style.display = 'flex';
            } else {
                takeoverBtn.style.display = 'none';
            }

            // Display messages
            this.displayConversationMessages(conversation.messages);
            
            // Show modal
            document.getElementById('chat-modal').classList.add('active');

        } catch (error) {
            console.error('Error opening conversation:', error);
        }
    }

    displayConversationMessages(messages) {
        const container = document.getElementById('modal-messages');
        
        container.innerHTML = messages.map(msg => `
            <div class="message ${msg.sender}">
                <div class="message-bubble">${this.escapeHtml(msg.content)}</div>
                <div class="message-meta">
                    <span class="sender-label sender-${msg.sender}">${msg.sender}</span>
                    <span>${this.formatTime(msg.timestamp)}</span>
                    ${msg.agentId ? `<span>Agent: ${msg.agentId}</span>` : ''}
                </div>
            </div>
        `).join('');

        container.scrollTop = container.scrollHeight;
    }

    displayMessageInModal(message) {
        const container = document.getElementById('modal-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender}`;
        messageDiv.innerHTML = `
            <div class="message-bubble">${this.escapeHtml(message.content)}</div>
            <div class="message-meta">
                <span class="sender-label sender-${message.sender}">${message.sender}</span>
                <span>${this.formatTime(message.timestamp)}</span>
                ${message.agentId ? `<span>Agent: ${message.agentId}</span>` : ''}
            </div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    async takeoverConversation() {
        if (!this.currentConversation) return;

        try {
            this.socket.emit('takeover_conversation', {
                conversationId: this.currentConversation.id,
                agentId: this.agentId
            });

            // Update UI
            document.getElementById('takeover-btn').style.display = 'none';
            document.getElementById('agent-input-container').style.display = 'flex';
            
            // Update conversation status
            this.currentConversation.status = 'agent_takeover';
            this.currentConversation.agentId = this.agentId;

        } catch (error) {
            console.error('Error taking over conversation:', error);
        }
    }

    async quickTakeover(conversationId) {
        try {
            this.socket.emit('takeover_conversation', {
                conversationId,
                agentId: this.agentId
            });

            // Refresh conversations list
            this.loadConversations();

        } catch (error) {
            console.error('Error taking over conversation:', error);
        }
    }

    sendAgentMessage() {
        const input = document.getElementById('agent-message-input');
        const message = input.value.trim();
        
        if (!message || !this.currentConversation) return;

        this.socket.emit('agent_message', {
            conversationId: this.currentConversation.id,
            content: message,
            agentId: this.agentId
        });

        input.value = '';
    }

    closeChatModal() {
        document.getElementById('chat-modal').classList.remove('active');
        this.currentConversation = null;
        document.getElementById('agent-input-container').style.display = 'none';
    }

    async loadProducts(page = 1) {
        try {
            const response = await fetch(`/api/admin/products?page=${page}&limit=20`);
            const data = await response.json();

            this.products = data.products;
            this.displayProductsGrid(data.products);
            this.displayPagination(data.pagination, 'products');

        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    displayProductsGrid(products) {
        const container = document.getElementById('products-grid');
        
        if (products.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #666; grid-column: 1/-1;">No products found</div>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-header">
                    <div class="product-name">${this.escapeHtml(product.name)}</div>
                    <div class="product-price">$${product.price}</div>
                </div>
                <div class="product-body">
                    <div class="product-description">${this.escapeHtml(product.description)}</div>
                    <div class="product-category">${this.escapeHtml(product.category)}</div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-sm btn-secondary" onclick="adminDashboard.editProduct('${product.id}')">Edit</button>
                    <button class="btn btn-sm btn-secondary" onclick="adminDashboard.deleteProduct('${product.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    showProductModal(productId = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        
        if (productId) {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                title.textContent = 'Edit Product';
                this.populateProductForm(product);
            }
        } else {
            title.textContent = 'Add Product';
            this.clearProductForm();
        }
        
        modal.classList.add('active');
    }

    populateProductForm(product) {
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-description').value = product.description;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-ai-context').value = product.aiContext;
    }

    clearProductForm() {
        document.getElementById('product-form').reset();
    }

    async saveProduct() {
        const formData = {
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-description').value,
            price: parseFloat(document.getElementById('product-price').value),
            category: document.getElementById('product-category').value,
            aiContext: document.getElementById('product-ai-context').value
        };

        try {
            const response = await fetch('/api/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.closeProductModal();
                this.loadProducts();
            } else {
                console.error('Error saving product');
            }
        } catch (error) {
            console.error('Error saving product:', error);
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const response = await fetch(`/api/admin/products/${productId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.loadProducts();
            } else {
                console.error('Error deleting product');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    }

    editProduct(productId) {
        this.showProductModal(productId);
    }

    closeProductModal() {
        document.getElementById('product-modal').classList.remove('active');
    }

    async loadAnalytics() {
        // Placeholder for analytics functionality
        console.log('Loading analytics...');
    }

    displayPagination(pagination, type) {
        const container = document.getElementById(`${type}-pagination`);
        if (!container) return;

        const { page, pages, total } = pagination;
        let paginationHTML = '';

        // Previous button
        paginationHTML += `<button ${page <= 1 ? 'disabled' : ''} onclick="adminDashboard.changePage(${page - 1}, '${type}')">Previous</button>`;

        // Page numbers
        for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
            paginationHTML += `<button class="${i === page ? 'active' : ''}" onclick="adminDashboard.changePage(${i}, '${type}')">${i}</button>`;
        }

        // Next button
        paginationHTML += `<button ${page >= pages ? 'disabled' : ''} onclick="adminDashboard.changePage(${page + 1}, '${type}')">Next</button>`;

        container.innerHTML = paginationHTML;
    }

    changePage(page, type) {
        if (type === 'conversations') {
            this.loadConversations(page);
        } else if (type === 'products') {
            this.loadProducts(page);
        }
    }

    handleConversationUpdate(data) {
        // Update live count
        this.loadDashboardData();
        
        // Refresh current view if needed
        if (this.currentView === 'conversations') {
            this.loadConversations();
        }
    }

    handleNewMessage(data) {
        // Update dashboard if on dashboard view
        if (this.currentView === 'dashboard') {
            this.loadDashboardData();
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Settings Management Methods
    setupSettingsTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchSettingsTab(tabName);
            });
        });
        
        // Temperature slider handler
        const tempSlider = document.getElementById('ai-temperature');
        if (tempSlider) {
            tempSlider.addEventListener('input', (e) => {
                document.getElementById('temperature-value').textContent = e.target.value;
            });
        }
    }

    setupSettingsHandlers() {
        // Settings handlers are set up in settings.js
    }

    switchSettingsTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            const settings = await response.json();
            
            // Populate form fields with current settings
            settings.forEach(setting => {
                const element = document.getElementById(setting.key.replace('_', '-'));
                if (element) {
                    if (element.type === 'range') {
                        element.value = setting.value;
                        if (setting.key === 'ai_temperature') {
                            document.getElementById('temperature-value').textContent = setting.value;
                        }
                    } else {
                        element.value = setting.value;
                    }
                }
            });
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showSettingsMessage('Error loading settings', 'error');
        }
    }

    showSettingsMessage(message, type) {
        let messageDiv = document.querySelector('.settings-message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.className = 'settings-message';
            const settingsContent = document.querySelector('.settings-content');
            if (settingsContent) {
                settingsContent.insertBefore(messageDiv, settingsContent.firstChild);
            }
        }
        
        messageDiv.textContent = message;
        messageDiv.className = `settings-message ${type}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Global functions for onclick handlers
function showProductModal() {
    adminDashboard.showProductModal();
}

function closeProductModal() {
    adminDashboard.closeProductModal();
}

function closeChatModal() {
    adminDashboard.closeChatModal();
}

function takeoverConversation() {
    adminDashboard.takeoverConversation();
}

function sendAgentMessage() {
    adminDashboard.sendAgentMessage();
}

function updateAnalytics() {
    adminDashboard.loadAnalytics();
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

// Handle Enter key in agent message input
document.addEventListener('keypress', (e) => {
    if (e.target.id === 'agent-message-input' && e.key === 'Enter') {
        sendAgentMessage();
    }
});
