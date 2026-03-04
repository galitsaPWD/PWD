// Admin Dashboard JavaScript
let customerSortConfig = { key: 'id', order: 'asc' };
let readingListSortConfig = { key: 'updated_at', order: 'desc' };
let currentLedgerCustomerId = null; // Track which customer's ledger is open

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

    // Reading List Table Sorting
    const readingHeaders = {
        'sortReadingAccount': 'id',
        'sortReadingName': 'last_name',
        'sortReadingDate': 'updated_at'
    };

    Object.entries(readingHeaders).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
                if (readingListSortConfig.key === key) {
                    readingListSortConfig.order = readingListSortConfig.order === 'asc' ? 'desc' : 'asc';
                } else {
                    readingListSortConfig.key = key;
                    readingListSortConfig.order = 'asc';
                }
                updateSortIndicators('readingListTable', readingListSortConfig);
                updateReadingList();
            });
        }
    });

    // Initial indicators
    updateSortIndicators('customerTable', customerSortConfig);
    updateSortIndicators('readingListTable', readingListSortConfig);
}

function updateSortIndicators(tableId, config) {
    const headers = document.querySelectorAll(`#${tableId} .sort-icon`);
    headers.forEach(icon => icon.className = 'fas fa-sort sort-icon');

    const activeHeader = document.querySelector(`[data-sort-key="${config.key}"] .sort-icon`);
    if (activeHeader) {
        activeHeader.className = `fas fa-sort-${config.order === 'asc' ? 'up' : 'down'} sort-icon active`;
    }
}

function refreshCustomers() {
    const search = document.getElementById('customerSearch')?.value || '';
    const status = document.getElementById('customerStatusFilter')?.value || '';
    const type = document.getElementById('customerTypeFilter')?.value || '';
    const barangay = document.getElementById('customerBarangayFilter')?.value || '';

    if (window.dbOperations && window.dbOperations.loadCustomers) {
        return window.dbOperations.loadCustomers({
            search,
            status,
            type,
            barangay,
            sortBy: customerSortConfig.key,
            sortOrder: customerSortConfig.order
        });
    }
    return Promise.resolve();
}
window.refreshCustomers = refreshCustomers; // Allow database.js to call with active filters

/**
 * Trigger refresh of Billing list with current filters
 */
function refreshBilling() {
    const search = document.getElementById('billingSearch')?.value || '';
    const status = document.getElementById('billingStatusFilter')?.value || '';
    const month = document.getElementById('billingMonthFilter')?.value || '';

    if (window.dbOperations && window.dbOperations.loadBilling) {
        return window.dbOperations.loadBilling({
            search,
            status,
            month
        });
    }
    return Promise.resolve();
}

/**
 * Trigger refresh of Ledger views (Master or Individual)
 */
function refreshLedger() {
    // 1. Refresh Master ledger if active
    if (typeof updateLedger === 'function') {
        updateLedger();
    }

    // 2. Refresh Individual Card if open
    if (currentLedgerCustomerId && window.dbOperations && window.dbOperations.loadLedgerCard) {
        console.log(`[Realtime] Refreshing Ledger Card for Customer ${currentLedgerCustomerId}`);
        window.dbOperations.loadLedgerCard(currentLedgerCustomerId);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeMobileMenu();
    initializeModals();
    initializeTableActions();
    initializeSearchFilters(); // New
    initializeSettings(); // New
    initializeLogout();
    initializeTheme(); // Added theme support
    initializeSidebarToggle(); // Modern Sidebar Step 3
    initializeStatMarquee(); // Intelligent Marquee
    initializeRateEditing(); // Rate category cards

    // Initialize password toggles for static content (like Change Password modal)
    if (window.initPasswordToggles) {
        window.initPasswordToggles('body');
    }

    // Wait a bit for Supabase to initialize, then load data
    setTimeout(() => {
        initializeSorting();
        initializeNotificationsUI(); // Initialize notification bell + dropdown
        loadInitialData();
    }, 100);
});

/**
 * Programmatically navigate to Billing page with optional filter
 * @param {string} statusFilter - Optional status filter to apply
 */
window.navigateToBilling = async function (statusFilter) {
    const billingNavItem = document.querySelector('.nav-item[data-page="billing"]');
    if (billingNavItem) {
        // 1. Manually set the filter value in the UI before navigating
        if (statusFilter) {
            const statusSelect = document.getElementById('billingStatusFilter');
            if (statusSelect) statusSelect.value = statusFilter;
        }

        // 2. Trigger the navigation click
        billingNavItem.click();
    }
};

async function loadInitialData() {
    console.log('🚀 Loading initial data...');
    try {
        // Check if Supabase client is ready
        if (!supabase || typeof supabase.from !== 'function') {
            console.error('❌ Supabase client not ready');
            showNotification('Database connection failed. Please refresh the page.', 'error');
            hideLoadingOverlay();
            return;
        }

        console.log('🚀 Parallel loading initial data...');

        // Use Promise.all for truly parallel execution of independent data fetches
        await Promise.all([
            window.dbOperations.loadDashboardStats(),
            window.dbOperations.loadRecentReadingsWidget().then(() => {
                window.dbOperations.initializeRealtimeReadingsWidget();
            }),
            refreshCustomers(),
            window.dbOperations.loadStaff(),
            refreshBilling(),
            window.dbOperations.loadAreaBoxes(),
            window.dbOperations.loadReadingList(), // Pre-fetch in background
            loadNotifications() // Load latest alerts
        ]);

        // Fail-safe: Hide loading overlay after 5 seconds no matter what
        const failSafeTimer = setTimeout(() => {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay && !overlay.classList.contains('fade-out')) {
                console.warn('⚠️ Loading fail-safe triggered');
                hideLoadingOverlay();
            }
        }, 5000);

        console.log('✅ All initial data loaded in parallel');

        // Cinematic reveal
        if (window.refreshMarquee) window.refreshMarquee();
        setTimeout(() => {
            clearTimeout(failSafeTimer);
            hideLoadingOverlay();
        }, 200);
    } catch (error) {
        console.error('❌ Error in loadInitialData:', error);
        showNotification('Some data could not be loaded', 'warning');
        // Always hide overlay to prevent being stuck
        hideLoadingOverlay();
    }

    // ===== SETUP REALTIME SUBSCRIPTIONS =====
    setupRealtimeSubscriptions();
}

function setupRealtimeSubscriptions() {
    if (!window.subscribeToTable) {
        console.warn('[Realtime] subscribeToTable not available');
        return;
    }

    // Subscribe to customers table
    subscribeToTable('customers', () => {
        refreshCustomers();
        refreshLedger(); // Update Master/Detail Ledger
        if (window.dbOperations && window.dbOperations.loadStats) {
            // Small delay for DELETE to ensure DB is updated
            setTimeout(() => window.dbOperations.loadStats(), 100);
        }
    });

    // Subscribe to staff table
    subscribeToTable('staff', () => {
        if (window.dbOperations && window.dbOperations.loadStaff) {
            window.dbOperations.loadStaff();
        }
        if (window.dbOperations && window.dbOperations.loadStats) {
            // Small delay for DELETE to ensure DB is updated
            setTimeout(() => window.dbOperations.loadStats(), 100);
        }
    });

    // Subscribe to billing table
    subscribeToTable('billing', () => {
        if (window.dbOperations && window.dbOperations.loadBilling) {
            window.dbOperations.loadBilling();
        }
        if (window.dbOperations && window.dbOperations.loadStats) {
            window.dbOperations.loadStats();
        }
        refreshLedger(); // Update Master/Detail Ledger

        // REALTIME: Sync Reading List if visible
        if (typeof window.updateReadingList === 'function') {
            console.log('[Realtime] Refreshing Reading List...');
            window.updateReadingList();
        }
    });

    // Subscribe to area_boxes (Scheduling)
    subscribeToTable('area_boxes', () => {
        if (window.dbOperations && window.dbOperations.loadAreaBoxes) {
            window.dbOperations.loadAreaBoxes();
        }
    });

    // Subscribe to system_settings table (THE BRAIN!)
    subscribeToTable('system_settings', () => {
        if (window.dbOperations && window.dbOperations.loadSettings) {
            window.dbOperations.loadSettings();
        }
    });

    // Subscribe to notifications for cutoff-done alerts
    subscribeToTable('notifications', () => {
        loadNotifications();
    });
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('fade-out');
    }
}

// === NAVIGATION ===
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();


            // Unsaved Changes Guard - only check when LEAVING settings page
            const currentPage = document.querySelector('.page.active');
            const isLeavingSettings = currentPage && currentPage.id === 'settingsPage';

            if (!e.target._bypassUnsavedCheck && isLeavingSettings && window.hasUnsavedChanges) {
                e.preventDefault();
                showUnsavedChangesModal(() => {
                    // User confirmed discard - reset flag and navigate
                    window.hasUnsavedChanges = false;
                    const saveBtn = document.getElementById('saveSettingsBtn');
                    if (saveBtn) {
                        saveBtn.classList.remove('btn-warning');
                        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Settings';
                    }
                    // Bypass check on next click
                    item._bypassUnsavedCheck = true;
                    item.click();
                    // Reset bypass flag
                    setTimeout(() => { item._bypassUnsavedCheck = false; }, 100);
                });
                return; // Stop navigation until user decides
            }

            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));

            // Add active class to clicked
            item.classList.add('active');

            // Show corresponding page
            const pageName = item.dataset.page;
            const targetPage = document.getElementById(`${pageName}Page`);

            if (targetPage) {
                targetPage.classList.add('active');

                // Close mobile sidebar if open
                if (window.innerWidth <= 1024) {
                    const sidebar = document.getElementById('sidebar');
                    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
                    if (sidebar) sidebar.classList.remove('active');
                    if (mobileMenuBtn) {
                        mobileMenuBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
                    }
                }

                // Load data for specific pages
                if (pageName === 'scheduling') {
                    if (window.dbOperations && window.dbOperations.loadAssignments) {
                        window.dbOperations.loadAssignments();
                    }
                } else if (pageName === 'customers') {
                    refreshCustomers();
                } else if (pageName === 'staff') {
                    await window.dbOperations.loadStaff();
                } else if (pageName === 'billing') {
                    await refreshBilling();
                } else if (pageName === 'readingList') {
                    const tbody = document.getElementById('readingListTableBody');
                    if (!tbody || tbody.children.length <= 1 || tbody.querySelector('.fa-spinner')) {
                        initializeReadingListPage();
                    }
                }
            }

            // Update page title
            const titles = {
                dashboard: 'Dashboard',
                customers: 'Customer Management',
                staff: 'Staff Management',
                billing: 'Billing Management',
                scheduling: 'Scheduling',
                ledger: 'Master Ledger',
                readingList: 'Meter Reading List',
                settings: 'System Settings'
            };
            pageTitle.textContent = titles[pageName] || 'Dashboard';

            if (pageName === 'ledger') {
                initializeLedgerPage();
            }

            if (pageName === 'customers') {
                populateBarangayFilters('customerBarangayFilter');
            }

            if (pageName === 'scheduling') {
                window.dbOperations.loadAreaBoxes();
            }

            if (pageName === 'settings') {
                loadSystemSettingsIntoForm();
            }

            if (pageName === 'readingList') {
                initializeReadingListPage();
            }
        });
    });
}

let isReadingListUIInitialized = false;

function initializeReadingListPage() {
    if (isReadingListUIInitialized) return;

    console.log('🏗️ Initializing Reading List UI...');

    const searchInput = document.getElementById('readingListSearch');
    const periodFilter = document.getElementById('readingListPeriodFilter');
    const barangayFilter = document.getElementById('readingListBarangayFilter');
    const printBtn = document.getElementById('printReadingListBtn');

    // 1. Populate filters
    populateReadingListFilters();

    // 2. Event Listeners for filters
    const updateList = async () => {
        const period = periodFilter?.value || '';
        const barangay = barangayFilter?.value || '';
        const search = searchInput?.value || '';

        // Update associated reader name
        if (barangay) {
            const reader = await window.dbOperations.getReaderForBarangay(barangay);
            document.getElementById('assignedReaderName').textContent = reader;
            // Update print header info
            if (document.getElementById('printReaderName')) document.getElementById('printReaderName').textContent = reader;
            if (document.getElementById('printBarangayName')) document.getElementById('printBarangayName').textContent = barangay;
        } else {
            document.getElementById('assignedReaderName').textContent = 'Not Assigned';
        }

        if (period && document.getElementById('printPeriodName')) {
            document.getElementById('printPeriodName').textContent = period;
        }

        window.dbOperations.loadReadingList({
            period,
            barangay,
            search,
            sortBy: readingListSortConfig.key,
            sortOrder: readingListSortConfig.order
        });
    };

    // Expose update function globally for sorting to use
    window.updateReadingList = updateList;

    searchInput?.addEventListener('input', debounce(updateList, 300));
    periodFilter?.addEventListener('change', updateList);
    barangayFilter?.addEventListener('change', updateList);

    // 3. Print Functionality
    if (printBtn) {
        printBtn.onclick = () => {
            const period = periodFilter?.value || 'All Periods';
            const barangay = barangayFilter?.value || 'All Barangays';
            const reader = document.getElementById('assignedReaderName')?.textContent || 'Not Assigned';

            // Update print header info
            if (document.getElementById('printPeriodName')) document.getElementById('printPeriodName').textContent = period;
            if (document.getElementById('printBarangayName')) document.getElementById('printBarangayName').textContent = barangay;
            if (document.getElementById('printReaderName')) document.getElementById('printReaderName').textContent = reader;

            // Only require a period for professional reports, but let them print anyway if they want
            if (period === 'All Periods') {
                showNotification('Tip: Select a Period for a more professional report header.', 'info');
            }

            document.body.classList.add('printing-reading-list');

            // Critical: Wait for layout to settle before printing
            // Increased delay to 800ms to ensure all professional styles and table content are rendered
            setTimeout(() => {
                window.print();

                // Cleanup after print dialog closes
                setTimeout(() => {
                    document.body.classList.remove('printing-reading-list');
                }, 500);
            }, 800);
        };
    }

    isReadingListUIInitialized = true;
}

async function populateReadingListFilters() {
    const periodSelect = document.getElementById('readingListPeriodFilter');
    const barangaySelect = document.getElementById('readingListBarangayFilter');

    if (!periodSelect || !barangaySelect) return;

    // Populate Barangays
    if (barangaySelect.options.length <= 1) {
        const barangays = window.dbOperations ?
            (window.dbOperations.PULUPANDAN_BARANGAYS || []) :
            (window.PULUPANDAN_BARANGAYS || []);

        barangays.forEach(bg => {
            const opt = document.createElement('option');
            opt.value = bg;
            opt.textContent = bg;
            barangaySelect.appendChild(opt);
        });
    }

    // Populate Periods (fetching from billing table unique periods)
    if (periodSelect.options.length <= 1) {
        try {
            const { data, error } = await supabase
                .from('billing')
                .select('billing_period')
                .order('billing_period', { ascending: false });

            if (error) throw error;

            // FIX: Normalize and deduplicate periods
            const rawPeriods = data.map(b => b.billing_period).filter(Boolean);
            const normalizedMap = {};
            rawPeriods.forEach(p => {
                const key = normalizePeriod(p);
                if (key && !normalizedMap[key]) {
                    normalizedMap[key] = p;
                }
            });

            // Clear and repopulate to avoid doubling if called multiple times
            periodSelect.innerHTML = '<option value="">All Periods</option>';
            Object.keys(normalizedMap).sort((a, b) => new Date(b) - new Date(a)).forEach(display => {
                const opt = document.createElement('option');
                opt.value = normalizedMap[display];
                opt.textContent = display;
                periodSelect.appendChild(opt);
            });
        } catch (error) {
            console.error('Error populating period filters:', error);
        }
    }
}

// === SIDEBAR & MOBILE MENU ===
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    // Mobile Menu Toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn?.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

// === MODALS ===
function initializeModals() {
    const addCustomerBtn = document.getElementById('addCustomerBtn');
    const addStaffBtn = document.getElementById('addStaffBtn');

    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', () => window.showCustomerModal());
    }
    if (addStaffBtn) {
        addStaffBtn.addEventListener('click', () => window.showStaffModal());
    }

    // Scheduling delegation
    document.addEventListener('click', (e) => {
        const addBoxBtn = e.target.closest('#openAddBoxModal');
        if (addBoxBtn) window.showAddBoxModal();
    });
}

function initializeTableActions() {
    console.log('Initializing table actions delegation...');
    // Filter Buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Map data attributes to refreshCustomers logic
            const statusFilter = document.getElementById('customerStatusFilter');
            if (statusFilter) {
                statusFilter.value = btn.dataset.filter === 'all' ? '' : btn.dataset.filter;
                refreshCustomers();
            } else {
                window.dbOperations.loadCustomers(btn.dataset.filter);
            }
        });
    });

    // Event delegation for all table buttons
    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-icon[title="Edit"]');
        const deleteBtn = e.target.closest('.btn-icon[title="Delete"]');
        const viewBtn = e.target.closest('.btn-icon[title="View"]'); // Staff/Customer view if any
        const viewBillBtn = e.target.closest('.btn-icon[title="View Bill"]');
        const ledgerBtn = e.target.closest('.btn-icon[title="View Ledger"]');
        const changePasswordBtn = e.target.closest('.btn-icon.change-password');

        if (editBtn) {
            console.log('Edit button clicked', editBtn);
            handleEdit(editBtn);
        } else if (deleteBtn) {
            console.log('Delete button clicked', deleteBtn);
            handleDelete(deleteBtn);
        } else if (viewBillBtn) {
            console.log('View Bill button clicked', viewBillBtn);
            handleViewBill(viewBillBtn);
        } else if (ledgerBtn) {
            console.log('Ledger button clicked', ledgerBtn);
            handleViewLedger(ledgerBtn);
        } else if (changePasswordBtn) {
            console.log('Change Password button clicked', changePasswordBtn);
            handleChangePassword(changePasswordBtn);
        } else if (viewBtn) {
            // Generic view or legacy view
        }
    });
}

// ... existing handleEdit ...
function handleEdit(button) {
    const row = button.closest('tr');
    const customerId = row.dataset.id;
    const cells = row.querySelectorAll('td');

    // Determine which table we're in
    const table = button.closest('table');
    const tableBody = table.querySelector('tbody');

    if (tableBody.id === 'customerTableBody') {
        window.editCustomer(customerId, row, cells);
    } else if (tableBody.id === 'staffTableBody') {
        window.editStaff(customerId, row, cells);
    }
}

function handleDelete(button) {
    const row = button.closest('tr');
    const id = row.dataset.id;
    const cells = row.querySelectorAll('td');
    const name = cells[1].textContent;

    // Determine which table we're in
    const table = button.closest('table');
    const tableBody = table.querySelector('tbody');

    let itemType = 'item';
    let deleteFunction = null;

    if (tableBody.id === 'customerTableBody') {
        itemType = 'customer';
        deleteFunction = window.dbOperations.deleteCustomer;
    } else if (tableBody.id === 'staffTableBody') {
        itemType = 'staff member';
        deleteFunction = window.dbOperations.deleteStaff;
    }

    window.showConfirmModal({
        title: `Delete ${itemType}?`,
        message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
        confirmText: 'Delete Forever',
        onConfirm: async () => {
            // Animate row removal
            row.style.transition = 'all 0.3s ease';
            row.style.opacity = '0';
            row.style.transform = 'translateY(10px)';

            setTimeout(async () => {
                try {
                    await deleteFunction(id);
                } catch (error) {
                    console.error(`Failed to delete ${itemType}:`, error);
                    row.style.opacity = '1';
                    row.style.transform = 'translateX(0)';
                    window.showNotification(`Failed to delete ${itemType}`, 'error');
                }
            }, 300);
        }
    });
}

function handleChangePassword(button) {
    const row = button.closest('tr');
    if (!row) {
        console.error('Could not find row for Change Password button');
        return;
    }

    const staffId = row.dataset.id;
    const firstName = row.dataset.firstName || '';
    const lastName = row.dataset.lastName || '';

    console.log(`Opening password modal for ${firstName} ${lastName} (#${staffId})`);

    // Store staff ID in modal for form submission
    const modal = document.getElementById('changePasswordModal');
    if (!modal) {
        console.error('FATAL: changePasswordModal not found in DOM!');
        if (window.showNotification) window.showNotification('System error: Password modal missing', 'error');
        return;
    }

    modal.dataset.staffId = staffId;

    // Update modal title with staff name
    const nameLabel = document.getElementById('changePasswordStaffName');
    if (nameLabel) {
        nameLabel.textContent = `Changing password for: ${firstName} ${lastName}`;
    }

    // Clear form
    const form = document.getElementById('changePasswordForm');
    if (form) {
        form.reset();
    } else {
        // Fallback if form not found
        const newPass = document.getElementById('newPassword');
        const confirmPass = document.getElementById('confirmPassword');
        if (newPass) newPass.value = '';
        if (confirmPass) confirmPass.value = '';
    }

    // Show modal
    if (window.openModal) {
        window.openModal('changePasswordModal');
    } else {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }
}

async function handlePasswordChange(event) {
    event.preventDefault();

    const modal = document.getElementById('changePasswordModal');
    if (!modal) {
        console.error('Password modal missing during submission');
        return;
    }

    const staffId = modal.dataset.staffId;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!staffId) {
        if (window.showNotification) window.showNotification('Error: Missing staff ID', 'error');
        return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        if (window.showNotification) window.showNotification('Passwords do not match', 'error');
        return;
    }

    // Validate minimum length
    if (newPassword.length < 6) {
        if (window.showNotification) window.showNotification('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        if (window.dbOperations && window.dbOperations.changeStaffPassword) {
            await window.dbOperations.changeStaffPassword(staffId, newPassword);
        } else {
            console.error('dbOperations.changeStaffPassword not found');
            if (window.showNotification) window.showNotification('System error: database function missing', 'error');
        }
    } catch (error) {
        console.error('Password change failed:', error);
    }
}


function handleViewBill(button) {
    const row = button.closest('tr');
    // We need to fetch the full data because the table doesn't show everything (tax, penalty, etc.)
    // But since we don't have a "getBillById" function yet, we can either extract from row (incomplete) 
    // or fetch. For speed, let's extract what we can and assume default for others or use a data-object.
    // Better approach: The row should ideally store the full object in a data attribute, or we fetch.
    // Let's implement a quick fetch by ID or just assume we have the data in the row's scope if we saved it.
    // Since we didn't save it, let's fetch it using the ID.
    const billId = row.dataset.id;
    showBillModal(billId);
}

// Table action handlers moved to initializeTableActions

async function handleViewLedger(button) {
    const row = button.closest('tr');
    // We need customer_id. The row has bill ID mostly.
    // But wait, the row in the table (loadBilling) was generated with:
    // data-id="${bill.id}". It doesn't have customer_id directly.
    // We should fix loadBilling to include data-customer-id on the row.
    // OR we fetch the bill first to get the customer_id. Fetching is safer.
    const billId = row.dataset.id;

    try {
        // 1. Get customer ID from the bill ID
        const { data: bill, error: billError } = await supabase
            .from('billing')
            .select('customer_id, customers(last_name, first_name, middle_initial)')
            .eq('id', billId)
            .maybeSingle();

        if (billError) throw billError;
        if (!bill) throw new Error('Bill record not found');
        if (!bill.customers) throw new Error('Customer linked to this bill not found');

        const customerId = bill.customer_id;
        const middleInitial = bill.customers.middle_initial ? ` ${bill.customers.middle_initial}.` : '';
        const customerName = `${bill.customers.last_name}, ${bill.customers.first_name}${middleInitial}`;

        // 2. Load history
        const history = await window.dbOperations.loadCustomerBillingHistory(customerId);

        const modalHTML = `
            <div class="modal-overlay" id="ledgerModal">
                <div class="modal" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>Billing Ledger - ${customerName}</h3>
                        <button class="modal-close" onclick="closeModal('ledgerModal')">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M5 5L15 15M5 15L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-form">
                        <div class="ledger-summary">
                            <div class="stat-box">
                                <span class="label">Balance</span>
                                <span class="value">₱${history.reduce((sum, b) => sum + b.balance, 0).toLocaleString()}</span>
                            </div>
                            <div class="stat-box">
                                <span class="label">Total Paid</span>
                                <span class="value">₱${history.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0).toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <div class="table-container" style="max-height: 400px; overflow-y: auto; margin-top: 1rem;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Period</th>
                                        <th>Ref No.</th>
                                        <th>Charges</th>
                                        <th>Payments</th>
                                        <th>Balance</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${history.map(item => `
                                    <tr>
                                        <td>${formatLocalDateTime(item.due_date, false)}</td>
                                        <td>${item.billing_period}</td>
                                        <td>BIL-${String(item.id).padStart(4, '0')}</td>
                                        <td>₱${item.amount.toLocaleString()}</td>
                                        <td>${item.status === 'paid' ? '₱' + item.amount.toLocaleString() : '-'}</td>
                                        <td>₱${item.balance.toLocaleString()}</td>
                                        <td><span class="badge ${item.status === 'paid' ? 'success' : (item.status === 'overdue' ? 'danger' : 'warning')}">${item.status}</span></td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="closeModal('ledgerModal')">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modalContainer').innerHTML = modalHTML;

    } catch (error) {
        console.error('Error loading ledger:', error);
        showNotification('Failed to load ledger', 'error');
    }
}

// Update User Info from Database
async function updateUserInfo() {
    try {
        // Use cached authUser from auth-guard.js to avoid Supabase lock contention
        let user = window.authUser;
        let sessionData = null;

        if (!user) {
            // If not found in window, try one last time from session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !session.user) return;
            user = session.user;
            sessionData = session;
        }

        // Use cached userProfile if available
        let profile = window.userProfile;
        let fetchError = null;

        if (!profile) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            profile = data;
            fetchError = error;
        }

        if (fetchError || !profile) {
            console.error('Failed to load profile for admin:', fetchError);
            // Fallback to email if profile missing
            const email = user.email || 'Admin';
            const namePart = email.split('@')[0];
            const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

            const userNameEl = document.querySelector('.user-name');
            const avatarEl = document.querySelector('.user-avatar');

            if (userNameEl) userNameEl.textContent = displayName;
            if (avatarEl) avatarEl.textContent = displayName.charAt(0);
            return;
        }

        const displayName = `${profile.first_name} ${profile.last_name}`;
        const userNameEl = document.querySelector('.user-name');
        const avatarEl = document.querySelector('.user-avatar');

        if (userNameEl) userNameEl.textContent = displayName;
        if (avatarEl) avatarEl.textContent = (profile.first_name || 'A').charAt(0).toUpperCase();

        console.log('Admin UI updated with real profile:', displayName);
    } catch (err) {
        console.error('Error updating admin info:', err);
    }
}

updateUserInfo();

console.log('Admin dashboard initialized');

// === AUTO ASSIGN BUTTONS ===
function initializeAutoAssign() {
    // Auto-Fill (Optional Action)
    const autoBtn = document.getElementById('autoDistributeBtn');
    if (autoBtn) {
        autoBtn.addEventListener('click', async () => {
            if (confirm('Randomly distribute readers to all areas? This will overwrite existing assignments.')) {
                // Pass true = Auto-Distribute
                if (window.dbOperations && window.dbOperations.autoAssignReaders) {
                    await window.dbOperations.autoAssignReaders(true);
                }
            }
        });
    }
}
// === SYSTEM SETTINGS ===
function initializeSettings() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const changePINBtn = document.getElementById('changePINBtn');

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (!window.currentSettings) {
                showNotification('Settings not loaded. Attempting to refresh...', 'info');
                await loadSystemSettingsIntoForm();
                if (!window.currentSettings) return;
            }

            // Security gate before saving settings
            showPINVerifyModal(async () => {
                await saveSettingsChanges();
            });
        });
    }

    if (changePINBtn) {
        changePINBtn.addEventListener('click', () => {
            showChangePINModal();
        });
    }
}

window.showPINVerifyModal = function (onConfirm) {
    const modalHTML = `
        <div class="modal-overlay" id="verifyPINModal">
            <div class="modal pin-verify-modal">
                <div class="modal-body" style="padding: 0;">
                    <div class="pin-verify-header">
                        <div class="pin-verify-icon">
                            <i class="fas fa-lock"></i>
                        </div>
                        <h3 class="no-margin">Access Verification</h3>
                        <p class="pin-verify-text">Enter System PIN to continue</p>
                    </div>
                    
                    <form id="verifyPINForm" class="pin-verify-form">
                        <div class="form-group">
                            <input type="password" id="verifyPINInput" class="form-control pin-input-field" 
                                    placeholder="••••" required maxlength="6" />
                        </div>
                        
                        <div class="modal-footer-flex">
                            <button type="button" class="btn btn-secondary flex-1" onclick="closeModal('verifyPINModal')">Cancel</button>
                            <button type="submit" class="btn btn-primary flex-1">Verify PIN</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;
    const input = document.getElementById('verifyPINInput');
    input.focus();

    // Initialize password toggle
    if (window.initPasswordToggles) {
        window.initPasswordToggles('#verifyPINModal');
    }

    document.getElementById('verifyPINForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;

        const isVerified = await window.dbOperations.verifyAdminPIN(input.value);

        if (isVerified) {
            closeModal('verifyPINModal');
            onConfirm();
        } else {
            btn.innerHTML = originalText;
            btn.disabled = false;
            showNotification('Incorrect PIN. Access Denied.', 'error');

            // Shake effect
            const modal = document.querySelector('#verifyPINModal .modal');
            modal.style.animation = 'none';
            void modal.offsetWidth; // trigger reflow
            modal.style.animation = 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both';
            input.value = '';
            input.focus();
        }
    });
};

window.showChangePINModal = function () {
    const modalHTML = `
        <div class="modal-overlay" id="changePINModal">
            <div class="modal small-modal">
                <div class="modal-header">
                    <h3>Update System PIN</h3>
                    <button class="modal-close" onclick="closeModal('changePINModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form class="modal-form" id="changePINForm">
                    <div class="form-group">
                        <label>Current PIN</label>
                        <input type="password" id="currentPIN" class="form-control" required maxlength="6" inputmode="numeric" pattern="[0-9]*" placeholder="••••" />
                    </div>
                    <div class="form-group divider-top">
                        <label>New PIN (4-6 digits)</label>
                        <input type="password" id="newPIN" class="form-control" required maxlength="6" inputmode="numeric" pattern="[0-9]*" placeholder="••••" />
                    </div>
                    <div class="form-group">
                        <label>Confirm New PIN</label>
                        <input type="password" id="confirmPIN" class="form-control" required maxlength="6" inputmode="numeric" pattern="[0-9]*" placeholder="••••" />
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('changePINModal')">Cancel</button>
                        <button type="submit" class="btn btn-primary">Update PIN</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;

    // Initialize password toggles
    if (window.initPasswordToggles) {
        window.initPasswordToggles('#changePINModal');
    }

    document.getElementById('changePINForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPIN = document.getElementById('currentPIN').value;
        const newPIN = document.getElementById('newPIN').value;
        const confirmPIN = document.getElementById('confirmPIN').value;

        if (newPIN.length < 4 || newPIN.length > 6) {
            showNotification('New PIN must be 4 to 6 digits.', 'error');
            return;
        }

        if (newPIN !== confirmPIN) {
            showNotification('New PINs do not match.', 'error');
            return;
        }

        // Direct update with internal verification
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        btn.disabled = true;

        try {
            const success = await window.dbOperations.updateAdminPIN(newPIN, currentPIN);
            if (success) {
                showNotification('System PIN updated successfully', 'success');
                closeModal('changePINModal');
                await loadSystemSettingsIntoForm();
            } else {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error('Failed to update PIN:', error);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
};

async function loadSystemSettingsIntoForm() {
    try {
        if (!window.dbOperations || !window.dbOperations.loadSystemSettings) return;

        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

        window.currentSettings = await window.dbOperations.loadSystemSettings();

        if (window.currentSettings) {
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val !== undefined && val !== null ? val : 0;
            };

            setVal('base_rate', window.currentSettings.base_rate);
            setVal('tier1_threshold', window.currentSettings.tier1_threshold);
            setVal('tier1_rate', window.currentSettings.tier1_rate);
            setVal('tier2_threshold', window.currentSettings.tier2_threshold);
            setVal('tier2_rate', window.currentSettings.tier2_rate);
            setVal('tier3_rate', window.currentSettings.tier3_rate);
            setVal('settingDiscount', window.currentSettings.discount_percentage);
            setVal('settingPenalty', window.currentSettings.penalty_percentage || 20);
            setVal('settingOverdueDays', window.currentSettings.overdue_days !== undefined ? window.currentSettings.overdue_days : 14);

            // Try cutoff_grace_period first, then total cutoff_days
            let graceValue = 3;
            if (window.currentSettings.cutoff_grace_period !== undefined) {
                graceValue = window.currentSettings.cutoff_grace_period;
            } else if (window.currentSettings.cutoff_days !== undefined) {
                graceValue = window.currentSettings.cutoff_days;
            }
            setVal('settingCutoffGrace', graceValue);
        }

        // Reset unsaved changes flag when form loads
        window.hasUnsavedChanges = false;

        // Add change listeners to all settings inputs
        const settingsInputs = [
            'base_rate', 'tier1_threshold', 'tier1_rate', 'tier2_threshold',
            'tier2_rate', 'tier3_rate', 'settingDiscount', 'settingPenalty',
            'settingOverdueDays', 'settingCutoffGrace'
        ];

        settingsInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input && !input.dataset.changeListenerAdded) {
                input.addEventListener('input', () => {
                    window.hasUnsavedChanges = true;
                    if (saveBtn) {
                        saveBtn.classList.remove('btn-primary');
                        saveBtn.classList.add('btn-warning');
                        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Settings (Unsaved)';
                    }
                });
                input.dataset.changeListenerAdded = 'true';
            }
        });

        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Settings';
            saveBtn.classList.remove('btn-danger', 'btn-warning');
            saveBtn.classList.add('btn-primary');
        }
    } catch (error) {
        console.error('Error loading settings into form:', error);
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error: ' + (error.message || 'Retry Load');
            saveBtn.classList.remove('btn-primary');
            saveBtn.classList.add('btn-danger');
        }
        if (window.showNotification) {
            window.showNotification('System Error: ' + error.message, 'error');
        }
    }
}

async function saveSettingsChanges() {
    try {
        const getVal = (id, isFloat = true) => {
            const el = document.getElementById(id);
            if (!el || !el.value) return 0;
            const val = isFloat ? parseFloat(el.value) : parseInt(el.value);
            return isNaN(val) ? 0 : val;
        };

        const updatedData = {
            id: window.currentSettings.id
        };

        // Core columns that should always exist
        const coreMappings = {
            'base_rate': 'base_rate',
            'tier1_threshold': 'tier1_threshold',
            'tier1_rate': 'tier1_rate',
            'tier2_threshold': 'tier2_threshold',
            'tier2_rate': 'tier2_rate',
            'tier3_rate': 'tier3_rate',
            'settingDiscount': 'discount_percentage',
            'settingPenalty': 'penalty_percentage'
        };

        for (const [inputId, colName] of Object.entries(coreMappings)) {
            if (colName in window.currentSettings) {
                updatedData[colName] = getVal(inputId, inputId.includes('threshold') ? false : true);
            }
        }

        // Evolved columns with variable names
        if ('overdue_days' in window.currentSettings) {
            updatedData.overdue_days = getVal('settingOverdueDays', false);
        }

        if ('cutoff_grace_period' in window.currentSettings) {
            updatedData.cutoff_grace_period = getVal('settingCutoffGrace', false);
        } else if ('cutoff_days' in window.currentSettings) {
            // Map the grace period input to cutoff_days if grace_period column doesn't exist
            updatedData.cutoff_days = getVal('settingCutoffGrace', false);
        }

        console.log('Pushing Settings Update:', updatedData);
        await window.dbOperations.updateSystemSettings(updatedData);
        window.currentSettings = updatedData;
        showNotification('Settings saved successfully', 'success');

        loadSystemSettingsIntoForm(); // Refresh

        // Reset unsaved flag
        window.hasUnsavedChanges = false;
        document.getElementById('saveSettingsBtn').classList.remove('btn-warning');
        document.getElementById('saveSettingsBtn').innerHTML = '<i class="fas fa-save"></i> Save Settings';
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Failed to save settings', 'error');
    }
}

// === UNSAVED CHANGES CHECKER ===
window.checkUnsavedChanges = function () {
    if (window.hasUnsavedChanges) return true;

    // Optional: Deep compare logic if we want to catch manual input changes without explicit flags
    const current = window.currentSettings;
    if (!current) return false;

    // Check policies
    const getVal = (id) => document.getElementById(id)?.value;

    if (getVal('settingDiscount') != current.discount_percentage) return true;
    if (getVal('settingPenalty') != (current.penalty_percentage || 20)) return true;
    if (getVal('settingOverdueDays') != (current.overdue_days || 14)) return true;
    if (getVal('settingCutoffGrace') != (current.cutoff_grace_period || 3)) return true;

    return false;
};

// === SEARCH & FILTERS ===
function initializeSearchFilters() {
    console.log('Initializing search filters...');
    const customerSearch = document.getElementById('customerSearch');
    const customerStatus = document.getElementById('customerStatusFilter');
    const customerType = document.getElementById('customerTypeFilter');
    const customerBarangay = document.getElementById('customerBarangayFilter');

    const staffSearch = document.getElementById('staffSearch');
    const staffStatus = document.getElementById('staffStatusFilter');
    const staffRole = document.getElementById('staffRoleFilter');

    const billingSearch = document.getElementById('billingSearch');
    const billingStatus = document.getElementById('billingStatusFilter');
    const billingMonth = document.getElementById('billingMonthFilter');

    // Customer Filters
    const updateCustomerFilters = () => {
        window.dbOperations.loadCustomers({
            search: customerSearch?.value || '',
            status: customerStatus?.value || '',
            type: customerType?.value || '',
            barangay: customerBarangay?.value || ''
        });
    };

    if (customerSearch) customerSearch.addEventListener('input', debounce(updateCustomerFilters, 300));
    if (customerStatus) customerStatus.addEventListener('change', updateCustomerFilters);
    if (customerType) customerType.addEventListener('change', updateCustomerFilters);
    if (customerBarangay) customerBarangay.addEventListener('change', updateCustomerFilters);

    // Staff Filters
    const updateStaffFilters = () => {
        window.dbOperations.loadStaff({
            search: staffSearch?.value || '',
            status: staffStatus?.value || '',
            role: staffRole?.value || ''
        });
    };

    if (staffSearch) staffSearch.addEventListener('input', debounce(updateStaffFilters, 300));
    if (staffStatus) staffStatus.addEventListener('change', updateStaffFilters);
    if (staffRole) staffRole.addEventListener('change', updateStaffFilters);

    // Billing Filters
    const updateBillingFilters = () => {
        window.dbOperations.loadBilling({
            search: billingSearch?.value || '',
            status: billingStatus?.value || '',
            month: billingMonth?.value || ''
        });
    };

    if (billingSearch) billingSearch.addEventListener('input', debounce(updateBillingFilters, 300));
    if (billingStatus) billingStatus.addEventListener('change', updateBillingFilters);
    if (billingMonth) billingMonth.addEventListener('change', updateBillingFilters);
}

// === CUSTOM CONFIRMATION MODALS ===
function showUnsavedChangesModal(onConfirm) {
    const modalHTML = `
        <div class="modal-overlay unsaved-modal-overlay" id="unsavedChangesModal">
            <div class="unsaved-card">
                <div class="unsaved-header-accent"></div>
                <div class="unsaved-body">
                    <div class="unsaved-icon-circle">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3 class="unsaved-title">Unsaved Changes</h3>
                    <p class="unsaved-msg">You have modified system settings. If you leave now, your changes will be permanently lost.</p>
                </div>
                <div class="unsaved-actions">
                    <button type="button" class="btn-unsaved-discard" id="confirmDiscardBtn">
                        Discard Changes
                    </button>
                    <button type="button" class="btn-unsaved-stay" onclick="closeModal('unsavedChangesModal')">
                        Stay & Save
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;
    document.getElementById('confirmDiscardBtn').addEventListener('click', () => {
        closeModal('unsavedChangesModal');
        if (onConfirm) onConfirm();
    });
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
                    <h3 class="logout-title">Signing Out?</h3>
                    <p class="logout-msg">You are about to end your session. Are you sure you want to sign out of the Admin Dashboard?</p>
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

    document.getElementById('modalContainer').innerHTML = modalHTML;
    
    // Show modal with activation logic
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    document.getElementById('confirmLogoutBtn').addEventListener('click', () => {
        closeModal('logoutModal');
        if (onConfirm) onConfirm();
    });
}

// === LOGOUT ===
function initializeLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            showLogoutModal(async () => {
                try {
                    const { error } = await supabase.auth.signOut();
                    if (error) throw error;
                    window.location.href = '../index.html';
                } catch (error) {
                    console.error('Error signing out:', error);
                    showNotification('Error signing out. Please try again.', 'error');
                }
            });
        });
    }
}

// === THEME MANAGEMENT ===
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('admin-theme') || 'light';

    // Apply saved theme
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            themeToggle.style.color = '#FFD700'; // Gold Sun
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const isDark = document.documentElement.classList.toggle('dark-theme');

    // Update icon and save preference
    if (isDark) {
        localStorage.setItem('admin-theme', 'dark');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            themeToggle.style.color = '#FFD700'; // Gold Sun
        }
    } else {
        localStorage.setItem('admin-theme', 'light');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            themeToggle.style.color = '#0288D1'; // Original Blue Moon
        }
    }

    // Refresh charts to update theme-dependent elements (like center text)
    if (typeof consumptionChart !== 'undefined' && consumptionChart) consumptionChart.update();
    if (typeof paymentStatusChart !== 'undefined' && paymentStatusChart) paymentStatusChart.update();
}

// === CHART MANAGEMENT ===
let consumptionChart = null;
let paymentStatusChart = null;

function updateDashboardCharts(data) {
    // Update Stat Totals in Pesos
    const statUnpaidAmount = document.getElementById('statUnpaidAmount');
    const statOverdueAmount = document.getElementById('statOverdueAmount');
    if (statUnpaidAmount) statUnpaidAmount.textContent = `₱${(data.status.unpaidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (statOverdueAmount) statOverdueAmount.textContent = `₱${(data.status.overdueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    // 1. Update Consumption Line Chart
    const ctxConsumption = document.getElementById('consumptionChart')?.getContext('2d');
    if (ctxConsumption) {
        if (consumptionChart) {
            consumptionChart.data.labels = data.consumption.labels;
            consumptionChart.data.datasets[0].data = data.consumption.values;
            consumptionChart.update();
        } else {
            consumptionChart = new Chart(ctxConsumption, {
                type: 'line',
                data: {
                    labels: data.consumption.labels,
                    datasets: [{
                        label: 'Consumption (m³)',
                        data: data.consumption.values,
                        borderColor: '#0288D1',
                        backgroundColor: 'rgba(2, 136, 209, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#0288D1',
                        pointBorderColor: '#fff',
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Consumption (m³)', font: { family: 'Inter', size: 11, weight: '600' }, color: '#64748B' },
                            grid: { color: 'rgba(148, 163, 184, 0.05)' },
                            ticks: { font: { family: 'Inter', size: 11 }, color: '#64748B' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { family: 'Inter', size: 11 }, color: '#64748B', padding: 10 }
                        }
                    }
                }
            });
        }
    }

    // 2. Update Payment Status Pie Chart
    const ctxPayment = document.getElementById('paymentStatusChart')?.getContext('2d');
    if (ctxPayment) {
        const statusValues = [data.status.paid, data.status.unpaid, data.status.overdue];
        const total = statusValues.reduce((a, b) => a + b, 0);

        if (paymentStatusChart) {
            paymentStatusChart.data.datasets[0].data = statusValues;
            paymentStatusChart.options.plugins.centerText.text = total.toString();
            paymentStatusChart.update();
        } else {
            // Register a custom plugin for the center text
            const centerTextPlugin = {
                id: 'centerText',
                text: total.toString(),
                afterDraw: (chart) => {
                    const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;
                    ctx.save();

                    const isDark = document.documentElement.classList.contains('dark-theme');
                    const centerX = left + width / 2;
                    const centerY = top + height / 2;

                    // Draw "TOTAL" label
                    ctx.font = '500 12px Inter';
                    ctx.fillStyle = isDark ? '#9CA3AF' : '#64748B';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('TOTAL BILLS', centerX, centerY - 12);

                    // Draw the count
                    ctx.font = 'bold 36px Inter';
                    ctx.fillStyle = isDark ? '#F9FAFB' : '#1E293B';
                    ctx.fillText(chart.config.options.plugins.centerText.text, centerX, centerY + 18);

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
                            position: 'bottom',
                            labels: {
                                padding: 25,
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: {
                                    family: 'Inter',
                                    size: 13,
                                    weight: '500'
                                },
                                color: '#64748B'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(30, 41, 59, 0.9)',
                            padding: 12,
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 13 },
                            cornerRadius: 8,
                            displayColors: true
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
}

// Expose to window for database operations access
window.updateDashboardCharts = updateDashboardCharts;
// === MASTER LEDGER LOGIC ===

function initializeLedgerPage() {
    const barangayFilter = document.getElementById('ledgerBarangayFilter');
    const searchInput = document.getElementById('ledgerSearch');
    const backBtn = document.getElementById('backToMasterBtnDetail');

    // Populate Barangays if not already
    populateBarangayFilters('ledgerBarangayFilter');

    // Event Listeners
    const updateLedger = () => {
        window.dbOperations.loadMasterLedger({
            barangay: barangayFilter.value,
            search: searchInput.value
        });
    };

    barangayFilter?.addEventListener('change', updateLedger);
    searchInput?.addEventListener('input', debounce(updateLedger, 300));

    // Print Logic
    document.getElementById('printLedgerBtn').onclick = () => {
        const printDate = document.querySelector('.print-date');
        if (printDate) {
            printDate.textContent = `Generated on: ${formatLocalDateTime(new Date())}`;
        }
        window.print();
    };

    // Detail View Controls
    const closeDetail = () => {
        document.getElementById('ledgerMasterView').style.display = 'block';
        document.getElementById('ledgerDetailView').style.display = 'none';
        document.querySelector('.ledger-controls').style.display = 'block';
        document.getElementById('backToMasterBtn').style.display = 'none';
        document.getElementById('printLedgerBtn').innerHTML = '<i class="fas fa-print"></i> Print Report';
    };

    if (backBtn) backBtn.onclick = closeDetail;
    document.getElementById('backToMasterBtn').onclick = closeDetail;

    // Initial Load
    document.getElementById('ledgerMasterView').style.display = 'block';
    document.getElementById('ledgerDetailView').style.display = 'none';
    updateLedger();
}


/**
 * Global function to switch to individual customer ledger card
 */
window.viewCustomerLedger = async function (customerId) {
    // Switch views
    document.getElementById('ledgerMasterView').style.display = 'none';
    document.getElementById('ledgerDetailView').style.display = 'block';

    // Hide master filters
    document.querySelector('.ledger-controls').style.display = 'none';

    // Show back button and update Print Button
    document.getElementById('backToMasterBtn').style.display = 'inline-block';
    document.getElementById('printLedgerBtn').innerHTML = '<i class="fas fa-print"></i> Print Customer Card';

    // Set current tracking ID for realtime refresh
    currentLedgerCustomerId = customerId;

    // Load data
    await window.dbOperations.loadLedgerCard(customerId);
};

/**
 * Utility to populate any barangay select element
 */
function populateBarangayFilters(selectId) {
    const filter = document.getElementById(selectId);
    if (!filter || filter.options.length > 1) return;

    const barangays = window.dbOperations ?
        (window.dbOperations.PULUPANDAN_BARANGAYS || []) :
        (window.PULUPANDAN_BARANGAYS || []);

    barangays.forEach(bg => {
        const opt = document.createElement('option');
        opt.value = bg;
        opt.textContent = bg;
        filter.appendChild(opt);
    });
}

/**
 * Modern Sidebar Persistence & Toggle Logic
 */
// Consolidated Sidebar Toggle & Persistence
function initializeSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');

    if (toggleBtn && sidebar && window.innerWidth > 1024) {
        // Load preference
        const isMini = localStorage.getItem('sidebar-mini') === 'true';
        if (isMini) {
            sidebar.classList.add('mini');
        }

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.add('is-animating'); // Lock tooltips
            sidebar.classList.toggle('mini');

            // Remove lock after transition
            setTimeout(() => {
                sidebar.classList.remove('is-animating');
            }, 400);

            localStorage.setItem('sidebar-mini', sidebar.classList.contains('mini'));
        });
    }
}


// === INTELLIGENT MARQUEE ===
function initializeStatMarquee() {
    const checkOverflow = () => {
        const statValues = document.querySelectorAll('.stat-value');

        statValues.forEach(el => {
            // Reset to allow measurement
            el.classList.remove('is-overflowing');
            el.style.removeProperty('--marquee-distance');

            // Check if content overflows
            if (el.scrollWidth > el.clientWidth) {
                el.classList.add('is-overflowing');

                // Store text content for CSS ::after clone
                el.setAttribute('data-text', el.textContent);

                // Calculate distance to scroll
                // We need to scroll the full width of the element + gap
                const distance = el.scrollWidth + 32; // 32px = 2rem gap
                el.style.setProperty('--marquee-distance', `-${distance}px`);
            } else {
                // Clean up if no longer overflowing
                el.removeAttribute('data-text');
            }
        });
    };

    // Run initially
    // Small delay to ensure layout is settled (fonts loaded, etc)
    setTimeout(checkOverflow, 500);

    // Run on resize
    window.addEventListener('resize', () => {
        // Debounce slightly
        if (window.marqueeResizeTimer) clearTimeout(window.marqueeResizeTimer);
        window.marqueeResizeTimer = setTimeout(checkOverflow, 200);
    });

    // Run when data changes (MutationObserver would be best, but simple hook for now)
    // We can expose it globally to be called by refresh functions
    window.refreshMarquee = checkOverflow;
}


// === EDIT RATE CATEGORY MODAL ===
window.showEditRateModal = function (category) {
    // Rate data structure
    const rateData = {
        'residential': {
            title: 'Residential Rates',
            icon: 'fa-home',
            color: '#0288D1',
            minimum: '260.00',
            tier1: '27.25',
            tier2: '28.75',
            tier3: '30.75',
            tier4: '33.25'
        },
        'commercial-a': {
            title: 'Commercial A Rates',
            icon: 'fa-store',
            color: '#43A047',
            minimum: '455.00',
            tier1: '47.69',
            tier2: '50.31',
            tier3: '53.81',
            tier4: '58.19'
        },
        'commercial-b': {
            title: 'Commercial B Rates',
            icon: 'fa-building',
            color: '#FB8C00',
            minimum: '390.00',
            tier1: '40.88',
            tier2: '43.12',
            tier3: '46.12',
            tier4: '49.88'
        },
        'full-commercial': {
            title: 'Full Commercial Rates',
            icon: 'fa-industry',
            color: '#E53935',
            minimum: '520.00',
            tier1: '54.50',
            tier2: '57.50',
            tier3: '61.50',
            tier4: '66.50'
        }
    };

    const data = rateData[category];
    if (!data) return;

    const modalHTML = `
        <div class="modal-overlay glass-effect" id="editRateModal" style="--btn-color: ${data.color}; --btn-color-rgb: ${window.hexToRgb ? window.hexToRgb(data.color) : '0, 102, 255'};">
            <div class="modal premium-adjustment">
                <div class="modal-header no-border" style="padding: 1rem 1.25rem 0.5rem 1.25rem;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <div style="width: 28px; height: 28px; border-radius: 6px; background: ${data.color}; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8rem;">
                            <i class="fas ${data.icon}"></i>
                        </div>
                        <div>
                            <h3 style="font-size: 0.9rem; margin: 0; color: var(--text-primary);">Adjust ${data.title}</h3>
                            <p style="font-size: 0.7rem; color: var(--text-light); margin: 0;">Update rates for this category</p>
                        </div>
                    </div>
                    <button class="modal-close" onclick="closeModal('editRateModal')" style="color: var(--text-light); background: transparent; border: none; cursor: pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form class="modal-form" id="editRateForm" style="padding: 1rem 1.25rem;">
                    <div class="form-group-compact" style="background: rgba(var(--btn-color-rgb), 0.05); padding: 0.75rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid rgba(var(--btn-color-rgb), 0.1);">
                        <label style="color: ${data.color}; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.4rem; display: block;">Minimum Rate (0-10 cu.m.)</label>
                        <input type="number" id="rateMinimum" class="input-pill" style="width: 100%; font-size: 1.1rem; height: 40px; border-color: ${data.color}33;" step="0.01" value="${data.minimum}" required />
                    </div>

                    <div class="tier-input-grid">
                        <div class="form-group-compact">
                            <label style="font-size: 0.65rem; color: var(--text-light); display: block; margin-bottom: 0.3rem; font-weight: 600;">11-20 cu.m.</label>
                            <input type="number" id="rateTier1" class="input-pill" style="width: 100%; font-size: 0.85rem; height: 38px;" step="0.01" value="${data.tier1}" required />
                        </div>
                        <div class="form-group-compact">
                            <label style="font-size: 0.65rem; color: var(--text-light); display: block; margin-bottom: 0.3rem; font-weight: 600;">21-30 cu.m.</label>
                            <input type="number" id="rateTier2" class="input-pill" style="width: 100%; font-size: 0.85rem; height: 38px;" step="0.01" value="${data.tier2}" required />
                        </div>
                        <div class="form-group-compact">
                            <label style="font-size: 0.65rem; color: var(--text-light); display: block; margin-bottom: 0.3rem; font-weight: 600;">31-40 cu.m.</label>
                            <input type="number" id="rateTier3" class="input-pill" style="width: 100%; font-size: 0.85rem; height: 38px;" step="0.01" value="${data.tier3}" required />
                        </div>
                        <div class="form-group-compact">
                            <label style="font-size: 0.65rem; color: var(--text-light); display: block; margin-bottom: 0.3rem; font-weight: 600;">41-up cu.m.</label>
                            <input type="number" id="rateTier4" class="input-pill" style="width: 100%; font-size: 0.85rem; height: 38px;" step="0.01" value="${data.tier4}" required />
                        </div>
                    </div>

                    <div id="pinSection" class="pin-section-container">
                        <label style="font-size: 0.65rem; color: var(--primary); text-transform: uppercase; font-weight: 800; display: block; margin-bottom: 0.5rem; text-align: center;">Enter Admin PIN to Confirm</label>
                        <div style="position: relative;">
                            <input type="password" id="ratePIN" class="input-pill" style="width: 100%; letter-spacing: 0.4rem; text-align: center; font-size: 1rem; height: 42px;" maxlength="6" inputmode="numeric" pattern="[0-9]*" placeholder="••••••" />
                        </div>
                    </div>
                    
                    <div class="modal-footer no-border" style="padding-top: 1rem; display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem;">
                        <button type="button" class="btn-premium btn-premium-outline" style="flex: 0.4;" onclick="closeModal('editRateModal')">Discard</button>
                        <button type="submit" id="btnUpdateRates" class="btn-premium btn-premium-primary" style="flex: 1; background: ${data.color}; border: none; color: #fff;">
                            Update Rates
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;

    // Helper to get RGB
    if (!window.hexToRgb) {
        window.hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
        };
    }

    let isPinVisible = false;

    document.getElementById('editRateForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const pinSection = document.getElementById('pinSection');
        const btnUpdate = document.getElementById('btnUpdateRates');

        if (!isPinVisible) {
            // First step: Show PIN section
            pinSection.classList.add('visible');
            btnUpdate.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Changes';
            isPinVisible = true;
            document.getElementById('ratePIN').focus();
            return;
        }

        // Second step: Verify and save
        const pin = document.getElementById('ratePIN').value;
        const minimum = document.getElementById('rateMinimum').value;
        const tier1 = document.getElementById('rateTier1').value;
        const tier2 = document.getElementById('rateTier2').value;
        const tier3 = document.getElementById('rateTier3').value;
        const tier4 = document.getElementById('rateTier4').value;

        if (!pin) {
            showNotification('Please enter PIN', 'error');
            return;
        }

        const originalText = btnUpdate.innerHTML;
        btnUpdate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authorizing...';
        btnUpdate.disabled = true;

        try {
            const pinValid = await window.dbOperations.verifyAdminPIN(pin);
            if (!pinValid) {
                showNotification('Invalid PIN. Authorization denied.', 'error');
                btnUpdate.innerHTML = originalText;
                btnUpdate.disabled = false;
                return;
            }

            // Update rates in the UI
            document.querySelector(`[data-rate="${category}-minimum"]`).textContent = `₱${parseFloat(minimum).toFixed(2)}`;
            document.querySelector(`[data-rate="${category}-tier1"]`).textContent = `₱${parseFloat(tier1).toFixed(2)}`;
            document.querySelector(`[data-rate="${category}-tier2"]`).textContent = `₱${parseFloat(tier2).toFixed(2)}`;
            document.querySelector(`[data-rate="${category}-tier3"]`).textContent = `₱${parseFloat(tier3).toFixed(2)}`;
            document.querySelector(`[data-rate="${category}-tier4"]`).textContent = `₱${parseFloat(tier4).toFixed(2)}`;

            // Sync changes to hidden inputs for "Save Settings"
            if (category === 'residential') {
                const setHidden = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val;
                };
                setHidden('base_rate', minimum); // Assuming minimum is base rate
                setHidden('tier1_rate', tier1);
                setHidden('tier2_rate', tier2);
                setHidden('tier3_rate', tier3);
            }

            // Flag as unsaved
            window.hasUnsavedChanges = true;
            const saveBtn = document.getElementById('saveSettingsBtn');
            if (saveBtn) {
                saveBtn.classList.add('btn-warning');
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Settings (Unsaved)';
            }

            showNotification(`${data.title} updated (Pending Save)`, 'info');
            closeModal('editRateModal');

            // Reset button state
            btnUpdate.innerHTML = originalText;
            btnUpdate.disabled = false;
        } catch (error) {
            console.error('Failed to update rates:', error);
            showNotification('Failed to update rates', 'error');
            btnUpdate.innerHTML = originalText;
            btnUpdate.disabled = false;
        }
    });
};

// Initialize edit rate buttons
function initializeRateEditing() {
    document.querySelectorAll('.btn-edit-rate').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            showEditRateModal(category);
        });
    });
}

// === NOTIFICATIONS LOGIC ===
function initializeNotificationsUI() {
    const bellBtn = document.getElementById('notificationBellBtn');
    const dropdown = document.getElementById('notificationDropdown');
    const markAllReadBtn = document.getElementById('markAllReadBtn');

    if (!bellBtn || !dropdown) return;

    // Toggle dropdown
    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = dropdown.style.display === 'flex';
        dropdown.style.display = isVisible ? 'none' : 'flex';
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // Mark all as read
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            await markAllRead();
        });
    }
}

async function loadNotifications() {
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');
    if (!list) return;

    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        // Update badge (count unread)
        const unreadCount = data.filter(n => !n.is_read).length;
        if (badge) {
            if (unreadCount > 0) {
                badge.style.display = 'flex';
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            } else {
                badge.style.display = 'none';
            }
        }

        // Render list
        if (data.length === 0) {
            list.innerHTML = '<div style="padding: 30px 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No new notifications</div>';
            return;
        }

        list.innerHTML = data.map(n => {
            const iconSvg = n.type === 'cutoff_done' 
                ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93"/></svg>` 
                : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
            
            const iconClass = n.type === 'cutoff_done' ? 'cutoff-done' : 'default';
            
            return `
                <div class="notification-item ${n.is_read ? '' : 'unread'}" 
                     onclick="handleNotificationClick('${n.id}', ${n.customer_id})">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div class="notification-icon-wrapper ${iconClass}">
                            ${iconSvg}
                        </div>
                        <div class="notification-content">
                            <p class="notification-message">${n.message}</p>
                            <span class="notification-time">${formatTimeAgo(new Date(n.created_at))}</span>
                        </div>
                        ${!n.is_read ? '<div class="unread-dot"></div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Load Notifications Error:', err);
    }
}

async function markAllRead() {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('is_read', false);

        if (error) throw error;
        loadNotifications();
    } catch (err) {
        console.error('Mark All Read Error:', err);
    }
}

window.handleNotificationClick = async function(id, customerId) {
    try {
        // Mark as read
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        // Close dropdown
        document.getElementById('notificationDropdown').style.display = 'none';
        
        // Reload notifications
        loadNotifications();

        // Navigate to customer if customerId exists
        if (customerId) {
            window.navigateToCustomer(customerId);
        }
    } catch (err) {
        console.error('Notification Click Error:', err);
    }
};

window.navigateToCustomer = function(customerId) {
    const customersNavItem = document.querySelector('.nav-item[data-page="customers"]');
    if (customersNavItem) {
        // Set search ID to target customer
        const searchInput = document.getElementById('customerSearch');
        if (searchInput && typeof getAccountID === 'function') {
            searchInput.value = getAccountID(customerId);
        }
        
        // Trigger navigation
        customersNavItem.click();
    }
};

function formatTimeAgo(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
}
