// script.js
// CampusBites - Frontend Application Controller

import { 
  auth, db, ref, set, push, update, onValue, getVal, isMock,
  getFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig 
} from './firebase.js';

// Global constants
const MAP_WIDTH = 500;
const MAP_HEIGHT = 300;

const mapPoints = {
  shops: {
    nescafe: { x: 80, y: 70, name: "Nescafe", label: "Nescafe ☕" },
    kitchenatte: { x: 380, y: 60, name: "Kitchenatte", label: "Kitchenatte 🍳" },
    kathiroll: { x: 120, y: 220, name: "Kathi Roll", label: "Kathi Roll 🌯" },
    pizzabar: { x: 420, y: 160, name: "Pizza Bar", label: "Pizza Bar 🍕" },
    dosahouse: { x: 260, y: 260, name: "Dosa House", label: "Dosa House 🥞" }
  },
  hostels: {
    "Hostel A": { x: 50, y: 140, label: "Hostel A" },
    "Hostel B": { x: 200, y: 110, label: "Hostel B" },
    "Hostel C": { x: 60, y: 270, label: "Hostel C" },
    "Hostel D": { x: 380, y: 270, label: "Hostel D" },
    "PG Block 1": { x: 180, y: 180, label: "PG-1" },
    "PG Block 2": { x: 300, y: 200, label: "PG-2" }
  }
};

// Global App State
let cart = [];
let currentSelectedShop = 'nescafe';
let currentUser = null;
let currentTrackedOrder = null;
let databaseShops = {};
let dbUnsubscribes = [];

// Helper: Show Toast notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <div>${message}</div>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// -------------------------------------------------------------
// STUDENT WEB PAGE PORTAL (index.html)
// -------------------------------------------------------------
function initStudentPortal() {
  // Load Cart from LocalStorage
  try {
    const savedCart = localStorage.getItem('campusbites_cart');
    if (savedCart) {
      cart = JSON.parse(savedCart);
      updateCartUI();
    }
  } catch (e) {
    cart = [];
  }

  // Display Firebase Mode
  const badge = document.getElementById('firebaseModeBadge');
  if (badge) {
    badge.textContent = isMock ? "Running in Local Mock Mode" : "Connected to Real Firebase";
    badge.style.background = isMock ? "rgba(255, 90, 54, 0.1)" : "rgba(16, 185, 129, 0.1)";
    badge.style.color = isMock ? "var(--accent-orange)" : "var(--status-delivered)";
    badge.style.border = isMock ? "1px solid rgba(255, 90, 54, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)";
  }

  // Listen to Database Shops
  onValue(ref(db, 'shops'), (snapshot) => {
    if (snapshot.exists()) {
      databaseShops = snapshot.val();
      renderShopSelector();
      renderMenuItems();
    }
  });

  // Track Auth Changes
  auth.onAuthStateChanged((user) => {
    currentUser = user;
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;

    if (user) {
      authContainer.innerHTML = `
        <div class="user-badge" id="userMenuBtn">
          <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
          <span style="font-size: 13px; font-weight:600;">${user.name}</span>
        </div>
      `;
      
      // Auto-fill checkout name
      const nameInput = document.getElementById('checkoutName');
      if (nameInput) nameInput.value = user.name;
      
      // Add signout event to badge
      document.getElementById('userMenuBtn').addEventListener('click', () => {
        if (confirm("Do you want to sign out?")) {
          auth.logOut().then(() => showToast("Signed out successfully"));
        }
      });
    } else {
      authContainer.innerHTML = `
        <button class="btn btn-secondary btn-sm" id="loginBtn">Sign In</button>
      `;
      document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
    }
  });

  // Event Listeners for UI interaction
  bindStudentEventListeners();
}

function bindStudentEventListeners() {
  // Cart Drawer
  document.getElementById('cartTrigger').addEventListener('click', () => {
    document.getElementById('cartDrawer').classList.add('open');
  });
  document.getElementById('cartClose').addEventListener('click', () => {
    document.getElementById('cartDrawer').classList.remove('open');
  });

  // Modals close buttons
  const closeButtons = [
    { btn: 'closeLoginModal', modal: 'loginModal' },
    { btn: 'closeRegisterModal', modal: 'registerModal' },
    { btn: 'closeConfigModal', modal: 'configModal' },
    { btn: 'closeRazorpayModal', modal: 'razorpayModal' }
  ];
  closeButtons.forEach(cfg => {
    const el = document.getElementById(cfg.btn);
    if (el) el.addEventListener('click', () => closeModal(cfg.modal));
  });

  // Open config settings modal
  document.getElementById('configTrigger').addEventListener('click', () => {
    openModal('configModal');
    // Pre-populate settings inputs
    const config = getFirebaseConfig();
    if (config) {
      document.getElementById('configApiKey').value = config.apiKey || '';
      document.getElementById('configDatabaseURL').value = config.databaseURL || '';
      document.getElementById('configAuthDomain').value = config.authDomain || '';
      document.getElementById('configProjectId').value = config.projectId || '';
      document.getElementById('configAppId').value = config.appId || '';
    }
  });

  // Save config settings
  document.getElementById('configForm').addEventListener('submit', (e) => {
    const config = {
      apiKey: document.getElementById('configApiKey').value.trim(),
      databaseURL: document.getElementById('configDatabaseURL').value.trim(),
      authDomain: document.getElementById('configAuthDomain').value.trim(),
      projectId: document.getElementById('configProjectId').value.trim(),
      appId: document.getElementById('configAppId').value.trim()
    };
    saveFirebaseConfig(config);
    showToast("Firebase Config saved. Page reloading...", "success");
  });

  // Clear config settings
  document.getElementById('clearConfigBtn').addEventListener('click', () => {
    clearFirebaseConfig();
    showToast("Reverted to Local Mock DB. Page reloading...", "info");
  });

  // Auth Modals Switches
  document.getElementById('switchToRegister').addEventListener('click', (e) => {
    e.preventDefault();
    closeModal('loginModal');
    openModal('registerModal');
  });
  document.getElementById('switchToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    closeModal('registerModal');
    openModal('loginModal');
  });

  // Auth Submit Handlers
  document.getElementById('loginForm').addEventListener('submit', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value;
    try {
      await auth.signIn(email, pass);
      closeModal('loginModal');
      showToast(`Welcome back, ${auth.currentUser.name}!`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  document.getElementById('registerForm').addEventListener('submit', async () => {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const pass = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;
    try {
      await auth.signUp(email, pass, name, role);
      closeModal('registerModal');
      showToast("Account registered successfully!", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // Checkout placement
  document.getElementById('checkoutForm').addEventListener('submit', (e) => {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    if (paymentMethod === 'Online') {
      openRazorpayModal();
    } else {
      submitOrder('COD');
    }
  });

  // Search track widget
  document.getElementById('searchTrackBtn').addEventListener('click', () => {
    const orderId = document.getElementById('searchTrackId').value.trim();
    if (!orderId) {
      showToast("Please enter an Order ID", "error");
      return;
    }
    trackOrderById(orderId);
  });

  // Payment UI toggles inside Razorpay modal
  document.getElementById('razorpayMethod').addEventListener('change', (e) => {
    const val = e.target.value;
    document.getElementById('razorpayUpiInput').style.display = val === 'upi' ? 'flex' : 'none';
    document.getElementById('razorpayCardInput').style.display = val === 'card' ? 'flex' : 'none';
  });

  document.getElementById('razorpayPayBtn').addEventListener('click', processRazorpayPayment);
}

// Render the outlet selections
function renderShopSelector() {
  const container = document.getElementById('shopContainer');
  if (!container) return;
  container.innerHTML = '';

  const shopMapping = {
    nescafe: { icon: "☕", desc: "Snacks & Brews" },
    kitchenatte: { icon: "🍳", desc: "Meals & Combos" },
    kathiroll: { icon: "🌯", desc: "Wraps & Rolls" },
    pizzabar: { icon: "🍕", desc: "Pizzas & Breads" },
    dosahouse: { icon: "🥞", desc: "South Indian" }
  };

  Object.entries(databaseShops).forEach(([key, shop]) => {
    const meta = shopMapping[key] || { icon: "🏪", desc: "Fast Food" };
    const card = document.createElement('div');
    card.className = `shop-card ${currentSelectedShop === key ? 'active' : ''}`;
    card.innerHTML = `
      <div class="shop-icon">${meta.icon}</div>
      <h3>${shop.name}</h3>
      <p>${meta.desc}</p>
    `;
    card.addEventListener('click', () => {
      currentSelectedShop = key;
      document.querySelectorAll('.shop-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      renderMenuItems();
    });
    container.appendChild(card);
  });
}

// Render selected outlet's menu
function renderMenuItems() {
  const container = document.getElementById('menuContainer');
  const title = document.getElementById('menuTitle');
  if (!container) return;

  const currentShop = databaseShops[currentSelectedShop];
  if (!currentShop) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Loading menu catalog...</p>`;
    return;
  }

  title.textContent = `${currentShop.name} Menu`;
  container.innerHTML = '';

  const menu = currentShop.menu || {};
  if (Object.keys(menu).length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No items available at this shop.</p>`;
    return;
  }

  Object.entries(menu).forEach(([itemId, item]) => {
    const cartItem = cart.find(c => c.shopId === currentSelectedShop && c.itemId === itemId);
    const qty = cartItem ? cartItem.quantity : 0;

    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <div>
        <div class="menu-header">
          <div class="menu-item-emoji">${item.image || '🍔'}</div>
          <span class="diet-badge ${item.veg ? 'diet-veg' : 'diet-nonveg'}">${item.veg ? 'Veg' : 'Non-Veg'}</span>
        </div>
        <div class="menu-body">
          <h4>${item.name}</h4>
          <p>${item.desc || 'No description available.'}</p>
        </div>
      </div>
      <div class="menu-footer">
        <span class="price">₹${item.price}</span>
        ${qty > 0 ? `
          <div class="qty-control">
            <button class="qty-btn" onclick="adjustMenuQty('${itemId}', -1)">-</button>
            <span class="qty-num">${qty}</span>
            <button class="qty-btn" onclick="adjustMenuQty('${itemId}', 1)">+</button>
          </div>
        ` : `
          <button class="btn btn-primary btn-sm" onclick="addToCart('${itemId}')">Add to Cart</button>
        `}
      </div>
    `;
    container.appendChild(card);
  });
}

// Cart state handlers exposed globally
window.addToCart = function(itemId) {
  const shop = databaseShops[currentSelectedShop];
  const item = shop.menu[itemId];
  
  // Verify that student is not ordering from multiple shops at once
  if (cart.length > 0 && cart[0].shopId !== currentSelectedShop) {
    if (!confirm("Your cart contains items from another outlet. Do you want to clear your cart and add this item?")) {
      return;
    }
    cart = [];
  }

  cart.push({
    shopId: currentSelectedShop,
    shopName: shop.name,
    itemId: itemId,
    name: item.name,
    price: item.price,
    quantity: 1
  });

  saveCart();
  updateCartUI();
  renderMenuItems();
};

window.adjustMenuQty = function(itemId, change) {
  const idx = cart.findIndex(c => c.shopId === currentSelectedShop && c.itemId === itemId);
  if (idx !== -1) {
    cart[idx].quantity += change;
    if (cart[idx].quantity <= 0) {
      cart.splice(idx, 1);
    }
    saveCart();
    updateCartUI();
    renderMenuItems();
  }
};

function saveCart() {
  localStorage.setItem('campusbites_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const cartCount = document.getElementById('cartCount');
  const cartItemsList = document.getElementById('cartItemsList');
  
  const subtotalEl = document.getElementById('cartSubtotal');
  const taxEl = document.getElementById('cartTax');
  const grandTotalEl = document.getElementById('cartGrandTotal');
  
  if (!cartCount || !cartItemsList) return;

  // Calculate items count
  const count = cart.reduce((acc, c) => acc + c.quantity, 0);
  cartCount.textContent = count;

  if (cart.length === 0) {
    cartItemsList.innerHTML = `
      <div class="cart-empty">
        <span style="font-size: 48px;">🛒</span>
        <p>Your cart is empty</p>
      </div>
    `;
    subtotalEl.textContent = '₹0';
    taxEl.textContent = '₹0';
    grandTotalEl.textContent = '₹0';
    return;
  }

  cartItemsList.innerHTML = '';
  let subtotal = 0;

  cart.forEach(c => {
    subtotal += c.price * c.quantity;
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-title">${c.name}</div>
        <div class="cart-item-shop">${c.shopName}</div>
        <div class="cart-item-price">₹${c.price}</div>
      </div>
      <div class="qty-control" style="margin-left: auto;">
        <button class="qty-btn" onclick="adjustMenuQty('${c.itemId}', -1)">-</button>
        <span class="qty-num">${c.quantity}</span>
        <button class="qty-btn" onclick="adjustMenuQty('${c.itemId}', 1)">+</button>
      </div>
    `;
    cartItemsList.appendChild(el);
  });

  const deliveryCharge = 20;
  const tax = Math.round(subtotal * 0.05);
  const grand = subtotal + deliveryCharge + tax;

  subtotalEl.textContent = `₹${subtotal}`;
  taxEl.textContent = `₹${tax}`;
  grandTotalEl.textContent = `₹${grand}`;
}

// -------------------------------------------------------------
// CHECKOUT & PAYMENTS SIMULATION
// -------------------------------------------------------------
function openRazorpayModal() {
  const grand = document.getElementById('cartGrandTotal').textContent;
  document.getElementById('razorpayAmount').textContent = grand;
  document.getElementById('razorpayBody').style.display = 'block';
  document.getElementById('razorpayLoader').style.display = 'none';
  document.getElementById('razorpayStatus').style.display = 'none';
  
  openModal('razorpayModal');
}

function processRazorpayPayment() {
  document.getElementById('razorpayBody').style.display = 'none';
  document.getElementById('razorpayLoader').style.display = 'flex';
  
  // Simulate payment processing delay (1.5 seconds)
  setTimeout(() => {
    document.getElementById('razorpayLoader').style.display = 'none';
    document.getElementById('razorpayStatus').style.display = 'block';
    
    const txId = Math.floor(100000 + Math.random() * 900000);
    document.getElementById('razorpayTxId').textContent = txId;
    
    // Save to payments records in local mock if needed
    savePaymentRecord(grandTotalValue(), txId);

    setTimeout(() => {
      closeModal('razorpayModal');
      submitOrder('Online');
    }, 2000);
  }, 1800);
}

function grandTotalValue() {
  const gStr = document.getElementById('cartGrandTotal').textContent.replace('₹', '');
  return parseInt(gStr) || 0;
}

function savePaymentRecord(amount, transactionId) {
  const record = {
    amount,
    transactionId,
    student: currentUser ? currentUser.name : document.getElementById('checkoutName').value.trim(),
    date: new Date().toISOString()
  };
  
  // Push payments logs in db
  const paymentsRef = ref(db, 'payments');
  const newRef = push(paymentsRef);
  set(ref(db, `payments/${newRef.key}`), record);
}

async function submitOrder(paymentMethod) {
  const studentName = document.getElementById('checkoutName').value.trim();
  const hostel = document.getElementById('checkoutHostel').value;
  const room = document.getElementById('checkoutRoom').value.trim();

  if (!studentName || !hostel || !room) {
    showToast("Please fill all checkout fields", "error");
    return;
  }

  const orderId = push(ref(db, 'orders')).key;
  
  const orderRecord = {
    orderId: orderId,
    student: studentName,
    hostel: hostel,
    room: room,
    payment: paymentMethod,
    total: grandTotalValue(),
    items: cart,
    status: "Pending",
    time: new Date().toLocaleString(),
    shopId: cart[0].shopId,
    shopName: cart[0].shopName,
    eta: 15,
    gpsStep: 0, // 0 = at outlet, 1 = half transit, 2 = near hostel, 3 = arrived
    riderName: "",
    riderId: ""
  };

  try {
    await set(ref(db, `orders/${orderId}`), orderRecord);
    
    // Clear Cart
    cart = [];
    saveCart();
    updateCartUI();
    renderMenuItems();
    document.getElementById('cartDrawer').classList.remove('open');
    
    showToast("Order Placed Successfully!", "success");
    
    // Auto-track the new order
    trackOrderById(orderId);
  } catch (err) {
    showToast("Failed to place order: " + err.message, "error");
  }
}

// -------------------------------------------------------------
// LIVE TRACKING MAP (Canvas rendering engine)
// -------------------------------------------------------------
function trackOrderById(orderId) {
  // Clear any existing active subscription for orders
  dbUnsubscribes.forEach(unsub => unsub());
  dbUnsubscribes = [];

  const unsub = onValue(ref(db, `orders/${orderId}`), (snapshot) => {
    if (!snapshot.exists()) {
      showToast("Order not found or deleted.", "error");
      return;
    }
    
    const order = snapshot.val();
    currentTrackedOrder = order;
    
    // Display tracking panel
    document.getElementById('trackingContainer').style.display = 'block';
    document.getElementById('trackOrderId').textContent = `#${orderId.substring(orderId.length - 6)}`;
    document.getElementById('searchTrackId').value = orderId;
    
    // Update status badge
    const badge = document.getElementById('trackStatusBadge');
    badge.className = `tracking-status-badge badge-${order.status.toLowerCase().replace(/\s+/g, '')}`;
    badge.textContent = order.status;

    // Timeline updates
    updateTimelineUI(order);
    
    // Draw Canvas Map
    drawCampusMap('campusMapCanvas', order);

    // Dynamic messaging
    const mapDeliveryBoyName = document.getElementById('mapDeliveryBoyName');
    const mapETA = document.getElementById('mapETA');
    const riderMessage = document.getElementById('riderMessage');
    
    if (order.riderName) {
      mapDeliveryBoyName.textContent = order.riderName;
      mapETA.textContent = `${order.eta} mins`;
      
      const messages = [
        "Rider is at the shop picking up order.",
        "Rider is on the way to your hostel.",
        "Rider has reached near your block.",
        "Rider is outside the building. Please collect!"
      ];
      riderMessage.textContent = messages[order.gpsStep] || "Rider assigned.";
    } else {
      mapDeliveryBoyName.textContent = "Assigning Rider...";
      mapETA.textContent = "Calculating...";
      riderMessage.textContent = "Waiting for shopkeeper to dispatch your order.";
    }

    // Scroll to tracking panel
    document.getElementById('trackingContainer').scrollIntoView({ behavior: 'smooth' });
  });

  dbUnsubscribes.push(unsub);
}

function updateTimelineUI(order) {
  const steps = ['pending', 'accepted', 'preparing', 'delivery', 'delivered'];
  const statusToStep = {
    "Pending": 0,
    "Accepted": 1,
    "Preparing": 2,
    "Out for Delivery": 3,
    "Delivered": 4
  };

  const currentStepIndex = statusToStep[order.status] ?? 0;
  
  steps.forEach((stepName, idx) => {
    const el = document.getElementById(`step-${stepName}`);
    if (!el) return;
    
    el.className = 'timeline-step';
    const timeEl = document.getElementById(`time-${stepName}`);

    if (idx === currentStepIndex) {
      el.classList.add('active');
    } else if (idx < currentStepIndex) {
      el.classList.add('completed');
    }

    // Set mock times if status reached
    if (idx <= currentStepIndex) {
      if (idx === 0) timeEl.textContent = order.time;
      if (idx === 1 && !timeEl.textContent.includes(':')) timeEl.textContent = "Accepted at " + getOffsetTime(order.time, 2);
      if (idx === 2 && !timeEl.textContent.includes(':')) timeEl.textContent = "Started at " + getOffsetTime(order.time, 4);
      if (idx === 3 && !timeEl.textContent.includes(':')) timeEl.textContent = "Dispatched at " + getOffsetTime(order.time, 8);
      if (idx === 4 && !timeEl.textContent.includes(':')) timeEl.textContent = "Arrived at " + getOffsetTime(order.time, 13);
    } else {
      // Revert descriptions
      if (idx === 1) timeEl.textContent = "Shopkeeper accepted the order";
      if (idx === 2) timeEl.textContent = "Your food is being freshly cooked";
      if (idx === 3) timeEl.textContent = "Rider is heading to your hostel";
      if (idx === 4) timeEl.textContent = "Enjoy your hot meal!";
    }
  });
}

function getOffsetTime(baseTimeStr, offsetMins) {
  try {
    const base = new Date(baseTimeStr);
    if (isNaN(base.getTime())) return "In Progress";
    base.setMinutes(base.getMinutes() + offsetMins);
    return base.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return "In Progress";
  }
}

// Map Rendering Engine
function drawCampusMap(canvasId, order) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  // Configure canvas internal resolution for HD displays
  canvas.width = MAP_WIDTH;
  canvas.height = MAP_HEIGHT;

  // Clear Canvas
  ctx.fillStyle = '#0f1420';
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // Draw Grid Lines (Background decoration)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 30;
  for (let x = 0; x < MAP_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < MAP_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_WIDTH, y);
    ctx.stroke();
  }

  // Draw Road Networks (Connect nodes)
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Connecting logic for visualization paths
  const points = Object.values(mapPoints.shops).concat(Object.values(mapPoints.hostels));
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i];
      const p2 = points[j];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      // Link nodes that are geographically close to form mock streets
      if (dist < 150) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }

  // Render Hostels Nodes
  Object.entries(mapPoints.hostels).forEach(([name, pos]) => {
    ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Text Label
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(name, pos.x, pos.y - 12);
  });

  // Render Shops Nodes
  Object.entries(mapPoints.shops).forEach(([key, pos]) => {
    ctx.fillStyle = 'rgba(255, 90, 54, 0.2)';
    ctx.strokeStyle = '#ff5a36';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Text Label
    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(pos.name, pos.x, pos.y - 14);
  });

  // If order details are active, draw delivery route and rider
  if (order) {
    const shopNode = mapPoints.shops[order.shopId];
    const hostelNode = mapPoints.hostels[order.hostel];

    if (shopNode && hostelNode) {
      // Highlight shop & target hostel
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(shopNode.x, shopNode.y);
      ctx.lineTo(hostelNode.x, hostelNode.y);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Calculate Rider coordinates along the linear path based on gpsStep
      // steps: 0, 1, 2, 3
      const stepFactor = order.gpsStep / 3;
      const rx = shopNode.x + (hostelNode.x - shopNode.x) * stepFactor;
      const ry = shopNode.y + (hostelNode.y - shopNode.y) * stepFactor;

      // Draw active target dots
      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.beginPath();
      ctx.arc(hostelNode.x, hostelNode.y, 15, 0, Math.PI*2);
      ctx.fill();

      // Draw Rider vehicle icon
      ctx.fillStyle = '#ff5a36';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx, ry, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rider label tag
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🛵', rx, ry + 3);
    }
  }
}

// -------------------------------------------------------------
// UNIFIED MERCHANT / DELIVERY / ADMIN DASHBOARD (dashboard.html)
// -------------------------------------------------------------
function initDashboard() {
  const dashFirebase = document.getElementById('dashboardFirebaseBadge');
  if (dashFirebase) {
    dashFirebase.textContent = isMock ? "Local Mock Mode" : "Real Firebase Connected";
    dashFirebase.className = `hero-badge ${isMock ? 'badge-pending' : 'badge-delivered'}`;
  }

  // Pre-bind Quick Logins for demo testing
  bindQuickLogins();

  // Listen to Auth state in Dashboard
  auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
      // Hide login overlay, show dashboard UI
      document.getElementById('dashboardLoginOverlay').classList.remove('open');
      document.getElementById('dashboardLoginOverlay').style.display = 'none';
      document.getElementById('dashboardLayout').style.display = 'grid';

      // Load Profile Data
      document.getElementById('sidebarName').textContent = user.name;
      document.getElementById('sidebarRole').textContent = `${user.role} ${user.shop ? `(${user.shop})` : ''}`;
      document.getElementById('sidebarAvatar').textContent = user.name.charAt(0).toUpperCase();

      // Setup Role Based Visibilities
      setupRoleVisibility(user);
      
      // Start Real-time synchronization listeners
      initDashboardDataListeners(user);
      
    } else {
      // Show login overlay, hide dashboard
      document.getElementById('dashboardLoginOverlay').classList.add('open');
      document.getElementById('dashboardLoginOverlay').style.display = 'flex';
      document.getElementById('dashboardLayout').style.display = 'none';
      
      // Clear data listeners
      dbUnsubscribes.forEach(unsub => unsub());
      dbUnsubscribes = [];
    }
  });

  // Common Dashboard controls
  bindDashboardControls();
}

function bindQuickLogins() {
  const pairings = [
    { id: 'quickNescafe', email: 'nescafe@campusbites.com', pass: 'nescafe' },
    { id: 'quickPizza', email: 'pizzabar@campusbites.com', pass: 'pizzabar' },
    { id: 'quickRider', email: 'delivery1@campusbites.com', pass: 'delivery1' },
    { id: 'quickAdmin', email: 'admin@campusbites.com', pass: 'admin' }
  ];

  pairings.forEach(p => {
    const el = document.getElementById(p.id);
    if (el) {
      el.addEventListener('click', async () => {
        try {
          await auth.signIn(p.email, p.pass);
          showToast("Authorized successfully as " + p.email.split('@')[0], "success");
        } catch (e) {
          showToast(e.message, "error");
        }
      });
    }
  });

  // Standard Login Submit inside Dashboard
  document.getElementById('dashboardLoginForm').addEventListener('submit', async (e) => {
    if (e) e.preventDefault();
    const email = document.getElementById('dashEmail').value.trim();
    const pass = document.getElementById('dashPassword').value;
    try {
      await auth.signIn(email, pass);
      showToast("Access Granted", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

function setupRoleVisibility(user) {
  // Hide all roles classes
  const hides = [
    'role-shopkeeper-only',
    'role-delivery-only',
    'role-admin-only',
    'role-shop-admin'
  ];
  hides.forEach(h => {
    document.querySelectorAll('.' + h).forEach(el => el.style.display = 'none');
  });

  // Setup panel defaults and navigation toggles depending on Role
  let defaultPanel = 'panelActiveOrders';

  if (user.role === 'shopkeeper') {
    document.querySelectorAll('.role-shopkeeper-only, .role-shop-admin').forEach(el => el.style.display = 'block');
  } else if (user.role === 'delivery') {
    document.querySelectorAll('.role-delivery-only').forEach(el => el.style.display = 'block');
    defaultPanel = 'panelDelivery';
  } else if (user.role === 'admin') {
    document.querySelectorAll('.role-admin-only, .role-shop-admin').forEach(el => el.style.display = 'block');
  }

  // Switch to default panel
  switchPanel(defaultPanel);
}

function switchPanel(panelId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  
  const targetPanel = document.getElementById(panelId);
  if (targetPanel) targetPanel.classList.add('active');

  const link = document.querySelector(`.sidebar-link[data-panel="${panelId}"]`);
  if (link) link.classList.add('active');

  // Page Subtitles & Titles updating
  const titles = {
    panelActiveOrders: { title: "Active Orders Incoming", sub: "Manage active campus food requests" },
    panelMenuMgmt: { title: "Menu Catalog CRUD Panel", sub: "Configure items, prices, and classifications" },
    panelDelivery: { title: "Delivery Rider Workstation", sub: "Track tasks, update status, and simulation drivers" },
    panelAdmin: { title: "Administrator Command Panel", sub: "Roster details, shop controllers, database logs" },
    panelAllOrders: { title: "Global Transaction Ledger", sub: "View historical order registries" },
    panelAnalytics: { title: "CampusBites Analytics", sub: "Outlets sales distribution metrics" },
    panelSettings: { title: "Firebase Connections Setup", sub: "Database credentials settings" }
  };

  const meta = titles[panelId];
  if (meta) {
    document.getElementById('panelTitle').textContent = meta.title;
    document.getElementById('panelSubtitle').textContent = meta.sub;
  }
}

function bindDashboardControls() {
  // Sidebar navigation click binds
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const panel = link.getAttribute('data-panel');
      switchPanel(panel);
    });
  });

  // Sign out button
  document.getElementById('signOutBtn').addEventListener('click', () => {
    auth.logOut().then(() => showToast("Logged out from Partner Hub"));
  });

  // Save config settings inside dashboard
  document.getElementById('dashboardConfigForm').addEventListener('submit', () => {
    const config = {
      apiKey: document.getElementById('dashConfigApiKey').value.trim(),
      databaseURL: document.getElementById('dashConfigDatabaseURL').value.trim(),
      authDomain: document.getElementById('dashConfigAuthDomain').value.trim(),
      projectId: document.getElementById('dashConfigProjectId').value.trim(),
      appId: document.getElementById('dashConfigAppId').value.trim()
    };
    saveFirebaseConfig(config);
    showToast("Firebase Config Saved. Reloading page...", "success");
  });

  document.getElementById('dashClearConfigBtn').addEventListener('click', () => {
    clearFirebaseConfig();
    showToast("Reverted to Local Mock DB. Page reloading...", "info");
  });

  // Dynamic config prefill for Settings panel
  const config = getFirebaseConfig();
  if (config) {
    document.getElementById('dashConfigApiKey').value = config.apiKey || '';
    document.getElementById('dashConfigDatabaseURL').value = config.databaseURL || '';
    document.getElementById('dashConfigAuthDomain').value = config.authDomain || '';
    document.getElementById('dashConfigProjectId').value = config.projectId || '';
    document.getElementById('dashConfigAppId').value = config.appId || '';
  }

  // Shopkeeper Add Menu Item Modals trigger
  const addBtn = document.getElementById('addItemBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      document.getElementById('menuItemForm').reset();
      document.getElementById('menuItemKey').value = '';
      document.getElementById('menuModalTitle').textContent = "Add Menu Item";
      document.getElementById('saveMenuItemBtn').textContent = "Add to Catalog";
      openModal('addItemModal');
    });
  }

  const closeItemModal = document.getElementById('closeAddItemModal');
  if (closeItemModal) {
    closeItemModal.addEventListener('click', () => closeModal('addItemModal'));
  }

  const menuForm = document.getElementById('menuItemForm');
  if (menuForm) {
    menuForm.addEventListener('submit', saveMenuItem);
  }

  // Delivery simulator GPS binds
  const gpsButtons = [
    { btn: 'gpsAtShop', step: 0 },
    { btn: 'gpsTransit', step: 1 },
    { btn: 'gpsNear', step: 2 },
    { btn: 'gpsArrived', step: 3 }
  ];
  gpsButtons.forEach(cfg => {
    const el = document.getElementById(cfg.btn);
    if (el) {
      el.addEventListener('click', () => {
        updateActiveDeliveryGps(cfg.step);
      });
    }
  });
}

// -------------------------------------------------------------
// DASHBOARD REAL-TIME DATA LOGIC
// -------------------------------------------------------------
let allOrders = {};
let allDeliveryBoys = [];

function initDashboardDataListeners(user) {
  // Clear any existing active listeners
  dbUnsubscribes.forEach(unsub => unsub());
  dbUnsubscribes = [];

  // Listen to active delivery boys (needed for shopkeeper dropdown lists)
  const deliveryUnsub = onValue(ref(db, 'users'), (snapshot) => {
    allDeliveryBoys = [];
    if (snapshot.exists()) {
      Object.entries(snapshot.val()).forEach(([uid, u]) => {
        if (u.role === 'delivery') {
          allDeliveryBoys.push({ uid, name: u.name, email: u.email });
        }
      });
    }
    // Update active screens
    renderActiveOrders(user);
    renderAdminConsole();
  });
  dbUnsubscribes.push(deliveryUnsub);

  // Listen to shops (needed for menu management)
  const shopsUnsub = onValue(ref(db, 'shops'), (snapshot) => {
    if (snapshot.exists()) {
      databaseShops = snapshot.val();
      renderMenuManagement(user);
    }
  });
  dbUnsubscribes.push(shopsUnsub);

  // Listen to all orders
  const ordersUnsub = onValue(ref(db, 'orders'), (snapshot) => {
    allOrders = {};
    if (snapshot.exists()) {
      allOrders = snapshot.val();
    }
    
    // Core Rendering triggers
    renderDashboardStats(user);
    renderActiveOrders(user);
    renderDeliveryWorkstation(user);
    renderAdminConsole();
    renderAllOrdersTable();
    renderAnalyticsDashboard(user);
  });
  dbUnsubscribes.push(ordersUnsub);
}

// Calculate Statistics
function renderDashboardStats(user) {
  const stat1Label = document.getElementById('stat1Label');
  const stat1Val = document.getElementById('stat1Val');
  const stat2Val = document.getElementById('stat2Val');
  const stat3Val = document.getElementById('stat3Val');
  const stat4Val = document.getElementById('stat4Val');
  
  if (!stat1Val) return;

  const ordersArray = Object.values(allOrders);

  if (user.role === 'shopkeeper') {
    // Shopkeeper Stats
    stat1Label.textContent = "Today's Earnings";
    
    const shopOrders = ordersArray.filter(o => o.shopId === user.shop);
    const earnings = shopOrders.filter(o => o.status === 'Delivered').reduce((acc, o) => acc + o.total, 0);
    const active = shopOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Rejected').length;
    const completed = shopOrders.filter(o => o.status === 'Delivered').length;

    stat1Val.textContent = `₹${earnings}`;
    stat2Val.textContent = active;
    stat3Val.textContent = completed;
    stat4Val.textContent = "Active";
  } else if (user.role === 'delivery') {
    // Delivery Boy Stats
    stat1Label.textContent = "Total Earnings";
    
    const riderOrders = ordersArray.filter(o => o.riderId === user.uid);
    // Flat rate earnings: ₹40 per delivery
    const earnings = riderOrders.filter(o => o.status === 'Delivered').length * 40;
    const active = riderOrders.filter(o => o.status === 'Out for Delivery' || (o.status === 'Preparing' && o.riderId === user.uid)).length;
    const completed = riderOrders.filter(o => o.status === 'Delivered').length;

    stat1Val.textContent = `₹${earnings}`;
    stat2Val.textContent = active;
    stat3Val.textContent = completed;
    stat4Val.textContent = "Online";
  } else if (user.role === 'admin') {
    // Admin stats
    stat1Label.textContent = "Platform Volume";
    
    const earnings = ordersArray.filter(o => o.status === 'Delivered').reduce((acc, o) => acc + o.total, 0);
    const active = ordersArray.filter(o => o.status !== 'Delivered' && o.status !== 'Rejected').length;
    const completed = ordersArray.filter(o => o.status === 'Delivered').length;

    stat1Val.textContent = `₹${earnings}`;
    stat2Val.textContent = active;
    stat3Val.textContent = completed;
    stat4Val.textContent = "System OK";
  }
}

// Render active orders queue
function renderActiveOrders(user) {
  const container = document.getElementById('activeOrdersContainer');
  if (!container) return;

  const ordersArray = Object.values(allOrders).sort((a,b) => b.orderId.localeCompare(a.orderId));
  
  // Filter based on user profile
  let filteredOrders = [];
  if (user.role === 'shopkeeper') {
    filteredOrders = ordersArray.filter(o => o.shopId === user.shop && o.status !== 'Delivered' && o.status !== 'Rejected');
  } else if (user.role === 'admin') {
    filteredOrders = ordersArray.filter(o => o.status !== 'Delivered' && o.status !== 'Rejected');
  } else {
    // Delivery does not use this container (uses My Deliveries workstation)
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Access deliveries from "My Deliveries" tab.</p>`;
    return;
  }

  if (filteredOrders.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <span style="font-size: 48px;">📥</span>
        <p style="margin-top: 10px;">No active orders in the queue right now.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filteredOrders.forEach(o => {
    const card = document.createElement('div');
    card.className = 'order-card';
    
    const itemsListHtml = o.items.map(item => `
      <li>
        <span>${item.quantity}x ${item.name}</span>
        <span>₹${item.price * item.quantity}</span>
      </li>
    `).join('');

    // Status action buttons based on shopkeeper logic
    let actionButtonsHtml = '';
    if (user.role === 'shopkeeper' || user.role === 'admin') {
      if (o.status === 'Pending') {
        actionButtonsHtml = `
          <div class="order-card-actions">
            <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${o.orderId}', 'Accepted')">Accept</button>
            <button class="btn btn-danger btn-sm" onclick="updateOrderStatus('${o.orderId}', 'Rejected')">Reject</button>
          </div>
        `;
      } else if (o.status === 'Accepted') {
        actionButtonsHtml = `
          <div class="order-card-actions">
            <button class="btn btn-accent btn-sm" onclick="updateOrderStatus('${o.orderId}', 'Preparing')">Start Cooking</button>
          </div>
        `;
      } else if (o.status === 'Preparing') {
        // Driver assignment
        const deliveryOptions = allDeliveryBoys.map(db => `
          <option value="${db.uid}|${db.name}" ${o.riderId === db.uid ? 'selected' : ''}>${db.name}</option>
        `).join('');

        actionButtonsHtml = `
          <div class="order-card-actions">
            <select class="form-input" id="assignSelect_${o.orderId}" style="padding: 6px; font-size:12px;">
              <option value="">Assign Delivery Boy</option>
              ${deliveryOptions}
            </select>
            <button class="btn btn-primary btn-sm" onclick="assignRiderAndDispatch('${o.orderId}')">Dispatch</button>
          </div>
        `;
      } else if (o.status === 'Out for Delivery') {
        actionButtonsHtml = `
          <div style="font-size:12px; color: var(--accent-orange); font-weight:600;">
            🛵 Out for Delivery by ${o.riderName || 'Rider'}
          </div>
        `;
      }
    }

    card.innerHTML = `
      <div class="order-card-header">
        <div>
          <div class="order-card-title">Order ID: #${o.orderId.substring(o.orderId.length - 6)}</div>
          <span class="tracking-status-badge badge-${o.status.toLowerCase().replace(/\s+/g, '')}">${o.status}</span>
        </div>
        <div class="order-card-time">${o.time.split(',')[1] || o.time}</div>
      </div>
      
      <ul class="order-card-items">
        ${itemsListHtml}
      </ul>
      
      <div class="order-card-details">
        <p>Student: <span>${o.student}</span></p>
        <p>Location: <span>${o.hostel} - Room ${o.room}</span></p>
        <p>Payment: <span>${o.payment}</span></p>
        ${o.riderName ? `<p>Rider: <span>${o.riderName}</span></p>` : ''}
      </div>
      
      <div class="order-card-footer">
        <div class="order-card-total-row">
          <span>Total:</span>
          <span>₹${o.total}</span>
        </div>
        ${actionButtonsHtml}
      </div>
    `;
    container.appendChild(card);
  });
}

// Shopkeeper update order status logic exposed globally
window.updateOrderStatus = function(orderId, nextStatus) {
  const data = { status: nextStatus };
  if (nextStatus === 'Preparing') {
    data.eta = 10;
  }
  update(ref(db, `orders/${orderId}`), data)
    .then(() => showToast(`Order ${nextStatus.toLowerCase()}`))
    .catch(e => showToast(e.message, 'error'));
};

window.assignRiderAndDispatch = function(orderId) {
  const select = document.getElementById(`assignSelect_${orderId}`);
  if (!select || !select.value) {
    showToast("Please select a delivery boy to assign", "error");
    return;
  }

  const [riderId, riderName] = select.value.split('|');
  
  const updates = {
    riderId,
    riderName,
    status: "Out for Delivery",
    eta: 8,
    gpsStep: 1 // Start moving
  };

  update(ref(db, `orders/${orderId}`), updates)
    .then(() => showToast("Rider assigned & dispatched!"))
    .catch(e => showToast(e.message, 'error'));
};

// -------------------------------------------------------------
// MENU MANAGEMENT CRUD (Shopkeeper Only)
// -------------------------------------------------------------
function renderMenuManagement(user) {
  const container = document.getElementById('menuItemsContainer');
  if (!container || user.role !== 'shopkeeper') return;

  const currentShop = databaseShops[user.shop];
  if (!currentShop) {
    container.innerHTML = `<p>Loading catalog items...</p>`;
    return;
  }

  container.innerHTML = '';
  const menu = currentShop.menu || {};

  Object.entries(menu).forEach(([itemId, item]) => {
    const card = document.createElement('div');
    card.className = 'item-mgmt-card';
    card.innerHTML = `
      <div class="menu-item-emoji">${item.image || '🍔'}</div>
      <div class="item-mgmt-details">
        <h4>${item.name}</h4>
        <p>${item.desc || 'No description'}</p>
        <div class="item-mgmt-price">₹${item.price}</div>
      </div>
      <div class="item-mgmt-actions">
        <button class="btn btn-secondary btn-sm" onclick="triggerEditMenuItem('${itemId}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMenuItem('${itemId}')">🗑️</button>
      </div>
    `;
    container.appendChild(card);
  });
}

window.triggerEditMenuItem = function(itemId) {
  const shopId = currentUser.shop;
  const item = databaseShops[shopId].menu[itemId];
  if (!item) return;

  document.getElementById('menuItemKey').value = itemId;
  document.getElementById('menuItemName').value = item.name;
  document.getElementById('menuItemPrice').value = item.price;
  document.getElementById('menuItemDesc').value = item.desc;
  document.getElementById('menuItemEmoji').value = item.image || '🍔';
  
  if (item.veg) {
    document.getElementById('menuVeg').checked = true;
  } else {
    document.getElementById('menuNonVeg').checked = true;
  }

  document.getElementById('menuModalTitle').textContent = "Edit Menu Item";
  document.getElementById('saveMenuItemBtn').textContent = "Save Changes";
  openModal('addItemModal');
};

async function saveMenuItem() {
  const shopId = currentUser.shop;
  const name = document.getElementById('menuItemName').value.trim();
  const price = parseInt(document.getElementById('menuItemPrice').value);
  const desc = document.getElementById('menuItemDesc').value.trim();
  const emoji = document.getElementById('menuItemEmoji').value.trim();
  const isVeg = document.getElementById('menuVeg').checked;
  
  const key = document.getElementById('menuItemKey').value || 'item_' + Date.now();

  const record = {
    name,
    price,
    desc,
    image: emoji,
    veg: isVeg
  };

  try {
    await set(ref(db, `shops/${shopId}/menu/${key}`), record);
    closeModal('addItemModal');
    showToast("Menu catalog saved");
  } catch (err) {
    showToast("Error saving item: " + err.message, "error");
  }
}

window.deleteMenuItem = function(itemId) {
  if (!confirm("Are you sure you want to delete this menu item?")) return;
  const shopId = currentUser.shop;
  
  // Set null to delete path in Realtime Database
  set(ref(db, `shops/${shopId}/menu/${itemId}`), null)
    .then(() => showToast("Menu item removed"))
    .catch(e => showToast(e.message, 'error'));
};

// -------------------------------------------------------------
// DELIVERY BOY GPS WORKSTATION (Delivery Only)
// -------------------------------------------------------------
let activeDeliveryOrder = null;

function renderDeliveryWorkstation(user) {
  const container = document.getElementById('deliveryOrdersContainer');
  if (!container || user.role !== 'delivery') return;

  const ordersArray = Object.values(allOrders);
  // Show assigned orders that are in transit or waiting pickup (Preparing, Out for Delivery)
  const assigned = ordersArray.filter(o => o.riderId === user.uid && o.status !== 'Delivered');

  if (assigned.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--border-radius-md); border:1px solid var(--glass-border);">
        <span style="font-size: 36px;">🛵</span>
        <p style="margin-top: 10px; font-size:13px;">No active delivery assignments.</p>
      </div>
    `;
    activeDeliveryOrder = null;
    disableGpsControls();
    // Redraw map with blank coordinates
    drawCampusMap('dashboardMapCanvas', null);
    return;
  }

  // Active delivery order (usually first incomplete one)
  activeDeliveryOrder = assigned[0];
  
  // Enable buttons based on GPS steps
  enableGpsControls(activeDeliveryOrder);
  
  // Render current assignment list
  container.innerHTML = '';
  assigned.forEach(o => {
    const isCurrent = activeDeliveryOrder.orderId === o.orderId;
    const card = document.createElement('div');
    card.className = 'order-card';
    if (isCurrent) card.style.borderColor = 'var(--accent-orange)';
    
    card.innerHTML = `
      <div class="order-card-header">
        <div>
          <div class="order-card-title">Order ID: #${o.orderId.substring(o.orderId.length - 6)}</div>
          <span class="tracking-status-badge badge-${o.status.toLowerCase().replace(/\s+/g, '')}">${o.status}</span>
        </div>
      </div>
      
      <div class="order-card-details">
        <p>Outlet: <strong>${o.shopName}</strong></p>
        <p>Delivery: <strong>${o.hostel} - Room ${o.room}</strong></p>
        <p>Student: <strong>${o.student}</strong></p>
      </div>
      
      <div style="display:flex; gap:10px; margin-top:10px;">
        ${o.status === 'Preparing' ? `
          <button class="btn btn-primary btn-sm" style="flex:1; justify-content:center;" onclick="startDeliveryTransit('${o.orderId}')">Start Delivery Transit</button>
        ` : ''}
        ${o.status === 'Out for Delivery' ? `
          <button class="btn btn-accent btn-sm" style="flex:1; justify-content:center;" onclick="markOrderDelivered('${o.orderId}')">Mark Delivered</button>
        ` : ''}
      </div>
    `;
    container.appendChild(card);
  });

  // Render Simulator Map inside dashboard
  drawCampusMap('dashboardMapCanvas', activeDeliveryOrder);
}

function enableGpsControls(order) {
  const atShop = document.getElementById('gpsAtShop');
  const transit = document.getElementById('gpsTransit');
  const near = document.getElementById('gpsNear');
  const arrived = document.getElementById('gpsArrived');
  
  if (!atShop) return;

  if (!order || order.status !== 'Out for Delivery') {
    disableGpsControls();
    return;
  }

  // Active steps buttons
  atShop.disabled = false;
  transit.disabled = false;
  near.disabled = false;
  arrived.disabled = false;

  // Highlight current step
  const buttons = [atShop, transit, near, arrived];
  buttons.forEach((btn, idx) => {
    btn.className = `btn btn-secondary btn-sm ${order.gpsStep === idx ? 'btn-primary' : ''}`;
  });
}

function disableGpsControls() {
  ['gpsAtShop', 'gpsTransit', 'gpsNear', 'gpsArrived'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = true;
      el.className = 'btn btn-secondary btn-sm';
    }
  });
}

window.startDeliveryTransit = function(orderId) {
  const updates = {
    status: "Out for Delivery",
    eta: 8,
    gpsStep: 1 // Moving out
  };
  update(ref(db, `orders/${orderId}`), updates)
    .then(() => showToast("Transit started. Navigate map..."))
    .catch(e => showToast(e.message, 'error'));
};

window.markOrderDelivered = function(orderId) {
  const updates = {
    status: "Delivered",
    eta: 0,
    gpsStep: 3 // Finished
  };
  update(ref(db, `orders/${orderId}`), updates)
    .then(() => showToast("Order marked as DELIVERED! Job complete."))
    .catch(e => showToast(e.message, 'error'));
};

function updateActiveDeliveryGps(step) {
  if (!activeDeliveryOrder) return;
  
  const etas = [10, 6, 3, 0];
  const updates = {
    gpsStep: step,
    eta: etas[step] || 0
  };
  
  if (step === 3) {
    updates.status = "Delivered";
  }

  update(ref(db, `orders/${activeDeliveryOrder.orderId}`), updates)
    .then(() => showToast(`GPS updated: Stage ${step}`))
    .catch(e => showToast(e.message, 'error'));
}

// -------------------------------------------------------------
// ADMIN CONTROL CONSOLE (Admin Only)
// -------------------------------------------------------------
function renderAdminConsole() {
  const shopsDiv = document.getElementById('adminShopsContainer');
  const delsDiv = document.getElementById('adminDeliveriesContainer');
  
  if (!shopsDiv || currentUser.role !== 'admin') return;

  // Render Shops open/close toggles
  shopsDiv.innerHTML = '';
  Object.entries(databaseShops).forEach(([key, shop]) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '8px 0';
    row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    row.innerHTML = `
      <div style="font-weight:600; font-size: 13px;">${shop.name}</div>
      <div style="display:flex; gap:10px; align-items:center;">
        <span style="font-size: 11px; padding: 2px 8px; border-radius:10px; background: rgba(16,185,129,0.1); color: #10b981;">Online</span>
        <button class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:10px;">Configure</button>
      </div>
    `;
    shopsDiv.appendChild(row);
  });

  // Render Delivery list
  delsDiv.innerHTML = '';
  if (allDeliveryBoys.length === 0) {
    delsDiv.innerHTML = `<p style="font-size:12px; color:var(--text-secondary);">No delivery boy registrations.</p>`;
    return;
  }

  allDeliveryBoys.forEach(db => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '8px 0';
    row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    row.innerHTML = `
      <div>
        <div style="font-weight:600; font-size: 13px;">${db.name}</div>
        <div style="font-size: 11px; color: var(--text-secondary);">${db.email}</div>
      </div>
      <span style="font-size:11px; padding:2px 8px; border-radius:10px; background: rgba(59,130,246,0.1); color: #3b82f6;">Active</span>
    `;
    delsDiv.appendChild(row);
  });
}

// -------------------------------------------------------------
// HISTORICAL ORDERS LEDGER TABLE (Admin Only)
// -------------------------------------------------------------
function renderAllOrdersTable() {
  const tbody = document.getElementById('allOrdersTableBody');
  if (!tbody || currentUser.role !== 'admin') return;

  const ordersArray = Object.values(allOrders).sort((a,b) => b.orderId.localeCompare(a.orderId));

  if (ordersArray.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-secondary);">No transactions recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  ordersArray.forEach(o => {
    const row = document.createElement('tr');
    
    const itemsSummary = o.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
    
    row.innerHTML = `
      <td><strong>#${o.orderId.substring(o.orderId.length - 6)}</strong></td>
      <td style="font-size:11px; color:var(--text-secondary);">${o.time.split(',')[1] || o.time}</td>
      <td>${o.shopName}</td>
      <td>
        <div>${o.student}</div>
        <div style="font-size:11px; color:var(--text-secondary);">${o.hostel} - Room ${o.room}</div>
      </td>
      <td style="max-width:200px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${itemsSummary}">${itemsSummary}</td>
      <td><strong>₹${o.total}</strong></td>
      <td><span style="font-size:11px; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.05);">${o.payment}</span></td>
      <td><span class="tracking-status-badge badge-${o.status.toLowerCase().replace(/\s+/g, '')}" style="font-size:10px; padding:4px 8px;">${o.status}</span></td>
    `;
    tbody.appendChild(row);
  });
}

// -------------------------------------------------------------
// ANALYTICS PANEL & CUSTOM HTML BAR CHART (Shop & Admin)
// -------------------------------------------------------------
function renderAnalyticsDashboard(user) {
  const chartContainer = document.getElementById('analyticsBarChart');
  const topSellingDiv = document.getElementById('analyticsTopSelling');
  
  if (!chartContainer || (user.role !== 'admin' && user.role !== 'shopkeeper')) return;

  const ordersArray = Object.values(allOrders);

  // Group by outlets & calculate revenue
  const outletRevenue = {
    nescafe: 0,
    kitchenatte: 0,
    kathiroll: 0,
    pizzabar: 0,
    dosahouse: 0
  };

  const itemCounts = {};

  ordersArray.forEach(o => {
    if (o.status === 'Delivered') {
      if (outletRevenue[o.shopId] !== undefined) {
        outletRevenue[o.shopId] += o.total;
      }
      
      // Calculate top items
      o.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    }
  });

  // Calculate percentages for custom CSS chart heights
  const maxRevenue = Math.max(...Object.values(outletRevenue), 1); // Avoid division by 0
  
  // Render Bar Charts
  chartContainer.innerHTML = '';
  Object.entries(outletRevenue).forEach(([shopId, rev]) => {
    const shopName = databaseShops[shopId]?.name || shopId.toUpperCase();
    const heightPercent = Math.round((rev / maxRevenue) * 80); // Max height 80%

    const wrapper = document.createElement('div');
    wrapper.className = 'chart-bar-wrapper';
    wrapper.innerHTML = `
      <div class="chart-bar" style="height: ${heightPercent}%;">
        <div class="chart-tooltip">Revenue: ₹${rev}</div>
      </div>
      <div class="chart-label">${shopName}</div>
    `;
    chartContainer.appendChild(wrapper);
  });

  // Render top selling products
  topSellingDiv.innerHTML = '';
  const sortedItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (sortedItems.length === 0) {
    topSellingDiv.innerHTML = `<p style="font-size:12px; color:var(--text-secondary); text-align:center;">No product delivery registry completed.</p>`;
    return;
  }

  const colors = ['#ff5a36', '#8b5cf6', '#10b981', '#3b82f6'];

  sortedItems.forEach(([name, count], idx) => {
    const color = colors[idx] || '#6b7280';
    const row = document.createElement('div');
    row.className = 'pie-row';
    row.innerHTML = `
      <div class="pie-legend">
        <div class="pie-color" style="background: ${color}"></div>
        <span>${name}</span>
      </div>
      <strong>${count} Sold</strong>
    `;
    topSellingDiv.appendChild(row);
  });
}

// -------------------------------------------------------------
// MODULE UTILS & COMMON DIALOGS
// -------------------------------------------------------------
function openModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (overlay) {
    overlay.classList.add('open');
    overlay.style.display = 'flex';
  }
}

function closeModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (overlay) {
    overlay.classList.remove('open');
    overlay.style.display = 'none';
  }
}

// -------------------------------------------------------------
// BOOTSTRAP INITIALIZATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Check if we are on Dashboard page or Student page
  const hasDashboardLayout = document.getElementById('dashboardLayout') !== null;
  
  if (hasDashboardLayout) {
    initDashboard();
  } else {
    initStudentPortal();
  }
});
