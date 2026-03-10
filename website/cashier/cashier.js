// Cashier Dashboard Logic

let logSortConfig = { key: 'date', order: 'desc' };
let logDataCache = [];
let customerSortConfig = { key: 'id', order: 'asc' };
let currentCashierLedgerCustomerId = null; // Track which customer's ledger is open

function initializeSorting() {
    // Customer Table Sorting
    const customerHeaders = {
        'sortAccount': 'id',
        'sortName': 'last_name'
    };

    Object.entries(customerHeaders).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
                if (customerSortConfig.key === key) {
                    customerSortConfig.order = customerSortConfig.order === 'asc' ? 'desc' : 'asc';
                } else {
                    customerSortConfig.key = key;
                    customerSortConfig.order = 'asc';
                }
                updateSortIndicators('customerTable', customerSortConfig);
                refreshCustomers();
            });
        }
    });
}

function updateSortIndicators(tableId, config) {
    const headers = document.querySelectorAll(`#${tableId} .sort-icon`);
    headers.forEach(icon => icon.className = 'fas fa-sort sort-icon');

    const activeHeader = document.querySelector(`[data-sort-key="${config.key}"] .sort-icon`);
    if (activeHeader) {
        activeHeader.className = `fas fa-sort-${config.order === 'asc' ? 'up' : 'down'} sort-icon active`;
    }
}

function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    // Sidebar Mini-Toggle Logic (Desktop)
    if (sidebarToggle && sidebar) {
        // Load preference
        const isMini = localStorage.getItem('sidebar-pinned-mini') === 'true';
        if (isMini && window.innerWidth > 1024) {
            sidebar.classList.add('mini');
        }

        sidebarToggle.addEventListener('click', () => {
            if (window.innerWidth > 1024) {
                sidebar.classList.add('is-animating'); // Lock tooltips
                sidebar.classList.toggle('mini');

                // Remove lock after transition
                setTimeout(() => {
                    sidebar.classList.remove('is-animating');
                }, 400); // Matches CSS transition duration

                localStorage.setItem('sidebar-pinned-mini', sidebar.classList.contains('mini'));
            } else {
                sidebar.classList.remove('active');
            }
        });
    }

    // Mobile Menu
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
        });
    }

    // Close when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && sidebar.classList.contains('active')) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn?.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

function refreshCustomers() {
    const search = document.getElementById('customerSearch')?.value || '';
    const status = document.getElementById('customerStatusFilter')?.value || '';
    const type = document.getElementById('customerTypeFilter')?.value || '';
    const barangay = document.getElementById('customerBarangayFilter')?.value || '';

    // Call global loadCustomers from database.js
    if (window.dbOperations && typeof window.dbOperations.loadCustomers === 'function') {
        window.dbOperations.loadCustomers({
            search,
            status,
            type,
            barangay,
            sortBy: customerSortConfig.key,
            sortOrder: customerSortConfig.order,
            hideActions: true
        });
    }
}

/**
 * Trigger refresh of Ledger views (Master or Individual)
 */
function refreshCashierLedger() {
    // 1. Refresh Master ledger if function exists
    if (typeof window.updateCashierLedger === 'function') {
        window.updateCashierLedger();
    }

    // 2. Refresh Individual Card if open
    if (currentCashierLedgerCustomerId && window.dbOperations && window.dbOperations.loadLedgerCard) {
        console.log(`[Realtime] Refreshing Cashier Ledger Card for Customer ${currentCashierLedgerCustomerId}`);
        window.dbOperations.loadLedgerCard(currentCashierLedgerCustomerId);
    }
}

async function loadUserProfile() {
    try {
        // Use the secure check from staff-auth.js
        const profile = await checkStaffAuth();

        if (!profile) return; // checkStaffAuth handles redirect if no profile/session

        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRole');
        const avatarEl = document.getElementById('userAvatar');

        // Update UI
        if (nameEl) nameEl.textContent = `${profile.first_name} ${profile.last_name}`;
        if (roleEl) roleEl.textContent = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
        if (avatarEl) avatarEl.textContent = (profile.first_name || 'U').charAt(0).toUpperCase();

        // Admin Override (Visual indicator)
        if (profile.role === 'admin') {
            if (roleEl) roleEl.textContent = 'Admin Mode (Cashier View)';
        }

    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeSidebar();
    initializeNavigation();
    initializeMobileMenu();
    initializeLogout();
    initializeTheme();

    // Initial data load
    setTimeout(() => {
        initializeSorting();
        loadInitialData();
    }, 100);

    // Search and Filter Hooks
    const custSearch = document.getElementById('customerSearch');
    const custStatusFilter = document.getElementById('customerStatusFilter');
    const custTypeFilter = document.getElementById('customerTypeFilter');

    if (custSearch) {
        custSearch.addEventListener('input', debounce(() => refreshCustomers(), 300));
    }
    if (custStatusFilter) {
        custStatusFilter.addEventListener('change', () => refreshCustomers());
    }
    if (custTypeFilter) {
        custTypeFilter.addEventListener('change', () => refreshCustomers());
    }

    const billSearch = document.getElementById('billingSearch');
    const billStatusFilter = document.getElementById('billingStatusFilter');
    const billMonthFilter = document.getElementById('billingMonthFilter');
    const billBarangayFilter = document.getElementById('billingBarangayFilter');

    if (billSearch) {
        billSearch.addEventListener('input', debounce(() => loadBilling(), 300));
    }
    if (billStatusFilter) {
        billStatusFilter.addEventListener('change', () => loadBilling());
    }
    if (billMonthFilter) {
        billMonthFilter.addEventListener('change', () => loadBilling());
    }
    if (billBarangayFilter) {
        billBarangayFilter.addEventListener('change', () => loadBilling());
    }

    // Records Filters
    const logSearch = document.getElementById('logSearch');
    const logDateFrom = document.getElementById('logDateFrom');
    const logDateTo = document.getElementById('logDateTo');
    const logBarangayFilter = document.getElementById('logBarangayFilter');

    if (logSearch) {
        logSearch.addEventListener('input', () => loadCollectionRecords());
    }
    if (logDateFrom) {
        logDateFrom.addEventListener('change', () => loadCollectionRecords());
    }
    if (logDateTo) {
        logDateTo.addEventListener('change', () => loadCollectionRecords());
    }
    if (logBarangayFilter) {
        logBarangayFilter.addEventListener('change', () => loadCollectionRecords());
    }

    // Barangay Filters
    const custBarangayFilter = document.getElementById('customerBarangayFilter');

    // Populate Barangay Dropdowns
    const barangayList = [
        'Zone 1', 'Zone 1-A', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 4-A',
        'Zone 5', 'Zone 6', 'Zone 7', 'Canjusa', 'Utod', 'Pag-ayon',
        'Palaka Norte', 'Palaka Sur', 'Mabini', 'Tapong', 'Crossing', 'Ubay', 'Poblacion'
    ];
    const barangayOptions = barangayList.map(b => `<option value="${b}">${b}</option>`).join('');
    if (custBarangayFilter) {
        custBarangayFilter.innerHTML = '<option value="">All Barangays</option>' + barangayOptions;
        custBarangayFilter.addEventListener('change', () => refreshCustomers());
    }
    if (billBarangayFilter && billBarangayFilter.options.length <= 1) {
        billBarangayFilter.innerHTML = '<option value="">All Barangays</option>' + barangayOptions;
    }
    if (logBarangayFilter && logBarangayFilter.options.length <= 1) {
        logBarangayFilter.innerHTML = '<option value="">All Barangays</option>' + barangayOptions;
    }
});

async function loadInitialData() {
    try {
        if (!supabase) {
            console.error('Supabase client not ready');
            return;
        }

        console.log('Loading Cashier data...');
        await Promise.all([
            loadUserProfile(),
            loadCashierStats(),
            loadRecentCollections(),
            refreshCustomers(),
            loadBilling(),
            // loadPaymentsQueue(), // DISABLED: online_payments table removed
            loadBillingMonths(),
            loadCollectionRecords()
        ]);

        hideLoadingOverlay();
    } catch (error) {
        console.error('Error loading initial data:', error);
        hideLoadingOverlay();
    }

    // ===== SETUP REALTIME SUBSCRIPTIONS =====
    setupRealtimeSubscriptions();
}

function setupRealtimeSubscriptions() {
    if (!window.subscribeToTable) {
        console.error('[Realtime] subscribeToTable not available - check supabase-config.js loaded');
        return;
    }

    console.log('[Realtime] Setting up Cashier subscriptions...');

    // Subscribe to customers table
    subscribeToTable('customers', (payload) => {
        console.log('[Realtime] Customers table changed, reloading...', payload);
        refreshCustomers();
        refreshCashierLedger(); // Live refresh for Ledger!
        // Small delay for DELETE to ensure DB is updated
        setTimeout(() => loadCashierStats(), 100);
    });

    // Subscribe to billing table
    subscribeToTable('billing', (payload) => {
        console.log('[Realtime] Billing table changed, reloading...', payload);

        // Refresh everything
        loadBilling();
        loadCashierStats();
        loadRecentCollections();
        refreshCashierLedger(); // Live refresh for Ledger!

        // Also refresh records if we are on that page
        if (typeof loadCollectionRecords === 'function') {
            loadCollectionRecords();
        }
    });

    // Subscribe to staff table (for user profile updates)
    subscribeToTable('staff', () => {
        loadUserProfile();
    });

    // Subscribe to system_settings (for rate/policy changes)
    subscribeToTable('system_settings', () => {
        console.log('[Realtime] Settings changed, updating stats...');
        loadCashierStats();
    });

    console.log('[Realtime] Cashier subscriptions setup complete');
}


function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('fade-out');
}

// === CHART MANAGEMENT ===
let paymentStatusChart = null;
let dailyTrendChart = null;

function updateCashierChart(stats) {
    const ctxPayment = document.getElementById('paymentStatusChart')?.getContext('2d');
    if (!ctxPayment || !stats) return;

    const statusValues = [stats.paid, stats.unpaid, stats.overdue];
    const total = statusValues.reduce((a, b) => a + b, 0);

    if (paymentStatusChart) {
        paymentStatusChart.data.datasets[0].data = statusValues;
        paymentStatusChart.options.plugins.centerText.text = total.toString();
        paymentStatusChart.update();
    } else {
        // Register a custom plugin for the center text (same as Admin)
        const centerTextPlugin = {
            id: 'centerText',
            text: total.toString(),
            afterDraw: (chart) => {
                const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;
                ctx.save();

                // Draw "TOTAL" label
                ctx.font = '500 12px Inter';
                ctx.fillStyle = '#64748B';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('TOTAL BILLS', width / 2, height / 2 - 15 + top);

                // Draw the count
                ctx.font = 'bold 36px Inter';
                ctx.fillStyle = document.documentElement.classList.contains('dark-theme') ? '#F9FAFB' : '#1E293B';
                ctx.fillText(chart.config.options.plugins.centerText.text, width / 2, height / 2 + 18 + top);

                ctx.restore();
            }
        };

        paymentStatusChart = new Chart(ctxPayment, {
            type: 'doughnut',
            plugins: [centerTextPlugin],
            data: {
                labels: ['Paid', 'Unpaid', 'Overdue'],
                datasets: [{
                    data: statusValues,
                    backgroundColor: [
                        '#10B981', // Emerald 500
                        '#F59E0B', // Amber 500
                        '#EF4444'  // Red 500
                    ],
                    hoverBackgroundColor: [
                        '#059669', // Emerald 600
                        '#D97706', // Amber 600
                        '#DC2626'  // Red 600
                    ],
                    borderWidth: 0,
                    hoverOffset: 15,
                    borderRadius: 4,
                    spacing: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { family: 'Inter', size: 12 },
                            color: '#64748B'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                        cornerRadius: 8
                    },
                    centerText: {
                        text: total.toString()
                    }
                },
                cutout: '80%',
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
    }
}

function updateDailyTrendChart(data) {
    const ctxTrend = document.getElementById('dailyTrendChart')?.getContext('2d');
    if (!ctxTrend || !data) return;

    if (dailyTrendChart) {
        dailyTrendChart.data.labels = data.labels;
        dailyTrendChart.data.datasets[0].data = data.amounts;
        dailyTrendChart.data.datasets[1].data = data.counts;
        dailyTrendChart.update();
    } else {
        dailyTrendChart = new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Revenue (₱)',
                        data: data.amounts,
                        borderColor: '#0288D1',
                        backgroundColor: 'rgba(2, 136, 209, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y',
                        order: 1
                    },
                    {
                        type: 'bar',
                        label: 'Payments Count',
                        data: data.counts,
                        backgroundColor: 'rgba(245, 158, 11, 0.5)',
                        borderColor: '#F59E0B',
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: 'y1',
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: { family: 'Inter', size: 12 },
                            color: '#64748B'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Inter', size: 11 }, color: '#64748B', padding: 10 }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Revenue (₱)', font: { family: 'Inter', size: 11, weight: '600' }, color: '#64748B' },
                        grid: { color: 'rgba(148, 163, 184, 0.05)' },
                        ticks: { font: { family: 'Inter', size: 11 }, color: '#64748B' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Payment Count', font: { family: 'Inter', size: 11, weight: '600' }, color: '#64748B' },
                        grid: { drawOnChartArea: false },
                        ticks: { font: { family: 'Inter', size: 11 }, color: '#64748B' }
                    }
                }
            }
        });
    }
}

async function loadCashierStats() {
    try {
        const { count: customersCount } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        const { data: unpaid } = await supabase
            .from('billing')
            .select('id, balance')
            .eq('status', 'unpaid');

        const { data: overdue } = await supabase
            .from('billing')
            .select('id, balance')
            .eq('status', 'overdue');

        const { data: paid } = await supabase
            .from('billing')
            .select('id')
            .eq('status', 'paid');

        // Get today's date range in local timezone (PHT)
        const todayStr = getLocalISODate();
        const todayStart = `${todayStr}T00:00:00.000Z`; // Note: Supabase compares in UTC, so we should be careful. 
        // Wait, if updated_at is timestamptz, '2026-02-13T00:00:00.000' without Z is interpreted by Supabase? 
        // Actually, the most reliable way is PHT start/end.
        const phtStart = `${todayStr}T00:00:00+08:00`;
        const phtEnd = `${todayStr}T23:59:59+08:00`;

        const { data: collections } = await supabase
            .from('billing')
            .select('amount')
            .eq('status', 'paid')
            .gte('updated_at', phtStart)
            .lte('updated_at', phtEnd);

        document.getElementById('statTotalCustomers').textContent = (customersCount || 0).toLocaleString();

        // Unpaid
        const unpaidCount = unpaid ? unpaid.length : 0;
        const unpaidTotal = unpaid ? unpaid.reduce((sum, b) => sum + (parseFloat(b.balance) || 0), 0) : 0;
        document.getElementById('statUnpaidBills').textContent = unpaidCount.toLocaleString();
        document.getElementById('statUnpaidAmount').textContent = `₱${unpaidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        // Overdue
        const overdueCount = overdue ? overdue.length : 0;
        const overdueTotal = overdue ? overdue.reduce((sum, b) => sum + (parseFloat(b.balance) || 0), 0) : 0;
        document.getElementById('statOverdueBills').textContent = overdueCount.toLocaleString();
        document.getElementById('statOverdueAmount').textContent = `₱${overdueTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        const collectedToday = collections ? collections.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0) : 0;
        document.getElementById('statCollectedToday').textContent = `₱${collectedToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        // Update real-time chart (Pie)
        updateCashierChart({
            paid: paid ? paid.length : 0,
            unpaid: unpaid ? unpaid.length : 0,
            overdue: overdue ? overdue.length : 0
        });

        // Update real-time chart (Daily Trend - Last 7 Days)
        // Create a proper PHT start-of-day for 7 days ago
        const now = new Date(`${todayStr}T00:00:00+08:00`);
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        const { data: trendData } = await supabase
            .from('billing')
            .select('amount, updated_at')
            .eq('status', 'paid')
            .gte('updated_at', sevenDaysAgo.toISOString())
            .order('updated_at', { ascending: true });

        // Aggregate by day
        const dailyStats = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', timeZone: 'Asia/Manila' });
            dailyStats[dateStr] = { amount: 0, count: 0 };
        }

        trendData?.forEach(bill => {
            const dateStr = new Date(bill.updated_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', timeZone: 'Asia/Manila' });
            if (dailyStats[dateStr]) {
                dailyStats[dateStr].amount += parseFloat(bill.amount) || 0;
                dailyStats[dateStr].count += 1;
            }
        });

        const labels = Object.keys(dailyStats);
        updateDailyTrendChart({
            labels: labels,
            amounts: labels.map(l => dailyStats[l].amount),
            counts: labels.map(l => dailyStats[l].count)
        });

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRecentCollections() {
    const body = document.getElementById('recentCollectionsBody');
    try {
        // 1. Fetch recent paid bills
        const { data: bills, error: billsError } = await supabase
            .from('billing')
            .select('*')
            .eq('status', 'paid')
            .order('id', { ascending: false })
            .limit(5);

        if (billsError) throw billsError;

        if (!bills || bills.length === 0) {
            body.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #9E9E9E;">No recent collections.</td></tr>';
            return;
        }

        // 2. Fetch related customers
        const customerIds = [...new Set(bills.map(b => b.customer_id))];
        const { data: customers, error: customerError } = await supabase
            .from('customers')
            .select('id, first_name, last_name, status')
            .in('id', customerIds);

        if (customerError) throw customerError;

        // Create a map
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c;
        });

        body.innerHTML = bills.map(bill => {
            const customer = customerMap[bill.customer_id] || { first_name: 'Unknown', last_name: 'Customer' };
            const isInactive = (customer.status || '').toLowerCase() === 'inactive';
            return `
                <tr class="${isInactive ? 'status-inactive' : ''}">
                    <td>${customer.last_name}, ${customer.first_name}${isInactive ? ' <span class="badge-deactivated">DEACTIVATED</span>' : ''}</td>
                    <td class="text-success">₱${parseFloat(bill.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td class="mono">#BIL-${String(bill.id).padStart(4, '0')}</td>
                    <td>${formatLocalDateTime(bill.updated_at, false)}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading recent collections:', error);
    }
}


async function loadBilling() {
    const body = document.getElementById('billingTableBody');
    const search = document.getElementById('billingSearch')?.value || '';
    const status = document.getElementById('billingStatusFilter')?.value || '';
    const period = document.getElementById('billingMonthFilter')?.value || '';
    const barangay = document.getElementById('billingBarangayFilter')?.value || '';

    try {
        // 1. Fetch bills and settings
        const [billsRes, settingsRes] = await Promise.all([
            supabase.from('billing').select('*').order('id', { ascending: false }),
            window.cashierDb.loadSystemSettings()
        ]);

        const bills = billsRes.data;
        const settings = settingsRes;

        if (billsRes.error) throw billsRes.error;

        if (!bills || bills.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #9E9E9E;">No billing records found.</td></tr>';
            return;
        }

        // Auto-update overdue status and calculate cutoff threshold
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const cutoffGrace = settings ? (settings.cutoff_days || settings.cutoff_grace_period || 30) : 30;

        for (const bill of bills) {
            if (bill.status === 'unpaid' && new Date(bill.due_date) < today) {
                bill.status = 'overdue';
                supabase.from('billing').update({ status: 'overdue' }).eq('id', bill.id);
            }
        }

        // Apply Filters client-side (Robust to schema differences)
        const filteredBills = bills.filter(bill => {
            if (status) {
                if (status.toLowerCase() === 'cutoff') {
                    if (bill.status !== 'overdue' || !bill.due_date) return false;
                    const dueDate = new Date(bill.due_date);
                    dueDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                    if (diffDays < cutoffGrace) return false;
                } else if ((bill.status || '').toLowerCase() !== status.toLowerCase()) {
                    return false;
                }
            }
            if (period && (bill.billing_period || '').toLowerCase() !== period.toLowerCase()) return false;

            // First pass filtering for status and period only.
            // Search filtering is handled in the second pass after customer data is loaded.
            return true;
        });

        if (filteredBills.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #9E9E9E;">No billing records match filters.</td></tr>';
            return;
        }

        // 2. Fetch related customers (including address for barangay filtering)
        const searchCustomerIds = [...new Set(filteredBills.map(b => b.customer_id))];
        const { data: searchCustomers, error: searchCustomerError } = await supabase
            .from('customers')
            .select('id, first_name, last_name, meter_number, address, status')
            .in('id', searchCustomerIds);

        if (searchCustomerError) throw searchCustomerError;

        const searchCustomerMap = {};
        searchCustomers.forEach(c => { searchCustomerMap[c.id] = c; });

        // Final Search & Barangay Filter (checks names and address)
        const finalResults = filteredBills.filter(bill => {
            const billIdStr = bill.id.toString();
            const formattedBillId = `#BIL-${billIdStr.padStart(4, '0')}`.toLowerCase();
            const customer = searchCustomerMap[bill.customer_id] || {};
            const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
            const meterNo = (customer.meter_number || '').toLowerCase();
            const accountId = customer.id ? getAccountID(customer.id).toLowerCase() : '';
            const address = (customer.address || '').toLowerCase();

            // Barangay filter
            if (barangay && !address.includes(barangay.toLowerCase())) return false;

            if (!search) return true;
            const term = search.toLowerCase();

            return (
                billIdStr.includes(term) ||
                formattedBillId.includes(term) ||
                fullName.includes(term) ||
                meterNo.includes(term) ||
                accountId.includes(term)
            );
        });

        if (finalResults.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #9E9E9E;">No billing records match search.</td></tr>';
            return;
        }

        body.innerHTML = finalResults.map(bill => {
            const customer = searchCustomerMap[bill.customer_id] || { first_name: 'Unknown', last_name: 'Customer' };
            const isInactive = (customer.status || '').toLowerCase() === 'inactive'; // New logic
            let statusClass = 'status-warning';
            if (bill.status === 'paid') statusClass = 'status-paid';
            if (bill.status === 'overdue') statusClass = 'status-danger';
            if (bill.status === 'unpaid') statusClass = 'status-unpaid';

            const isOverdue = bill.status === 'overdue' || bill.status === 'unpaid';
            let isForCutoff = false;
            
            if (isOverdue && bill.due_date) {
                const dueDate = new Date(bill.due_date);
                dueDate.setHours(0, 0, 0, 0);
                const diffTime = today - dueDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                isForCutoff = diffDays >= cutoffGrace;
            }

            return `
                <tr class="${isInactive ? 'status-inactive' : ''}">
                    <td class="mono">#BIL-${String(bill.id).padStart(4, '0')}</td>
                    <td>
                        <div class="customer-column">
                            <span class="customer-name">${customer.last_name}, ${customer.first_name}</span>
                            ${isInactive ? '<span class="badge-deactivated">DEACTIVATED</span>' : ''}
                            <div class="customer-meta">
                                <span class="customer-acc-id mono" style="color: var(--text-light); font-size: 0.75rem;">${getAccountID(customer.id)}</span>
                                <span class="meta-sep" style="opacity: 0.3; margin: 0 2px;">•</span>
                                <span class="barangay-mini" style="color: var(--text-light); font-size: 0.75rem;">${getBarangay(customer.address)}</span>
                            </div>
                        </div>
                    </td>
                    <td>${formatLocalDateTime(bill.reading_date, false)}</td>
                    <td class="text-primary">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            ₱${parseFloat(bill.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            ${bill.balance > 0 ? `
                                <div class="balance-info-trigger">
                                    <i class="fas fa-info-circle" style="font-size: 0.85rem; cursor: help; opacity: 0.7; color: var(--cashier-primary);"></i>
                                    <div class="balance-tooltip">
                                        <div class="tooltip-header">Balance Breakdown</div>
                                        <div class="tooltip-row">
                                            <span>Current Charge</span> 
                                            <span>₱${(parseFloat(bill.base_charge || 0) + parseFloat(bill.consumption_charge || 0) || (parseFloat(bill.amount) - parseFloat(bill.arrears || 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div class="tooltip-row">
                                            <span>Arrears</span> 
                                            <span>₱${parseFloat(bill.arrears || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div class="tooltip-footer">
                                            <span>Subtotal</span>
                                            <span>₱${parseFloat(bill.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge-status ${statusClass}">${(bill.status || '').toUpperCase()}</span>
                            ${isForCutoff ? `
                                <div class="balance-info-trigger" style="margin-left: 0;">
                                    <i class="fas fa-exclamation-triangle text-danger" style="cursor: pointer; animation: pulse 2s infinite;"></i>
                                    <div class="balance-tooltip" style="width: 180px;">
                                        <div class="tooltip-header" style="color: #ef4444; border-bottom-color: rgba(239, 68, 68, 0.2);">Disconnection Alert</div>
                                        <div class="tooltip-row" style="margin-bottom: 0;">
                                            <span>Status</span>
                                            <span style="color: #ef4444; font-weight: 800;">FOR CUTOFF</span>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="actions" style="display: flex; gap: 8px;">
                            ${bill.status !== 'paid' ? `
                                <button class="btn btn-sm btn-primary" onclick="window.cashierComponents.showPaymentModal('${bill.id}')">
                                    <i class="fas fa-cash-register"></i> Pay
                                </button>
                            ` : `
                                <button class="btn btn-sm btn-outline" onclick="window.showBillModal('${bill.id}')">
                                    <i class="fas fa-print"></i> Receipt
                                </button>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading billing:', error.message || error);
        showNotification('Failed to load billing records', 'error');
    }
}

// === NAVIGATION ===
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const pageName = item.dataset.page;

                // Update active state
                navItems.forEach(n => n.classList.remove('active'));
                pages.forEach(p => p.classList.remove('active'));

                item.classList.add('active');
                const targetPage = document.getElementById(`${pageName}Page`);

                if (targetPage) {
                    targetPage.classList.add('active');

                    // Update Title
                    const titleText = item.querySelector('span').textContent;
                    if (pageTitle) pageTitle.textContent = titleText;
                }

                // Page specific init
                if (pageName === 'customers') refreshCustomers();
                if (pageName === 'billing') loadBilling();
                if (pageName === 'records') loadCollectionRecords();
                if (pageName === 'ledger') initializeLedgerPage();

                // Close sidebar on mobile
                const sidebar = document.getElementById('sidebar');
                if (window.innerWidth <= 1024 && sidebar) {
                    sidebar.classList.remove('active');
                }
            }
        });
    });
}

// === UTILS ===
function initializeMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (btn && sidebar) {
        btn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
}

function showLogoutModal(onConfirm) {
    const modalHTML = `
        <div class="modal-overlay logout-modal-overlay" id="logoutModal">
            <div class="logout-card">
                <div class="logout-header-accent"></div>
                <div class="logout-body">
                    <div class="logout-icon-circle">
                        <i class="fas fa-sign-out-alt"></i>
                    </div>
                    <h3 class="logout-title">End Session?</h3>
                    <p class="logout-msg">You are about to sign out from the Cashier Terminal. Make sure all transactions are finalized.</p>
                </div>
                <div class="logout-actions">
                    <button type="button" class="btn-logout-cancel" onclick="closeModal('logoutModal')">
                        Cancel
                    </button>
                    <button type="button" id="confirmLogoutBtn" class="btn-logout-confirm">
                        <i class="fas fa-sign-out-alt"></i> Sign Out
                    </button>
                </div>
            </div>
        </div>
    `;

    const container = document.getElementById('modalContainer');
    if (container) {
        container.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('confirmLogoutBtn')?.addEventListener('click', () => {
            closeModal('logoutModal');
            if (onConfirm) onConfirm();
        });
    }
}

function initializeLogout() {
    const btn = document.getElementById('logoutBtn');
    if (btn) {
        btn.addEventListener('click', async () => {
            showLogoutModal(async () => {
                try {
                    await supabase.auth.signOut();
                    window.location.href = '../index.html';
                } catch (error) {
                    console.error('Logout failed:', error);
                    showNotification('Sign out failed', 'error');
                }
            });
        });
    }
}

function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('admin-theme') || 'light';

    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            themeToggle.style.color = '#FFD700'; // Gold Sun
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark-theme');
            localStorage.setItem('admin-theme', isDark ? 'dark' : 'light');
            themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            if (isDark) {
                themeToggle.style.color = '#FFD700';
            } else {
                themeToggle.style.color = 'var(--text-secondary)';
            }
        });
    }
}

// Re-expose needed functions for admin-components.js if necessary
window.showNotification = function (message, type) {
    // Simple notification implementation or reuse admin's
    console.log(`[${type}] ${message}`);
    // You might want to copy the notification logic from script.js or admin.js
};

/* DISABLED: online_payments table was removed
async function loadPaymentsQueue() {
    const body = document.getElementById('paymentsQueueBody');
    try {
        // 1. Fetch pending payments
        const { data: payments, error: paymentsError } = await supabase
            .from('online_payments')
            .select('*')
            .eq('status', 'pending')
            .order('id', { ascending: true });

        if (paymentsError) throw paymentsError;

        if (!payments || payments.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #9E9E9E;">No pending online payments to verify.</td></tr>';
            return;
        }

        // 2. Fetch related customers
        const customerIds = [...new Set(payments.map(p => p.customer_id))];
        const { data: customers, error: customerError } = await supabase
            .from('customers')
            .select('id, first_name, last_name')
            .in('id', customerIds);

        if (customerError) throw customerError;

        // Create a map for easy lookup
        const customerMap = {};
        customers.forEach(c => {
            customerMap[c.id] = c;
        });

        body.innerHTML = payments.map(p => {
            const customer = customerMap[p.customer_id] || { first_name: 'Unknown', last_name: 'Customer' };
            return `
            <tr>
                <td><strong>${p.reference_number}</strong></td>
                <td>${customer.last_name}, ${customer.first_name}</td>
                <td>₱${parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td><span class="badge platform-${p.platform}">${p.platform ? p.platform.toUpperCase() : 'N/A'}</span></td>
                <td><span class="badge-status status-pending">Pending</span></td>
                <td>
                    <div class="actions" style="display: flex; gap: 5px;">
                        <button class="btn btn-sm btn-primary" onclick="verifyPayment('${p.id}', 'approve')" title="Approve">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="verifyPayment('${p.id}', 'reject')" title="Reject" style="color: #d32f2f; border-color: #d32f2f;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading payments queue:', error);
        showNotification('Failed to load payments queue', 'error');
    }
}
*/


/* DISABLED: online_payments table was removed
async function verifyPayment(paymentId, action) {
    if (!confirm(`Are you sure you want to ${action} this payment?`)) return;
    
    try {
        await window.cashierDb.verifyOnlinePayment(paymentId, action);
        showNotification(`Payment ${action}d successfully`, 'success');
        loadInitialData(); // Refresh everything
    } catch (error) {
        console.error(`Error ${action}ing payment:`, error);
        showNotification(`Failed to ${action} payment`, 'error');
    }
}

window.verifyPayment = verifyPayment;
*/

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Fade out effect
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.2s ease';

        setTimeout(() => {
            modal.remove();
        }, 200);
    }
}
window.closeModal = closeModal;

async function loadBillingMonths() {
    const filter = document.getElementById('billingMonthFilter');
    if (!filter) return;

    try {
        const { data, error } = await supabase
            .from('billing')
            .select('billing_period');

        if (error) throw error;

        const rawPeriods = data.map(b => b.billing_period).filter(Boolean);
        const normalizedMap = {};
        rawPeriods.forEach(p => {
            const key = typeof normalizePeriod === 'function' ? normalizePeriod(p) : p;
            if (key && !normalizedMap[key]) {
                normalizedMap[key] = p;
            }
        });

        const sortedKeys = Object.keys(normalizedMap).sort((a, b) => new Date(b) - new Date(a));

        const currentVal = filter.value;
        filter.innerHTML = '<option value="">All Periods</option>' +
            sortedKeys.map(display => `<option value="${display}" ${display === currentVal ? 'selected' : ''}>${display}</option>`).join('');
    } catch (error) {
        console.error('Error loading periods:', error);
    }
}
async function loadCollectionRecords() {
    const body = document.getElementById('collectionLogBody');
    const totalEl = document.getElementById('logTotalAmount');
    const countEl = document.getElementById('logTotalCount');
    const search = document.getElementById('logSearch')?.value || '';
    const dateFrom = document.getElementById('logDateFrom')?.value || '';
    const dateTo = document.getElementById('logDateTo')?.value || '';
    const barangay = document.getElementById('logBarangayFilter')?.value || '';

    if (!body) return;

    try {
        // 1. Fetch Data (Optimized with cache if filters haven't changed much)
        // For now, fresh fetch to ensure real-time accuracy

        // Paid Cash Bills
        let cashQuery = supabase
            .from('billing')
            .select('id, amount, updated_at, customer_id')
            .eq('status', 'paid');

        if (dateFrom) cashQuery = cashQuery.gte('updated_at', `${dateFrom}T00:00:00`);
        if (dateTo) cashQuery = cashQuery.lte('updated_at', `${dateTo}T23:59:59`);

        // Online payments table was removed - only cash payments now
        const cashRes = await cashQuery;

        if (cashRes.error) throw cashRes.error;

        // 2. Unify & Enrich with Customer Data (cash only)
        const unified = [
            ...(cashRes.data || []).map(p => ({
                id: p.id,
                amount: p.amount,
                date: p.updated_at,
                method: 'Cash',
                ref: `#BIL-${String(p.id).padStart(4, '0')}`,
                customer_id: p.customer_id
            }))
        ];

        if (unified.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 4rem; color: #9E9E9E;"><i class="fas fa-history" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i><br>No records found. Adjust your filters.</td></tr>';
            if (totalEl) totalEl.textContent = '₱0.00';
            if (countEl) countEl.textContent = '0';
            return;
        }

        const customerIds = [...new Set(unified.map(u => u.customer_id))];
        const { data: customers } = await supabase
            .from('customers')
            .select('id, first_name, last_name, address, status')
            .in('id', customerIds);

        const customerMap = {};
        customers?.forEach(c => { customerMap[c.id] = c; });

        // 3. Filter & Sort
        logDataCache = unified.map(u => {
            const customer = customerMap[u.customer_id];
            return {
                ...u,
                customerName: customer ? `${customer.last_name}, ${customer.first_name}` : 'Unknown Customer',
                accountID: getAccountID(u.customer_id),
                address: customer?.address || '',
                isInactive: (customer?.status || '').toLowerCase() === 'inactive'
            };
        }).filter(u => {
            // Barangay filter
            if (barangay && !u.address.toLowerCase().includes(barangay.toLowerCase())) return false;

            if (!search) return true;
            const term = search.toLowerCase();
            return u.customerName.toLowerCase().includes(term) ||
                u.accountID.toLowerCase().includes(term) ||
                u.ref.toLowerCase().includes(term);
        });

        renderLogRecords();

    } catch (error) {
        console.error('Error loading records:', error);
    }
}

function renderLogRecords() {
    const body = document.getElementById('collectionLogBody');
    const totalEl = document.getElementById('logTotalAmount');
    const countEl = document.getElementById('logTotalCount');

    // Apply sorting
    const data = [...logDataCache].sort((a, b) => {
        let valA = a[logSortConfig.key];
        let valB = b[logSortConfig.key];

        if (logSortConfig.key === 'date') {
            valA = new Date(valA);
            valB = new Date(valB);
        }

        if (valA < valB) return logSortConfig.order === 'asc' ? -1 : 1;
        if (valA > valB) return logSortConfig.order === 'asc' ? 1 : -1;
        return 0;
    });

    let total = 0;
    let html = '';
    let lastDate = '';

    data.forEach(u => {
        total += parseFloat(u.amount);

        // Grouping logic
        const dateObj = new Date(u.date);
        const dateKey = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Manila'
        });

        // Relative text (Today, Yesterday)
        const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' });

        let label = dateKey;
        if (dateObj.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' }) === today) label = 'Today';
        else if (dateObj.toLocaleDateString('en-US', { timeZone: 'Asia/Manila' }) === yesterday) label = 'Yesterday';

        if (label !== lastDate) {
            html += `<tr><td colspan="6" class="group-header">${label}</td></tr>`;
            lastDate = label;
        }

        const time = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });

        html += `
            <tr class="${u.isInactive ? 'status-inactive' : ''}">
                <td><span class="time-badge">${time}</span></td>
                <td class="account-id">${u.accountID}</td>
                <td>${u.customerName}${u.isInactive ? ' <span class="badge-deactivated">DEACTIVATED</span>' : ''}</td>
                <td class="text-success font-weight-bold">₱${parseFloat(u.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td><span class="badge ${u.method === 'Cash' ? 'secondary' : 'primary'}">${u.method}</span></td>
                <td><code style="font-size: 0.85rem;">${u.ref}</code></td>
            </tr>
        `;
    });

    if (totalEl) totalEl.textContent = `₱${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (countEl) countEl.textContent = data.length.toLocaleString();
    if (body) body.innerHTML = html;
}

function setLogSort(key) {
    if (logSortConfig.key === key) {
        logSortConfig.order = logSortConfig.order === 'asc' ? 'desc' : 'asc';
    } else {
        logSortConfig.key = key;
        logSortConfig.order = (key === 'amount' || key === 'date') ? 'desc' : 'asc';
    }

    // Update headers UI
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('active');
        const icon = th.querySelector('i');
        if (icon) icon.className = 'fas fa-sort';
    });

    const activeHeader = document.querySelector(`.sortable[onclick*="${key}"]`);
    if (activeHeader) {
        activeHeader.classList.add('active');
        const icon = activeHeader.querySelector('i');
        if (icon) icon.className = `fas fa-sort-${logSortConfig.order === 'asc' ? 'up' : 'down'}`;
    }

    renderLogRecords();
}

function setQuickDate(range) {
    const fromEl = document.getElementById('logDateFrom');
    const toEl = document.getElementById('logDateTo');

    const now = new Date();
    let fromDate = '';
    let toDate = getLocalISODate();

    if (range === 'today') {
        fromDate = toDate;
    } else if (range === 'week') {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        // Use PHT date string
        fromDate = lastWeek.toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' });
    } else if (range === 'all') {
        fromDate = '';
        toDate = '';
    }

    fromEl.value = fromDate;
    toEl.value = toDate;

    // Update buttons
    document.querySelectorAll('.quick-filters .btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(range));
    });

    loadCollectionRecords();
}

window.setLogSort = setLogSort;
window.setQuickDate = setQuickDate;

// === MASTER LEDGER ===
function initializeLedgerPage() {
    const barangayFilter = document.getElementById('ledgerBarangayFilter');
    const periodFilter = document.getElementById('ledgerPeriodFilter');
    const searchInput = document.getElementById('ledgerSearch');
    const backBtn = document.getElementById('backToMasterBtn');

    // Populate Barangays if not already
    populateBarangayFilters('ledgerBarangayFilter');

    // Populate Period filter
    populateLedgerPeriodFilter();

    // Event Listeners
    const updateLedger = () => {
        if (window.dbOperations && window.dbOperations.loadMasterLedger) {
            window.dbOperations.loadMasterLedger({
                barangay: barangayFilter?.value || '',
                search: searchInput?.value || '',
                period: periodFilter?.value || ''
            });
        }
    };

    // Expose for external realtime refreshes
    window.updateCashierLedger = updateLedger;

    barangayFilter?.addEventListener('change', updateLedger);
    periodFilter?.addEventListener('change', updateLedger);
    searchInput?.addEventListener('input', debounce(updateLedger, 300));

    // Print Logic
    const printBtn = document.getElementById('printLedgerBtn');
    if (printBtn) {
        printBtn.onclick = () => {
            const printDate = document.querySelector('.print-date');
            if (printDate) {
                printDate.textContent = `Generated on: ${formatLocalDateTime(new Date())}`;
            }
            document.body.classList.add('printing-ledger');
            window.print();
            document.body.classList.remove('printing-ledger');
        };
    }

    // Detail View Controls
    const closeDetail = () => {
        document.getElementById('ledgerMasterView').style.display = 'block';
        document.getElementById('ledgerDetailView').style.display = 'none';
        document.querySelector('.ledger-controls').style.display = 'block';
        document.getElementById('backToMasterBtn').style.display = 'none';
        document.getElementById('printLedgerBtn').innerHTML = '<i class="fas fa-print"></i> Print Report';
    };

    if (backBtn) {
        backBtn.onclick = () => {
            currentCashierLedgerCustomerId = null; // Stop tracking when closing
            closeDetail();
        };
    }

    // Initial Load
    document.getElementById('ledgerMasterView').style.display = 'block';
    document.getElementById('ledgerDetailView').style.display = 'none';
    updateLedger();
}

async function viewCustomerLedger(customerId) {
    document.getElementById('ledgerMasterView').style.display = 'none';
    document.getElementById('ledgerDetailView').style.display = 'block';
    document.querySelector('.ledger-controls').style.display = 'none';
    document.getElementById('backToMasterBtn').style.display = 'block';
    document.getElementById('printLedgerBtn').innerHTML = '<i class="fas fa-print"></i> Print Customer Card';

    // Track for realtime refresh
    currentCashierLedgerCustomerId = customerId;

    if (window.dbOperations && window.dbOperations.loadLedgerCard) {
        await window.dbOperations.loadLedgerCard(customerId);
    }
}

// Expose for window access (buttons in table)
window.viewCustomerLedger = viewCustomerLedger;

// === HELPERS ===
function populateBarangayFilters(selectId) {
    const filter = document.getElementById(selectId);
    if (!filter || filter.options.length > 1) return;

    const barangays = [
        'Zone 1', 'Zone 1-A', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 4-A',
        'Zone 5', 'Zone 6', 'Zone 7', 'Canjusa', 'Utod', 'Pag-ayon',
        'Palaka Norte', 'Palaka Sur', 'Mabini', 'Tapong', 'Crossing', 'Ubay', 'Poblacion'
    ];

    barangays.forEach(bg => {
        const opt = document.createElement('option');
        opt.value = bg;
        opt.textContent = bg;
        filter.appendChild(opt);
    });
}

/**
 * Populate the ledger period filter from billing data
 */
async function populateLedgerPeriodFilter() {
    const select = document.getElementById('ledgerPeriodFilter');
    if (!select || select.options.length > 1) return;

    try {
        const { data, error } = await supabase
            .from('billing')
            .select('billing_period');

        if (error) throw error;

        // Normalize and deduplicate: '02/25/2026', 'February 2026' → 'February 2026'
        const normalizedMap = {};
        data.forEach(b => {
            const raw = b.billing_period;
            if (!raw) return;
            const key = typeof normalizePeriod === 'function' ? normalizePeriod(raw) : raw;
            if (key && !normalizedMap[key]) {
                normalizedMap[key] = raw;
            }
        });

        const sortedKeys = Object.keys(normalizedMap).sort((a, b) => new Date(b) - new Date(a));

        sortedKeys.forEach(display => {
            const opt = document.createElement('option');
            opt.value = normalizedMap[display];
            opt.textContent = display;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('Could not populate ledger period filter:', e);
    }
}
