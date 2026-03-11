let currentUser = null;
let profile = null;
let assignedAreas = [];
let systemSettings = null;
let isOnline = navigator.onLine;
let isSyncInProgress = false;

// IndexedDB Constants
const DB_NAME = 'WBReaderDB';
const DB_VERSION = 2; // Incremented for new stores
const STORE_NAME = 'readings';
const STORE_AREAS = 'areas';
const STORE_CUSTOMERS = 'customers';

// Initialize IndexedDB
async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORE_AREAS)) {
                db.createObjectStore(STORE_AREAS, { keyPath: 'id' }); // Use 'id' (staff_id) or singular key
            }
            if (!db.objectStoreNames.contains(STORE_CUSTOMERS)) {
                db.createObjectStore(STORE_CUSTOMERS, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ... (Existing saveToIndexedDB, getOfflineReadings, removeReadingFromDB remain) ...

async function saveToIndexedDB(reading) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.add(reading);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getOfflineReadings() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function removeReadingFromDB(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// === Caching Helpers ===
async function saveCache(storeName, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear(); // Always replace cache with fresh data
        data.forEach(item => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getCache(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Reading Section State
let currentAreaCustomers = [];
let currentAreaBarangays = []; // Track actual brgys of opened area
let currentBarangay = 'All';

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const readingSection = document.getElementById('reading-section');
const cutoffSection = document.getElementById('cutoff-view');
const historySection = document.getElementById('history-view');
const loginForm = document.getElementById('loginForm');
const loading = document.getElementById('loading');
const toastContainer = document.getElementById('toast-container');
const pendingSyncCount = document.getElementById('pending-sync');
const syncBtnAction = document.getElementById('sync-btn-action');
const totalReadingsDisplay = document.getElementById('total-readings');
const receiptsDoneDisplay = document.getElementById('receipts-done');
const barangayTabsContainer = document.getElementById('barangay-tabs');

// === Connection Handling ===
function updateConnectionStatus() {
    const isOnline = navigator.onLine;
    const headerStatus = document.querySelector('.header-status');

    if (headerStatus) {
        // Updated for High Contrast (Solid White Background)
        if (isOnline) {
            headerStatus.innerHTML = '<span style="display:inline-block; width:8px; height:8px; background:#4CAF50; border-radius:50%; margin-right:6px; flex-shrink:0; box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);"></span>Online';
            headerStatus.className = 'header-status';
            headerStatus.style.color = '#2E7D32';
            headerStatus.style.setProperty('background', '#ffffff', 'important');
            headerStatus.style.border = 'none';
            headerStatus.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';

            if (window.triggerSync) window.triggerSync();
        } else {
            headerStatus.innerHTML = '<span style="display:inline-block; width:8px; height:8px; background:#757575; border-radius:50%; margin-right:6px; flex-shrink:0;"></span>Offline';
            headerStatus.className = 'header-status offline';
            headerStatus.style.color = '#757575';
            headerStatus.style.setProperty('background', '#ffffff', 'important');
            headerStatus.style.border = 'none';
            headerStatus.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        }

        // Common styles re-enforced
        headerStatus.style.display = 'flex';
        headerStatus.style.alignItems = 'center';
        headerStatus.style.padding = '6px 16px'; // Slightly larger
        headerStatus.style.borderRadius = '20px';
        headerStatus.style.fontWeight = '700'; // Bolder
        headerStatus.style.fontSize = '12px';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 WB Reader Premium Initializing...');

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showToast('App Updated! Refreshing...', 'success');
                        setTimeout(() => window.location.reload(), 2000);
                    }
                };
            };
        });
    }


    updateConnectionStatus(); // Initial check
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);

    await checkSession();
    updateUIState();

    // ... (rest of listeners)
    loginForm.addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('refreshBtn').addEventListener('click', loadDashboard);

    window.triggerSync = async () => {
        const readings = await getOfflineReadings();
        if (readings.length > 0) syncData();
        else showToast('Nothing to sync', 'info');
    };

    document.getElementById('sync-card').addEventListener('click', (e) => {
        if (e.target.id !== 'sync-btn-action') window.triggerSync();
    });

    syncBtnAction.addEventListener('click', (e) => {
        e.stopPropagation();
        window.triggerSync();
    });
    document.getElementById('backToDash').addEventListener('click', () => {
        readingSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        switchView('home'); // Always return to home when back from reading
    });

    // Bottom Nav Tab Listeners
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const viewId = tab.dataset.view;
            switchView(viewId);
        });
    });

    await updateSyncCount();
});

// === Auth Functions ===
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await fetchProfileAndLoadData();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');

    showLoading(true);
    errorEl.classList.add('hidden');

    try {
        if (!navigator.onLine) {
            // === OFFLINE LOGIN: Check cached session ===
            const cachedSession = localStorage.getItem('cached_session');
            const cachedProfile = localStorage.getItem('cached_profile');

            if (!cachedSession || !cachedProfile) {
                throw new Error('Offline login unavailable. Please connect to login for the first time.');
            }

            const session = JSON.parse(cachedSession);
            profile = JSON.parse(cachedProfile);

            // Basic credential check (email match only, no password verification offline)
            if (session.user.email !== email) {
                throw new Error('Email does not match cached session.');
            }

            currentUser = session.user;
            updateUIState();
            showToast(`Welcome back, ${profile?.first_name || 'Reader'}! (Offline Mode)`, 'info');
            return;
        }

        // === ONLINE LOGIN ===
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        currentUser = data.user;

        // Cache session for offline login
        localStorage.setItem('cached_session', JSON.stringify(data.session));

        await fetchProfileAndLoadData();

        const role = (profile?.role || profile?.user_role || '').toLowerCase();
        const isStaff = !!(profile?.auth_uid || profile?.username);

        if (role !== 'reader' && role !== 'admin' && !isStaff) {
            await supabase.auth.signOut();
            currentUser = null;
            profile = null;
            localStorage.removeItem('cached_session');
            localStorage.removeItem('cached_profile');
            throw new Error('Access denied. Reader account required.');
        }

        updateUIState();
        showToast(`Welcome back, ${profile?.first_name || 'Reader'}!`, 'success');
    } catch (err) {
        errorEl.textContent = err.message || 'Invalid credentials';
        errorEl.classList.remove('hidden');
    } finally {
        showLoading(false);
    }
}

async function fetchProfileAndLoadData() {
    if (!currentUser) return;
    try {
        if (navigator.onLine) {
            // === ONLINE: Fetch & Cache ===
            const { data: staffData } = await supabase.from('staff').select('*').eq('auth_uid', currentUser.id).maybeSingle();
            if (staffData) {
                profile = staffData;
            } else {
                const { data: profileData } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
                profile = profileData || { role: 'admin', first_name: currentUser.email.split('@')[0] };
            }

            // Cache Profile for Offline Use
            localStorage.setItem('cached_profile', JSON.stringify(profile));

        } else {
            // === OFFLINE: Load from Cache ===
            console.log('⚠️ Offline: Loading profile from cache...');
            const cached = localStorage.getItem('cached_profile');
            if (cached) {
                profile = JSON.parse(cached);
            } else {
                throw new Error('Offline login unavailable. Please login online first.');
            }
        }

        if (profile) {
            document.getElementById('user-name-display').textContent = profile.first_name || 'Reader';
            document.getElementById('user-initials').textContent = (profile.first_name?.[0] || 'R').toUpperCase();
            
            // ===== INITIALIZE REALTIME EARLY =====
            initRealtime(); 

            await loadDashboard();
        }
    } catch (err) {
        console.error('Profile Fetch Error:', err);
        showToast(err.message || 'Error loading profile', 'error');
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    currentUser = null;
    profile = null;
    localStorage.removeItem('cached_profile');
    localStorage.removeItem('cached_session'); // Clear session cache
    updateUIState();
}

// === Dashboard Functions ===
// === Dashboard Functions ===
async function loadDashboard() {
    if (!currentUser || !profile) return;
    showLoading(true);

    try {
        let settings, areas, todayBills, allCustomers;

        if (navigator.onLine) {
            // === ONLINE: Fetch from Supabase & Cache ===

            // 1. System Settings
            const { data: s } = await supabase.from('system_settings').select('*').single();
            settings = s;
            // Cache settings (reuse 'areas' store for now or add new? ID 'settings')
            if (settings) saveCache(STORE_AREAS, [{ id: 'settings', ...settings }]); // Hacky but works for singular config

            // 2. Identify Staff ID
            let staffIntId = null;
            if (profile.auth_uid) staffIntId = profile.id;
            else {
                const { data: s } = await supabase.from('staff').select('id').eq('auth_uid', currentUser.id).maybeSingle();
                if (s) staffIntId = s.id;
            }

            // 3. Areas
            let query = supabase.from('area_boxes').select('*');
            if (staffIntId) query = query.eq('assigned_reader_id', staffIntId);
            else if ((profile.role || '').toLowerCase() !== 'admin') {
                assignedAreas = [];
                renderBarangayDashboard([], [], []);
                return;
            }

            const { data: a, error } = await query;
            if (error) throw error;
            areas = a || [];

            // Cache Areas
            await saveCache(STORE_AREAS, areas.map(area => ({ ...area, type: 'area' })));
            localStorage.setItem('sync_areas_time', Date.now()); // Mark sync time

            // 4. Today's Billing (for stats)
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: tb } = await supabase
                .from('billing')
                .select('consumption, reading_date, customer_id')
                .eq('reading_date', todayStr);
            todayBills = tb || [];

            // 5. ALL CUSTOMERS (FULL DATA) - Pre-load for offline use
            const { data: fullCustomers } = await supabase
                .from('customers')
                .select('*')
                .in('status', ['active', 'inactive']);
            
            // 6. Fetch ALL billing records for these customers (to build history/arrears)
            const { data: allBills } = await supabase
                .from('billing')
                .select('*')
                .order('reading_date', { ascending: false });

            // Map billing to customers
            const billsByCustomer = {};
            (allBills || []).forEach(b => {
                if (!billsByCustomer[b.customer_id]) billsByCustomer[b.customer_id] = [];
                billsByCustomer[b.customer_id].push(b);
            });

            // Process and cache ALL customers
            const processedCustomers = (fullCustomers || []).map(c => {
                const customerBills = billsByCustomer[c.id] || [];
                const sortedBills = [...customerBills].sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date));
                const latestBilling = sortedBills[0];
                const arrears = customerBills.reduce((sum, b) => sum + (parseFloat(b.balance) || 0), 0);

                return {
                    ...c,
                    previous_reading: latestBilling ? latestBilling.current_reading : 0,
                    arrears: arrears,
                    history: sortedBills.slice(0, 12)
                };
            });

            // Cache ALL customers for offline use (active + inactive for cutoff view)
            await saveCache(STORE_CUSTOMERS, processedCustomers);
            localStorage.setItem('sync_customers_time', Date.now());

            // Use ONLY active customers for dashboard counts (matches what openArea loads)
            allCustomers = processedCustomers
                .filter(c => (c.status || 'active') === 'active')
                .map(c => ({ id: c.id, address: c.address }));

            // Filter todayBills to ONLY this reader's assigned area customers
            // Without this, counts are system-wide (all readers combined)
            const assignedBrgyList = (areas || []).flatMap(area => area.barangays || []);
            const assignedCustIds = new Set(
                allCustomers
                    .filter(c => assignedBrgyList.some(brgy => (c.address || '').toLowerCase().includes(brgy.toLowerCase())))
                    .map(c => c.id)
            );
            todayBills = todayBills.filter(b => assignedCustIds.has(b.customer_id));

        } else {
            // === OFFLINE: Fetch from IndexedDB ===
            console.log('⚠️ Offline: Loading dashboard from cache...');

            const lastSync = localStorage.getItem('sync_areas_time');
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            if (!lastSync || new Date(parseInt(lastSync)) < startOfDay) {
                console.warn('Cache expired (from yesterday or older). Ignoring.');
                areas = [];
                settings = null;
                showToast('Daily cache expired. Go online to refresh.', 'warning');
            } else {
                const cachedItems = await getCache(STORE_AREAS);
                settings = cachedItems.find(i => i.id === 'settings');
                areas = cachedItems.filter(i => i.type === 'area');
            }


            // Load all customers for progress tracking (active-only for consistent counts)
            const cachedCustomers = await getCache(STORE_CUSTOMERS);
            allCustomers = (cachedCustomers || [])
                .filter(c => (c.status || 'active') === 'active')
                .map(c => ({ id: c.id, address: c.address, history: c.history || [] }));

            // Calculate "Today's Bills" from local history + unsynced readings
            const todayStr = new Date().toISOString().split('T')[0];
            const offlineReadings = await getOfflineReadings();

            todayBills = [];

            // 1. Add already synced readings (found in history)
            allCustomers.forEach(c => {
                const syncedToday = c.history.find(h => h.reading_date === todayStr);
                if (syncedToday) {
                    todayBills.push({ customer_id: c.id, consumption: syncedToday.consumption });
                }
            });

            // 2. Add unsynced readings (from offline queue)
            offlineReadings.forEach(r => {
                if (r.p_month_date === todayStr) {
                    // Check for duplicates (unlikely unless logic allows, but safe)
                    if (!todayBills.some(b => b.customer_id === r.p_customer_id)) {
                        todayBills.push({ customer_id: r.p_customer_id, consumption: r.p_consumption });
                    }
                }
            });

            if ((!areas || areas.length === 0) && navigator.onLine === false) {
                // Only warn if we truly have nothing and expected something
                // handled above by toast
            }
        }

        systemSettings = settings;
        assignedAreas = areas || [];

        renderBarangayDashboard(assignedAreas, todayBills, allCustomers);
        updateSyncCount();

        // Calculate Totals — only for THIS reader's assigned customers
        const todayConsumption = todayBills.reduce((sum, b) => sum + (parseFloat(b.consumption) || 0), 0);
        const offlineItems = await getOfflineReadings();
        // Offline items already tied to a specific customer_id — no extra filter needed
        const offlineTotal = offlineItems.reduce((sum, r) => sum + (parseFloat(r.p_consumption) || 0), 0);

        totalReadingsDisplay.innerHTML = `${(todayConsumption + offlineTotal).toFixed(1)} <span class="unit">cu.m.</span>`;
        totalReadingsDisplay.nextElementSibling.textContent = 'RECORDED TODAY';

        const receiptsDoneCount = todayBills.length + offlineItems.length;
        if (receiptsDoneDisplay) receiptsDoneDisplay.textContent = receiptsDoneCount;

        updateCutoffBadge(); // Refresh cutoff badge whenever dashboard reloads

    } catch (err) {
        showToast('Dashboard Load Error', 'error');
        console.error('Loader Dashboard Error:', err);
    } finally {
        showLoading(false);
    }
}

function renderBarangayDashboard(areas, todayBills, allCustomers) {
    const container = document.getElementById('area-list');
    if (areas.length === 0) {
        container.innerHTML = `
            <div class="empty-illustration">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                        <line x1="8" y1="2" x2="8" y2="18"/>
                        <line x1="16" y1="6" x2="16" y2="22"/>
                    </svg>
                </div>
                <p style="color: var(--text-muted); font-weight: 600;">No Routes Assigned</p>
            </div>
        `;
        return;
    }

    // Flatten all barangays from all assigned areas
    const allAssignedBrgys = [];
    areas.forEach(area => {
        (area.barangays || []).forEach(brgy => {
            if (!allAssignedBrgys.some(b => b.name === brgy)) {
                allAssignedBrgys.push({ name: brgy, areaId: area.id, areaName: area.name });
            }
        });
    });

    container.innerHTML = allAssignedBrgys.map(brgy => {
        // Calculate progress for this barangay
        const brgyCustomers = allCustomers.filter(c => (c.address || '').toLowerCase().includes(brgy.name.toLowerCase()));
        const brgyCustIds = brgyCustomers.map(c => c.id);
        const completedCount = todayBills.filter(b => brgyCustIds.includes(b.customer_id)).length;
        const totalCount = brgyCustomers.length;
        const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

        return `
            <div class="modern-card" onclick="openArea(${brgy.areaId}, '${brgy.areaName}', '${brgy.name}')">
                <div class="card-info" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <h4 style="margin: 0;">${brgy.name}</h4>
                        <span style="font-size: 11px; font-weight: 800; color: var(--primary);">${completedCount}/${totalCount}</span>
                    </div>
                    <p style="font-size: 11px;">Part of ${brgy.areaName}</p>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// === Reading Functions ===
async function openArea(areaId, areaName, jumpToBrgy = 'All') {
    document.getElementById('area-name-display').textContent = jumpToBrgy !== 'All' ? jumpToBrgy : areaName;
    dashboardSection.classList.add('hidden');
    readingSection.classList.remove('hidden');

    showLoading(true);
    try {
        const area = assignedAreas.find(a => a.id === areaId);
        const barangays = area.barangays || [];

        renderBarangayTabs(barangays);

        let allCustomers = [];

        if (navigator.onLine) {
            // === ONLINE: Fetch & Cache ===
            const { data, error } = await supabase
                .from('customers')
                .select(`
                    *,
                    billing:billing(
                        id,
                        current_reading,
                        reading_date,
                        billing_period,
                        balance,
                        consumption,
                        due_date
                    )
                `)
                .eq('status', 'active');

            if (error) throw error;

            // Process customers immediately
            allCustomers = (data || []).map(c => {
                const sortedBills = (c.billing || []).sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date));
                const latestBilling = sortedBills[0];
                const arrears = (c.billing || []).reduce((sum, b) => sum + (parseFloat(b.balance) || 0), 0);

                return {
                    ...c,
                    previous_reading: latestBilling ? latestBilling.current_reading : 0,
                    arrears: arrears,
                    history: sortedBills.slice(0, 12) // Last 12 months
                };
            });

            // Smart Cache: Only cache customers belonging to the assigned area to avoid bloat?
            // For now, safe to cache all fetched to be comprehensive.
            await saveCache(STORE_CUSTOMERS, allCustomers);
            localStorage.setItem('sync_customers_time', Date.now()); // Mark sync time

        } else {
            // === OFFLINE: Fetch from Cache ===
            console.log('⚠️ Offline: Loading customers from cache...');

            const lastSync = localStorage.getItem('sync_customers_time');
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            if (!lastSync || new Date(parseInt(lastSync)) < startOfDay) {
                console.warn('Customer cache expired. Ignoring.');
                allCustomers = [];
                showToast('Daily customers expired. Go online to refresh.', 'warning');
            } else {
                allCustomers = await getCache(STORE_CUSTOMERS);
            }

            if (!allCustomers || allCustomers.length === 0) {
                // showToast('No offline customers found. Go online to sync first.', 'warning'); // Duplicate toast
            }
        }

        currentAreaBarangays = barangays; // Save for refresh
        currentAreaCustomers = allCustomers.filter(c => {
            return barangays.some(brgy => (c.address || '').toLowerCase().includes(brgy.toLowerCase()));
        });

        currentBarangay = jumpToBrgy;

        // Update tab active state
        setTimeout(() => {
            const tabs = document.querySelectorAll('.brgy-tab');
            tabs.forEach(t => {
                if (t.textContent.trim() === jumpToBrgy) t.classList.add('active');
                else t.classList.remove('active');
            });
        }, 100);

        filterAndRenderCustomers();
    } catch (err) {
        console.error('Error opening area:', err);
        showToast('Failed to load customers', 'error');
    } finally {
        showLoading(false);
    }
}

function renderBarangayTabs(barangays) {
    if (barangays.length === 0) {
        barangayTabsContainer.innerHTML = '';
        barangayTabsContainer.style.display = 'none';
        return;
    }

    barangayTabsContainer.style.display = 'flex';
    const tabs = ['All', ...barangays];
    barangayTabsContainer.innerHTML = tabs.map(brgy => `
        <button class="brgy-tab ${brgy === currentBarangay ? 'active' : ''}" onclick="setBarangayFilter('${brgy}', this)">
            ${brgy}
        </button>
    `).join('');
}

window.setBarangayFilter = (brgy, element) => {
    currentBarangay = brgy;
    document.querySelectorAll('.brgy-tab').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('area-name-display').textContent = brgy === 'All' ? 'Area Route' : brgy;
    filterAndRenderCustomers();
};

async function filterAndRenderCustomers() {
    const offlineReadings = await getOfflineReadings();
    const todayStr = new Date().toISOString().split('T')[0];

    const filtered = currentBarangay === 'All'
        ? currentAreaCustomers
        : currentAreaCustomers.filter(c => (c.address || '').toLowerCase().includes(currentBarangay.toLowerCase()));

    document.getElementById('area-meta').textContent = `${filtered.length} Customers found`;
    renderCustomerList(filtered, offlineReadings, todayStr);
}

function renderCustomerList(customers, offlineReadings = [], todayStr = '') {
    const container = document.getElementById('customer-list');
    if (customers.length === 0) {
        container.innerHTML = `
            <div class="empty-illustration">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                </div>
                <p style="color: var(--text-muted); font-weight: 600;">No active customers found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = customers.map(c => {
        const isTodaySaved = c.history.some(b => b.reading_date === todayStr);
        const isPending = offlineReadings.some(r => r.p_customer_id === c.id && r.p_month_date === todayStr);

        const cardClass = isTodaySaved ? 'is-saved' : (isPending ? 'is-pending' : '');
        const statusLabel = isTodaySaved
            ? '<span style="font-size: 10px; color: #388E3C; font-weight: 700;">RECORDED TODAY</span>'
            : (isPending ? '<span style="font-size: 10px; color: #E65100; font-weight: 700;">PENDING SYNC</span>' : '');

        return `
            <div class="customer-card-condensed ${cardClass}" id="cust-card-${c.id}">
                <div class="card-header-toggle" onclick="toggleCustomerDetails(${c.id})">
                    <div style="display: flex; flex-direction: column;">
                        <span class="customer-name">${c.first_name} ${c.last_name} <span style="font-size: 11px; color: var(--text-muted); font-weight: 600; margin-left: 8px;">(${c.meter_number})</span></span>
                        ${statusLabel}
                    </div>
                    <div class="toggle-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>
                
                <div class="card-details hidden" id="details-${c.id}">
                    <div class="detail-row">
                        <div class="previous-reading-badge-small">
                            <span class="label">Prev:</span>
                            <span class="value">${c.previous_reading} cu.m.</span>
                        </div>
                    </div>
                    
                    <p class="address-sub-small">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        ${c.address}
                    </p>

                    <div id="anomaly-${c.id}" class="hidden"></div>

                    <div class="reading-input-group">
                        <input type="number" step="0.01" class="input-field reading-input" 
                            placeholder="Current Reading" 
                            id="reading-${c.id}" 
                            ${isTodaySaved ? 'disabled' : ''}
                            oninput="updateConsumption(${c.id}, ${c.previous_reading})">
                        
                        <div class="reading-action-bar">
                            <div class="usage-display-compact" id="cons-card-${c.id}">
                                <span class="label">Usage</span>
                                <div class="value" id="cons-${c.id}">0.0 <span class="unit">cu.m.</span></div>
                            </div>

                            <button onclick="submitReading(${c.id}, ${c.previous_reading}, ${c.has_discount}, ${c.arrears})" 
                                    class="btn-save" ${isTodaySaved ? 'disabled' : ''}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Confirm
                            </button>
                        </div>
                    </div>

                    ${isTodaySaved ? `
                        <button onclick="showReceiptShortcut(${c.id})" class="btn-small-outline" style="width: 100%; margin-top: 15px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            View Today's Receipt
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.toggleCustomerDetails = (id) => {
    const details = document.getElementById(`details-${id}`);
    const card = document.getElementById(`cust-card-${id}`);
    const isHidden = details.classList.toggle('hidden');
    card.classList.toggle('expanded', !isHidden);
};

window.updateConsumption = (id, prev) => {
    const input = document.getElementById(`reading-${id}`);
    const display = document.getElementById(`cons-${id}`);
    const anomalyEl = document.getElementById(`anomaly-${id}`);
    const current = parseFloat(input.value) || 0;
    const cons = current - prev;

    display.innerHTML = `${Math.max(0, cons).toFixed(2)} <span class="unit">cu.m.</span>`;

    // Anomaly Flagging (Spike detection)
    if (cons > 0 && prev > 0) {
        const customer = currentAreaCustomers.find(c => c.id === id);
        const history = customer?.history || [];
        const avg = history.length > 0 ? history.reduce((s, h) => s + h.consumption, 0) / history.length : 10;

        if (cons > avg * 2) {
            anomalyEl.innerHTML = `
                <div class="anomaly-flag">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    ABNORMAL: High Usage (+100% of avg)
                </div>`;
            anomalyEl.classList.remove('hidden');
            display.style.color = 'var(--error)';
        } else if (cons < 0) {
            anomalyEl.innerHTML = `
                <div class="anomaly-flag" style="background:#FFEBEE; color:#C62828;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    ERROR: Below previous reading
                </div>`;
            anomalyEl.classList.remove('hidden');
        } else {
            anomalyEl.classList.add('hidden');
            display.style.color = '';
        }
    } else {
        anomalyEl.classList.add('hidden');
    }

    const btn = input.parentElement?.nextElementSibling;
    if (btn) {
        if (current >= prev) {
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1)';
        } else {
            btn.style.opacity = '0.5';
            btn.style.transform = 'scale(0.9)';
        }
    }
};

async function submitReading(customerId, prevReading, hasDiscount, arrears) {
    const input = document.getElementById(`reading-${customerId}`);
    const value = parseFloat(input.value);

    if (isNaN(value) || value < prevReading) {
        showToast('Invalid Reading', 'error');
        return;
    }

    const consumption = value - prevReading;
    // Standardize to "Month Year" format
    const now = new Date();
    const billingPeriod = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const readingDate = now.toISOString().split('T')[0];

    // Calculate Amount
    let charges;
    let totalDue;

    try {
        charges = calculateCharges(consumption, hasDiscount);
        totalDue = charges.total + arrears;
    } catch (calcErr) {
        showToast('Cannot submit: system rates not loaded yet. Please wait a moment and try again.', 'error');
        showLoading(false);
        return;
    }

    // Safety guard: a zero-amount bill will be immediately marked PAID by the
    // payment RPC (balance <= 0 → paid). Reject the submission loudly.
    if (totalDue <= 0 && consumption > 0) {
        showToast('Calculation error: bill amount is ₱0. Check system settings and retry.', 'error');
        showLoading(false);
        return;
    }

    const dueDate = new Date(readingDate);
    dueDate.setDate(dueDate.getDate() + 14);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    try {
        showLoading(true);
        const rpcPayload = {
            p_customer_id: customerId,
            p_current_reading: value,
            p_previous_reading: prevReading,
            p_month_date: readingDate,
            p_amount: totalDue,
            p_consumption: consumption,
            p_due_date: dueDateStr,
            p_base_charge: charges.base,
            p_consumption_charge: charges.consumption,
            p_penalty: 0,
            p_tax: 0,
            p_arrears: arrears
        };

        if (!navigator.onLine) {
            await saveOffline(rpcPayload);
            const customerForReceipt = currentAreaCustomers.find(c => c.id === customerId) || {};
            const penaltyPerc = systemSettings ? (parseFloat(systemSettings.penalty_percentage) || 20) : 20;
            // NEW PLAN: Penalty only on CURRENT bill amount (Base + Consumption), ignoring Arrears/Discount
        const penalty = (charges.base + charges.consumption) * (penaltyPerc / 100);

            showReceipt({
                receiptNo: `OFF-${Date.now().toString().slice(-6)}`,
                name: `${customerForReceipt.first_name || 'Customer'} ${customerForReceipt.last_name || ''}`,
                barangay: extractBarangay(customerForReceipt.address),
                meter: customerForReceipt.meter_number || 'N/A',
                prev: prevReading,
                pres: value,
                cons: consumption,
                charges: charges,
                arrears: arrears,
                total: totalDue,
                penalty: penalty,
                penaltyPerc: penaltyPerc,
                due: dueDateStr,
                prevDate: (customerForReceipt.history && customerForReceipt.history[0]) ? customerForReceipt.history[0].reading_date : 'N/A',
                currentDate: readingDate,
                readerName: profile ? `${profile.first_name} ${profile.last_name}` : 'Reader'
            });
            return;
        }

        const { data, error } = await supabase.rpc('generate_bill', rpcPayload);

        if (error) {
            console.error('RPC Error:', error);
            if (error.code === 'PGRST301') {
                await saveOffline(rpcPayload);
                const customerForReceipt = currentAreaCustomers.find(c => c.id === customerId) || {};
                const penaltyPerc = systemSettings ? (parseFloat(systemSettings.penalty_percentage) || 20) : 20;
                // NEW PLAN: Penalty on Gross Current charges
                const penalty = (charges.base + charges.consumption) * (penaltyPerc / 100);

                showReceipt({
                    receiptNo: `OFF-${Date.now().toString().slice(-6)}`,
                    name: `${customerForReceipt.first_name || 'Customer'} ${customerForReceipt.last_name || ''}`,
                    barangay: extractBarangay(customerForReceipt.address),
                    meter: customerForReceipt.meter_number || 'N/A',
                    prev: prevReading,
                    pres: value,
                    cons: consumption,
                    charges: charges,
                    arrears: arrears,
                    total: totalDue,
                    penalty: penalty,
                    penaltyPerc: penaltyPerc,
                    due: dueDateStr,
                    prevDate: (customerForReceipt.history && customerForReceipt.history[0]) ? customerForReceipt.history[0].reading_date : 'N/A',
                    currentDate: readingDate,
                    readerName: profile ? `${profile.first_name} ${profile.last_name}` : 'Reader'
                });
                return;
            }
            throw error;
        }

        // Correctly look up the customer from `currentAreaCustomers` to avoid data collision
        const submittedCust = currentAreaCustomers.find(c => c.id === customerId);
        if (submittedCust) {
            if (!submittedCust.history) submittedCust.history = [];
            submittedCust.history = submittedCust.history.filter(h => h.reading_date !== readingDate);
            submittedCust.history.unshift({
                id: data.bill_id,
                bill_no: data.bill_no,
                reading_date: readingDate,
                consumption: consumption,
                current_reading: value,
                balance: totalDue
            });
        }

        showToast('Success!', 'success');
        finalizeInput(customerId);

        const penaltyPerc = systemSettings ? (parseFloat(systemSettings.penalty_percentage) || 20) : 20;
        // NEW PLAN: Penalty on Gross Current charges
        const penalty = (charges.base + charges.consumption) * (penaltyPerc / 100);

        showReceipt({
            receiptNo: `RCP-${new Date().getFullYear()}-${String(data.bill_no || data.bill_id).padStart(4, '0')}`,
            name: submittedCust ? `${submittedCust.first_name} ${submittedCust.last_name}` : 'Customer',
            barangay: submittedCust ? extractBarangay(submittedCust.address) : 'N/A',
            meter: submittedCust ? submittedCust.meter_number : 'N/A',
            prev: prevReading,
            pres: value,
            cons: consumption,
            charges: charges,
            arrears: arrears,
            total: totalDue + penalty,
            penalty: penalty,
            penaltyPerc: penaltyPerc,
            due: dueDateStr,
            prevDate: (submittedCust.history && submittedCust.history[1]) ? submittedCust.history[1].reading_date : (submittedCust.history && submittedCust.history[0] ? submittedCust.history[0].reading_date : 'N/A'),
            currentDate: readingDate,
            readerName: profile ? `${profile.first_name} ${profile.last_name}` : 'Reader'
        });

        await loadDashboard();
        await filterAndRenderCustomers();
    } catch (err) {
        console.error('Submission Error:', err);
        showToast('Sync Failed - Saved Offline', 'warning');
        const rpcPayloadFallback = {
            p_customer_id: customerId,
            p_current_reading: value,
            p_previous_reading: prevReading,
            p_month_date: readingDate,
            p_amount: totalDue,
            p_consumption: consumption,
            p_due_date: dueDateStr,
            p_base_charge: charges.base,
            p_consumption_charge: charges.consumption,
            p_penalty: 0,
            p_tax: 0,
            p_arrears: arrears
        };
        await saveOffline(rpcPayloadFallback);
        const customerForReceipt = currentAreaCustomers.find(c => c.id === customerId) || {};
        const penaltyPerc = systemSettings ? (parseFloat(systemSettings.penalty_percentage) || 20) : 20;
        // NEW PLAN: Penalty on Gross Current charges
        const penalty = (charges.base + charges.consumption) * (penaltyPerc / 100);

        showReceipt({
            receiptNo: `OFF-${Date.now().toString().slice(-6)}`,
            name: `${customerForReceipt.first_name || 'Customer'} ${customerForReceipt.last_name || ''}`,
            barangay: extractBarangay(customerForReceipt.address),
            meter: customerForReceipt.meter_number || 'N/A',
            prev: prevReading,
            pres: value,
            cons: consumption,
            charges: charges,
            arrears: arrears,
            total: totalDue + penalty,
            penalty: penalty,
            penaltyPerc: penaltyPerc,
            due: dueDateStr,
            prevDate: (customerForReceipt.history && customerForReceipt.history[0]) ? customerForReceipt.history[0].reading_date : 'N/A',
            currentDate: readingDate,
            readerName: profile ? `${profile.first_name} ${profile.last_name}` : 'Reader'
        });
    } finally {
        showLoading(false);
    }
}

function finalizeInput(customerId) {
    const input = document.getElementById(`reading-${customerId}`);
    const consCard = document.getElementById(`cons-card-${customerId}`);
    const btn = input?.parentElement?.querySelector('.btn-save');

    if (input) input.disabled = true;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span style="color: white; font-weight: 700;">Synced now</span>
        `;
        btn.style.background = 'linear-gradient(135deg, #00B894 0%, #00A885 100%)';
        btn.style.boxShadow = '0 4px 12px rgba(0, 184, 148, 0.4)';
    }

    // Keep usage display as is
    if (consCard) {
        consCard.style.opacity = '0.7';
    }
}

function extractBarangay(address) {
    if (!address) return 'N/A';
    // Use the remembered brgys to find the matching one in the address
    if (currentAreaBarangays && currentAreaBarangays.length > 0) {
        const matchingBrgy = currentAreaBarangays.find(brgy =>
            address.toLowerCase().includes(brgy.toLowerCase())
        );
        if (matchingBrgy) return matchingBrgy;
    }
    // Fallback: Return first segment before municipality if format is "Info, Brgy, City"
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) return parts[parts.length - 2];
    return parts[parts.length - 1] || 'N/A';
}

function calculateCharges(consumption, hasDiscount) {
    if (!systemSettings) throw new Error('System settings not loaded — cannot calculate charges.');
    const t1T = systemSettings.tier1_threshold || 10;
    const t1R = systemSettings.tier1_rate || 15;
    const t2T = systemSettings.tier2_threshold || 20;
    const t2R = systemSettings.tier2_rate || 20;
    const t3R = systemSettings.tier3_rate || 25;
    const baseRate = parseFloat(systemSettings.base_rate) || 150;

    let consumptionCharge = 0;
    if (consumption > 0) {
        const t1Usage = Math.min(consumption, t1T);
        consumptionCharge += t1Usage * t1R;
        if (consumption > t1T) {
            const t2Usage = Math.min(consumption - t1T, t2T - t1T);
            consumptionCharge += t2Usage * t2R;
            if (consumption > t2T) {
                const t3Usage = consumption - t2T;
                consumptionCharge += t3Usage * t3R;
            }
        }
    }

    let total = baseRate + consumptionCharge;
    let discountAmount = 0;
    if (hasDiscount) {
        const discountP = parseFloat(systemSettings.discount_percentage || 20) / 100;
        discountAmount = total * discountP;
    }
    let netTotal = total - discountAmount;
    const penaltyPerc = systemSettings ? (parseFloat(systemSettings.penalty_percentage) || 20) : 20;

    return {
        base: baseRate,
        consumption: consumptionCharge,
        total: netTotal,
        discount: discountAmount,
        penaltyPerc: penaltyPerc // Track for receipt display
    };
}

// === Digital Receipt Logic ===
function showReceipt(data) {
    const body = document.getElementById('receipt-body');
    if (!body) return;

    // Extract Barangay (last part of address usually, or handle as needed)
    const barangay = data.barangay || 'N/A';
    const penaltyAmount = data.penalty || 0;
    const amountAfterDue = data.total + penaltyAmount;

    const formatMdy = (d) => {
        if(!d || d === 'N/A') return 'N/A';
        const date = new Date(d);
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    body.innerHTML = `
        <div class="receipt-row"><span>Reference Code:</span> <strong>${data.receiptNo}</strong></div>
        <div class="receipt-row"><span>Date:</span> <span>${formatMdy(new Date())}</span></div>
        <div style="margin: 15px 0 5px 0; font-weight: 700; border-top: 1px solid #eee; padding-top: 10px; font-size: 16px;">${data.name}</div>
        <div style="font-size: 13px; color: #666; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Brgy. ${barangay}</div>
        
        <div class="receipt-row"><span>Meter No:</span> <span>${data.meter}</span></div>
        <div class="receipt-row">
            <div>
                <span style="display: block;">Prev Reading:</span>
                <span style="font-size: 11px; color: #888;">(${formatMdy(data.prevDate)})</span>
            </div>
            <span>${data.prev}</span>
        </div>
        <div class="receipt-row">
            <div>
                <span style="display: block;">Pres Reading:</span>
                <span style="font-size: 11px; color: #888;">(${formatMdy(data.currentDate)})</span>
            </div>
            <span>${data.pres}</span>
        </div>
        <div class="receipt-row"><span>Consumption:</span> <strong>${data.cons} cu.m.</strong></div>
        
        <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
            <div class="receipt-row"><span>Arrears:</span> <span>₱${(data.arrears || 0).toFixed(2)}</span></div>
            <div class="receipt-row"><span>Current Bill:</span> <span>₱${(data.charges.total || 0).toFixed(2)}</span></div>
            
            ${data.charges.discount > 0 ? `
            <div class="receipt-row" style="color: #059669; font-size: 13px;">
                <span>Senior Discount:</span> 
                <span>-₱${data.charges.discount.toFixed(2)}</span>
            </div>
            ` : ''}

            <div class="receipt-row total" style="border-bottom: 1px dashed #ddd; padding-bottom: 10px; margin-bottom: 10px;">
                <span>AMOUNT DUE:</span> 
                <span>₱${data.total.toFixed(2)}</span>
            </div>
            
            <div class="receipt-row" style="color: #666; font-size: 13px;">
                <span>Penalty (${data.penaltyPerc}%):</span> 
                <span>₱${penaltyAmount.toFixed(2)}</span>
            </div>
            <div class="receipt-row total" style="color: var(--primary); margin-top: 5px;">
                <span>AFTER DUE DATE:</span> 
                <span>₱${amountAfterDue.toFixed(2)}</span>
            </div>
        </div>
        
        <div style="margin-top: 15px; background: #F5F5F5; padding: 10px; border-radius: 8px; text-align: center; font-size: 12px;">
            DUE DATE: <strong>${formatMdy(data.due)}</strong>
        </div>

        <div style="margin-top: 25px; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
            <div style="font-size: 12px; color: #888;">Meter Reader</div>
            <div style="font-weight: 700; margin-top: 5px;">${data.readerName}</div>
        </div>
    `;
    document.getElementById('receipt-modal').classList.remove('hidden');

    // Store data for shareReceipt
    window.lastReceiptData = data;
}

window.shareReceipt = async () => {
    const data = window.lastReceiptData;
    if (!data) return;

    const penaltyAmount = data.penalty || 0;
    
    // Safely format the previous date, avoiding "Invalid Date"
    const prevDateParsed = data.prevDate ? new Date(data.prevDate) : null;
    const prevDateStr = (prevDateParsed && !isNaN(prevDateParsed)) ? prevDateParsed.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A';
    const presDateStr = new Date(data.currentDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

    const text = `
--------------------------------
PULUPANDAN WATER DISTRICT
Official Water Bill
--------------------------------
Date: ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
Reference: ${data.receiptNo}
--------------------------------
CUSTOMER DETAILS
--------------------------------
Name: ${data.name}
Account No: ${data.meter}
Period: ${presDateStr}
--------------------------------
CONSUMPTION (cu.m.)
--------------------------------
Prev: ${data.prev} (${prevDateStr})
Pres: ${data.pres} (${presDateStr})
Consumed (cons): ${data.cons} cu.m.
--------------------------------
CHARGES BREAKDOWN
--------------------------------
Arrears:         P${(data.arrears || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
Current Charges: P${(data.charges.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
${data.charges.discount > 0 ? `Discount:       -P${data.charges.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` : ''}Late Penalty (20%): P${penaltyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
--------------------------------
TOTAL AMOUNT DUE:P${data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
--------------------------------
Due Date: ${new Date(data.due).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
--------------------------------
Reader: ${data.readerName || 'Reader'}

Thank you for being a 
valued customer!
    `.trim();

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Official Water Bill',
                text: text
            });
            showToast('Shared to printer app', 'success');
        } catch (err) {
            console.error('Share Error:', err);
        }
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(text);
        showToast('Receipt copied (paste in printer app)', 'info');
    }
};

window.directPrint = () => {
    const data = window.lastReceiptData;
    if (!data) return;

    const penaltyAmount = data.penalty || 0;
    
    // Safely format the previous date, avoiding "Invalid Date"
    const prevDateParsed = data.prevDate ? new Date(data.prevDate) : null;
    const prevDateStr = (prevDateParsed && !isNaN(prevDateParsed)) ? prevDateParsed.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A';
    const presDateStr = new Date(data.currentDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

    const text = `
--------------------------------
PULUPANDAN WATER DISTRICT
Official Water Bill
--------------------------------
Date: ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
Reference: ${data.receiptNo}
--------------------------------
CUSTOMER DETAILS
--------------------------------
Name: ${data.name}
Account No: ${data.meter}
Period: ${presDateStr}
--------------------------------
CONSUMPTION (cu.m.)
--------------------------------
Prev: ${data.prev} (${prevDateStr})
Pres: ${data.pres} (${presDateStr})
Consumed (cons): ${data.cons} cu.m.
--------------------------------
CHARGES BREAKDOWN
--------------------------------
Arrears:         P${(data.arrears || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
Current Charges: P${(data.charges.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
${data.charges.discount > 0 ? `Discount:       -P${data.charges.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` : ''}Late Penalty (20%): P${penaltyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
--------------------------------
TOTAL AMOUNT DUE:P${data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
--------------------------------
Due Date: ${new Date(data.due).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
--------------------------------
Reader: ${data.readerName || 'Reader'}

Thank you for being a 
valued customer!



    `.trim();

    const url = "rawbt:" + encodeURIComponent(text);
    window.location.href = url;
    showToast('Sent to Printer', 'success');
};

window.closeReceipt = () => {
    document.getElementById('receipt-modal').classList.add('hidden');
};

window.showReceiptShortcut = (id) => {
    const customer = currentAreaCustomers.find(c => c.id === id);
    const todayStr = new Date().toISOString().split('T')[0];
    const bill = customer.history.find(b => b.reading_date === todayStr);

    if (bill) {
        const charges = calculateCharges(bill.consumption, customer.has_discount);
        const penaltyPerc = systemSettings ? (parseFloat(systemSettings.penalty_percentage) || 20) : 20;
        // NEW PLAN: Penalty only on CURRENT bill amount (Base + Consumption), ignoring Arrears/Discount
        const penalty = (charges.base + charges.consumption) * (penaltyPerc / 100);

        showReceipt({
            receiptNo: `RCP-${new Date().getFullYear()}-${bill.id || 'N/A'}`,
            name: `${customer.first_name} ${customer.last_name}`,
            barangay: extractBarangay(customer.address),
            meter: customer.meter_number,
            prev: bill.current_reading - bill.consumption,
            pres: bill.current_reading,
            cons: bill.consumption,
            charges: charges,
            arrears: (customer.arrears || 0) - (bill.balance || 0),
            total: bill.balance + penalty, // Fix: Add penalty to the total balance
            penalty: penalty,
            penaltyPerc: penaltyPerc,
            due: bill.due_date || 'N/A',
            prevDate: (customer.history && customer.history[1]) ? customer.history[1].reading_date : (customer.history && customer.history[0] ? customer.history[0].reading_date : 'N/A'),
            currentDate: bill.reading_date,
            readerName: profile ? `${profile.first_name} ${profile.last_name}` : 'Reader'
        });
    }
};

async function saveOffline(reading) {
    try {
        const offlineData = {
            ...reading,
            timestamp: Date.now()
        };
        await saveToIndexedDB(offlineData);
        await updateSyncCount();
        showToast('Offline Log Saved (IndexedDB)', 'info');
        finalizeInput(reading.p_customer_id);

        // Update button to show "Saved Offline"
        const input = document.getElementById(`reading-${reading.p_customer_id}`);
        const btn = input?.parentElement?.querySelector('.btn-save');
        if (btn) {
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span style="color: white; font-weight: 700;">Saved Offline</span>
            `;
            btn.style.background = 'linear-gradient(135deg, #FFB74D 0%, #FFA726 100%)';
            btn.style.boxShadow = '0 4px 12px rgba(255, 183, 77, 0.4)';
        }

        await loadDashboard();
        if (!readingSection.classList.contains('hidden')) {
            await filterAndRenderCustomers();
        }
    } catch (err) {
        console.error('IndexedDB Save Error:', err);
        showToast('Storage Error!', 'error');
    }
}

async function syncData() {
    if (!navigator.onLine || isSyncInProgress) return;

    const readings = await getOfflineReadings();
    if (readings.length === 0) return;

    try {
        isSyncInProgress = true;
        showLoading(true);

        // Stability Delay: Wait 1s for connection to fully stabilize
        // This prevents the common "Failed to fetch" on immediate transition
        await new Promise(r => setTimeout(r, 1000));

        showToast(`Syncing ${readings.length} readings...`, 'info');

        let successCount = 0;
        let failCount = 0;

        for (const item of readings) {
            const { id, timestamp, sortTime, ...payload } = item;

            // Internal retry logic (3 attempts per reading)
            let attempt = 0;
            let currentError = null;
            let success = false;

            while (attempt < 3 && !success) {
                attempt++;
                try {
                    const { error } = await supabase.rpc('generate_bill', payload);
                    if (!error) {
                        await removeReadingFromDB(id);
                        successCount++;
                        success = true;
                    } else {
                        currentError = error;
                        // Don't retry if it's a structural error (e.g., bad data)
                        if (error.code && !error.code.startsWith('5')) break;
                    }
                } catch (e) {
                    currentError = e;
                    console.warn(`Sync attempt ${attempt} failed for ID ${id}:`, e);
                    if (attempt < 3) await new Promise(r => setTimeout(r, 500)); // Brief pause before retry
                }
            }

            if (!success) {
                console.error(`Sync permanently failed for ID ${id}:`, currentError);
                failCount++;
            }
        }

        await updateSyncCount();

        if (failCount === 0) {
            showToast(`Synced ${successCount} readings successfully!`, 'success');
        } else {
            showToast(`Synced ${successCount}, Failed ${failCount}.`, 'warning');
        }

        if (successCount > 0) {
            await loadDashboard();
            if (!readingSection.classList.contains('hidden') && currentAreaBarangays.length > 0) {
                const cachedCustomers = await getCache(STORE_CUSTOMERS);
                if (cachedCustomers && cachedCustomers.length > 0) {
                    currentAreaCustomers = cachedCustomers.filter(c => {
                        return currentAreaBarangays.some(brgy => (c.address || '').toLowerCase().includes(brgy.toLowerCase()));
                    });
                }
                await filterAndRenderCustomers();
            }
        }
    } catch (err) {
        console.error('Sync Process Error:', err);
        showToast('Sync interrupted', 'error');
    } finally {
        isSyncInProgress = false;
        showLoading(false);
    }
}

async function updateSyncCount() {
    const readings = await getOfflineReadings();
    const count = readings.length;

    // Update dashboard counter
    if (pendingSyncCount) pendingSyncCount.innerText = count;
    if (syncBtnAction) syncBtnAction.classList.toggle('hidden', count === 0);

    // Update header indicator
    const pill = document.getElementById('pending-sync-pill');
    if (pill) {
        if (count > 0) {
            pill.classList.remove('hidden');
            pill.innerText = `${count} Pending`;
        } else {
            pill.classList.add('hidden');
        }
    }
}

// Duplicate checkConnection removed to fix status inconsistency.
// State is managed by updateConnectionStatus() defined earlier.

// Remove duplicate listeners if any, app logic handles init


// === UI Helpers ===
// === NAVIGATION SYSTEM ===
function switchView(viewId) {
    console.log(`Switching View to: ${viewId}`);

    // Update View Visibility
    const views = document.querySelectorAll('.app-view');
    views.forEach(v => {
        v.classList.toggle('hidden', v.id !== `${viewId}-view`);
    });

    // Update Bottom Nav Active State
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(t => {
        t.classList.toggle('active', t.dataset.view === viewId);
    });

    // Update Header Context (Subtitle)
    const subtitle = document.getElementById('view-subtitle');
    if (subtitle) {
        switch (viewId) {
            case 'home':
                subtitle.textContent = 'Ready to start your meter reading route?';
                break;
            case 'cutoff':
                subtitle.textContent = 'Accounts marked for disconnection.';
                if (typeof loadCutoffs === 'function') loadCutoffs();
                break;
            case 'history':
                subtitle.textContent = 'Your recent reading activity and logs.';
                if (typeof loadHistory === 'function') loadHistory();
                break;
        }
    }
}

// Data Loaders for New Views
async function loadCutoffs() {
    const list = document.getElementById('cutoff-list');
    if (!list) return;

    list.innerHTML = '<div class="loading-placeholder">Searching records...</div>';

    try {
        const isAdmin = (profile?.role || '').toLowerCase() === 'admin';

        // 1. Identify assigned barangays
        const assignedBrgys = [];
        (assignedAreas || []).forEach(area => {
            (area.barangays || []).forEach(brgy => {
                if (!assignedBrgys.includes(brgy)) assignedBrgys.push(brgy);
            });
        });

        // 2. Strict enforcement for Readers
        if (!isAdmin && assignedBrgys.length === 0) {
            list.innerHTML = `
                <div class="empty-msg" style="padding: 40px 20px;">
                    <i class="fas fa-route" style="font-size: 32px; color: var(--text-muted); margin-bottom: 15px; display: block;"></i>
                    <p style="font-weight: 700; color: var(--text-main);">No Assignments Found</p>
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: 8px;">Please ask your supervisor to assign a route box to your account for today.</p>
                </div>`;
            return;
        }

        const cachedCustomers = await getCache(STORE_CUSTOMERS);
        let cutoffAccounts = (cachedCustomers || [])
            .filter(c => (c.status || '').toLowerCase() === 'inactive');

        // 3. Apply Barangay Filter (unless Admin)
        if (!isAdmin) {
            cutoffAccounts = cutoffAccounts.filter(c =>
                assignedBrgys.some(brgy => (c.address || '').toLowerCase().includes(brgy.toLowerCase()))
            );
        }

        // ... (sorting remains the same)
        cutoffAccounts.sort((a, b) => b.id - a.id);

        // 4. Try to fetch fresher data from server if online
        if (navigator.onLine) {
            try {
                const { data } = await supabase.from('customers')
                    .select('id, first_name, last_name, address, status, updated_at')
                    .eq('status', 'inactive');
                
                if (data && data.length > 0) {
                    let serverAccounts = data;
                    if (!isAdmin) {
                        serverAccounts = serverAccounts.filter(c =>
                            assignedBrgys.some(brgy => (c.address || '').toLowerCase().includes(brgy.toLowerCase()))
                        );
                    }
                    if (serverAccounts.length > 0) cutoffAccounts = serverAccounts;
                }
            } catch (e) { /* use cache fallback */ }
        }

        if (cutoffAccounts.length === 0) {
            list.innerHTML = `
                <div class="empty-msg" style="padding: 40px 20px;">
                    <i class="fas fa-check-circle" style="font-size: 32px; color: #4CAF50; margin-bottom: 15px; display: block;"></i>
                    <p style="font-weight: 700; color: var(--text-main);">All Clear!</p>
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: 8px;">No accounts currently marked for cutoff in your assigned barangays.</p>
                </div>`;
            return;
        }

        // Check locally which ones the reader has already marked done this session
        // Migration: Check the new timestamp-based storage
        const doneCutoffsV2 = JSON.parse(localStorage.getItem('done_cutoffs_v2') || '{}');

        list.innerHTML = cutoffAccounts.map(c => {
            const storedTimestamp = doneCutoffsV2[String(c.id)];
            const serverTimestamp = c.updated_at;
            
            // isDone if we have a stored timestamp AND it's not older than the server's update
            const isDone = storedTimestamp && serverTimestamp && new Date(storedTimestamp) >= new Date(serverTimestamp);

            return `
            <div class="modern-card customer-card-cutoff ${isDone ? 'cutoff-done' : ''}" data-id="${c.id}">
                <div class="card-info">
                    <h4>${c.first_name} ${c.last_name}</h4>
                    <p>${c.address || 'No address provided'}</p>
                    <div class="card-meta">
                        <span class="badge badge-error">CUTOFF</span>
                        ${c.arrears ? `<span class="price-pill">ARREARS: ₱${parseFloat(c.arrears || 0).toLocaleString()}</span>` : ''}
                    </div>
                </div>
                ${isDone
                    ? `<span class="cutoff-done-badge">✓ Done</span>`
                    : `<button class="btn-cutoff-done" onclick="handleCutoffDone('${c.id}', '${c.first_name} ${c.last_name}', '${c.updated_at}')">Mark Done</button>`
                }
            </div>
        `}).join('');
    } catch (err) {
        console.error('Load Cutoffs Error:', err);
        list.innerHTML = '<div class="empty-msg">Error loading accounts.</div>';
    }
}

async function handleCutoffDone(customerId, customerName, updatedAt) {
    if (!confirm(`Confirm cutoff completed for ${customerName}?`)) return;

    showLoading(true);
    try {
        // Record in localStorage V2 with timestamp (for reset logic)
        const doneV2 = JSON.parse(localStorage.getItem('done_cutoffs_v2') || '{}');
        doneV2[String(customerId)] = updatedAt || new Date().toISOString();
        localStorage.setItem('done_cutoffs_v2', JSON.stringify(doneV2));

        // If online, log a notification for the admin
        if (navigator.onLine) {
            const readerName = (profile && profile.first_name) 
                || currentUser?.user_metadata?.full_name
                || currentUser?.email
                || 'A reader';

            await supabase.from('notifications').insert({
                type: 'cutoff_done',
                message: `${readerName} completed cutoff for ${customerName}`,
                customer_id: customerId
            });
        }

        showLoading(false);
        showToast(`Cutoff recorded for ${customerName}`);
        loadCutoffs();
        updateCutoffBadge(); // Update badge after marking done
    } catch (err) {
        showLoading(false);
        console.error('Cutoff Action Error:', err);
        showToast('Error recording cutoff', 'error');
    } finally {
        showLoading(false);
    }
}

async function updateCutoffBadge() {
    const badge = document.getElementById('cutoff-badge');
    if (!badge) return;

    try {
        const isAdmin = (profile?.role || '').toLowerCase() === 'admin';
        
        // Use cached data to avoid flickering, realtime will refresh cache/badge
        const cachedCustomers = await getCache(STORE_CUSTOMERS);
        if (!cachedCustomers) return;

        const assignedBrgys = [];
        (assignedAreas || []).forEach(area => {
            (area.barangays || []).forEach(brgy => {
                if (!assignedBrgys.includes(brgy)) assignedBrgys.push(brgy);
            });
        });

        const cutoffAccounts = cachedCustomers.filter(c => {
            // Check status
            if ((c.status || '').toLowerCase() !== 'inactive') return false;
            
            // Check assigned area (if reader)
            if (!isAdmin) {
                const isAssigned = assignedBrgys.some(brgy => 
                    (c.address || '').toLowerCase().includes(brgy.toLowerCase())
                );
                if (!isAssigned) return false;
            }

            // Check if already done in this session
            const doneCutoffsV2 = JSON.parse(localStorage.getItem('done_cutoffs_v2') || '{}');
            const storedTimestamp = doneCutoffsV2[String(c.id)];
            const serverTimestamp = c.updated_at;
            const isDone = storedTimestamp && serverTimestamp && new Date(storedTimestamp) >= new Date(serverTimestamp);
            
            return !isDone;
        });

        const pendingCount = cutoffAccounts.length;
        if (pendingCount > 0) {
            badge.textContent = pendingCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (err) {
        console.error('Update Cutoff Badge Error:', err);
    }
}

// Global initialization for realtime in webapp
function initRealtime() {
    if (typeof subscribeToTable === 'function') {
        if (!navigator.onLine) return; // Don't bother subscribing if offline

        console.log('[Realtime] Initializing WebApp listeners...');
        
        // Listen for customer changes (new cutoffs)
        subscribeToTable('customers', (payload) => {
            console.log('[Realtime] Customer event received:', payload.eventType);
            // Reload dashboard data to get fresh counts/status
            loadDashboard(); 

            // If user is currently looking at cutoffs, refresh that view too
            if (cutoffSection && !cutoffSection.classList.contains('hidden')) {
                loadCutoffs();
            }
        });

        // Listen for new bills (might trigger arrears/cutoff status)
        subscribeToTable('billing', (payload) => {
            console.log('[Realtime] Billing event received:', payload.eventType);
            loadDashboard();

            if (cutoffSection && !cutoffSection.classList.contains('hidden')) {
                loadCutoffs();
            }
        });
    } else {
        console.warn('[Realtime] subscribeToTable not found during initRealtime');
    }
}

async function loadHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;

    list.innerHTML = '<div class="loading-placeholder">Compiling history...</div>';

    try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // 1. Get Offline Unsynced Readings
        const offline = await getOfflineReadings() || [];
        
        // 2. Get Today's Synced Readings (from server or cache if offline)
        let todaySynced = [];
        if (navigator.onLine) {
            const { data: bills, error: billsError } = await supabase
                .from('billing')
                .select('*')
                .eq('reading_date', todayStr)
                .order('id', { ascending: false });
            
            if (!billsError && bills && bills.length > 0) {
                const customerIds = [...new Set(bills.map(b => b.customer_id))];
                const { data: customers } = await supabase
                    .from('customers')
                    .select('id, first_name, last_name, address')
                    .in('id', customerIds);
                
                const customerMap = {};
                (customers || []).forEach(c => { customerMap[c.id] = c; });

                todaySynced = bills.map(b => ({
                    ...b,
                    customer: customerMap[b.customer_id]
                }));
            }
        } else {
            // If offline, check our customer cache for today's readings
            const cachedCustomers = await getCache(STORE_CUSTOMERS);
            (cachedCustomers || []).forEach(c => {
                const todayBill = (c.history || []).find(h => h.reading_date === todayStr);
                if (todayBill) {
                    todaySynced.push({
                        ...todayBill,
                        customer: {
                            first_name: c.first_name,
                            last_name: c.last_name,
                            address: c.address
                        }
                    });
                }
            });
        }

        // 3. Merge and Format
        const allLogs = [
            ...offline.map(o => ({
                ...o,
                status: 'pending',
                sortTime: o.timestamp || Date.now(),
                display_name: o.p_customer_name || `Customer #${o.p_customer_id}`,
                display_date: new Date(o.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })),
            ...todaySynced.map(s => {
                let timeStr = 'N/A';
                let sortTime = Date.now();
                
                if (s.updated_at) {
                    let dStr = s.updated_at;
                    if (typeof dStr === 'string' && !dStr.includes('Z') && !dStr.includes('+')) {
                        // Ensure it's treated as UTC if no timezone is present
                        dStr = dStr.replace(' ', 'T') + 'Z';
                    }
                    const d = new Date(dStr);
                    timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    sortTime = d.getTime();
                } else if (s.reading_date) {
                    timeStr = `--:--`;
                    sortTime = new Date(s.reading_date).getTime();
                }

                return {
                    ...s,
                    status: 'synced',
                    sortTime: sortTime,
                    display_name: s.customer ? `${s.customer.first_name} ${s.customer.last_name}` : `Customer #${s.customer_id}`,
                    display_date: timeStr
                };
            })
        ].sort((a, b) => b.sortTime - a.sortTime);

        if (allLogs.length === 0) {
            list.innerHTML = '<div class="empty-msg">No activity recorded today yet.</div>';
            return;
        }

        list.innerHTML = allLogs.map(log => `
            <div class="history-item ${log.status}">
                <div class="history-marker"></div>
                <div class="history-content">
                    <div class="history-header">
                        <span class="history-time">${log.display_date}</span>
                    </div>
                    <div class="history-card" onclick="viewHistoricalReceipt(${log.id})">
                        <div class="history-info">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <h4>${log.display_name}</h4>
                                <span class="history-status-tag">${log.status.toUpperCase()}</span>
                            </div>
                            <p>${log.consumption || log.p_consumption || 0} cu.m. consumed • ₱${(log.amount || log.p_amount || 0).toFixed(2)}</p>
                        </div>
                        <div class="btn-view-log">View</div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Load History Error:', err);
        list.innerHTML = '<div class="empty-msg">Error loading history logs.</div>';
    }
}

// Helper to view receipt from history
async function viewHistoricalReceipt(billId) {
    showLoading(true);
    try {
        let billData;
        if (navigator.onLine) {
            const { data: bill, error: billError } = await supabase
                .from('billing')
                .select('*')
                .eq('id', billId)
                .single();
            
            if (!billError && bill) {
                const { data: customer } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('id', bill.customer_id)
                    .single();
                
                billData = { ...bill, customer };
            }
        } else {
            const cachedCustomers = await getCache(STORE_CUSTOMERS);
            for (const c of cachedCustomers) {
                const found = (c.history || []).find(h => h.id == billId);
                if (found) {
                    billData = { ...found, customer: c };
                    break;
                }
            }
        }

        if (billData) {
            // Find prev date from customer history
            const history = (billData.customer.history || []);
            const currentIdx = history.findIndex(h => h.id == billData.id || h.reading_date === billData.reading_date);
            const prevBill = currentIdx !== -1 ? history[currentIdx + 1] : null;

            const receiptData = {
                receiptNo: `RCP-${new Date(billData.reading_date).getFullYear()}-${billData.id || 'N/A'}`,
                name: `${billData.customer.first_name} ${billData.customer.last_name}`,
                barangay: billData.customer.address ? extractBarangay(billData.customer.address) : 'N/A',
                meter: billData.customer.meter_number,
                prev: billData.previous_reading || 0,
                pres: billData.current_reading || 0,
                cons: billData.consumption || 0,
                charges: {
                    base: billData.base_charge || 0,
                    consumption: billData.consumption_charge || 0,
                    total: (billData.base_charge || 0) + (billData.consumption_charge || 0),
                    discount: billData.discount_amount || 0
                },
                arrears: billData.arrears || 0,
                total: billData.amount || 0,
                penalty: billData.penalty || 0,
                penaltyPerc: systemSettings ? (parseFloat(systemSettings.penalty_percentage) || 20) : 20,
                due: billData.due_date,
                prevDate: prevBill ? prevBill.reading_date : 'N/A',
                currentDate: billData.reading_date,
                readerName: profile ? `${profile.first_name} ${profile.last_name}` : 'Reader'
            };
            showReceipt(receiptData);
        } else {
            showToast('Receipt details not found in cache.', 'error');
        }
    } catch (err) {
        console.error('View Receipt Error:', err);
        showToast('Error loading receipt', 'error');
    } finally {
        showLoading(false);
    }
}

function updateUIState() {
    if (currentUser && profile) {
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        switchView('home'); // Default to home view on login
        updateConnectionStatus();
    } else {
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        readingSection.classList.add('hidden');
    }
}

function showLoading(show) { loading.classList.toggle('hidden', !show); }

function showToast(message, type = 'info') {
    // Prevent duplicate toasts
    const existingToasts = Array.from(toastContainer.children);
    const isDuplicate = existingToasts.some(toast => toast.textContent.trim() === message);

    if (isDuplicate) {
        // If duplicate exists, just shake the existing one
        const existingToast = existingToasts.find(toast => toast.textContent.trim() === message);
        existingToast.style.animation = 'none';
        setTimeout(() => {
            existingToast.style.animation = 'slideInRight 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
        }, 10);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `modern-toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.transform = 'translateY(-100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// === PASSWORD VISIBILITY TOGGLE ===
function initPasswordToggles() {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        if (input.dataset.passwordToggleInit) return;
        input.dataset.passwordToggleInit = "true";

        let wrapper = input.parentElement;
        if (!wrapper.classList.contains('password-wrapper')) {
            wrapper = document.createElement('div');
            wrapper.className = 'password-wrapper';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
        }

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'toggle-password';
        toggle.setAttribute('aria-label', 'Toggle password visibility');
        toggle.innerHTML = '<i class="fas fa-eye"></i>';
        wrapper.appendChild(toggle);

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const start = input.selectionStart;
            const end = input.selectionEnd;
            const isPassword = input.type === 'password';

            input.type = isPassword ? 'text' : 'password';

            input.focus();
            if (start !== null && end !== null) {
                input.setSelectionRange(start, end);
            }

            const icon = toggle.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
        });
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initPasswordToggles);
window.initPasswordToggles = initPasswordToggles;
