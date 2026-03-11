/**
 * Cashier UI Components & Modals
 * Strictly isolated from the Admin side.
 */

(function () {
    // Add Reading Modal
    async function showAddReadingModal() {
        const modalId = 'addReadingModal';
        const container = document.getElementById('modalContainer');

        // Fetch customers for the selection
        const { data: customers, error } = await supabase
            .from('customers')
            .select('id, first_name, last_name, meter_number')
            .eq('status', 'active')
            .order('last_name', { ascending: true });

        if (error) {
            showNotification('Failed to load customers', 'error');
            return;
        }

        const modalHTML = `
            <div class="modal-overlay" id="${modalId}">
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Record Water Reading</h2>
                        <button class="modal-close" onclick="closeModal('${modalId}')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="addReadingForm" class="elegant-form">
                            <div class="form-group-elegant">
                                <label>Select Customer</label>
                                <select id="readingCustomerId" class="form-control" required>
                                    <option value="">-- Choose Customer --</option>
                                    ${customers.map(c => {
            const accNum = `ACC-${String(c.id).padStart(3, '0')}`;
            return `<option value="${c.id}" data-meter="${c.meter_number}">${c.last_name}, ${c.first_name} (${accNum})</option>`;
        }).join('')}
                                </select>
                            </div>

                            <div class="form-row">
                                <div class="form-group-elegant">
                                    <label>Previous Reading</label>
                                    <input type="number" id="prevReading" class="form-control" readonly value="0">
                                </div>
                                <div class="form-group-elegant">
                                    <label>Current Reading</label>
                                    <input type="number" id="currReading" class="form-control" required min="0">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group-elegant">
                                    <label>Consumption (cu.m.)</label>
                                    <input type="number" id="readingConsumption" class="form-control" readonly value="0">
                                </div>
                                <div class="form-group-elegant">
                                    <label>Date of Reading</label>
                                    <input type="date" id="readingDate" class="form-control" required value="${getLocalISODate()}">
                                </div>
                            </div>

                            <div class="reading-summary" id="readingSummary" style="display: none;">
                                <div class="summary-item">
                                    <span>Estimated Bill:</span>
                                    <strong id="estimatedBill">₱0.00</strong>
                                </div>
                            </div>

                            <div class="modal-actions" style="margin-top: 1.5rem;">
                                <button type="button" class="btn btn-outline" onclick="closeModal('${modalId}')">Cancel</button>
                                <button type="submit" class="btn btn-primary">Generate Bill</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', modalHTML);

        const form = document.getElementById('addReadingForm');
        const customerSelect = document.getElementById('readingCustomerId');
        const prevInput = document.getElementById('prevReading');
        const currInput = document.getElementById('currReading');
        const consInput = document.getElementById('readingConsumption');
        const summary = document.getElementById('readingSummary');
        const estBill = document.getElementById('estimatedBill');

        customerSelect.addEventListener('change', async () => {
            const customerId = customerSelect.value;
            if (!customerId) {
                prevInput.value = 0;
                return;
            }

            try {
                const { data: latestBill, error: billError } = await supabase
                    .from('billing')
                    .select('current_reading')
                    .eq('customer_id', customerId)
                    .order('period_end', { ascending: false })
                    .limit(1);

                if (billError) throw billError;

                prevInput.value = (latestBill && latestBill.length > 0) ? latestBill[0].current_reading : 0;
                updateConsumption();
            } catch (error) {
                console.error('Error fetching prev reading:', error);
                prevInput.value = 0;
            }
        });

        const updateConsumption = () => {
            const prev = parseFloat(prevInput.value) || 0;
            const curr = parseFloat(currInput.value) || 0;
            const cons = Math.max(0, curr - prev);
            consInput.value = cons;

            if (curr > 0) {
                summary.style.display = 'block';
                calculateEstimate(cons);
            } else {
                summary.style.display = 'none';
            }
        };

        currInput.addEventListener('input', updateConsumption);

        async function calculateEstimate(consumption) {
            const settings = await window.cashierDb.loadSystemSettings();

            let total = parseFloat(settings.base_rate) || 0;
            const t1T = settings.tier1_threshold || 10;
            const t1R = settings.tier1_rate || 0;
            const t2T = settings.tier2_threshold || 20;
            const t2R = settings.tier2_rate || 0;
            const t3R = settings.tier3_rate || 0;

            if (consumption > 0) {
                const t1 = Math.min(consumption, t1T);
                total += t1 * t1R;
                if (consumption > t1T) {
                    const t2 = Math.min(consumption - t1T, t2T - t1T);
                    total += t2 * t2R;
                    if (consumption > t2T) {
                        const t3 = consumption - t2T;
                        total += t3 * t3R;
                    }
                }
            }
            estBill.textContent = `₱${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        }

        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            try {
                const customerId = customerSelect.value;
                const currentReading = parseFloat(currInput.value);
                const prevReading = parseFloat(prevInput.value);
                const readingDate = document.getElementById('readingDate').value;

                await window.cashierDb.generateBillFromReading(customerId, currentReading, prevReading, readingDate);

                showNotification('Bill generated successfully!', 'success');
                closeModal(modalId);
                if (typeof loadInitialData === 'function') loadInitialData();
            } catch (error) {
                console.error('Bill generation failed:', error);
                showNotification('Failed to generate bill', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Generate Bill';
            }
        };
    }

    // Payment Modal
    async function showPaymentModal(billId) {
        const modalId = 'paymentModal';
        const container = document.getElementById('modalContainer');

        try {
            // 1. Fetch bill details
            const { data: bill, error: billError } = await supabase
                .from('billing')
                .select('*')
                .eq('id', billId)
                .single();

            if (billError) throw billError;

            // 2. Fetch customer details
            const { data: customer, error: customerError } = await supabase
                .from('customers')
                .select('id, last_name, first_name, has_discount, status')
                .eq('id', bill.customer_id)
                .single();

            if (customerError) throw customerError;

            // Compute account number
            const accountNumber = `ACC-${String(customer.id).padStart(3, '0')}`;

            // Fetch settings for penalty calculation
            const settings = await window.cashierDb.loadSystemSettings();

            // Calculate Penalty
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(bill.due_date);
            dueDate.setHours(0, 0, 0, 0);

            const isPastDue = today > dueDate;
            const shouldApplyPenalty = bill.status === 'overdue' || (bill.status === 'unpaid' && isPastDue);

            let penaltyAmount = 0;
            if (shouldApplyPenalty) {
                const penaltyRate = (parseFloat(settings.penalty_percentage) || 20) / 100;
                // NEW PLAN: Penalty on CURRENT bill amount (Base + Consumption), ignoring Arrears
                const currentCharges = parseFloat(bill.base_charge || 0) + parseFloat(bill.consumption_charge || 0);
                penaltyAmount = currentCharges * penaltyRate;
            }

            const totalDue = parseFloat(bill.balance) + penaltyAmount;

            const cutoffGrace = settings ? (settings.cutoff_grace_period || settings.cutoff_days || 30) : 30;
            
            let isForCutoff = false;
            if (bill.due_date) {
                const diffTime = today - dueDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                isForCutoff = (bill.status === 'overdue' || bill.status === 'unpaid') && diffDays >= cutoffGrace;
            }

            const modalHTML = `
                <div class="modal-overlay" id="${modalId}">
                    <div class="modal">
                        <div class="modal-header">
                            <h2 class="modal-title">Process Payment</h2>
                            <button class="modal-close" onclick="closeModal('${modalId}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            ${customer.status === 'inactive' ? `
                            <div class="deactivated-danger-banner">
                                <i class="fas fa-exclamation-triangle fa-2x"></i>
                                <div>
                                    <div style="font-size: 1.1rem;">ACCOUNT DEACTIVATED</div>
                                    <div style="font-weight: 400; opacity: 0.9;">Full payment required for reconnection eligibility.</div>
                                    ${customer.disconnection_date ? `<div style="font-weight: 400; font-size: 0.85rem; opacity: 0.85; margin-top: 4px;">Disconnected on: ${new Date(customer.disconnection_date).toLocaleDateString()}${customer.disconnection_bill_id ? ' | Bill: BIL-' + customer.disconnection_bill_id : ''}</div>` : ''}
                                </div>
                            </div>
                            ` : ''}
                            
                            <div class="payment-info-card">
                                <div class="info-row">
                                    <span>Customer:</span>
                                    <strong>${customer.last_name}, ${customer.first_name}</strong>
                                </div>
                                 <!-- TAX REMOVED AS REQUESTED -->
                                <div class="info-row">
                                    <span>Account No:</span>
                                    <strong>${accountNumber}</strong>
                                </div>
                                <div class="info-row" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee;">
                                    <span>Bill Balance:</span>
                                    <strong>₱${parseFloat(bill.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                </div>
                                
                                ${isForCutoff ? `
                                <div class="info-row status-danger" style="background: rgba(239, 68, 68, 0.1); padding: 8px; border-radius: 4px; margin-top: 8px; justify-content: center; animation: pulse 2s infinite;">
                                    <strong style="color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> ACCOUNT FOR CUTOFF</strong>
                                </div>
                                ` : ''}
                                
                                ${penaltyAmount > 0 ? `
                                <div class="info-row text-danger">
                                    <span>Late Penalty (${settings.penalty_percentage || 20}%):</span>
                                    <strong>+₱${penaltyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                </div>
                                ` : ''}

                                <div class="info-row total-row" style="margin-top: 5px; font-size: 1.1em; border-top: 1px solid #ddd; padding-top: 5px;">
                                    <span>Total Due:</span>
                                    <strong class="text-primary" style="font-size: 1.3rem;">₱${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                </div>
                            </div>

                            <form id="paymentForm" class="elegant-form" style="margin-top: 1.5rem;">
                                <div class="form-group-elegant">
                                    <label>Payment Method</label>
                                    <select id="paymentMethod" class="form-control" required>
                                        <option value="cash">Cash</option>
                                        <!-- Temporarily disabled online options for faster workflow -->
                                        <!-- <option value="gcash">GCash</option> -->
                                        <!-- <option value="bank">Bank Transfer</option> -->
                                    </select>
                                </div>

                                <div class="form-group-elegant">
                                    <label>Amount Received</label>
                                    <input type="number" id="amountReceived" class="form-control" required step="0.01" value="${totalDue.toFixed(2)}">
                                </div>

                                <div id="onlineRefGroup" class="form-group-elegant" style="display: none;">
                                    <label>Reference Number</label>
                                    <input type="text" id="onlineReference" class="form-control" placeholder="TXN-123456">
                                </div>

                                <div class="payment-summary" style="margin-top: 15px; background: #f9f9f9; padding: 10px; border-radius: 8px;">
                                    <div class="info-row">
                                        <span>Change:</span>
                                        <strong id="paymentChange" style="color: #2e7d32;">₱0.00</strong>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline" onclick="closeModal('${modalId}')" style="min-width: 100px;">Cancel</button>
                            <button type="submit" id="finalizePaymentBtn" form="paymentForm" class="btn btn-primary" style="flex: 1; min-height: 44px; font-weight: 700;">
                                <i class="fas fa-check-circle" style="margin-right: 8px;"></i> Finalize Payment
                            </button>
                        </div>
                    </div>
                </div>
            `;

            container.insertAdjacentHTML('beforeend', modalHTML);

            const form = document.getElementById('paymentForm');
            const methodSelect = document.getElementById('paymentMethod');
            const amountInput = document.getElementById('amountReceived');
            const changeText = document.getElementById('paymentChange');
            const refGroup = document.getElementById('onlineRefGroup');

            methodSelect.addEventListener('change', () => {
                refGroup.style.display = (methodSelect.value === 'cash') ? 'none' : 'block';
            });

            const updateChange = () => {
                const received = parseFloat(amountInput.value) || 0;
                const balance = totalDue;
                const change = Math.max(0, received - balance);
                changeText.textContent = `₱${change.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
            };

            amountInput.addEventListener('input', updateChange);
            updateChange();

            form.onsubmit = async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('finalizePaymentBtn');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                }

                try {
                    const received = parseFloat(amountInput.value);
                    const method = methodSelect.value;
                    const reference = document.getElementById('onlineReference').value;

                    const result = await window.cashierDb.recordPayment(billId, received, method, reference);

                    showNotification('Payment recorded successfully!', 'success');
                    closeModal(modalId);

                    // Check for reactivation if customer was inactive and balance is now 0
                    if (customer.status === 'inactive' && result.total_balance <= 0) {
                        const confirmReactivate = confirm(`Customer ${customer.last_name} has cleared their total balance. Reactivate account now?`);
                        if (confirmReactivate) {
                            try {
                                await window.cashierDb.reactivateCustomer(customer.id);
                                showNotification('Customer reactivated successfully!', 'success');
                                
                                // Notify Admin
                                if (typeof supabase !== 'undefined') {
                                    await supabase.from('notifications').insert([{
                                        customer_id: customer.id,
                                        message: `Customer ${customer.last_name}, ${customer.first_name} paid in full and was REACTIVATED.`,
                                        type: 'activation',
                                        is_read: false
                                    }]);
                                }
                            } catch (reactError) {
                                console.error('Delayed reactivation failed:', reactError);
                                showNotification('Reactivation failed, but payment was recorded.', 'error');
                            }
                        } else {
                            // Notify Admin that they paid but remain inactive
                            if (typeof supabase !== 'undefined') {
                                await supabase.from('notifications').insert([{
                                    customer_id: customer.id,
                                    message: `Customer ${customer.last_name}, ${customer.first_name} paid in full but remains INACTIVE.`,
                                    type: 'payment',
                                    is_read: false
                                }]);
                            }
                        }
                    }

                    if (typeof loadInitialData === 'function') loadInitialData();

                    // Auto-Show Receipt for Printing
                    setTimeout(() => {
                        window.showBillModal(billId);
                    }, 300); // Slight delay for smoother transition

                } catch (error) {
                    console.error('Payment failed:', error);
                    showNotification('Payment failed', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Finalize Payment';
                }
            };

        } catch (error) {
            console.error('Error opening payment modal:', error);
            showNotification('Failed to load bill details', 'error');
        }
    }

    // Receipt/Bill Modal (Refactored to use BillingEngine)
    async function showBillModal(billId) {
        try {
            const { data: bill, error: billError } = await supabase
                .from('billing')
                .select('*')
                .eq('id', billId)
                .single();

            if (billError) throw billError;

            // Fetch customer details
            const { data: customer, error: customerError } = await supabase
                .from('customers')
                .select('*')
                .eq('id', bill.customer_id)
                .single();

            if (customerError) throw customerError;

            const middleInitial = customer.middle_initial ? ` ${customer.middle_initial}.` : '';
            const customerName = `${customer.last_name}, ${customer.first_name}${middleInitial}`;

            // Settings and Schedules for logic
            const [settings, schedules] = await Promise.all([
                window.cashierDb.loadSystemSettings(),
                window.cashierDb.loadRateSchedules()
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
        } catch (error) {
            console.error('Error opening receipt:', error);
            showNotification('Failed to load bill details', 'error');
        }
    }

    // Add Print Helper
    window.printBill = function (billId) {
        document.body.classList.add('printing-invoice');
        window.print();
        document.body.classList.remove('printing-invoice');
    };

    // Export to window
    window.cashierComponents = {
        showAddReadingModal,
        showPaymentModal,
        showBillModal
    };

    // Override global
    window.showBillModal = showBillModal;
})();
