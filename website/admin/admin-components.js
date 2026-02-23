/**
 * Admin Dashboard - UI Components & Template Generators
 * Modularized to keep the main logic clean.
 */

// Global state mirrors or shared references
const PREMIUM_PALETTE = window.PREMIUM_PALETTE || [];
let modalSelectedBarangays = [];
let tempSubSelectedBarangays = [];

// === UI HELPERS ===
function closeModal(modalId) {
    if (window.pwdUtils && window.pwdUtils.closeModal) {
        window.pwdUtils.closeModal(modalId);
    } else {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }
}

function openModal(id) {
    console.log('Opening modal:', id);
    if (id === 'customerModal') showCustomerModal();
    if (id === 'staffModal') showStaffModal();
    if (id === 'changePasswordModal') {
        const modal = document.getElementById('changePasswordModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        }
    }
}

// Make globally accessible
window.closeModal = closeModal;
window.openModal = openModal;


/**
 * Customer Modal Generator
 */
function showCustomerModal() {
    const modalHTML = `
        <div class="modal-overlay" id="customerModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Add New Customer</h3>
                    <button class="modal-close" onclick="closeModal('customerModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form class="modal-form" id="customerForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Last Name *</label>
                            <input type="text" name="lastName" required />
                        </div>
                        <div class="form-group">
                            <label>First Name *</label>
                            <input type="text" name="firstName" required />
                        </div>
                        <div class="form-group mi-group">
                            <label>M.I.</label>
                            <input type="text" name="middleInitial" />
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Contact Number *</label>
                            <input type="tel" name="contact" required />
                        </div>
                        <div class="form-group">
                            <label>Barangay *</label>
                            <select name="address" required>
                                <option value="">-- Select Barangay --</option>
                                ${(window.PULUPANDAN_BARANGAYS || []).map(b => `<option value="${b}">${b}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Meter Number *</label>
                            <input type="text" name="meterNumber" required />
                        </div>
                        <div class="form-group">
                            <label>Customer Type *</label>
                            <select name="customerType" required>
                                <option value="residential">Residential</option>
                                <option value="commercial-a">Commercial A</option>
                                <option value="commercial-b">Commercial B</option>
                                <option value="full-commercial">Full Commercial</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Status</label>
                            <select name="status">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>
                        <div class="form-group checkbox-form-group">
                             <label class="alignment-label">&nbsp;</label>
                             <label class="checkbox-label">
                                <input type="checkbox" name="discount" value="true" />
                                <span>PWD / Senior Citizen Discount (${window.currentSettings ? (window.currentSettings.discount_percentage || 0) : 20}% off)</span>
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('customerModal')">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Customer</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;

    document.getElementById('customerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const customer = Object.fromEntries(formData);
        customer.discount = formData.get('discount') === 'true';

        try {
            await window.dbOperations.addCustomer(customer);
            closeModal('customerModal');
        } catch (error) {
            console.error('Failed to add customer:', error);
        }
    });
}
window.showCustomerModal = showCustomerModal;

/**
 * Staff Modal Generator
 */
function showStaffModal() {
    const modalHTML = `
        <div class="modal-overlay" id="staffModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Add New Staff</h3>
                    <button class="modal-close" onclick="closeModal('staffModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form class="modal-form" id="staffForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Last Name *</label>
                            <input type="text" name="lastName" required />
                        </div>
                        <div class="form-group">
                            <label>First Name *</label>
                            <input type="text" name="firstName" required />
                        </div>
                        <div class="form-group mi-group">
                            <label>M.I.</label>
                            <input type="text" name="middleInitial" />
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Role *</label>
                            <select name="role" required>
                                <option value="cashier">Cashier</option>
                                <option value="reader">Meter Reader</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Contact Number *</label>
                            <input type="tel" name="contact" required />
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Username *</label>
                            <input type="text" name="username" required />
                            <small style="color: #666; font-size: 0.85rem;">Login will be: username@gmail.com</small>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Password *</label>
                            <input type="password" id="staffPassword" name="password" required minlength="6" />
                        </div>
                        <div class="form-group">
                            <label>Confirm Password *</label>
                            <input type="password" id="staffConfirmPassword" required minlength="6" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select name="status">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('staffModal')">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Staff</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;

    // Initialize password toggles
    if (window.initPasswordToggles) {
        window.initPasswordToggles('#staffModal');
    }

    document.getElementById('staffForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate password match
        const password = document.getElementById('staffPassword').value;
        const confirmPassword = document.getElementById('staffConfirmPassword').value;

        if (password !== confirmPassword) {
            showNotification('Passwords do not match!', 'error');
            return;
        }

        if (password.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        const formData = new FormData(e.target);
        const username = formData.get('username');
        const email = `${username}@gmail.com`; // Auto-generate email

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

        try {
            // Get current session to verify user is logged in
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                throw new Error('No active session. Please log in again.');
            }

            console.log('Calling Edge Function with session:', session.user.id);

            // Call Edge Function - Supabase automatically includes auth header
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: email,
                    password: password,
                    role: formData.get('role'),
                    firstName: formData.get('firstName'),
                    lastName: formData.get('lastName'),
                    middleInitial: formData.get('middleInitial'),
                    username: username,
                    contact: formData.get('contact')
                }
            });

            if (error) throw error;

            // Log the full response for debugging
            console.log('Edge Function Response:', data);

            if (error) {
                console.error('Initial Error:', error);
                throw error;
            }

            // Since we now return 200 for errors, check data.success
            if (!data || !data.success) {
                const errorMsg = data?.error || 'Failed to create user (Unknown Error)';
                console.error('Edge Function Error:', errorMsg);
                throw new Error(errorMsg);
            }

            showNotification(`${data.user.name} created successfully!`, 'success');
            closeModal('staffModal');

            // Reload staff list
            if (window.dbOperations && window.dbOperations.loadStaff) {
                window.dbOperations.loadStaff();
            }
        } catch (error) {
            console.error('Failed to create user:', error);
            showNotification(error.message || 'Failed to create user', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}
window.showStaffModal = showStaffModal;

/**
 * Area Box Modal Overhaul (Scheduling)
 */
async function showAreaBoxModal(box = null) {
    if (!window.dbOperations || !window.dbOperations.PULUPANDAN_BARANGAYS) {
        showNotification('System Error: Required data not loaded.', 'error');
        return;
    }

    const isEdit = !!box;
    modalSelectedBarangays = isEdit ? (box.barangays || []) : [];
    const initialPalette = PREMIUM_PALETTE.find(p => p.color === box?.color) || PREMIUM_PALETTE[0];
    const selectedColor = isEdit ? box.color : initialPalette.color;
    const { data: readers } = await supabase
        .from('staff')
        .select('id, first_name, last_name')
        .ilike('role', 'reader')
        .eq('status', 'active');

    const colorPickerHTML = PREMIUM_PALETTE.map(p => `
        <div class="color-opt ${p.color === selectedColor ? 'active' : ''}" 
             style="background: ${p.color}" 
             title="${p.name}"
             onclick="selectModalColor(this, '${p.color}', '${p.rgb}')"></div>
    `).join('');

    const modalHTML = `
        <div class="modal-overlay" id="boxModal">
            <div class="modal" style="--active-tag-color: ${selectedColor}; --active-tag-rgb: ${initialPalette.rgb}">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit Area Box' : 'Create New Area Box'}</h3>
                    <button class="modal-close" onclick="closeModal('boxModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form class="modal-form" id="areaBoxForm">
                    <input type="hidden" name="color" id="modalSelectedColor" value="${selectedColor}" />
                    
                    <div class="form-group">
                        <label>Sector Name *</label>
                        <input type="text" name="name" required placeholder="e.g. North Sector" value="${isEdit ? box.name : ''}" />
                    </div>

                    <div class="form-group">
                        <label>Sector Theme Color</label>
                        <div class="color-options">
                            ${colorPickerHTML}
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Assigned Barangays *</label>
                        <div id="selectedBarangaysContainer" class="selected-barangays-flex"></div>
                        <button type="button" class="btn-add-barangay" onclick="showBarangaySelector(${isEdit ? box.id : 'null'})">
                            <i class="fas fa-plus-circle"></i> Manage Locations
                        </button>
                    </div>

                    <div class="form-group">
                        <label>Assigned Reader</label>
                        <select name="readerId">
                            <option value="">-- No Reader Assigned --</option>
                            ${(readers || []).map(r => `<option value="${r.id}" ${isEdit && box.assigned_reader_id === r.id ? 'selected' : ''}>${r.last_name}, ${r.first_name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="modal-footer">
                        ${isEdit ? `<button type="button" class="btn btn-danger delete-btn-left" onclick="window.dbOperations.deleteAreaBox(${box.id}); closeModal('boxModal');">Delete Box</button>` : ''}
                        <button type="button" class="btn btn-secondary" onclick="closeModal('boxModal')">Cancel</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Box'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;
    renderSelectedBarangayTags();

    const form = document.getElementById('areaBoxForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        if (modalSelectedBarangays.length === 0) {
            showNotification('Please select at least one Barangay.', 'error');
            return;
        }
        const data = {
            name: formData.get('name'),
            color: formData.get('color'),
            barangays: modalSelectedBarangays,
            readerId: formData.get('readerId') ? parseInt(formData.get('readerId')) : null
        };
        try {
            if (isEdit) await window.dbOperations.updateAreaBox(box.id, data);
            else await window.dbOperations.addAreaBox(data);
            closeModal('boxModal');
        } catch (error) {
            showNotification('Failed to save area box', 'error');
        }
    });
}
window.showAreaBoxModal = showAreaBoxModal;
window.showAddBoxModal = () => showAreaBoxModal();
window.showEditBoxModal = (box) => showAreaBoxModal(box);

function renderSelectedBarangayTags() {
    const container = document.getElementById('selectedBarangaysContainer');
    if (!container) return;
    if (modalSelectedBarangays.length === 0) {
        container.innerHTML = '<span style="color: #94A3B8; font-size: 0.85rem; width: 100%; text-align: center;">No barangays selected yet</span>';
        return;
    }
    container.innerHTML = modalSelectedBarangays.map(bg => `
        <div class="selected-tag">
            <span>${bg}</span>
            <i class="fas fa-times" onclick="removeBarangayFromModal('${bg}')"></i>
        </div>
    `).join('');
}

window.removeBarangayFromModal = function (bg) {
    modalSelectedBarangays = modalSelectedBarangays.filter(item => item !== bg);
    renderSelectedBarangayTags();
};

window.showBarangaySelector = function (currentBoxId = null) {
    tempSubSelectedBarangays = [...modalSelectedBarangays];

    // Create assignment lookup map (Barangay -> Box Info)
    const assignments = {};
    if (window.allAreaBoxes) {
        window.allAreaBoxes.forEach(box => {
            if (box.id !== currentBoxId) { // Skip current box
                (box.barangays || []).forEach(bg => {
                    assignments[bg] = {
                        boxName: box.name,
                        color: box.color,
                        rgb: (window.PREMIUM_PALETTE || []).find(p => p.color === box.color)?.rgb || '148, 163, 184'
                    };
                });
            }
        });
    }

    const selectorHTML = `
        <div class="modal-overlay sub-modal" id="barangaySelectorModal">
            <div class="modal small-modal">
                <div class="modal-header">
                    <h3>Select Barangays</h3>
                    <button class="modal-close" onclick="closeModal('barangaySelectorModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="sub-modal-content">
                    <div class="search-input-wrapper">
                        <i class="fas fa-search search-icon-sub"></i>
                        <input type="text" class="search-field-sub" placeholder="Search barangays or areas..." oninput="filterBarangayList(this.value)" />
                    </div>
                    <div class="barangay-select-list" id="fullBarangayList"></div>
                    <div class="modal-footer themed-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('barangaySelectorModal')">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="confirmBarangaySelection()">Confirm Selection</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    // 1. Cleanup existing sub-modal container to prevent duplicate IDs
    const existing = document.getElementById('subModalContainer');
    if (existing) existing.remove();

    const subContainer = document.createElement('div');
    subContainer.id = 'subModalContainer';
    document.body.appendChild(subContainer);
    subContainer.innerHTML = selectorHTML;
    renderFullBarangayList('', assignments);
};

function renderFullBarangayList(filter = '', assignments = {}) {
    const listEl = document.getElementById('fullBarangayList');
    if (!listEl) return;
    const allBarangays = window.dbOperations.PULUPANDAN_BARANGAYS;
    const filtered = allBarangays.filter(bg => bg.toLowerCase().includes(filter.toLowerCase()));
    listEl.innerHTML = filtered.map(bg => {
        const isSelected = tempSubSelectedBarangays.includes(bg);
        const assigned = assignments[bg];

        if (assigned) {
            return `
                <div class="select-item assigned-elsewhere" 
                     style="--box-color: ${assigned.color}; --box-color-rgb: ${assigned.rgb}"
                     title="Assigned to ${assigned.boxName} (Locked)">
                    <span class="bg-name">${bg}</span>
                </div>
            `;
        }

        return `<div class="select-item ${isSelected ? 'selected' : ''}" onclick="toggleBarangaySelection('${bg}', this)">${bg}</div>`;
    }).join('');
}
window.filterBarangayList = renderFullBarangayList;

window.toggleBarangaySelection = function (bg, el) {
    if (tempSubSelectedBarangays.includes(bg)) {
        tempSubSelectedBarangays = tempSubSelectedBarangays.filter(item => item !== bg);
        el.classList.remove('selected');
    } else {
        tempSubSelectedBarangays.push(bg);
        el.classList.add('selected');
    }
};

window.confirmBarangaySelection = function () {
    modalSelectedBarangays = [...tempSubSelectedBarangays];
    renderSelectedBarangayTags();
    closeModal('barangaySelectorModal');
};

window.selectModalColor = function (el, color, rgb) {
    document.querySelectorAll('.color-opt').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('modalSelectedColor').value = color;
    const modal = document.querySelector('#boxModal .modal');
    if (modal) {
        modal.style.setProperty('--active-tag-color', color);
        modal.style.setProperty('--active-tag-rgb', rgb);
    }
};

/**
 * Bill Detailed Modal
 */
async function showBillModal(billId) {
    try {
        const { data: bill, error } = await supabase
            .from('billing')
            .select(`*, customers (id, last_name, first_name, middle_initial, address, meter_number, customer_type, has_discount)`)
            .eq('id', billId)
            .maybeSingle();

        if (error) throw error;
        const customer = bill.customers;
        if (!customer) throw new Error('Customer information missing');

        const middleInitial = customer.middle_initial ? ` ${customer.middle_initial}.` : '';
        const customerName = `${customer.last_name}, ${customer.first_name}${middleInitial}`;

        // Settings for logic
        const settings = await window.dbOperations.loadSystemSettings();

        const data = window.BillingEngine.calculate(bill, customer, settings);
        const invoiceHTML = window.BillingEngine.generateInvoiceHTML(bill, customer, data, { customerName });

        const modalHTML = `
            <div class="modal-overlay" id="billModal">
                <div class="modal service-invoice-modal">
                    <button class="modal-close no-print" onclick="closeModal('billModal')" style="position: absolute; top: 1rem; right: 1rem; z-index: 20; background: rgba(255,255,255,0.8); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd;">
                        <i class="fas fa-times"></i>
                    </button>

                    ${invoiceHTML}

                    <div class="button-row-receipt no-print" style="display: flex; gap: 10px; padding: 1rem 2rem; background: #f8f9fa; border-top: 1px solid #ddd;">
                        <button type="button" class="btn btn-secondary flex-1" onclick="closeModal('billModal')">Close</button>
                        <button type="button" class="btn btn-primary flex-1" onclick="window.printBill(${bill.id})">
                            <i class="fas fa-print"></i> Print Invoice
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modalContainer').innerHTML = modalHTML;
    } catch (error) {
        console.error('Error showing bill modal:', error);
        showNotification('Failed to load bill details', 'error');
    }
}

// Print helper for admin invoice
window.printBill = function (billId) {
    document.body.classList.add('printing-invoice');
    window.print();
    document.body.classList.remove('printing-invoice');
};

window.showBillModal = showBillModal;

/**
 * Edit Customer Modal
 */
function editCustomer(customerId, row, cells) {
    const customer = {
        id: customerId,
        firstName: row.dataset.firstName || '',
        lastName: row.dataset.lastName || '',
        middleInitial: row.dataset.middleInitial || '',
        address: row.dataset.address || '',
        meterNumber: row.dataset.meterNumber || '',
        contact: row.dataset.contact || '',
        status: (row.dataset.status || 'active').toLowerCase(),
        discount: row.dataset.discount === 'true',
        type: row.dataset.type || 'residential'
    };

    const modalHTML = `
        <div class="modal-overlay" id="editCustomerModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Edit Customer - #${String(customerId).padStart(3, '0')}</h3>
                    <button class="modal-close" onclick="closeModal('editCustomerModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form class="modal-form" id="editCustomerForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Last Name *</label>
                            <input type="text" name="lastName" required value="${customer.lastName}" />
                        </div>
                        <div class="form-group">
                            <label>First Name *</label>
                            <input type="text" name="firstName" required value="${customer.firstName}" />
                        </div>
                        <div class="form-group mi-group">
                            <label>M.I.</label>
                            <input type="text" name="middleInitial" value="${customer.middleInitial}" />
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Contact Number *</label>
                            <input type="tel" name="contact" required value="${customer.contact}" />
                        </div>
                        <div class="form-group">
                            <label>Barangay *</label>
                            <select name="address" required>
                                ${(window.PULUPANDAN_BARANGAYS || []).map(b => `
                                    <option value="${b}" ${customer.address === b ? 'selected' : ''}>${b}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Meter Number *</label>
                            <input type="text" name="meterNumber" required value="${customer.meterNumber}" />
                        </div>
                        <div class="form-group">
                            <label>Customer Type *</label>
                            <select name="customerType" required>
                                <option value="residential" ${customer.type === 'residential' ? 'selected' : ''}>Residential</option>
                                <option value="commercial-a" ${customer.type === 'commercial-a' ? 'selected' : ''}>Commercial A</option>
                                <option value="commercial-b" ${customer.type === 'commercial-b' ? 'selected' : ''}>Commercial B</option>
                                <option value="full-commercial" ${customer.type === 'full-commercial' ? 'selected' : ''}>Full Commercial</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Status</label>
                            <select name="status">
                                <option value="active" ${customer.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${customer.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                <option value="pending" ${customer.status === 'pending' ? 'selected' : ''}>Pending</option>
                            </select>
                        </div>
                        <div class="form-group checkbox-form-group">
                             <label class="alignment-label">&nbsp;</label>
                             <label class="checkbox-label">
                                <input type="checkbox" name="discount" value="true" ${customer.discount ? 'checked' : ''} />
                                <span>PWD / Senior Citizen Discount (${window.currentSettings ? (window.currentSettings.discount_percentage || 0) : 20}% off)</span>
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('editCustomerModal')">Cancel</button>
                        <button type="submit" class="btn btn-primary">Update Customer</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;

    document.getElementById('editCustomerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updatedCustomer = Object.fromEntries(formData);
        updatedCustomer.discount = formData.get('discount') === 'true';

        try {
            await window.dbOperations.updateCustomer(customerId, updatedCustomer);
            closeModal('editCustomerModal');
        } catch (error) {
            console.error('Failed to update customer:', error);
        }
    });
}
window.editCustomer = editCustomer;

/**
 * Edit Staff Modal
 */
function editStaff(staffId, row, cells) {
    const staff = {
        id: staffId,
        firstName: row.dataset.firstName || '',
        lastName: row.dataset.lastName || '',
        middleInitial: row.dataset.middleInitial || '',
        role: (row.dataset.role || 'reader').toLowerCase(),
        contact: row.dataset.contact || '',
        status: (row.dataset.status || 'active').toLowerCase()
    };

    const modalHTML = `
        <div class="modal-overlay" id="editStaffModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Edit Staff - #S${String(staffId).padStart(3, '0')}</h3>
                    <button class="modal-close" onclick="closeModal('editStaffModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form class="modal-form" id="editStaffForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Last Name *</label>
                            <input type="text" name="lastName" required value="${staff.lastName}" />
                        </div>
                        <div class="form-group">
                            <label>First Name *</label>
                            <input type="text" name="firstName" required value="${staff.firstName}" />
                        </div>
                        <div class="form-group mi-group">
                            <label>M.I.</label>
                            <input type="text" name="middleInitial" value="${staff.middleInitial}" />
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Role *</label>
                            <select name="role" required>
                                <option value="cashier" ${staff.role === 'cashier' ? 'selected' : ''}>Cashier</option>
                                <option value="reader" ${staff.role === 'reader' ? 'selected' : ''}>Meter Reader</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Contact Number *</label>
                            <input type="tel" name="contact" required value="${staff.contact}" />
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Status</label>
                            <select name="status">
                                <option value="active" ${staff.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${staff.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                <option value="pending" ${staff.status === 'pending' ? 'selected' : ''}>Pending</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('editStaffModal')">Cancel</button>
                        <button type="submit" class="btn btn-primary">Update Staff</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;

    document.getElementById('editStaffForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const formData = new FormData(e.target);
        const updatedStaff = Object.fromEntries(formData);

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            await window.dbOperations.updateStaff(staffId, updatedStaff);
            closeModal('editStaffModal');
        } catch (error) {
            console.error('Failed to update staff:', error);
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Update Staff';
        }
    });
}
window.editStaff = editStaff;

/**
 * Premium Confirm Modal
 * Replaces the native browser confirm() dialog
 */
function showConfirmModal(options = {}) {
    const {
        title = 'Are you sure?',
        message = 'This action cannot be undone.',
        confirmText = 'Yes, Delete',
        cancelText = 'Cancel',
        type = 'danger',
        onConfirm = () => { }
    } = options;

    const modalHTML = `
        <div class="confirm-modal-overlay" id="confirmModalOverlay">
            <div class="confirm-modal">
                <div class="confirm-modal-icon">
                    <i class="fas fa-trash-alt"></i>
                </div>
                <h3 class="confirm-modal-title">${title}</h3>
                <p class="confirm-modal-message">${message}</p>
                <div class="confirm-modal-actions">
                    <button class="confirm-modal-btn cancel" onclick="closeConfirmModal()">
                        ${cancelText}
                    </button>
                    <button class="confirm-modal-btn confirm" id="confirmModalAction">
                        ${confirmText}
                    </button>
                </div>
            </div>
        </div>
    `;

    // Append to body instead of modalContainer to avoid overlap issues with other modals
    const wrapper = document.createElement('div');
    wrapper.id = 'confirmModalWrapper';
    wrapper.innerHTML = modalHTML;
    document.body.appendChild(wrapper);

    // Handle Confirm Click
    document.getElementById('confirmModalAction').addEventListener('click', () => {
        onConfirm();
        closeConfirmModal();
    });
}

function closeConfirmModal() {
    const wrapper = document.getElementById('confirmModalWrapper');
    if (wrapper) {
        const modal = wrapper.querySelector('.confirm-modal');
        const overlay = wrapper.querySelector('.confirm-modal-overlay');

        if (modal) modal.style.transform = 'scale(0.9) translateY(20px)';
        if (modal) modal.style.opacity = '0';
        if (overlay) overlay.style.opacity = '0';

        setTimeout(() => wrapper.remove(), 300);
    }
}

window.showConfirmModal = showConfirmModal;
window.closeConfirmModal = closeConfirmModal;
