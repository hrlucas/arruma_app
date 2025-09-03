/**
 * ArrumaAí — Plataforma de Serviços Profissional
 * Sistema de roteamento e gerenciamento de estado
 */

class ArrumaAiApp {
    constructor() {
        this.currentUser = null;
        this.currentScreen = 'loading';
        this.screenHistory = [];
        this.isAuthenticated = false;
        
        // Dados da aplicação
        this.data = {
            users: this.loadFromStorage('users') || [],
            services: this.loadFromStorage('services') || this.getDefaultServices(),
            providers: this.loadFromStorage('providers') || this.getDefaultProviders(),
            clients: this.loadFromStorage('clients') || [],
            auctions: this.loadFromStorage('auctions') || this.getDefaultAuctions(),
            calls: this.loadFromStorage('calls') || this.getDefaultCalls(),
            transactions: this.loadFromStorage('transactions') || [],
            pendingDocs: this.loadFromStorage('pendingDocs') || [],
            chats: this.loadFromStorage('chats') || this.getDefaultChats()
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.checkAuthentication();
        this.startLoadingScreen();
    }
    
    // Sistema de Roteamento
    navigateTo(screen, data = {}) {
        console.log('Navegando para:', screen, data); // Debug
        
        // Salvar tela atual no histórico
        if (this.currentScreen !== 'loading') {
            this.screenHistory.push({
                screen: this.currentScreen,
                data: this.currentScreenData || {}
            });
        }
        
        this.currentScreen = screen;
        this.currentScreenData = data;
        
        // Esconder todas as telas
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
        });
        
        // Mostrar tela desejada
        const targetScreen = document.getElementById(screen);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.renderScreen(screen, data);
        } else {
            // Se a tela não existe, criar dinamicamente
            this.renderScreen(screen, data);
        }
        
        // Atualizar navegação
        this.updateNavigation();
        
        // Scroll para o topo
        window.scrollTo(0, 0);
    }
    
    goBack() {
        if (this.screenHistory.length > 0) {
            const previous = this.screenHistory.pop();
            this.navigateTo(previous.screen, previous.data);
        } else {
            this.navigateTo('welcome-screen');
        }
    }
    
    // Renderização de Telas
    renderScreen(screen, data = {}) {
        switch (screen) {
            case 'welcome-screen':
                this.renderWelcomeScreen();
                break;
            case 'auth-screen':
                this.renderAuthScreen(data.role);
                break;
            case 'client-dashboard':
                this.renderClientDashboard();
                break;
            case 'provider-dashboard':
                this.renderProviderDashboard();
                break;
            case 'admin-dashboard':
                this.renderAdminDashboard();
                break;
            case 'services-list-screen':
                this.renderServicesList(data.category);
                break;
            case 'service-detail-screen':
                this.renderServiceDetail(data.serviceId);
                break;
            case 'profile-screen':
                this.renderProfileScreen();
                break;
            case 'chat-screen':
                this.renderChatScreen(data.chatId);
                break;
            case 'services':
                this.renderServicesTab();
                break;
            case 'auctions':
                this.renderAuctionsTab();
                break;
            case 'chat':
                this.renderChatTab();
                break;
            case 'profile':
                this.renderProfileTab();
                break;
        }
    }
    
    // Tela de Boas-vindas
    renderWelcomeScreen() {
        // Bind eventos dos cards de role
        document.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const role = card.dataset.role;
                this.navigateTo('auth-screen', { role });
            });
        });
    }
    
    // Tela de Autenticação
    renderAuthScreen(role) {
        const authTitle = document.getElementById('auth-title');
        const providerFields = document.querySelectorAll('.provider-only');
        
        // Configurar título baseado no role
        if (role === 'provider') {
            authTitle.textContent = 'Prestador de Serviços';
            providerFields.forEach(field => field.style.display = 'block');
        } else if (role === 'client') {
            authTitle.textContent = 'Cliente';
            providerFields.forEach(field => field.style.display = 'none');
        } else if (role === 'admin') {
            authTitle.textContent = 'Administrador';
            providerFields.forEach(field => field.style.display = 'none');
        }
        
        // Bind eventos das abas
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                this.switchAuthTab(targetTab);
            });
        });
        
        // Bind eventos dos formulários
        this.bindAuthForms(role);
        
        // Bind evento do botão voltar
        document.getElementById('auth-back').addEventListener('click', () => {
            this.goBack();
        });
    }
    
    switchAuthTab(tab) {
        // Atualizar abas ativas
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Atualizar formulários ativos
        document.querySelectorAll('.auth-form').forEach(f => {
            f.classList.remove('active');
        });
        document.getElementById(`${tab}-form`).classList.add('active');
        
        // Atualizar título
        const authTitle = document.getElementById('auth-title');
        authTitle.textContent = tab === 'login' ? 'Entrar' : 'Cadastrar';
    }
    
    bindAuthForms(role) {
        // Login form
        const loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(role);
        });
        
        // Register form
        const registerForm = document.getElementById('register-form');
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister(role);
        });
        
        // Password toggles
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const input = e.target.parentNode.querySelector('input');
                const icon = e.target;
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    input.type = 'password';
                    icon.innerHTML = '<i class="fas fa-eye"></i>';
                }
            });
        });
        
        // Input masks
        this.setupInputMasks();
    }
    
    setupInputMasks() {
        // CPF mask
        const cpfInput = document.getElementById('register-cpf');
        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                e.target.value = value;
            });
        }
        
        // Phone mask
        const phoneInput = document.getElementById('register-phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 10) {
                    value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                } else {
                    value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
                }
                e.target.value = value;
            });
        }
    }
    
    // Autenticação
    async handleLogin(role) {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        
        try {
            // Simular validação
            if (!email || !password) {
                this.showToast('Por favor, preencha todos os campos', 'error');
                return;
            }
            
            // Simular login (em produção, seria uma chamada para API)
            const user = this.authenticateUser(email, password, role);
            
            if (user) {
                this.currentUser = user;
                this.isAuthenticated = true;
                
                if (rememberMe) {
                    localStorage.setItem('rememberedUser', JSON.stringify(user));
                }
                
                this.showToast('Login realizado com sucesso!', 'success');
                
                // Navegar para dashboard apropriado
                setTimeout(() => {
                    this.navigateToDashboard(role);
                }, 1000);
            } else {
                this.showToast('Credenciais inválidas', 'error');
            }
        } catch (error) {
            this.showToast('Erro ao fazer login', 'error');
        }
    }
    
    async handleRegister(role) {
        const formData = new FormData(document.getElementById('register-form'));
        const userData = Object.fromEntries(formData.entries());
        
        try {
            // Validações
            if (!this.validateRegistration(userData)) {
                return;
            }
            
            // Criar usuário
            const newUser = this.createUser(userData, role);
            
            if (newUser) {
                this.currentUser = newUser;
                this.isAuthenticated = true;
                
                this.showToast('Conta criada com sucesso!', 'success');
                
                // Navegar para dashboard
                setTimeout(() => {
                    this.navigateToDashboard(role);
                }, 1000);
            }
        } catch (error) {
            this.showToast('Erro ao criar conta', 'error');
        }
    }
    
    validateRegistration(userData) {
        const requiredFields = ['name', 'email', 'phone', 'cpf', 'region', 'password', 'confirm-password'];
        
        for (const field of requiredFields) {
            if (!userData[field]) {
                this.showToast(`Campo ${field} é obrigatório`, 'error');
                return false;
            }
        }
        
        if (userData.password !== userData['confirm-password']) {
            this.showToast('Senhas não coincidem', 'error');
            return false;
        }
        
        if (userData.password.length < 6) {
            this.showToast('Senha deve ter pelo menos 6 caracteres', 'error');
            return false;
        }
        
        return true;
    }
    
    // Dashboard do Cliente
    renderClientDashboard() {
        this.loadFeaturedServices();
        this.loadRecentActivity();
        this.bindClientDashboardEvents();
    }
    
    loadFeaturedServices() {
        const featuredContainer = document.getElementById('featured-services');
        const featuredServices = this.data.services.filter(s => s.featured).slice(0, 3);
        
        featuredContainer.innerHTML = featuredServices.map(service => `
            <div class="service-card" data-service-id="${service.id}">
                <div class="service-header">
                    <div class="service-icon">${service.icon}</div>
                    <div class="service-info">
                        <strong>${service.name}</strong>
                        <div class="rating">${'★'.repeat(Math.floor(service.rating))}${'☆'.repeat(5 - Math.floor(service.rating))} ${service.rating}</div>
                    </div>
                    <button class="btn-primary btn-small">Solicitar</button>
                </div>
                <p class="service-description">${service.description}</p>
                <div class="service-footer">
                    <span class="price">A partir de R$ ${service.price}</span>
                    ${service.discount ? `<span class="badge yellow">${service.discount}% OFF</span>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    loadRecentActivity() {
        const activityContainer = document.getElementById('recent-activity');
        const recentActivity = this.data.transactions
            .filter(t => t.userId === this.currentUser?.id)
            .slice(0, 5);
        
        if (recentActivity.length === 0) {
            activityContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>Nenhuma atividade recente</p>
                </div>
            `;
            return;
        }
        
        activityContainer.innerHTML = recentActivity.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-info">
                    <strong>${activity.description}</strong>
                    <span>${new Date(activity.timestamp).toLocaleDateString()}</span>
                </div>
                <div class="activity-amount">
                    R$ ${activity.amount}
                </div>
            </div>
        `).join('');
    }
    
    bindClientDashboardEvents() {
        // Categorias
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.navigateTo('services-list-screen', { category });
            });
        });
        
        // Serviços em destaque
        document.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const serviceId = e.currentTarget.dataset.serviceId;
                this.navigateTo('service-detail-screen', { serviceId });
            });
        });
        
        // Busca
        const searchInput = document.querySelector('.search-input');
        const searchBtn = document.querySelector('.search-btn');
        
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                this.navigateTo('services-list-screen', { search: query });
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }
    
    // Dashboard do Prestador
    renderProviderDashboard() {
        this.loadProviderStats();
        this.loadActiveCalls();
        this.loadAvailableAuctions();
        this.bindProviderDashboardEvents();
    }
    
    loadProviderStats() {
        const callsCount = this.data.calls.filter(c => c.providerId === this.currentUser?.id).length;
        const earnings = this.data.transactions
            .filter(t => t.providerId === this.currentUser?.id && t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);
        const rating = this.currentUser?.rating || 4.5;
        
        document.getElementById('provider-calls').textContent = callsCount;
        document.getElementById('provider-earnings').textContent = `R$ ${earnings.toFixed(2)}`;
        document.getElementById('provider-rating').textContent = rating.toFixed(1);
    }
    
    loadActiveCalls() {
        const callsContainer = document.getElementById('active-calls');
        const activeCalls = this.data.calls.filter(c => c.providerId === this.currentUser?.id && c.status === 'active');
        
        if (activeCalls.length === 0) {
            callsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-phone"></i>
                    <p>Nenhum chamado ativo</p>
                </div>
            `;
            return;
        }
        
        callsContainer.innerHTML = activeCalls.map(call => `
            <div class="call-item" data-call-id="${call.id}">
                <div class="call-info">
                    <strong>${call.title}</strong>
                    <span>${call.clientName} • ${call.region}</span>
                    <span>R$ ${call.price}</span>
                </div>
                <div class="call-actions">
                    <button class="btn-primary btn-small">Aceitar</button>
                    <button class="btn-ghost btn-small">Recusar</button>
                </div>
            </div>
        `).join('');
    }
    
    loadAvailableAuctions() {
        const auctionsContainer = document.getElementById('available-auctions');
        const availableAuctions = this.data.auctions.filter(a => a.status === 'open');
        
        if (availableAuctions.length === 0) {
            auctionsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-gavel"></i>
                    <p>Nenhum leilão disponível</p>
                </div>
            `;
            return;
        }
        
        auctionsContainer.innerHTML = availableAuctions.map(auction => `
            <div class="auction-item" data-auction-id="${auction.id}">
                <div class="auction-info">
                    <strong>${auction.title}</strong>
                    <span>${auction.region} • Orçamento: R$ ${auction.budget}</span>
                    <span>Encerra em: ${this.formatTimeRemaining(auction.endsAt)}</span>
                </div>
                <div class="auction-actions">
                    <button class="btn-primary btn-small">Fazer Proposta</button>
                </div>
            </div>
        `).join('');
    }
    
    bindProviderDashboardEvents() {
        // Botão refresh
        document.querySelector('.btn-refresh').addEventListener('click', () => {
            this.renderProviderDashboard();
            this.showToast('Dados atualizados', 'success');
        });
        
        // Chamados
        document.querySelectorAll('.call-item').forEach(item => {
            const acceptBtn = item.querySelector('.btn-primary');
            const rejectBtn = item.querySelector('.btn-ghost');
            
            acceptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const callId = item.dataset.callId;
                this.acceptCall(callId);
            });
            
            rejectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const callId = item.dataset.callId;
                this.rejectCall(callId);
            });
        });
        
        // Leilões
        document.querySelectorAll('.auction-item').forEach(item => {
            const bidBtn = item.querySelector('.btn-primary');
            
            bidBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const auctionId = item.dataset.auctionId;
                this.openBidModal(auctionId);
            });
        });
    }
    
    // Dashboard do Administrador
    renderAdminDashboard() {
        this.loadAdminStats();
        this.loadAdminActivity();
        this.bindAdminDashboardEvents();
    }
    
    loadAdminStats() {
        const totalUsers = this.data.users.length;
        const verifiedUsers = this.data.users.filter(u => u.verified).length;
        const pendingUsers = this.data.pendingDocs.length;
        const totalRevenue = this.data.transactions
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + (t.amount * 0.15), 0);
        
        document.getElementById('total-users').textContent = totalUsers;
        document.getElementById('verified-users').textContent = verifiedUsers;
        document.getElementById('pending-users').textContent = pendingUsers;
        document.getElementById('total-revenue').textContent = `R$ ${totalRevenue.toFixed(2)}`;
    }
    
    loadAdminActivity() {
        const activityContainer = document.getElementById('admin-activity');
        const recentActivity = this.data.transactions
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
        
        if (recentActivity.length === 0) {
            activityContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <p>Nenhuma atividade recente</p>
                </div>
            `;
            return;
        }
        
        activityContainer.innerHTML = recentActivity.map(activity => `
            <div class="admin-activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-info">
                    <strong>${activity.description}</strong>
                    <span>${new Date(activity.timestamp).toLocaleDateString()}</span>
                </div>
                <div class="activity-status ${activity.status}">
                    ${activity.status}
                </div>
            </div>
        `).join('');
    }
    
    bindAdminDashboardEvents() {
        // Botões de ação administrativa
        document.querySelectorAll('.admin-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAdminAction(action);
            });
        });
    }
    
    // Navegação
    updateNavigation() {
        const nav = document.getElementById('app-navigation');
        
        if (!this.isAuthenticated) {
            nav.style.display = 'none';
            return;
        }
        
        nav.style.display = 'flex';
        
        // Atualizar item ativo
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-screen="${this.currentScreen}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        // Bind eventos de navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const targetScreen = e.currentTarget.dataset.screen;
                this.navigateTo(targetScreen);
            });
        });
    }
    
    navigateToDashboard(role) {
        // Esconder todas as telas
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Mostrar dashboard apropriado
        let dashboardScreen;
        switch (role) {
            case 'client':
                dashboardScreen = 'client-dashboard';
                break;
            case 'provider':
                dashboardScreen = 'provider-dashboard';
                break;
            case 'admin':
                dashboardScreen = 'admin-dashboard';
                break;
            default:
                dashboardScreen = 'client-dashboard';
        }
        
        const dashboard = document.getElementById(dashboardScreen);
        if (dashboard) {
            dashboard.classList.add('active');
            this.currentScreen = dashboardScreen;
            this.renderScreen(dashboardScreen);
        }
        
        // Mostrar navegação
        this.updateNavigation();
    }
    
    // Eventos Globais
    bindEvents() {
        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
        
        // Botões voltar
        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', () => {
                this.goBack();
            });
        });
        
        // Navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const targetScreen = e.currentTarget.dataset.screen;
                this.navigateTo(targetScreen);
            });
        });
    }
    
    // Autenticação e Sessão
    checkAuthentication() {
        const rememberedUser = localStorage.getItem('rememberedUser');
        const currentUser = localStorage.getItem('currentUser');
        
        if (currentUser) {
            this.currentUser = JSON.parse(currentUser);
            this.isAuthenticated = true;
            this.navigateToDashboard(this.currentUser.role);
        } else if (rememberedUser) {
            this.currentUser = JSON.parse(rememberedUser);
            this.isAuthenticated = true;
            this.navigateToDashboard(this.currentUser.role);
        } else {
            setTimeout(() => {
                this.navigateTo('welcome-screen');
            }, 2000);
        }
    }
    
    logout() {
        if (confirm('Deseja sair da aplicação?')) {
            this.currentUser = null;
            this.isAuthenticated = false;
            localStorage.removeItem('currentUser');
            localStorage.removeItem('rememberedUser');
            
            this.showToast('Logout realizado com sucesso', 'success');
            this.navigateTo('welcome-screen');
        }
    }
    
    // Utilitários
    startLoadingScreen() {
        setTimeout(() => {
            if (this.currentScreen === 'loading') {
                this.checkAuthentication();
            }
        }, 2000);
    }
    
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getToastIcon(type);
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    getToastIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
    
    getActivityIcon(type) {
        switch (type) {
            case 'service': return 'tools';
            case 'payment': return 'credit-card';
            case 'auction': return 'gavel';
            case 'chat': return 'comments';
            default: return 'circle';
        }
    }
    
    formatTimeRemaining(timestamp) {
        const now = Date.now();
        const diff = timestamp - now;
        
        if (diff <= 0) return 'Encerrado';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}m`;
    }
    
    // Dados Mock
    getDefaultServices() {
        return [
            {
                id: 'limpeza-residencial',
                name: 'Limpeza Residencial',
                description: 'Limpeza completa da sua residência com produtos de qualidade.',
                price: 120,
                rating: 4.2,
                icon: '🧹',
                category: 'limpeza',
                featured: true,
                discount: 10
            },
            {
                id: 'pintura-residencial',
                name: 'Pintura Residencial',
                description: 'Pintura interna ou externa da sua casa.',
                price: 35,
                rating: 4.7,
                icon: '🎨',
                category: 'pintura',
                featured: true,
                priceType: 'por m²'
            },
            {
                id: 'desentupimento',
                name: 'Desentupimento',
                description: 'Desentupimento de pias, ralos e vasos sanitários.',
                price: 150,
                rating: 4.3,
                icon: '🚰',
                category: 'encanamento',
                featured: true,
                emergency: true
            },
            {
                id: 'instalacao-eletrica',
                name: 'Instalação Elétrica',
                description: 'Instalação e manutenção elétrica residencial.',
                price: 80,
                rating: 4.8,
                icon: '🔌',
                category: 'eletricista',
                priceType: 'por hora'
            },
            {
                id: 'manutencao-geral',
                name: 'Manutenção Geral',
                description: 'Serviços gerais de manutenção e reparos.',
                price: 100,
                rating: 4.5,
                icon: '🔧',
                category: 'manutencao',
                featured: false
            },
            {
                id: 'jardinagem',
                name: 'Jardinagem',
                description: 'Cuidados com jardim, poda e paisagismo.',
                price: 90,
                rating: 4.6,
                icon: '🌱',
                category: 'jardinagem',
                featured: false
            }
        ];
    }
    
    getDefaultProviders() {
        return [
            {
                id: 1,
                name: 'João Silva',
                service: 'Eletricista',
                region: 'Centro',
                rating: 4.9,
                price: 120,
                verified: true,
                badge: false
            },
            {
                id: 2,
                name: 'Maria P.',
                service: 'Pintora',
                region: 'Zona Sul',
                rating: 4.7,
                price: 180,
                verified: true,
                badge: false
            },
            {
                id: 3,
                name: 'Equipe Azul',
                service: 'Faz-tudo',
                region: 'Bairro Alto',
                rating: 5.0,
                price: 200,
                verified: true,
                badge: true
            }
        ];
    }
    
    getDefaultAuctions() {
        return [
            {
                id: 1,
                title: 'Pintura quarto 12m²',
                desc: 'Tinta lavável',
                region: 'Centro',
                budget: 250,
                proposals: [],
                status: 'open',
                endsAt: Date.now() + 60000
            },
            {
                id: 2,
                title: 'Instalação de tomadas',
                desc: '3 tomadas novas',
                region: 'Zona Sul',
                budget: 180,
                proposals: [],
                status: 'open',
                endsAt: Date.now() + 120000
            },
            {
                id: 3,
                title: 'Limpeza pós-obra',
                desc: 'Limpeza pesada',
                region: 'Zona Norte',
                budget: 300,
                proposals: [],
                status: 'closed',
                endsAt: Date.now() - 3600000
            }
        ];
    }
    
    getDefaultCalls() {
        return [
            {
                id: 1,
                title: 'Troca de tomada',
                desc: 'Tomada 3 pinos',
                region: 'Centro',
                price: 80,
                client: 'Ana',
                status: 'pending'
            },
            {
                id: 2,
                title: 'Pintura sala',
                desc: 'Pintura interna',
                region: 'Zona Sul',
                price: 200,
                client: 'Carlos',
                status: 'active'
            }
        ];
    }
    
    getDefaultChats() {
        return [
            {
                id: 1,
                participantName: 'João Silva',
                lastMessage: 'Olá! Posso ajudar com o serviço?',
                lastMessageTime: Date.now() - 300000,
                unreadCount: 2,
                status: 'active'
            },
            {
                id: 2,
                participantName: 'Maria P.',
                lastMessage: 'Orçamento enviado com sucesso',
                lastMessageTime: Date.now() - 600000,
                unreadCount: 0,
                status: 'active'
            },
            {
                id: 3,
                participantName: 'Equipe Azul',
                lastMessage: 'Serviço confirmado para amanhã',
                lastMessageTime: Date.now() - 900000,
                unreadCount: 1,
                status: 'active'
            }
        ];
    }
    
    // Persistência
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(`arrumaai_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Erro ao carregar ${key}:`, error);
            return null;
        }
    }
    
    saveToStorage(key, data) {
        try {
            localStorage.setItem(`arrumaai_${key}`, JSON.stringify(data));
        } catch (error) {
            console.error(`Erro ao salvar ${key}:`, error);
        }
    }
    
    // Métodos auxiliares (simulação)
    authenticateUser(email, password, role) {
        // Simulação de autenticação
        const user = this.data.users.find(u => 
            u.email === email && u.password === password && u.role === role
        );
        
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            return user;
        }
        
        // Para demonstração, criar usuário se não existir
        if (email && password) {
            const newUser = {
                id: Date.now(),
                email,
                password,
                role,
                name: email.split('@')[0],
                verified: role === 'admin' ? true : false,
                createdAt: Date.now()
            };
            
            this.data.users.push(newUser);
            this.saveToStorage('users', this.data.users);
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            
            return newUser;
        }
        
        return null;
    }
    
    createUser(userData, role) {
        const newUser = {
            id: Date.now(),
            ...userData,
            role,
            verified: role === 'admin' ? true : false,
            createdAt: Date.now()
        };
        
        this.data.users.push(newUser);
        this.saveToStorage('users', this.data.users);
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        
        return newUser;
    }
    
    acceptCall(callId) {
        const call = this.data.calls.find(c => c.id == callId);
        if (call) {
            call.status = 'accepted';
            call.providerId = this.currentUser.id;
            this.saveToStorage('calls', this.data.calls);
            this.showToast('Chamado aceito com sucesso!', 'success');
            this.renderProviderDashboard();
        }
    }
    
    rejectCall(callId) {
        const call = this.data.calls.find(c => c.id == callId);
        if (call) {
            call.status = 'rejected';
            this.saveToStorage('calls', this.data.calls);
            this.showToast('Chamado recusado', 'warning');
            this.renderProviderDashboard();
        }
    }
    
    openBidModal(auctionId) {
        // Implementar modal de proposta
        this.showToast('Funcionalidade de proposta em desenvolvimento', 'info');
    }
    
    handleAdminAction(action) {
        switch (action) {
            case 'verify-users':
                this.showToast('Abrindo lista de usuários para verificação', 'info');
                break;
            case 'view-reports':
                this.showToast('Relatórios em desenvolvimento', 'info');
                break;
            case 'manage-services':
                this.showToast('Gerenciamento de serviços em desenvolvimento', 'info');
                break;
            case 'system-settings':
                this.showToast('Configurações do sistema em desenvolvimento', 'info');
                break;
        }
    }
    
    // Renderização das Abas de Navegação
    
    // Aba Serviços
    renderServicesTab() {
        const mainContent = document.querySelector('.app-main');
        
        // Criar conteúdo da aba serviços
        const servicesContent = `
            <div class="screen active" id="services-tab">
                <div class="services-tab-content">
                    <div class="services-tab-header">
                        <h2>Serviços Disponíveis</h2>
                        <div class="services-filter">
                            <button class="filter-btn active" data-filter="all">Todos</button>
                            <button class="filter-btn" data-filter="featured">Destaques</button>
                            <button class="filter-btn" data-filter="nearby">Próximos</button>
                        </div>
                    </div>
                    
                    <div class="services-search">
                        <div class="search-bar">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" class="search-input" placeholder="Buscar serviços..." id="services-search">
                            <button class="search-btn">
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="services-categories">
                        <h3>Categorias</h3>
                        <div class="categories-grid">
                            <div class="category-item" data-category="limpeza">
                                <div class="category-icon">🧹</div>
                                <span>Limpeza</span>
                            </div>
                            <div class="category-item" data-category="pintura">
                                <div class="category-icon">🎨</div>
                                <span>Pintura</span>
                            </div>
                            <div class="category-item" data-category="encanamento">
                                <div class="category-icon">🚰</div>
                                <span>Encanamento</span>
                            </div>
                            <div class="category-item" data-category="eletricista">
                                <div class="category-icon">🔌</div>
                                <span>Elétrica</span>
                            </div>
                            <div class="category-item" data-category="manutencao">
                                <div class="category-icon">🔧</div>
                                <span>Manutenção</span>
                            </div>
                            <div class="category-item" data-category="jardinagem">
                                <div class="category-icon">🌱</div>
                                <span>Jardinagem</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="services-list" id="services-list-container">
                        <!-- Lista de serviços será carregada aqui -->
                    </div>
                </div>
            </div>
        `;
        
        // Substituir conteúdo atual
        this.replaceMainContent(servicesContent);
        
        // Carregar serviços
        this.loadServicesList();
        
        // Bind eventos
        this.bindServicesTabEvents();
    }
    
    // Aba Leilões
    renderAuctionsTab() {
        const mainContent = document.querySelector('.app-main');
        
        const auctionsContent = `
            <div class="screen active" id="auctions-tab">
                <div class="auctions-tab-content">
                    <div class="auctions-tab-header">
                        <h2>Leilões Ativos</h2>
                        <button class="btn-primary" id="create-auction-btn">
                            <i class="fas fa-plus"></i>
                            Criar Leilão
                        </button>
                    </div>
                    
                    <div class="auctions-filter">
                        <button class="filter-btn active" data-filter="all">Todos</button>
                        <button class="filter-btn" data-filter="my-auctions">Meus Leilões</button>
                        <button class="filter-btn" data-filter="participating">Participando</button>
                    </div>
                    
                    <div class="auctions-list" id="auctions-list-container">
                        <!-- Lista de leilões será carregada aqui -->
                    </div>
                </div>
            </div>
        `;
        
        this.replaceMainContent(auctionsContent);
        this.loadAuctionsList();
        this.bindAuctionsTabEvents();
    }
    
    // Aba Chat
    renderChatTab() {
        const mainContent = document.querySelector('.app-main');
        
        const chatContent = `
            <div class="screen active" id="chat-tab">
                <div class="chat-tab-content">
                    <div class="chat-tab-header">
                        <h2>Conversas</h2>
                        <button class="btn-primary" id="new-chat-btn">
                            <i class="fas fa-plus"></i>
                            Nova Conversa
                        </button>
                    </div>
                    
                    <div class="chat-search">
                        <div class="search-bar">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" class="search-input" placeholder="Buscar conversas..." id="chat-search">
                        </div>
                    </div>
                    
                    <div class="chats-list" id="chats-list-container">
                        <!-- Lista de conversas será carregada aqui -->
                    </div>
                </div>
            </div>
        `;
        
        this.replaceMainContent(chatContent);
        this.loadChatsList();
        this.bindChatTabEvents();
    }
    
    // Aba Perfil
    renderProfileTab() {
        const mainContent = document.querySelector('.app-main');
        
        const profileContent = `
            <div class="screen active" id="profile-tab">
                <div class="profile-tab-content">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="profile-info">
                            <h2>${this.currentUser?.name || 'Usuário'}</h2>
                            <p>${this.currentUser?.role === 'client' ? 'Cliente' : this.currentUser?.role === 'provider' ? 'Prestador' : 'Administrador'}</p>
                        </div>
                        <button class="btn-ghost" id="edit-profile-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                    
                    <div class="profile-stats">
                        <div class="stat-item">
                            <div class="stat-number" id="profile-services">0</div>
                            <div class="stat-label">Serviços</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" id="profile-rating">4.5</div>
                            <div class="stat-label">Avaliação</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" id="profile-earnings">R$ 0</div>
                            <div class="stat-label">Ganhos</div>
                        </div>
                    </div>
                    
                    <div class="profile-menu">
                        <div class="menu-item" data-action="personal-info">
                            <i class="fas fa-user-circle"></i>
                            <span>Informações Pessoais</span>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        <div class="menu-item" data-action="documents">
                            <i class="fas fa-file-alt"></i>
                            <span>Documentos</span>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        <div class="menu-item" data-action="payments">
                            <i class="fas fa-credit-card"></i>
                            <span>Pagamentos</span>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        <div class="menu-item" data-action="settings">
                            <i class="fas fa-cog"></i>
                            <span>Configurações</span>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        <div class="menu-item" data-action="help">
                            <i class="fas fa-question-circle"></i>
                            <span>Ajuda</span>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                    
                    <div class="profile-actions">
                        <button class="btn-primary btn-full" id="logout-btn-tab">
                            <i class="fas fa-sign-out-alt"></i>
                            Sair da Conta
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.replaceMainContent(profileContent);
        this.loadProfileData();
        this.bindProfileTabEvents();
    }
    
    // Métodos auxiliares para as abas
    
    replaceMainContent(content) {
        // Esconder todas as telas atuais
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Remover conteúdo das abas anteriores
        const existingTabs = document.querySelectorAll('#services-tab, #auctions-tab, #chat-tab, #profile-tab');
        existingTabs.forEach(tab => tab.remove());
        
        // Adicionar novo conteúdo
        const mainContent = document.querySelector('.app-main');
        mainContent.insertAdjacentHTML('beforeend', content);
    }
    
    loadServicesList() {
        const container = document.getElementById('services-list-container');
        const services = this.data.services;
        
        if (services.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tools"></i>
                    <p>Nenhum serviço disponível no momento</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = services.map(service => `
            <div class="service-card" data-service-id="${service.id}">
                <div class="service-header">
                    <div class="service-icon">${service.icon}</div>
                    <div class="service-info">
                        <strong>${service.name}</strong>
                        <div class="rating">${'★'.repeat(Math.floor(service.rating))}${'☆'.repeat(5 - Math.floor(service.rating))} ${service.rating}</div>
                    </div>
                    <button class="btn-primary btn-small">Solicitar</button>
                </div>
                <p class="service-description">${service.description}</p>
                <div class="service-footer">
                    <span class="price">A partir de R$ ${service.price}</span>
                    ${service.discount ? `<span class="badge yellow">${service.discount}% OFF</span>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    loadAuctionsList() {
        const container = document.getElementById('auctions-list-container');
        const auctions = this.data.auctions;
        
        if (auctions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-gavel"></i>
                    <p>Nenhum leilão ativo no momento</p>
                    <button class="btn-primary" id="create-first-auction">Criar Primeiro Leilão</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = auctions.map(auction => `
            <div class="auction-card" data-auction-id="${auction.id}">
                <div class="auction-header">
                    <h3>${auction.title}</h3>
                    <span class="auction-status ${auction.status}">${auction.status}</span>
                </div>
                <p class="auction-description">${auction.desc}</p>
                <div class="auction-details">
                    <span><i class="fas fa-map-marker-alt"></i> ${auction.region}</span>
                    <span><i class="fas fa-dollar-sign"></i> R$ ${auction.budget}</span>
                    <span><i class="fas fa-clock"></i> ${this.formatTimeRemaining(auction.endsAt)}</span>
                </div>
                <div class="auction-actions">
                    <button class="btn-primary btn-small view-auction">Ver Detalhes</button>
                    ${auction.status === 'open' ? '<button class="btn-ghost btn-small bid-auction">Fazer Proposta</button>' : ''}
                </div>
            </div>
        `).join('');
    }
    
    loadChatsList() {
        const container = document.getElementById('chats-list-container');
        const chats = this.data.chats;
        
        if (chats.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <p>Nenhuma conversa ativa</p>
                    <button class="btn-primary" id="start-first-chat">Iniciar Conversa</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = chats.map(chat => `
            <div class="chat-item" data-chat-id="${chat.id}">
                <div class="chat-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="chat-info">
                    <div class="chat-header">
                        <strong>${chat.participantName}</strong>
                        <span class="chat-time">${new Date(chat.lastMessageTime).toLocaleTimeString()}</span>
                    </div>
                    <p class="chat-preview">${chat.lastMessage}</p>
                </div>
                <div class="chat-status">
                    ${chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    loadProfileData() {
        // Carregar estatísticas do perfil
        const servicesCount = this.data.transactions.filter(t => t.userId === this.currentUser?.id).length;
        const rating = this.currentUser?.rating || 4.5;
        const earnings = this.data.transactions
            .filter(t => t.userId === this.currentUser?.id && t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);
        
        document.getElementById('profile-services').textContent = servicesCount;
        document.getElementById('profile-rating').textContent = rating.toFixed(1);
        document.getElementById('profile-earnings').textContent = `R$ ${earnings.toFixed(2)}`;
    }
    
    // Bind eventos das abas
    bindServicesTabEvents() {
        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterServices(e.target.dataset.filter);
            });
        });
        
        // Busca
        const searchInput = document.getElementById('services-search');
        const searchBtn = document.querySelector('.search-btn');
        
        searchBtn.addEventListener('click', () => {
            this.searchServices(searchInput.value);
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchServices(searchInput.value);
            }
        });
        
        // Categorias
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.filterServicesByCategory(category);
            });
        });
        
        // Serviços
        document.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const serviceId = e.currentTarget.dataset.serviceId;
                this.openServiceDetail(serviceId);
            });
        });
    }
    
    bindAuctionsTabEvents() {
        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterAuctions(e.target.dataset.filter);
            });
        });
        
        // Criar leilão
        document.getElementById('create-auction-btn').addEventListener('click', () => {
            this.openCreateAuctionModal();
        });
        
        // Ver detalhes do leilão
        document.querySelectorAll('.view-auction').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const auctionId = e.target.closest('.auction-card').dataset.auctionId;
                this.openAuctionDetail(auctionId);
            });
        });
        
        // Fazer proposta
        document.querySelectorAll('.bid-auction').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const auctionId = e.target.closest('.auction-card').dataset.auctionId;
                this.openBidModal(auctionId);
            });
        });
    }
    
    bindChatTabEvents() {
        // Nova conversa
        document.getElementById('new-chat-btn').addEventListener('click', () => {
            this.openNewChatModal();
        });
        
        // Busca de conversas
        const searchInput = document.getElementById('chat-search');
        searchInput.addEventListener('input', (e) => {
            this.searchChats(e.target.value);
        });
        
        // Conversas
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const chatId = e.currentTarget.dataset.chatId;
                this.openChat(chatId);
            });
        });
    }
    
    bindProfileTabEvents() {
        // Editar perfil
        document.getElementById('edit-profile-btn').addEventListener('click', () => {
            this.openEditProfileModal();
        });
        
        // Menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleProfileAction(action);
            });
        });
        
        // Logout
        document.getElementById('logout-btn-tab').addEventListener('click', () => {
            this.performLogout();
        });
    }
    
    // Métodos de funcionalidade
    filterServices(filter) {
        // Implementar filtro de serviços
        this.showToast(`Filtro aplicado: ${filter}`, 'info');
    }
    
    searchServices(query) {
        // Implementar busca de serviços
        this.showToast(`Buscando por: ${query}`, 'info');
    }
    
    filterServicesByCategory(category) {
        // Implementar filtro por categoria
        this.showToast(`Categoria selecionada: ${category}`, 'info');
    }
    
    openServiceDetail(serviceId) {
        // Implementar detalhes do serviço
        this.showToast(`Abrindo serviço: ${serviceId}`, 'info');
    }
    
    filterAuctions(filter) {
        // Implementar filtro de leilões
        this.showToast(`Filtro de leilões: ${filter}`, 'info');
    }
    
    openCreateAuctionModal() {
        // Implementar modal de criar leilão
        this.showToast('Modal de criar leilão em desenvolvimento', 'info');
    }
    
    openAuctionDetail(auctionId) {
        // Implementar detalhes do leilão
        this.showToast(`Abrindo leilão: ${auctionId}`, 'info');
    }
    
    openBidModal(auctionId) {
        // Implementar modal de proposta
        this.showToast(`Modal de proposta para leilão: ${auctionId}`, 'info');
    }
    
    openNewChatModal() {
        // Implementar modal de nova conversa
        this.showToast('Modal de nova conversa em desenvolvimento', 'info');
    }
    
    searchChats(query) {
        // Implementar busca de conversas
        this.showToast(`Buscando conversas: ${query}`, 'info');
    }
    
    openChat(chatId) {
        // Implementar abertura de chat
        this.showToast(`Abrindo chat: ${chatId}`, 'info');
    }
    
    openEditProfileModal() {
        // Implementar modal de editar perfil
        this.showToast('Modal de editar perfil em desenvolvimento', 'info');
    }
    
    // Logout Funcional
    performLogout() {
        // Mostrar confirmação
        if (confirm('Tem certeza que deseja sair da conta?')) {
            // Limpar dados da sessão
            localStorage.removeItem('currentUser');
            localStorage.removeItem('rememberedUser');
            
            // Resetar estado da aplicação
            this.currentUser = null;
            this.isAuthenticated = false;
            this.currentScreen = 'loading';
            this.screenHistory = [];
            
            // Esconder navegação
            const nav = document.getElementById('app-navigation');
            if (nav) {
                nav.style.display = 'none';
            }
            
            // Esconder todas as telas
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });
            
            // Mostrar tela de carregamento
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('active');
            }
            
            // Mostrar mensagem de sucesso
            this.showToast('Logout realizado com sucesso!', 'success');
            
            // Redirecionar para tela inicial após 2 segundos
            setTimeout(() => {
                this.navigateTo('welcome-screen');
            }, 2000);
        }
    }
    
    // Ações específicas do perfil
    handleProfileAction(action) {
        switch (action) {
            case 'personal-info':
                this.showToast('Informações Pessoais em desenvolvimento', 'info');
                break;
            case 'documents':
                this.showToast('Documentos em desenvolvimento', 'info');
                break;
            case 'payments':
                this.showToast('Pagamentos em desenvolvimento', 'info');
                break;
            case 'schedule':
                this.showToast('Agenda em desenvolvimento', 'info');
                break;
            case 'favorites':
                this.showToast('Favoritos em desenvolvimento', 'info');
                break;
            case 'history':
                this.showToast('Histórico em desenvolvimento', 'info');
                break;
            case 'settings':
                this.showToast('Configurações em desenvolvimento', 'info');
                break;
            case 'help':
                this.showToast('Ajuda em desenvolvimento', 'info');
                break;
            case 'system-info':
                this.showToast('Informações do Sistema em desenvolvimento', 'info');
                break;
            case 'user-management':
                this.showToast('Gerenciamento de Usuários em desenvolvimento', 'info');
                break;
            case 'reports':
                this.showToast('Relatórios em desenvolvimento', 'info');
                break;
            default:
                this.showToast(`Ação: ${action} em desenvolvimento`, 'info');
        }
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.arrumaAiApp = new ArrumaAiApp();
});

// Expor métodos globais para compatibilidade
window.showToast = (message, type) => {
    if (window.arrumaAiApp) {
        window.arrumaAiApp.showToast(message, type);
    }
};

window.navigateTo = (screen, data) => {
    if (window.arrumaAiApp) {
        window.arrumaAiApp.navigateTo(screen, data);
    }
};
