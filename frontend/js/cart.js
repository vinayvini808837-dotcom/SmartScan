/**
 * SmartScan - User Cart, Checkout & Order Controller
 * Connects frontend to Express REST API /api/cart and /api/orders
 */

const SmartScanCart = (function () {
  'use strict';

  const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';
  let activeCart = { items: [], subtotal: 0, tax: 0, total: 0 };

  // Fetch current cart from server
  async function refreshCart() {
    try {
      const res = await fetch(`${API_BASE}/api/cart`);
      const data = await res.json();
      if (data.success && data.data) {
        activeCart = data.data;
        updateCartBadge();
        renderCartDrawer();
      }
    } catch (err) {
      console.warn('Could not fetch cart from server:', err.message);
    }
  }

  // Add product to cart by barcode or ID
  async function addToCart(barcodeOrId, quantity = 1) {
    try {
      showToast('Adding item to cart...');
      const res = await fetch(`${API_BASE}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: barcodeOrId, quantity })
      });
      const data = await res.json();

      if (data.success && data.data) {
        activeCart = data.data;
        updateCartBadge();
        renderCartDrawer();
        showToast(data.message || 'Product added to cart!');
        openDrawer();
      } else {
        showToast(data.message || 'Failed to add item', 'error');
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      showToast('Network error adding to cart', 'error');
    }
  }

  // Change quantity (+ / -)
  async function updateQuantity(barcodeOrId, newQty) {
    try {
      const res = await fetch(`${API_BASE}/api/cart/item`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcodeOrId, quantity: newQty })
      });
      const data = await res.json();
      if (data.success && data.data) {
        activeCart = data.data;
        updateCartBadge();
        renderCartDrawer();
      }
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  }

  // Remove single line item
  async function removeItem(itemId) {
    try {
      const res = await fetch(`${API_BASE}/api/cart/item/${encodeURIComponent(itemId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success && data.data) {
        activeCart = data.data;
        updateCartBadge();
        renderCartDrawer();
        showToast('Item removed from cart');
      }
    } catch (err) {
      console.error('Error removing item:', err);
    }
  }

  // Clear all items
  async function clearCart() {
    try {
      const res = await fetch(`${API_BASE}/api/cart`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && data.data) {
        activeCart = data.data;
        updateCartBadge();
        renderCartDrawer();
        showToast('Cart cleared');
      }
    } catch (err) {
      console.error('Error clearing cart:', err);
    }
  }

  // Open Checkout Modal
  function proceedToCheckout() {
    if (!activeCart.items || activeCart.items.length === 0) {
      showToast('Your cart is empty. Scan products first!', 'warning');
      return;
    }

    const checkoutModal = document.getElementById('checkoutModal');
    const checkoutSummary = document.getElementById('checkoutOrderSummary');

    if (checkoutSummary) {
      checkoutSummary.innerHTML = `
        <div class="checkout-summary-box">
          <h4>Order Summary (${activeCart.items.length} items)</h4>
          <div class="checkout-items-list">
            ${activeCart.items.map(i => `
              <div class="checkout-item-line">
                <span>${i.name} &times; ${i.quantity}</span>
                <strong>₹${i.subtotal.toFixed(2)}</strong>
              </div>
            `).join('')}
          </div>
          <hr style="margin: 12px 0; border: none; border-top: 1px dashed #CBD5E1;">
          <div class="checkout-totals">
            <div><span>Subtotal:</span> <span>₹${activeCart.subtotal.toFixed(2)}</span></div>
            <div><span>GST (5% FMCG):</span> <span>₹${activeCart.tax.toFixed(2)}</span></div>
            <div class="grand-total"><span>Total Payable:</span> <strong>₹${activeCart.total.toFixed(2)}</strong></div>
          </div>
        </div>
      `;
    }

    closeDrawer();
    if (checkoutModal) checkoutModal.classList.add('active');
  }

  // Submit Order to backend
  async function submitOrder() {
    const nameInput = document.getElementById('checkoutNameInput');
    const phoneInput = document.getElementById('checkoutPhoneInput');
    const paymentMethodSelect = document.getElementById('checkoutPaymentMethod');
    const checkoutBtn = document.getElementById('btnConfirmOrder');

    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Processing Order...';
    }

    try {
      const res = await fetch(`${API_BASE}/api/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerInfo: {
            name: nameInput ? nameInput.value : 'Consumer',
            phone: phoneInput ? phoneInput.value : '+91 9876543210'
          },
          paymentMethod: paymentMethodSelect ? paymentMethodSelect.value : 'UPI'
        })
      });

      const data = await res.json();

      if (data.success && data.data) {
        // Reset active cart
        activeCart = { items: [], subtotal: 0, tax: 0, total: 0 };
        updateCartBadge();
        renderCartDrawer();

        // Close checkout modal & show Order Confirmation
        closeModal('checkoutModal');
        showOrderConfirmation(data.data);
      } else {
        alert(data.message || 'Checkout failed');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Error placing order: ' + err.message);
    } finally {
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Confirm & Pay';
      }
    }
  }

  // Display Order Confirmation Modal
  function showOrderConfirmation(order) {
    const modal = document.getElementById('orderSuccessModal');
    const content = document.getElementById('orderSuccessContent');

    if (content) {
      content.innerHTML = `
        <div class="order-success-card">
          <div class="success-icon-badge">✓</div>
          <h2>Order Confirmed!</h2>
          <p class="order-id-tag">Order ID: <strong>${order.orderId}</strong></p>
          <p style="color: #64748B; font-size: 0.9rem;">Date: ${new Date(order.createdAt).toLocaleString('en-IN')}</p>

          <div class="order-receipt-box">
            <table class="receipt-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td style="text-align: right;">₹${item.subtotal.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="receipt-breakdown">
              <div><span>Subtotal:</span> <span>₹${order.subtotal.toFixed(2)}</span></div>
              <div><span>GST:</span> <span>₹${order.tax.toFixed(2)}</span></div>
              <div class="final-amt"><span>Total Paid:</span> <strong>₹${order.totalAmount.toFixed(2)}</strong></div>
            </div>
          </div>

          <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
            <button class="btn btn-primary" onclick="SmartScanCart.closeModal('orderSuccessModal')">
              Done / Continue Scanning
            </button>
            <button class="btn btn-outline" onclick="window.print()">
              🖨️ Print Receipt
            </button>
          </div>
        </div>
      `;
    }

    if (modal) modal.classList.add('active');
  }

  // UI Helpers
  function updateCartBadge() {
    const badges = document.querySelectorAll('.cart-count-badge');
    const totalCount = (activeCart.items || []).reduce((sum, item) => sum + item.quantity, 0);
    badges.forEach(b => {
      b.textContent = totalCount;
      b.style.display = totalCount > 0 ? 'inline-flex' : 'none';
    });
  }

  function renderCartDrawer() {
    const listContainer = document.getElementById('cartDrawerItemsList');
    const subtotalEl = document.getElementById('cartDrawerSubtotal');
    const taxEl = document.getElementById('cartDrawerTax');
    const totalEl = document.getElementById('cartDrawerTotal');
    const emptyState = document.getElementById('cartDrawerEmptyState');
    const checkoutBtn = document.getElementById('btnCartCheckout');

    if (!listContainer) return;

    if (!activeCart.items || activeCart.items.length === 0) {
      listContainer.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (subtotalEl) subtotalEl.textContent = '₹0.00';
      if (taxEl) taxEl.textContent = '₹0.00';
      if (totalEl) totalEl.textContent = '₹0.00';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (checkoutBtn) checkoutBtn.disabled = false;

    listContainer.innerHTML = activeCart.items.map(item => `
      <div class="cart-item-card">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-meta">
            <span>Barcode: ${item.barcode}</span>
            <span>₹${item.price.toFixed(2)} each</span>
          </div>
        </div>
        <div class="cart-item-controls">
          <div class="qty-stepper">
            <button onclick="SmartScanCart.updateQuantity('${item.barcode}', ${item.quantity - 1})">-</button>
            <span>${item.quantity}</span>
            <button onclick="SmartScanCart.updateQuantity('${item.barcode}', ${item.quantity + 1})">+</button>
          </div>
          <div class="cart-item-subtotal">₹${item.subtotal.toFixed(2)}</div>
          <button class="cart-item-del-btn" onclick="SmartScanCart.removeItem('${item.barcode}')" title="Remove item">&times;</button>
        </div>
      </div>
    `).join('');

    if (subtotalEl) subtotalEl.textContent = `₹${activeCart.subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `₹${activeCart.tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₹${activeCart.total.toFixed(2)}`;
  }

  function openDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartBackdrop');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
  }

  function closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  function showToast(msg, type = 'info') {
    let toast = document.getElementById('smartScanToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'smartScanToast';
      toast.className = 'smartscan-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = `smartscan-toast show ${type}`;
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // Setup DOM listeners
  document.addEventListener('DOMContentLoaded', () => {
    refreshCart();

    // Floating cart button & drawer close
    const cartToggleBtn = document.getElementById('floatingCartBtn');
    const drawerCloseBtn = document.getElementById('btnCartDrawerClose');
    const backdrop = document.getElementById('cartBackdrop');
    const checkoutBtn = document.getElementById('btnCartCheckout');
    const clearCartBtn = document.getElementById('btnCartClear');
    const confirmOrderBtn = document.getElementById('btnConfirmOrder');

    if (cartToggleBtn) cartToggleBtn.addEventListener('click', openDrawer);
    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    if (checkoutBtn) checkoutBtn.addEventListener('click', proceedToCheckout);
    if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);
    if (confirmOrderBtn) confirmOrderBtn.addEventListener('click', submitOrder);
  });

  return {
    refreshCart,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    proceedToCheckout,
    submitOrder,
    openDrawer,
    closeDrawer,
    closeModal,
    showToast
  };
})();

window.SmartScanCart = SmartScanCart;
