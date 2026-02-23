/**
 * Unified Billing Logic for PWD Management System
 * Handles all financial calculations and receipt template generation.
 */

(function () {
    const BillingEngine = {
        /**
         * Securely escapes HTML special characters to prevent XSS
         * @param {string} str - The string to escape
         * @returns {string} - The escaped string
         */
        escapeHTML(str) {
            if (!str) return '';
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return String(str).replace(/[&<>"']/g, function (m) { return map[m]; });
        },

        /**
         * Calculate detailed billing components based on system settings
         * @param {Object} bill - The bill record from DB
         * @param {Object} customer - The customer record from DB
         * @param {Object} settings - System settings from DB
         */
        calculate(bill, customer, settings) {
            const consumption = parseFloat(bill.consumption) || 0;
            const baseRate = parseFloat(settings.base_rate) || 150;
            const arrears = parseFloat(bill.arrears) || 0;

            // Tier Calculation
            let consumptionCharge = 0;
            const tiers = [
                { threshold: settings.tier1_threshold || 10, rate: settings.tier1_rate || 15, label: 'Tier 1' },
                { threshold: settings.tier2_threshold || 20, rate: settings.tier2_rate || 20, label: 'Tier 2' },
                { threshold: Infinity, rate: settings.tier3_rate || 25, label: 'Tier 3' }
            ];

            const breakdown = [];
            let remaining = consumption;
            let lastThreshold = 0;

            for (let i = 0; i < tiers.length; i++) {
                if (remaining <= 0) break;
                const tier = tiers[i];
                const availableInTier = tier.threshold - lastThreshold;
                const usageInTier = Math.min(remaining, availableInTier);
                const costInTier = usageInTier * tier.rate;

                consumptionCharge += costInTier;
                breakdown.push({
                    label: i === 0 ? `First ${tier.threshold} m³` : (tier.threshold === Infinity ? `Above ${lastThreshold} m³` : `Next ${availableInTier} m³`),
                    usage: usageInTier,
                    rate: tier.rate,
                    cost: costInTier,
                    tierLabel: tier.label
                });

                remaining -= usageInTier;
                lastThreshold = tier.threshold;
            }

            // Penalty Calculation
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(bill.due_date);
            dueDate.setHours(0, 0, 0, 0);

            const isPastDue = today > dueDate;
            const shouldApplyPenalty = bill.status === 'overdue' || (bill.status === 'unpaid' && isPastDue);
            const penaltyRate = (parseFloat(settings.penalty_percentage) || 20) / 100;
            const penalty = shouldApplyPenalty ? (baseRate + consumptionCharge) * penaltyRate : 0;

            // Discount Calculation
            const discountPercent = parseFloat(settings.discount_percentage) || 20;
            const discountAmount = customer.has_discount ? (baseRate + consumptionCharge) * (discountPercent / 100) : 0;

            // Totals
            const totalDue = baseRate + consumptionCharge + penalty + arrears - discountAmount;

            // Cut-off Logic
            const cutoffDays = parseInt(settings.cutoff_days) || 17;
            const overdueDays = parseInt(settings.overdue_days) || 14;
            const delayAfterOverdue = cutoffDays - overdueDays;
            const cutoffDate = new Date(dueDate);
            cutoffDate.setDate(cutoffDate.getDate() + (delayAfterOverdue > 0 ? delayAfterOverdue : 3));
            const isCutoff = today > cutoffDate;

            return {
                consumption,
                baseRate,
                consumptionCharge,
                penalty,
                arrears,
                discountAmount,
                discountPercent,
                totalDue,
                isPastDue,
                isCutoff,
                breakdown
            };
        },

        /**
         * Generate Service Invoice HTML (Used by Cashier)
         */
        generateInvoiceHTML(bill, customer, data, options = {}) {
            const middleInitial = customer.middle_initial ? ` ${this.escapeHTML(customer.middle_initial)}.` : '';
            const customerName = options.customerName ? this.escapeHTML(options.customerName) : `${this.escapeHTML(customer.last_name)}, ${this.escapeHTML(customer.first_name)}${middleInitial}`;
            const address = this.escapeHTML(customer.address || '');
            const businessStyle = this.escapeHTML(customer.customer_type || 'Residential');
            const dateStr = window.formatLocalDateTime ? window.formatLocalDateTime(new Date(), false) : new Date().toLocaleDateString();

            return `
                <div class="service-invoice-paper">
                    <div class="invoice-header">
                        <div class="invoice-logo">
                            <img src="../assets/logo.png" alt="Logo">
                        </div>
                        <div class="invoice-district-info">
                            <h1>PULUPANDAN WATER DISTRICT</h1>
                            <p>Pulupandan, Negros Occidental</p>
                            <p>NON-VAT REG. TIN 006-849-454-000</p>
                        </div>
                    </div>

                    <div class="invoice-title-row">
                        <h2 class="invoice-main-title">SERVICE INVOICE</h2>
                        <div class="invoice-date-box">
                            <span>Date</span>
                            <span class="ink-line" style="min-width: 150px;">${dateStr}</span>
                        </div>
                    </div>

                    <div class="invoice-customer-info">
                        <div class="info-field">
                            <label>RECEIVED from</label>
                            <span class="ink-line" style="flex: 1;">${customerName}</span>
                            <label>TIN</label>
                            <span class="ink-line" style="width: 150px;"></span>
                        </div>
                        <div class="info-field">
                            <label>Address</label>
                            <span class="ink-line" style="flex: 1;">${address}</span>
                        </div>
                        <div class="info-field">
                            <label>Bus. Style</label>
                            <span class="ink-line" style="flex: 1;">${businessStyle}</span>
                        </div>
                        <div class="info-field">
                            <label>the sum of</label>
                            <span class="ink-line" style="flex: 1;">${data.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <label>(P</label>
                            <span class="ink-line" style="width: 150px; text-align: center;">${data.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <label>)</label>
                        </div>
                    </div>

                    <div class="invoice-payment-details">
                        <div class="payment-grid">
                            <div class="payment-col">
                                <div class="payment-row-item">
                                    <label>in payment for: Current</label>
                                    <span class="ink-line" style="width: 100px;">${(data.baseRate + data.consumptionCharge - data.discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="payment-row-item">
                                    <label>CY Arrears</label>
                                    <span class="ink-line" style="width: 100px;"></span>
                                </div>
                                <div class="payment-row-item">
                                    <label>PY Arrears</label>
                                    <span class="ink-line" style="width: 100px;">${data.arrears > 0 ? data.arrears.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</span>
                                </div>
                                <div class="payment-row-item">
                                    <label>Penalty</label>
                                    <span class="ink-line" style="width: 100px;">${data.penalty > 0 ? data.penalty.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}</span>
                                </div>
                            </div>
                            <div class="payment-col">
                                <div class="payment-row-item"><label>Installation fees</label><span class="ink-line" style="width: 100px;"></span></div>
                                <div class="payment-row-item"><label>Notary/Inspection</label><span class="ink-line" style="width: 100px;"></span></div>
                                <div class="payment-row-item"><label>Materials</label><span class="ink-line" style="width: 100px;"></span></div>
                                <div class="payment-row-item"><label>Others</label><span class="ink-line" style="width: 100px;"></span></div>
                            </div>
                        </div>
                    </div>

                    <div class="invoice-footer-section">
                        <div class="footer-left">
                            <div class="payment-method-boxes">
                                <label>PAYMENT IN FORM OF: [ ${bill.status === 'paid' ? 'x' : ' '} ] CASH</label>
                                <label>[   ] CHECK NO.</label>
                            </div>
                            <div class="bank-info-line">
                                <label>BANK</label><span class="ink-line" style="width: 120px;"></span>
                                <label>DATE</label><span class="ink-line" style="width: 120px;"></span>
                            </div>
                        </div>
                        <div class="footer-right">
                            <div class="signature-box">
                                <span class="ink-line" style="width: 200px;"></span>
                                <label>Cashier / Collector</label>
                            </div>
                            <div class="serial-number">
                                № <span class="serial-red">${String(bill.id).padStart(6, '0')}</span>
                            </div>
                        </div>
                    </div>

                    <div class="invoice-legal-disclaimer">
                        <p>"THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAX"</p>
                        <p>THIS SERVICE INVOICE SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF ATP</p>
                    </div>
                </div>
            `;
        },

        /**
         * Generate Receipt Paper HTML (Used by Admin)
         */
        generateReceiptHTML(bill, customer, data, options = {}) {
            const middleInitial = customer.middle_initial ? ` ${this.escapeHTML(customer.middle_initial)}.` : '';
            const customerName = options.customerName ? this.escapeHTML(options.customerName) : `${this.escapeHTML(customer.last_name)}, ${this.escapeHTML(customer.first_name)}${middleInitial}`;
            const accountNo = this.escapeHTML(window.getAccountID ? window.getAccountID(bill.customer_id) : bill.customer_id);
            const meterNo = this.escapeHTML(customer.meter_number || 'N/A');
            const periodStr = window.formatLocalDateTime ? window.formatLocalDateTime(bill.reading_date, false) : bill.reading_date;

            const breakdownHTML = data.breakdown.map(b => `
                <div class="breakdown-row"><span>${b.label}</span> <span>₱${b.cost.toLocaleString()}</span></div>
            `).join('');

            return `
                <div class="receipt-paper">
                    <div class="status-stamp ${bill.status === 'paid' ? 'paid' : (data.isCutoff ? 'cutoff' : 'unpaid')}">
                        ${data.isCutoff && bill.status !== 'paid' ? 'CUT-OFF' : bill.status}
                    </div>

                    ${data.isCutoff && bill.status !== 'paid' ? `
                        <div class="cutoff-notice">
                            <i class="fas fa-exclamation-triangle"></i> DISCONNECTION NOTICE: This account is past the grace period.
                        </div>
                    ` : ''}

                    <header class="receipt-header">
                        <div class="receipt-brand">
                            <img src="../assets/logo.png" alt="Logo" style="height: 40px; margin-right: 10px;">
                            <span>Pulupandan Water District</span>
                        </div>
                        <div class="receipt-subtitle">Official Water Bill</div>
                    </header>

                    <div class="receipt-id-row">
                        <span>#BIL-${String(bill.id).padStart(4, '0')}</span>
                        <span>${window.formatLocalDateTime ? window.formatLocalDateTime(new Date(), false) : new Date().toLocaleDateString()}</span>
                    </div>

                    <section class="receipt-section">
                        <h4 class="receipt-section-title">Customer Details</h4>
                        <div class="receipt-row"><span class="receipt-label">Name:</span><span class="receipt-value">${customerName}</span></div>
                        <div class="receipt-row"><span class="receipt-label">Account No:</span><span class="receipt-value mono">${accountNo}</span></div>
                        <div class="receipt-row"><span class="receipt-label">Meter No:</span><span class="receipt-value">${meterNo}</span></div>
                        <div class="receipt-row"><span class="receipt-label">Period:</span><span class="receipt-value">${periodStr}</span></div>
                    </section>

                    <section class="receipt-section">
                        <h4 class="receipt-section-title">Consumption (m³)</h4>
                        <div class="receipt-reading-grid">
                            <div class="reading-item"><label>Previous</label><span>${bill.previous_reading}</span></div>
                            <div class="reading-item"><label>Current</label><span>${bill.current_reading}</span></div>
                            <div class="reading-item"><label>Total</label><span style="color: var(--primary)">${data.consumption}</span></div>
                        </div>
                    </section>

                    <section class="receipt-section">
                        <h4 class="receipt-section-title">Charges Breakdown</h4>
                        <div class="receipt-row"><span class="receipt-label">Base Rate</span><span class="receipt-value">₱${data.baseRate.toLocaleString()}</span></div>
                        <div class="receipt-row"><span class="receipt-label">Consumption Charge</span><span class="receipt-value">₱${data.consumptionCharge.toLocaleString()}</span></div>
                        <div class="receipt-row" style="padding-left: 1rem; opacity: 0.7; font-size: 0.8rem;"><span>Tiered Breakdown:</span></div>
                        <div style="padding-left: 1rem; border-left: 2px solid #eee; margin-left: 0.5rem; margin-bottom: 1rem;">${breakdownHTML}</div>

                        ${customer.has_discount ? `
                        <div class="receipt-row" style="color: var(--primary); font-weight: 700;">
                            <span class="receipt-label">SC/PWD Discount (${data.discountPercent}%)</span>
                            <span class="receipt-value">-₱${data.discountAmount.toLocaleString()}</span>
                        </div>
                        ` : ''}

                        <div class="receipt-row">
                            <span class="receipt-label">Late Penalty</span>
                            <span class="receipt-value" style="${data.penalty > 0 ? 'color: var(--danger); font-weight: bold;' : ''}">₱${data.penalty.toLocaleString()}</span>
                        </div>
                        <div class="receipt-row">
                            <div class="receipt-label-column">
                                <span class="receipt-label">Arrears</span>
                                <small style="display: block; font-size: 0.7rem; color: #888; margin-top: -0.2rem;">(Previous Unpaid Balance)</small>
                            </div>
                            <span class="receipt-value">₱${data.arrears.toLocaleString()}</span>
                        </div>
                    </section>

                    <div class="receipt-total-section">
                        <div class="receipt-total-row">
                            <span class="receipt-total-label">Total Amount Due</span>
                            <span class="receipt-total-value">₱${data.totalDue.toLocaleString()}</span>
                        </div>
                        <div class="receipt-row" style="margin-top: 1rem; font-style: italic; color: #666;">
                            <span>Due Date:</span>
                            <span>${window.formatLocalDateTime ? window.formatLocalDateTime(bill.due_date, false) : bill.due_date}</span>
                        </div>
                    </div>

                    <footer class="receipt-footer">
                        <p class="thanks-msg">Thank you for being a valued customer!</p>
                        <p class="receipt-timestamp">Generated on ${window.formatLocalDateTime ? window.formatLocalDateTime(new Date()) : new Date().toLocaleString()}</p>
                    </footer>
                </div>
            `;
        }
    };

    window.BillingEngine = BillingEngine;
})();
