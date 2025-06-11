document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let allProducts = new Map();
    let currentUser = null;
    let currentView = 'recommendations-section';
    let authToken = localStorage.getItem('authToken');

    // --- DOM Element Selection ---
    const userDropdown = document.getElementById('user-dropdown');
    const recommendationGrid = document.getElementById('recommendation-grid');
    const purchaseHistoryGrid = document.getElementById('purchase-history-grid');
    const historyTitle = document.getElementById('history-title');
    const profileCardContainer = document.getElementById('profile-card-container');
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeCheckbox = document.getElementById('theme-checkbox'); // Hidden checkbox for state
    
    // Auth elements
    const authBtn = document.getElementById('auth-btn');
    const authModal = document.getElementById('auth-modal');
    const closeModalBtn = authModal.querySelector('.close-btn');
    const modalTabs = authModal.querySelectorAll('.tab-link');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authError = document.getElementById('auth-error');

    // Welcome text elements
    const welcomeTitle = document.getElementById('welcome-title');
    const welcomeSubtitle = document.getElementById('welcome-subtitle');

    const initializeApp = async () => {
        setupEventListeners();
        applyInitialTheme();
        await fetchStaticData();
        await checkAuthStatus();
    };

    const fetchStaticData = async () => {
        try {
            const [demoUsersRes, productsRes] = await Promise.all([
                fetch('/api/users'), fetch('/api/products')
            ]);
            const demoUsers = await demoUsersRes.json();
            const productsArray = await productsRes.json();
            productsArray.forEach(p => allProducts.set(p.id, p));
            populateUserDropdown(demoUsers);
        } catch (error) { console.error("Failed to fetch static data:", error); }
    };

    const fetchWithAuth = async (url, options = {}) => {
        const headers = { ...options.headers };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        return fetch(url, { ...options, headers });
    };

    const setupEventListeners = () => {
        userDropdown.addEventListener('change', handleDemoUserSelection);
        themeToggleBtn.addEventListener('click', handleThemeToggle);

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => handleNavigation(e, link));
        });

        authBtn.addEventListener('click', () => {
            if (currentUser) logout();
            else authModal.classList.add('show');
        });
        closeModalBtn.addEventListener('click', () => authModal.classList.remove('show'));
        authModal.addEventListener('click', e => e.target === authModal && authModal.classList.remove('show'));
        modalTabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
        loginForm.addEventListener('submit', handleLogin);
        registerForm.addEventListener('submit', handleRegister);
    };
    
    const handleThemeToggle = () => {
        themeCheckbox.checked = !themeCheckbox.checked;
        document.body.classList.toggle('dark-mode', themeCheckbox.checked);
        localStorage.setItem('theme', themeCheckbox.checked ? 'dark' : 'light');
    };
    
    const applyInitialTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            themeCheckbox.checked = true;
            document.body.classList.add('dark-mode');
        }
    };
    
    const switchTab = (targetTab) => {
        modalTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === targetTab));
        authModal.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `${targetTab}-tab`));
        authError.textContent = '';
    };

    const checkAuthStatus = async () => {
        if (!authToken) return updateUI();
        try {
            const response = await fetchWithAuth('/api/me');
            if (response.ok) currentUser = await response.json();
            else logout(); // Token invalid
        } catch (error) { logout(); }
        updateUI();
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        authError.textContent = '';
        const formData = new FormData(loginForm);
        try {
            const response = await fetch('/api/auth/login', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail);
            authToken = data.access_token;
            localStorage.setItem('authToken', authToken);
            authModal.classList.remove('show');
            await checkAuthStatus();
        } catch (error) { authError.textContent = error.message; }
    };

    // const handleRegister = async (e) => {
    //     e.preventDefault();
    //     authError.textContent = '';
    //     const user = {
    //         name: registerForm.querySelector('#register-name').value,
    //         email: registerForm.querySelector('#register-email').value,
    //         password: registerForm.querySelector('#register-password').value,
    //     };
    //     try {
    //         const response = await fetch('/api/auth/register', {
    //             method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user)
    //         });
    //         if (!response.ok) throw new Error((await response.json()).detail);
    //         alert('Registration successful! Please log in.');
    //         switchTab('login');
    //     } catch (error) { authError.textContent = error.message; }
    // };

    const handleRegister = async (e) => {
        e.preventDefault();
        authError.textContent = '';
        const user = {
            name: registerForm.querySelector('#register-name').value,
            email: registerForm.querySelector('#register-email').value,
            password: registerForm.querySelector('#register-password').value,
        };

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });

            // First, get the response body. We now know it's always JSON.
            const data = await response.json();

            // Then, check if the request was successful.
            if (!response.ok) {
                // If not, the 'data' object contains our error message.
                // The 'detail' key is the standard for FastAPI errors.
                throw new Error(data.detail || 'An unknown error occurred.');
            }

            // If we reach here, registration was successful.
            alert('Registration successful! Please log in.');
            switchTab('login');

        } catch (error) {
            // This catch block now handles both network errors and our custom
            // JSON errors thrown from the block above.
            console.error('Registration failed:', error);
            authError.textContent = error.message;
        }
    };
    
    const logout = () => {
        currentUser = null;
        authToken = null;
        localStorage.removeItem('authToken');
        currentView = 'recommendations-section'; // Reset to home on logout
        updateUI();
    };

    const handleDemoUserSelection = async () => {
        if (currentUser) return;
        const userId = userDropdown.value;
        recommendationGrid.innerHTML = !userId ? '' : '<p>Loading demo picks...</p>';
        if (!userId) return;
        try {
            const response = await fetch(`/api/recommendations/${userId}`);
            const data = await response.json();
            if (data.recommendations) renderCards(recommendationGrid, data.recommendations, createRecommendationCard);
            else recommendationGrid.innerHTML = `<p>${data.error || 'No recommendations.'}</p>`;
        } catch (error) { recommendationGrid.innerHTML = '<p>Could not load recommendations.</p>'; }
    };

    const updateUI = () => {
        // Auth state updates
        authBtn.querySelector('span').textContent = currentUser ? 'Logout' : 'Login';
        document.getElementById('user-details-nav-link').style.display = currentUser ? 'flex' : 'none';
        welcomeTitle.textContent = currentUser ? `Welcome, ${currentUser.name}!` : 'Your Personal Shopping Agent';
        welcomeSubtitle.textContent = currentUser ? 'Here are your personalized picks.' : 'Select a demo profile or login.';
        userDropdown.style.display = currentUser ? 'none' : 'block';

        // Navigation and section visibility
        navLinks.forEach(l => l.classList.toggle('active', l.dataset.section === currentView));
        contentSections.forEach(s => s.classList.toggle('active', s.id === currentView));
        
        // Render content for the active view
        switch (currentView) {
            case 'recommendations-section':
                if (currentUser) fetchAndRenderRecommendations();
                else userDropdown.value ? handleDemoUserSelection() : recommendationGrid.innerHTML = '';
                break;
            case 'purchase-history-section':
                renderPurchaseHistory();
                break;
            case 'user-details-section':
                renderUserDetails();
                break;
        }
    };
    
    const handleNavigation = (e, link) => {
        e.preventDefault();
        const sectionId = link.dataset.section;
        if (!sectionId) return;
        
        // Prevent navigating to protected sections when logged out
        if (!currentUser && (sectionId === 'purchase-history-section' || sectionId === 'user-details-section')) {
            authModal.classList.add('show');
            return;
        }
        
        currentView = sectionId;
        updateUI();
    };

    const fetchAndRenderRecommendations = async () => { /* Logic unchanged, just rendering part */
        recommendationGrid.innerHTML = '<p>Loading your picks...</p>';
        try {
            const response = await fetchWithAuth('/api/me/recommendations');
            const data = await response.json();
            if (data.recommendations?.length > 0) renderCards(recommendationGrid, data.recommendations, createRecommendationCard);
            else recommendationGrid.innerHTML = `<p>${data.message || 'No new recommendations right now. Check back later!'}</p>`;
        } catch (error) { recommendationGrid.innerHTML = '<p>Could not load recommendations.</p>'; }
    };

    const renderPurchaseHistory = () => { /* Logic unchanged, just rendering part */
        if (!currentUser) return; // Should be handled by nav guard
        historyTitle.textContent = `${currentUser.name}'s Purchase History`;
        if (currentUser.purchase_history.length === 0) {
            purchaseHistoryGrid.innerHTML = '<p>You have no past purchases.</p>';
            return;
        }
        const items = currentUser.purchase_history.map(item => ({...allProducts.get(item.product_id), purchase_date: item.purchase_date}));
        renderCards(purchaseHistoryGrid, items.reverse(), createHistoryCard);
    };

    const renderUserDetails = () => {
        if (!currentUser) { // Should be handled by nav guard
            profileCardContainer.innerHTML = `<div class="profile-card"><p class="placeholder">Please log in to view your profile.</p></div>`;
            return;
        }
        const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        profileCardContainer.innerHTML = `
            <div class="profile-card">
                <div class="profile-avatar">${initials}</div>
                <h2 class="profile-name">${currentUser.name}</h2>
                <p class="profile-email">${currentUser.email}</p>
            </div>
        `;
    };

    const populateUserDropdown = (users) => users.forEach(user => { /* Logic Unchanged */
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        userDropdown.appendChild(option);
    });

    const renderCards = (grid, items, cardCreator) => { /* Logic Unchanged */
        grid.innerHTML = '';
        items.forEach(item => grid.appendChild(cardCreator(item)));
    };

    const createRecommendationCard = product => { /* Card structure unchanged, styles will handle look */
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `<img src="${product.image_url}" alt="${product.name}" class="card-image" loading="lazy"><div class="card-info"><h3>${product.name}</h3><p>${product.description}</p></div>`;
        return card;
    };
    
    const createHistoryCard = item => { /* Card structure unchanged, styles will handle look */
        const card = document.createElement('div');
        card.className = 'product-card'; // Re-use product card style for consistency
        card.innerHTML = `<img src="${item.image_url}" alt="${item.name}" class="card-image" loading="lazy"><div class="card-info"><h3>${item.name}</h3><p class="purchase-date">Purchased on: ${item.purchase_date}</p></div><div class="card-actions"><button class="reorder-btn">Reorder</button></div>`;
        return card;
    };

    initializeApp();
});