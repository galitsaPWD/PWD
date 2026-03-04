/**
 * Shared Utilities for PWD Management System
 */

(function () {
    /**
     * Securely escapes HTML special characters to prevent XSS
     */
    function escapeHTML(str) {
        if (!str) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(str).replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    /**
     * Format a date string to Local ISO Date (YYYY-MM-DD)
     */
    function getLocalISODate(date = new Date()) {
        const d = new Date(date);
        return d.toLocaleDateString('en-CA'); // en-CA format is YYYY-MM-DD
    }

    /**
     * Format Account ID for display
     */
    function getAccountID(id) {
        if (!id) return 'ACC-000';
        return `ACC-${String(id).padStart(3, '0')}`;
    }

    /**
     * Get Barangay from address
     */
    function getBarangay(address) {
        if (!address) return 'N/A';
        const lowerAddr = address.toLowerCase();
        const list = window.PULUPANDAN_BARANGAYS || [];
        const found = list.find(b => lowerAddr.includes(b.toLowerCase()));
        return found || address;
    }

    /**
     * Format Date/Time for display
     */
    function formatLocalDateTime(dateString, includeTime = true) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return date.toLocaleDateString(undefined, options);
    }

    /**
     * Notification Helper
     */
    function showNotification(message, type = 'info') {
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            // Simple default styling if first use
            container.style.cssText = 'position: fixed; top: 24px; right: 24px; z-index: 10000; pointer-events: none; display: flex; flex-direction: column; gap: 12px;';
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = type === 'success' ? 
            '<i class="fas fa-check-circle"></i>' : 
            (type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : '<i class="fas fa-info-circle"></i>');

        notification.innerHTML = `
            <div class="notification-content" style="display: flex; align-items: center; gap: 12px; pointer-events: auto;">
                ${icon}
                <span>${message}</span>
            </div>
        `;

        container.appendChild(notification);
        
        // Trigger show animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 3500);
    }

    /**
     * Modal Closer
     */
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                // Only remove if it was NOT a permanent modal (injected dynamically)
                // For now, consistent behavior: hidden is safer for dashboard modals.
            }, 300);
        }
    }

    /**
     * Initializes show/hide password toggles for all password fields
     */
    function initPasswordToggles(containerSelector = 'body') {
        const container = typeof containerSelector === 'string' ?
            document.querySelector(containerSelector) : containerSelector;

        if (!container) return;

        const passwordInputs = container.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            // Avoid duplicate initialization
            if (input.dataset.passwordToggleInit) return;
            input.dataset.passwordToggleInit = "true";

            // If already has a toggle in its parent wrapper, just attach event
            // Otherwise wrap it and add the toggle
            let wrapper = input.parentElement;
            if (!wrapper.classList.contains('password-input-wrapper') && 
                !wrapper.classList.contains('password-wrapper') &&
                !wrapper.classList.contains('password-input-wrapper-elegant')) {
                wrapper = document.createElement('div');
                wrapper.className = 'password-input-wrapper';
                input.parentNode.insertBefore(wrapper, input);
                wrapper.appendChild(input);
            }

            // Check if toggle button already exists
            let toggle = wrapper.querySelector('.toggle-password, .password-toggle, .pass-toggle');
            if (!toggle) {
                toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.className = 'pass-toggle';
                toggle.setAttribute('aria-label', 'Toggle password visibility');
                toggle.innerHTML = '<i class="fas fa-eye"></i>';
                wrapper.appendChild(toggle);
            }

            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Preserve cursor position and focus
                const start = input.selectionStart;
                const end = input.selectionEnd;
                const isPassword = input.type === 'password';

                input.type = isPassword ? 'text' : 'password';

                // Restore focus and cursor
                input.focus();
                if (start !== null && end !== null) {
                    input.setSelectionRange(start, end);
                }

                // Update icon (Support Fa-Eye and SVG fallback)
                const icon = toggle.querySelector('i');
                if (icon) {
                    icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
                } else {
                    // Fallback for cases where SVG might be present - replace with icon
                    toggle.innerHTML = `<i class="fas ${isPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
                }
            });
        });
    }

    /**
     * Debounce Function
     */
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Export to window
    window.pwdUtils = {
        getLocalISODate,
        formatLocalDateTime,
        showNotification,
        closeModal,
        getAccountID,
        getBarangay,
        debounce,
        escapeHTML,
        initPasswordToggles
    };

    // Global overrides for backward compatibility
    window.formatLocalDateTime = formatLocalDateTime;
    window.showNotification = showNotification;
    window.closeModal = closeModal;
    window.getLocalISODate = getLocalISODate;
    window.getAccountID = getAccountID;
    window.getBarangay = getBarangay;
    window.debounce = debounce;
    window.escapeHTML = escapeHTML;
    window.initPasswordToggles = initPasswordToggles;
})();
