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
    if (id === 'customerModal') return showCustomerModal();
    if (id === 'staffModal') return showStaffModal();
    
    // Generic fallback for fixed modals (like cutoffConfirmModal)
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
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
        <div class="modal-overlay premium-modal-overlay" id="customerModal">
            <div class="premium-modal-card" style="max-width: 480px; width: 95%;">
                <div class="premium-header-accent"></div>
                <div class="premium-modal-body" style="padding: 1.25rem 1.75rem;">
                    <button class="modal-close-btn" onclick="closeModal('customerModal')">
                        <i class="fas fa-times"></i>
                    </button>

                    <div class="stepper-header" style="margin-bottom: 0.5rem;">
                        <div class="stepper-progress-bar" style="left: 0.5rem; right: 0.5rem; height: 1px;">
                            <div class="stepper-progress-fill" id="customerStepperFill"></div>
                        </div>
                        <div class="stepper-steps">
                            <div class="step-item active" id="custStep1Indicator">
                                <div class="step-number" style="width: 22px; height: 22px; font-size: 0.75rem;">1</div>
                                <span class="step-label" style="font-size: 0.65rem;">Personal</span>
                            </div>
                            <div class="step-item" id="custStep2Indicator">
                                <div class="step-number" style="width: 22px; height: 22px; font-size: 0.75rem;">2</div>
                                <span class="step-label" style="font-size: 0.65rem;">Service</span>
                            </div>
                        </div>
                    </div>

                    <form class="premium-form" id="customerForm" novalidate>
                        <!-- Step 1: Personal Information -->
                        <div class="modal-step active" id="custStep1">
                            <div class="premium-icon-circle" style="width: 36px; height: 36px; font-size: 1rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-user-plus"></i>
                            </div>
                            <h2 class="premium-modal-title" style="font-size: 1.05rem; margin-bottom: 0.1rem;">Customer Profile</h2>
                            <p class="premium-modal-subtitle" style="margin-bottom: 0.75rem; font-size: 0.8rem;">Basic personal details.</p>
                            
                            <div class="form-section no-border">
                                <div class="form-row-elegant">
                                    <div class="form-group-elegant flex-2">
                                        <label>Last Name *</label>
                                        <input type="text" name="lastName" placeholder="e.g. Dela Cruz" required />
                                    </div>
                                    <div class="form-group-elegant flex-2">
                                        <label>First Name *</label>
                                        <input type="text" name="firstName" placeholder="e.g. Juan" required />
                                    </div>
                                    <div class="form-group-elegant flex-1">
                                        <label>M.I.</label>
                                        <input type="text" name="middleInitial" placeholder="A" maxlength="1" />
                                    </div>
                                </div>
                                <div class="form-row-elegant">
                                    <div class="form-group-elegant flex-2">
                                        <label>Contact Number *</label>
                                        <input type="tel" name="contact" placeholder="09XX XXX XXXX" maxlength="11" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 11)" required />
                                    </div>
                                    <div class="form-group-elegant flex-1">
                                        <label>Age *</label>
                                        <input type="number" name="age" placeholder="25" min="1" max="150" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 3)" required />
                                    </div>
                                </div>
                            </div>
                            <div class="stepper-actions">
                                <button type="button" class="btn-premium-secondary" onclick="closeModal('customerModal')">
                                    Cancel
                                </button>
                                <button type="button" class="btn-premium-primary" id="custBtnNext">
                                    Next Step <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Step 2: Property & Service -->
                        <div class="modal-step" id="custStep2">
                            <div class="premium-icon-circle" style="width: 36px; height: 36px; font-size: 1rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-home"></i>
                            </div>
                            <h2 class="premium-modal-title" style="font-size: 1.05rem; margin-bottom: 0.1rem;">Service Details</h2>
                            <p class="premium-modal-subtitle" style="margin-bottom: 0.75rem; font-size: 0.8rem;">Property and account specifics.</p>

                            <div class="form-section no-border">
                                <div class="form-row-elegant">
                                    <div class="form-group-elegant">
                                        <label>Barangay *</label>
                                        <select name="address" class="elegant-select" required>
                                            <option value="">-- Select --</option>
                                            ${(window.PULUPANDAN_BARANGAYS || []).map(b => `<option value="${b}">${b}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group-elegant">
                                        <label>Customer Type *</label>
                                        <select name="customerType" class="elegant-select" required>
                                            <option value="residential">Residential</option>
                                            <option value="commercial-a">Semi-Commercial A</option>
                                            <option value="commercial-b">Semi-Commercial B</option>
                                            <option value="commercial-c">Semi-Commercial C</option>
                                            <option value="full-commercial">Commercial / Industrial</option>
                                            <option value="bulk">Bulk / Wholesale</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row-elegant">
                                    <div class="form-group-elegant">
                                        <label>Meter Size *</label>
                                        <select name="meterSize" class="elegant-select" required>
                                            <option value='1/2"'>1/2"</option>
                                            <option value='3/4"'>3/4"</option>
                                            <option value='1"'>1"</option>
                                            <option value='1 1/2"'>1 1/2"</option>
                                            <option value='2"'>2"</option>
                                            <option value='3"'>3"</option>
                                            <option value='4"'>4"</option>
                                        </select>
                                    </div>
                                    <div class="form-group-elegant">
                                        <label>Meter Number *</label>
                                        <input type="text" name="meterNumber" placeholder="Serial No." required />
                                    </div>
                                </div>
                                <div class="form-row-elegant" style="display: flex; justify-content: flex-start;">
                                    <div class="form-group-elegant checkbox-form-group" style="max-width: 300px;">
                                         <label class="checkbox-label premium-cb" style="padding: 0.75rem 1rem; border-radius: 12px;">
                                            <input type="checkbox" name="discount" value="true" />
                                            <div class="cb-text">
                                                <span class="cb-title" style="font-size: 0.85rem;">Senior Citizen Discount</span>
                                                <span class="cb-sub" style="font-size: 0.725rem;">Apply ${window.currentSettings ? (window.currentSettings.discount_percentage || 0) : 5}% off</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div class="stepper-actions">
                                <button type="button" class="btn-premium-secondary" id="custBtnBack">
                                    <i class="fas fa-arrow-left"></i> Back
                                </button>
                                <button type="submit" class="btn-premium-primary" id="custBtnSubmit">
                                    <i class="fas fa-save"></i> Save Customer
                                </button>
                            </div>
                        </div> <!-- close custStep2 -->
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;
    
    // Show modal
    const modal = document.getElementById('customerModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    // Stepper Logic
    let currentStep = 1;
    const totalSteps = 2;
    const btnNext = document.getElementById('custBtnNext');
    const btnBack = document.getElementById('custBtnBack');
    const btnSubmit = document.getElementById('custBtnSubmit');
    const fill = document.getElementById('customerStepperFill');

    function updateStepper() {
        document.querySelectorAll('#customerModal .modal-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`custStep${currentStep}`).classList.add('active');
 
        document.querySelectorAll('#customerModal .step-item').forEach((item, idx) => {
            if (idx + 1 < currentStep) {
                item.classList.add('completed');
                item.classList.remove('active');
            } else if (idx + 1 === currentStep) {
                item.classList.add('active');
                item.classList.remove('completed');
            } else {
                item.classList.remove('active', 'completed');
            }
        });
 
        fill.style.width = currentStep === 1 ? '0%' : '100%';
    }
 
    // Attach event delegation for navigation
    document.getElementById('customerForm').addEventListener('click', (e) => {
        const nextBtn = e.target.closest('#custBtnNext');
        const backBtn = e.target.closest('#custBtnBack');
 
        if (nextBtn) {
            e.preventDefault();
            const step1 = document.getElementById('custStep1');
            const inputs = step1.querySelectorAll('input[required]');
            let valid = true;
            inputs.forEach(i => {
                if (!i.value) {
                    i.style.borderColor = 'var(--danger)';
                    valid = false;
                } else {
                    i.style.borderColor = '';
                }
            });
 
            if (!valid) {
                showNotification('Please fill in all personal details.', 'error');
                return;
            }
            if (currentStep < totalSteps) {
                currentStep++;
                updateStepper();
            }
        }
 
        if (backBtn) {
            e.preventDefault();
            if (currentStep > 1) {
                currentStep--;
                updateStepper();
            }
        }
    });

    document.getElementById('customerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!e.target.checkValidity()) {
            showNotification('Please complete all required fields.', 'error');
            return;
        }
        const formData = new FormData(e.target);
        const customer = Object.fromEntries(formData);
        customer.discount = formData.get('discount') === 'true';

        const submitBtn = document.getElementById('custBtnSubmit');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            await window.dbOperations.addCustomer(customer);
            closeModal('customerModal');
            showNotification('Customer added successfully!', 'success');
        } catch (error) {
            console.error('Failed to add customer:', error);
            showNotification('Failed to add customer.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}
window.showCustomerModal = showCustomerModal;

/**
 * Staff Modal Generator
 */
function showStaffModal() {
    const modalHTML = `
        <div class="modal-overlay premium-modal-overlay" id="staffModal">
            <div class="premium-modal-card" style="max-width: 480px; width: 95%;">
                <div class="premium-header-accent"></div>
                <div class="premium-modal-body" style="padding: 1.25rem 1.75rem;">
                    <button class="modal-close-btn" onclick="closeModal('staffModal')">
                        <i class="fas fa-times"></i>
                    </button>

                    <div class="stepper-header" style="margin-bottom: 0.5rem;">
                        <div class="stepper-progress-bar" style="left: 0.5rem; right: 0.5rem; height: 1px;">
                            <div class="stepper-progress-fill" id="stepperFill"></div>
                        </div>
                        <div class="stepper-steps">
                            <div class="step-item active" id="step1Indicator">
                                <div class="step-number" style="width: 22px; height: 22px; font-size: 0.75rem;">1</div>
                                <span class="step-label" style="font-size: 0.65rem;">Personal</span>
                            </div>
                            <div class="step-item" id="step2Indicator">
                                <div class="step-number" style="width: 22px; height: 22px; font-size: 0.75rem;">2</div>
                                <span class="step-label" style="font-size: 0.65rem;">Security</span>
                            </div>
                        </div>
                    </div>

                    <form class="premium-form" id="staffForm" novalidate>
                        <!-- Step 1: Personal Information -->
                        <div class="modal-step active" id="modalStep1">
                            <div class="premium-icon-circle" style="width: 36px; height: 36px; font-size: 1rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-id-card"></i>
                            </div>
                            <h2 class="premium-modal-title" style="font-size: 1.05rem; margin-bottom: 0.1rem;">Personal Details</h2>
                            <p class="premium-modal-subtitle" style="margin-bottom: 0.75rem; font-size: 0.8rem;">Basic identification.</p>
                            
                            <div class="form-section no-border">
                                <div class="form-row-elegant">
                                    <div class="form-group-elegant flex-2">
                                        <label>Last Name *</label>
                                        <input type="text" name="lastName" placeholder="e.g. Dela Cruz" required />
                                    </div>
                                    <div class="form-group-elegant flex-2">
                                        <label>First Name *</label>
                                        <input type="text" name="firstName" placeholder="e.g. Juan" required />
                                    </div>
                                    <div class="form-group-elegant flex-1">
                                        <label>M.I.</label>
                                        <input type="text" name="middleInitial" placeholder="A" maxlength="1" />
                                    </div>
                                </div>
                                <div class="form-row-elegant">
                                    <div class="form-group-elegant flex-2">
                                        <label>Role *</label>
                                        <select name="role" class="elegant-select" required>
                                            <option value="admin">Administrator</option>
                                            <option value="cashier">Cashier</option>
                                            <option value="reader">Meter Reader</option>
                                        </select>
                                    </div>
                                    <div class="form-group-elegant flex-2">
                                        <label>Contact Number *</label>
                                        <input type="tel" name="contact" placeholder="09XX XXX XXXX" maxlength="11" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 11)" required />
                                    </div>
                                    <div class="form-group-elegant flex-1">
                                        <label>Age *</label>
                                        <input type="number" name="age" placeholder="25" min="1" max="150" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 3)" required />
                                    </div>
                                </div>
                            </div>
                             <div class="stepper-actions">
                                <button type="button" class="btn-premium-secondary" onclick="closeModal('staffModal')">
                                    Cancel
                                </button>
                                <button type="button" class="btn-premium-primary" id="btnNext">
                                    Next Step <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Step 2: Authentication -->
                        <div class="modal-step" id="modalStep2">
                            <div class="premium-icon-circle" style="width: 36px; height: 36px; font-size: 1rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-shield-alt"></i>
                            </div>
                            <h2 class="premium-modal-title" style="font-size: 1.05rem; margin-bottom: 0.1rem;">Security & Status</h2>
                            <p class="premium-modal-subtitle" style="margin-bottom: 0.75rem; font-size: 0.8rem;">Login credentials.</p>

                            <div class="form-section no-border">
                                <div class="form-group-elegant" style="margin-bottom: 0.75rem;">
                                    <label style="font-size: 0.7rem;">Username *</label>
                                    <div class="input-with-hint-elegant">
                                        <input type="text" name="username" placeholder="Enter username" />
                                        <span class="input-hint-elegant" style="font-size: 0.7rem; margin-top: 2px;">Login: <span class="hint-dynamic-elegant">username</span>@gmail.com</span>
                                    </div>
                                </div>
                                <div class="form-row-elegant" style="gap: 1rem;">
                                    <div class="form-group-elegant password-field">
                                        <label style="font-size: 0.7rem;">Password *</label>
                                        <div class="password-input-wrapper-elegant">
                                            <input type="password" id="staffPassword" name="password" placeholder="••••••••" minlength="6" />
                                        </div>
                                    </div>
                                    <div class="form-group-elegant password-field">
                                        <label style="font-size: 0.7rem;">Confirm Password *</label>
                                        <div class="password-input-wrapper-elegant">
                                            <input type="password" id="staffConfirmPassword" placeholder="••••••••" minlength="6" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                             <div class="stepper-actions">
                                <button type="button" class="btn-premium-secondary" id="btnBack">
                                    <i class="fas fa-arrow-left"></i> Back
                                </button>
                                <button type="submit" class="btn-premium-primary" id="btnSubmit">
                                    <i class="fas fa-user-check"></i> Register Staff
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;

    const modal = document.getElementById('staffModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    // Stepper Navigation Logic
    let currentStep = 1;
    const totalSteps = 2;
    const btnNext = document.getElementById('btnNext');
    const btnBack = document.getElementById('btnBack');
    const btnSubmit = document.getElementById('btnSubmit');
    const fill = document.getElementById('stepperFill');

    function updateStepper() {
        // Handle Content
        document.querySelectorAll('#staffModal .modal-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`modalStep${currentStep}`).classList.add('active');

        // Handle Indicators
        document.querySelectorAll('#staffModal .step-item').forEach((item, idx) => {
            if (idx + 1 < currentStep) {
                item.classList.add('completed');
                item.classList.remove('active');
            } else if (idx + 1 === currentStep) {
                item.classList.add('active');
                item.classList.remove('completed');
            } else {
                item.classList.remove('active', 'completed');
            }
        });

        // Handle Progress Bar bar
        fill.style.width = currentStep === 1 ? '0%' : '100%';
    }

    // Attach event delegation for navigation
    document.getElementById('staffForm').addEventListener('click', (e) => {
        const nextBtn = e.target.closest('#btnNext');
        const backBtn = e.target.closest('#btnBack');

        if (nextBtn) {
            e.preventDefault();
            // Basic validation for Step 1
            const step1 = document.getElementById('modalStep1');
            const inputs = step1.querySelectorAll('input[required], select[required]');
            let valid = true;
            inputs.forEach(i => {
                if (!i.checkValidity()) {
                    i.style.borderColor = 'var(--danger)';
                    valid = false;
                } else {
                    i.style.borderColor = '';
                }
            });

            if (!valid) {
                showNotification('Please fill in all personal details correctly.', 'error');
                return;
            }

            if (currentStep < totalSteps) {
                currentStep++;
                updateStepper();
            }
        }

        if (backBtn) {
            e.preventDefault();
            if (currentStep > 1) {
                currentStep--;
                updateStepper();
            }
        }
    });

    // Dynamic username hint logic
    const usernameInput = modal.querySelector('input[name="username"]');
    const dynamicHint = modal.querySelector('.hint-dynamic-elegant');
    if (usernameInput && dynamicHint) {
        usernameInput.addEventListener('input', (e) => {
            const val = e.target.value || 'username';
            dynamicHint.textContent = val;
        });
    }

    // Initialize password toggles
    if (window.initPasswordToggles) {
        window.initPasswordToggles('#staffModal');
    }

    document.getElementById('staffForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate missing fields in Step 2
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');
        const confirmPassword = document.getElementById('staffConfirmPassword').value;

        if (!username || !password || !confirmPassword) {
            showNotification('Please fill in all authentication details.', 'error');
            return;
        }

        // Validate password match
        if (!password || !confirmPassword) {
            showNotification('Please fill in all authentication details.', 'error');
            return;
        }

        // Validate password match
        if (password !== confirmPassword) {
            showNotification('Passwords do not match!', 'error');
            return;
        }

        if (password.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }

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
                    contact: formData.get('contact'),
                    age: formData.get('age')
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
    
    // Show modal
    const modal = document.getElementById('boxModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

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
            showNotification(isEdit ? 'Area Box updated!' : 'Area Box created!', 'success');
            closeModal('boxModal');
        } catch (error) {
            console.error('Failed to save area box:', error);
            showNotification(error.message || 'Failed to save area box.', 'error');
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

    // Show sub-modal
    const modal = document.getElementById('barangaySelectorModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

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

        // Settings and Schedules for logic
        const [settings, schedules] = await Promise.all([
            window.dbOperations.loadSystemSettings(),
            window.dbOperations.loadRateSchedules()
        ]);

        const schedule = schedules.find(s => s.category_key === customer.customer_type);

        const data = window.BillingEngine.calculate(bill, customer, settings, schedule);
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

        // Show modal
        const modal = document.getElementById('billModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        }
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
        age: row.dataset.age || '',
        status: (row.dataset.status || 'active').toLowerCase(),
        discount: row.dataset.discount === 'true',
        type: row.dataset.type || 'residential',
        meterSize: row.dataset.meterSize || '1/2"'
    };

    const modalHTML = `
        <div class="modal-overlay premium-modal-overlay" id="editCustomerModal">
            <div class="premium-modal-card" style="max-width: 480px; width: 95%;">
                <div class="premium-header-accent" style="height: 4px; background: linear-gradient(90deg, #0f172a, #1e293b);"></div>
                <div class="premium-modal-body" style="padding: 1.25rem 1.75rem;">
                    <button class="modal-close-btn" onclick="closeModal('editCustomerModal')">
                        <i class="fas fa-times"></i>
                    </button>

                    <div class="stepper-header" style="margin-bottom: 0.5rem;">
                        <div class="stepper-progress-bar" style="left: 0.5rem; right: 0.5rem; height: 1px;">
                            <div class="stepper-progress-fill" id="editCustFill"></div>
                        </div>
                        <div class="stepper-steps">
                            <div class="step-item active" id="editCustStep1Ind">
                                <div class="step-number" style="width: 22px; height: 22px; font-size: 0.75rem;">1</div>
                                <span class="step-label" style="font-size: 0.65rem;">Personal</span>
                            </div>
                            <div class="step-item" id="editCustStep2Ind">
                                <div class="step-number" style="width: 22px; height: 22px; font-size: 0.75rem;">2</div>
                                <span class="step-label" style="font-size: 0.65rem;">Service</span>
                            </div>
                        </div>
                    </div>

                    <form class="premium-form" id="editCustomerForm" novalidate>
                        <div class="modal-step active" id="editCustStep1">
                            <div class="premium-icon-circle" style="width: 36px; height: 36px; font-size: 1rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-user-edit"></i>
                            </div>
                            <h2 class="premium-modal-title" style="font-size: 1.05rem; margin-bottom: 0.1rem;">Edit Profile</h2>
                            <p class="premium-modal-subtitle" style="margin-bottom: 0.75rem; font-size: 0.8rem;">ID: #${String(customerId).padStart(3, '0')}</p>

                            <div class="form-section no-border">
                                <div class="form-row-elegant">
                                    <div class="form-group-elegant flex-2">
                                        <label>Last Name *</label>
                                        <input type="text" name="lastName" value="${customer.lastName}" required />
                                    </div>
                                    <div class="form-group-elegant flex-2">
                                        <label>First Name *</label>
                                        <input type="text" name="firstName" value="${customer.firstName}" required />
                                    </div>
                                    <div class="form-group-elegant flex-1">
                                        <label>M.I.</label>
                                        <input type="text" name="middleInitial" value="${customer.middleInitial}" maxlength="1" />
                                    </div>
                                </div>
                                <div class="form-row-elegant">
                                    <div class="form-group-elegant flex-2">
                                        <label>Contact Number *</label>
                                        <input type="tel" name="contact" value="${customer.contact}" maxlength="11" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 11)" required />
                                    </div>
                                    <div class="form-group-elegant flex-1">
                                        <label>Age *</label>
                                        <input type="number" name="age" value="${customer.age}" min="1" max="150" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 3)" required />
                                    </div>
                                </div>
                            </div>
                            <div class="stepper-actions">
                                <button type="button" class="btn-premium-secondary" onclick="closeModal('editCustomerModal')">
                                    Cancel
                                </button>
                                <button type="button" class="btn-premium-primary" id="editCustNext">
                                    Next Step <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>

                        <div class="modal-step" id="editCustStep2">
                            <div class="premium-icon-circle" style="width: 36px; height: 36px; font-size: 1rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-map-marker-alt"></i>
                            </div>
                            <h2 class="premium-modal-title" style="font-size: 1.05rem; margin-bottom: 0.1rem;">Service Info</h2>
                            <p class="premium-modal-subtitle" style="margin-bottom: 0.75rem; font-size: 0.8rem;">Property specifics.</p>

                            <div class="form-section no-border">
                                <div class="form-row-elegant">
                                    <div class="form-group-elegant">
                                        <label>Barangay *</label>
                                        <select name="address" class="elegant-select" required>
                                            ${(window.PULUPANDAN_BARANGAYS || []).map(b => `<option value="${b}" ${customer.address === b ? 'selected' : ''}>${b}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group-elegant">
                                        <label>Customer Type *</label>
                                        <select name="customerType" class="elegant-select" required>
                                            <option value="residential" ${customer.type === 'residential' ? 'selected' : ''}>Residential</option>
                                            <option value="commercial-a" ${customer.type === 'commercial-a' ? 'selected' : ''}>Semi-Commercial A</option>
                                            <option value="commercial-b" ${customer.type === 'commercial-b' ? 'selected' : ''}>Semi-Commercial B</option>
                                            <option value="commercial-c" ${customer.type === 'commercial-c' ? 'selected' : ''}>Semi-Commercial C</option>
                                            <option value="full-commercial" ${customer.type === 'full-commercial' ? 'selected' : ''}>Commercial / Industrial</option>
                                            <option value="bulk" ${customer.type === 'bulk' ? 'selected' : ''}>Bulk / Wholesale</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row-elegant">
                                    <div class="form-group-elegant">
                                        <label>Meter Size *</label>
                                        <select name="meterSize" class="elegant-select" required>
                                            <option value='1/2"' ${customer.meterSize === '1/2"' ? 'selected' : ''}>1/2"</option>
                                            <option value='3/4"' ${customer.meterSize === '3/4"' ? 'selected' : ''}>3/4"</option>
                                            <option value='1"' ${customer.meterSize === '1"' ? 'selected' : ''}>1"</option>
                                            <option value='1 1/2"' ${customer.meterSize === '1 1/2"' ? 'selected' : ''}>1 1/2"</option>
                                            <option value='2"' ${customer.meterSize === '2"' ? 'selected' : ''}>2"</option>
                                            <option value='3"' ${customer.meterSize === '3"' ? 'selected' : ''}>3"</option>
                                            <option value='4"' ${customer.meterSize === '4"' ? 'selected' : ''}>4"</option>
                                        </select>
                                    </div>
                                    <div class="form-group-elegant">
                                        <label>Meter Number *</label>
                                        <input type="text" name="meterNumber" value="${customer.meterNumber}" required />
                                    </div>
                                </div>
                                <div class="form-row-elegant">
                                    <div class="form-group-elegant">
                                        <label>Account Status</label>
                                        <select name="status" class="elegant-select">
                                            <option value="active" ${customer.status === 'active' ? 'selected' : ''}>Active</option>
                                            <option value="inactive" ${customer.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                        </select>
                                    </div>
                                <div class="form-group-elegant checkbox-form-group" style="margin-top: 0.5rem;">
                                     <label class="checkbox-label premium-cb" style="padding: 0.5rem; border-radius: 10px;">
                                        <input type="checkbox" name="discount" value="true" ${customer.discount ? 'checked' : ''} />
                                        <div class="cb-text">
                                            <span class="cb-title" style="font-size: 0.85rem;">Senior Citizen Discount</span>
                                            <span class="cb-sub" style="font-size: 0.7rem;">Apply ${window.currentSettings ? (window.currentSettings.discount_percentage || 0) : 5}% off</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div class="stepper-actions">
                                <button type="button" class="btn-premium-secondary" id="editCustBack">
                                    <i class="fas fa-arrow-left"></i> Back
                                </button>
                                <button type="submit" class="btn-premium-primary" id="editCustSubmit">
                                    <i class="fas fa-check-circle"></i> Save Changes
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;
    
    // Show modal
    const modal = document.getElementById('editCustomerModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    // Stepper Logic
    let currentStep = 1;
    const totalSteps = 2;
    const btnNext = document.getElementById('editCustNext');
    const btnBack = document.getElementById('editCustBack');
    const btnSubmit = document.getElementById('editCustSubmit');
    const fill = document.getElementById('editCustFill');

    function updateStepper() {
        document.querySelectorAll('#editCustomerModal .modal-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`editCustStep${currentStep}`).classList.add('active');

        document.querySelectorAll('#editCustomerModal .step-item').forEach((item, idx) => {
            if (idx + 1 < currentStep) {
                item.classList.add('completed');
                item.classList.remove('active');
            } else if (idx + 1 === currentStep) {
                item.classList.add('active');
                item.classList.remove('completed');
            } else {
                item.classList.remove('active', 'completed');
            }
        });

        fill.style.width = currentStep === 1 ? '0%' : '100%';
    }

    // Attach listener via event delegation to handle buttons inside active steps
    document.getElementById('editCustomerForm').addEventListener('click', (e) => {
        const nextBtn = e.target.closest('#editCustNext');
        const backBtn = e.target.closest('#editCustBack');

        if (nextBtn) {
            e.preventDefault();
            
            const step1 = document.getElementById('editCustStep1');
            const inputs = step1.querySelectorAll('input[required], select[required]');
            let valid = true;
            inputs.forEach(i => {
                if (!i.checkValidity()) {
                    i.style.borderColor = 'var(--danger)';
                    valid = false;
                } else {
                    i.style.borderColor = '';
                }
            });

            if (!valid) {
                showNotification('Please check personal details.', 'error');
                return;
            }

            if (currentStep < totalSteps) {
                currentStep++;
                updateStepper();
            }
        }
        
        if (backBtn) {
            e.preventDefault();
            if (currentStep > 1) {
                currentStep--;
                updateStepper();
            }
        }
    });

    document.getElementById('editCustomerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!e.target.checkValidity()) {
            showNotification('Please check all fields.', 'error');
            return;
        }
        const formData = new FormData(e.target);
        const updatedCustomer = Object.fromEntries(formData);
        updatedCustomer.discount = formData.get('discount') === 'true';

        try {
            await window.dbOperations.updateCustomer(customerId, updatedCustomer);
            showNotification('Customer updated successfully!', 'success');
            closeModal('editCustomerModal');
        } catch (error) {
            console.error('Failed to update customer:', error);
            showNotification(error.message || 'Failed to update customer.', 'error');
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
        age: row.dataset.age || '',
        status: (row.dataset.status || 'active').toLowerCase()
    };

    const modalHTML = `
        <div class="modal-overlay premium-modal-overlay" id="editStaffModal">
            <div class="premium-modal-card" style="max-width: 440px; width: 95%;">
                <div class="premium-header-accent"></div>
                <div class="premium-modal-body" style="padding: 1.25rem 1.75rem;">
                    <button class="modal-close-btn" onclick="closeModal('editStaffModal')">
                        <i class="fas fa-times"></i>
                    </button>

                    <div class="premium-icon-circle" style="width: 36px; height: 36px; font-size: 1rem; margin-bottom: 0.5rem;">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <h2 class="premium-modal-title" style="font-size: 1.05rem; margin-bottom: 0.1rem;">Edit Staff</h2>
                    <p class="premium-modal-subtitle" style="margin-bottom: 0.75rem; font-size: 0.8rem;">#S${String(staffId).padStart(3, '0')}</p>

                    <form class="premium-form" id="editStaffForm" novalidate>
                        <div class="form-section no-border">
                            <div class="form-row-elegant">
                                <div class="form-group-elegant flex-2">
                                    <label>Last Name *</label>
                                    <input type="text" name="lastName" value="${staff.lastName}" required />
                                </div>
                                <div class="form-group-elegant flex-2">
                                    <label>First Name *</label>
                                    <input type="text" name="firstName" value="${staff.firstName}" required />
                                </div>
                                <div class="form-group-elegant flex-1">
                                    <label>M.I.</label>
                                    <input type="text" name="middleInitial" value="${staff.middleInitial}" maxlength="1" />
                                </div>
                            </div>
                            <div class="form-row-elegant">
                                <div class="form-group-elegant">
                                    <label>Role *</label>
                                    <select name="role" class="elegant-select" required>
                                        <option value="cashier" ${staff.role === 'cashier' ? 'selected' : ''}>Cashier</option>
                                        <option value="reader" ${staff.role === 'reader' ? 'selected' : ''}>Meter Reader</option>
                                    </select>
                                </div>
                                <div class="form-group-elegant">
                                    <label>Status</label>
                                    <select name="status" class="elegant-select">
                                        <option value="active" ${staff.status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="inactive" ${staff.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row-elegant">
                                <div class="form-group-elegant flex-2">
                                    <label>Contact Number *</label>
                                    <input type="tel" name="contact" value="${staff.contact}" maxlength="11" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 11)" required />
                                </div>
                                <div class="form-group-elegant flex-1">
                                    <label>Age *</label>
                                    <input type="number" name="age" value="${staff.age}" min="1" max="150" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 3)" required />
                                </div>
                            </div>
                        </div>

                        <div class="stepper-actions">
                             <button type="button" class="btn-premium-secondary" onclick="closeModal('editStaffModal')">
                                Cancel
                            </button>
                            <button type="submit" class="btn-premium-primary" id="editStaffSubmit">
                                <i class="fas fa-check-double"></i> Save Staff
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;

    // Show modal
    const modal = document.getElementById('editStaffModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    document.getElementById('editStaffForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!e.target.checkValidity()) {
            showNotification('Please check all fields.', 'error');
            return;
        }
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const formData = new FormData(e.target);
        const updatedStaff = Object.fromEntries(formData);

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            await window.dbOperations.updateStaff(staffId, updatedStaff);
            showNotification('Staff updated successfully!', 'success');
            closeModal('editStaffModal');
        } catch (error) {
            console.error('Failed to update staff:', error);
            showNotification(error.message || 'Failed to update staff.', 'error');
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

/**
 * Shared Pagination UI Renderer
 * @param {string} containerId - Container element ID
 * @param {number} totalItems - Total number of records
 * @param {number} currentPage - Current page number (1-indexed)
 * @param {number} pageSize - Number of items per page
 * @param {string} onPageChange - Callback function name for page click
 */
window.renderPagination = function (containerId, totalItems, currentPage, pageSize, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Ensure it has the correct class for styling
    container.classList.add('pagination-container');

    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, totalItems);

    let html = `
        <div class="pagination-info">
            Showing <strong>${startIdx}-${endIdx}</strong> of <strong>${totalItems}</strong> entries
        </div>
        <div class="pagination-controls">
            <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChange}(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
    `;

    const delta = 2;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
            html += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="${onPageChange}(${i})">${i}</button>
            `;
        } else if (i === (currentPage - delta - 1) || i === (currentPage + delta + 1)) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    html += `
            <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChange}(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

    container.innerHTML = html;
};
