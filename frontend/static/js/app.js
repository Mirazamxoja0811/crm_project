const API = '/api';

// ===== API HELPERS =====
async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    throw e;
  }
}

const api = {
  get: (url) => apiFetch(url),
  post: (url, data) => apiFetch(url, { method: 'POST', body: JSON.stringify(data) }),
  put: (url, data) => apiFetch(url, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (url) => apiFetch(url, { method: 'DELETE' }),
};

// ===== TOAST =====
function toast(msg, type = 'success') {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span style="font-size:16px">${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ===== NAVIGATION =====
let currentPage = 'dashboard';

function navigate(page) {
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.querySelector(`[data-page="${page}"]`);

  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  currentPage = page;
  loadPage(page);

  // Update topbar
  const titles = {
    dashboard: { title: 'Boshqaruv paneli', sub: 'Barcha ko\'rsatkichlar — jonli' },
    customers: { title: 'Mijozlar', sub: 'Korporativ mijozlarni boshqarish' },
    orders: { title: 'Buyurtmalar', sub: 'Barcha buyurtmalar va yetkazib berish' },
    products: { title: 'Mahsulotlar', sub: 'Tovar katalogi va zaxiralar' },
    interactions: { title: 'Muloqotlar', sub: 'Mijozlar bilan aloqa tarixi' },
  };
  const t = titles[page] || { title: page, sub: '' };
  document.getElementById('topbar-title').textContent = t.title;
  document.getElementById('topbar-subtitle').textContent = t.sub;
}

function loadPage(page) {
  if (page === 'dashboard') loadDashboard();
  else if (page === 'customers') loadCustomers();
  else if (page === 'orders') loadOrders();
  else if (page === 'products') loadProducts();
  else if (page === 'interactions') loadInteractions();
}

// ===== FORMATTERS =====
function formatMoney(n) {
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M so'm`;
  if (n >= 1000) return `${(n/1000).toFixed(0)}K so'm`;
  return `${n.toLocaleString()} so'm`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function statusBadge(status) {
  const map = {
    pending: 'Kutilmoqda',
    processing: 'Jarayonda',
    shipped: 'Yuborildi',
    delivered: 'Yetkazildi',
    cancelled: 'Bekor qilindi',
    active: 'Faol',
    inactive: 'Nofaol',
    vip: 'VIP',
  };
  return `<span class="badge badge-${status}">${map[status] || status}</span>`;
}

function interactionIcon(type) {
  const map = { call: '📞', email: '✉️', meeting: '🤝', note: '📝' };
  return map[type] || '💬';
}

// ===== MODAL =====
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  const form = document.querySelector(`#${id} form`);
  if (form) form.reset();
  // Remove hidden fields
  const hid = document.querySelector(`#${id} [name="edit_id"]`);
  if (hid) hid.remove();
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal(e.target.id);
  }
});

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const data = await api.get('/dashboard/stats');
    renderDashboard(data);
  } catch (e) {
    toast('Ma\'lumotlarni yuklashda xato: ' + e.message, 'error');
  }
}

function renderDashboard(data) {
  // Stats
  document.getElementById('stat-customers').textContent = data.total_customers;
  document.getElementById('stat-orders').textContent = data.total_orders;
  document.getElementById('stat-pending').textContent = data.pending_orders;
  document.getElementById('stat-revenue').textContent = formatMoney(data.total_revenue);
  document.getElementById('stat-products').textContent = data.total_products;

  // Recent orders table
  const tbody = document.getElementById('recent-orders-body');
  if (!data.recent_orders.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:30px;color:var(--text-muted);text-align:center">Buyurtmalar yo'q</td></tr>`;
  } else {
    tbody.innerHTML = data.recent_orders.map(o => `
      <tr onclick="navigate('orders')">
        <td><span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent-blue)">${o.order_number}</span></td>
        <td><strong>${o.customer_name}</strong></td>
        <td>${statusBadge(o.status)}</td>
        <td><span style="font-weight:600">${formatMoney(o.total_amount)}</span></td>
        <td style="color:var(--text-muted);font-size:12px">${formatDate(o.created_at)}</td>
      </tr>
    `).join('');
  }

  // Top customers
  const topBody = document.getElementById('top-customers-body');
  topBody.innerHTML = data.top_customers.map((c, i) => `
    <tr onclick="showCustomerDetail(${c.id})">
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="customer-row-avatar" style="background:${avatarGradient(i)}">${getInitials(c.company_name)}</div>
          <span>${c.company_name}</span>
        </div>
      </td>
      <td>${statusBadge(c.status)}</td>
      <td><span style="font-weight:600;color:var(--accent-emerald)">${formatMoney(c.total_spent)}</span></td>
      <td style="color:var(--text-muted)">${c.total_orders}</td>
    </tr>
  `).join('');

  // Revenue chart
  renderRevenueChart(data.monthly_revenue);

  // Status donut
  renderStatusDonut(data.order_status_distribution);
}

const gradients = [
  'linear-gradient(135deg,#3d8bff,#a855f7)',
  'linear-gradient(135deg,#00d084,#3d8bff)',
  'linear-gradient(135deg,#ffaa00,#ff4d6d)',
  'linear-gradient(135deg,#a855f7,#ff4d6d)',
  'linear-gradient(135deg,#00d084,#ffaa00)',
];
function avatarGradient(i) { return gradients[i % gradients.length]; }

function renderRevenueChart(data) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  const bars = document.getElementById('revenue-bars');
  const labels = document.getElementById('revenue-labels');
  if (!bars || !labels) return;

  bars.innerHTML = data.map((d, i) => {
    const h = Math.max((d.revenue / max) * 100, 2);
    const isLast = i === data.length - 1;
    return `<div class="chart-bar ${isLast ? 'highlight' : ''}" style="height:${h}%" title="${d.month}: ${formatMoney(d.revenue)}"></div>`;
  }).join('');

  labels.innerHTML = data.map(d => `<div class="chart-label">${d.month}</div>`).join('');
}

function renderStatusDonut(dist) {
  const el = document.getElementById('status-donut');
  if (!el) return;

  const colors = {
    delivered: '#00d084',
    processing: '#3d8bff',
    shipped: '#a855f7',
    pending: '#ffaa00',
    cancelled: '#ff4d6d',
  };
  const labels = {
    delivered: 'Yetkazildi', processing: 'Jarayonda',
    shipped: 'Yuborildi', pending: 'Kutilmoqda', cancelled: 'Bekor'
  };

  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  let offset = 0;
  const segments = Object.entries(dist).filter(([_, v]) => v > 0).map(([k, v]) => {
    const pct = (v / total) * 100;
    const seg = { key: k, pct, offset };
    offset += pct;
    return seg;
  });

  const svgSize = 120;
  const r = 40;
  const cx = svgSize / 2;
  const cy = svgSize / 2;

  function polarToCart(pct) {
    const angle = (pct / 100) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const paths = segments.map(seg => {
    const start = polarToCart(seg.offset);
    const end = polarToCart(seg.offset + seg.pct);
    const large = seg.pct > 50 ? 1 : 0;
    const color = colors[seg.key] || '#888';
    return `<path d="M${cx},${cy} L${start.x},${start.y} A${r},${r} 0 ${large},1 ${end.x},${end.y} Z" fill="${color}" opacity="0.85"/>`;
  }).join('');

  const legend = document.getElementById('status-legend');
  if (legend) {
    legend.innerHTML = Object.entries(dist).filter(([_, v]) => v > 0).map(([k, v]) => `
      <div class="donut-legend-item">
        <div class="legend-dot" style="background:${colors[k] || '#888'}"></div>
        <span>${labels[k] || k}</span>
        <span class="legend-value">${v}</span>
      </div>
    `).join('');
  }

  el.innerHTML = `<svg viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">${paths}<circle cx="${cx}" cy="${cy}" r="24" fill="var(--bg-card)"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="var(--text-primary)" font-size="14" font-weight="700" font-family="Sora">${total}</text><text x="${cx}" y="${cy+14}" text-anchor="middle" fill="var(--text-muted)" font-size="8" font-family="Sora">JAMI</text></svg>`;
}

// ===== CUSTOMERS =====
let allCustomers = [];

async function loadCustomers(search = '') {
  const tbody = document.getElementById('customers-body');
  tbody.innerHTML = `<tr><td colspan="7"><div class="loading-overlay"><div class="spinner"></div></div></td></tr>`;
  try {
    allCustomers = await api.get(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    renderCustomers(allCustomers);
  } catch (e) {
    toast('Mijozlarni yuklashda xato', 'error');
  }
}

function renderCustomers(customers) {
  const tbody = document.getElementById('customers-body');
  if (!customers.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">👥</div><div class="title">Mijozlar topilmadi</div><div class="sub">Birinchi mijozni qo'shing yoki qidiruv so'zini o'zgartiring</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = customers.map((c, i) => `
    <tr onclick="showCustomerDetail(${c.id})">
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="customer-row-avatar" style="background:${avatarGradient(i)}">${getInitials(c.company_name)}</div>
          <div>
            <div style="font-weight:600">${c.company_name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${c.email}</div>
          </div>
        </div>
      </td>
      <td>${c.contact_name}</td>
      <td>${c.phone || '—'}</td>
      <td>${c.city || '—'}</td>
      <td>${statusBadge(c.status)}</td>
      <td><span style="font-weight:600;color:var(--accent-emerald)">${formatMoney(c.total_spent)}</span></td>
      <td>
        <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-secondary" onclick="editCustomer(${c.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${c.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  document.getElementById('customer-count').textContent = customers.length;
}

async function showCustomerDetail(id) {
  const c = allCustomers.find(x => x.id === id);
  if (!c) return;

  const interactions = await api.get(`/interactions?customer_id=${id}`).catch(() => []);
  const orders = await api.get('/orders').catch(() => []);
  const custOrders = orders.filter(o => o.customer_id === id).slice(0, 5);

  const modal = document.getElementById('customer-detail-modal');

  modal.querySelector('.detail-avatar').textContent = getInitials(c.company_name);
  modal.querySelector('.company').textContent = c.company_name;
  modal.querySelector('.contact').textContent = `${c.contact_name} · ${c.email}`;

  modal.querySelector('#detail-spent').textContent = formatMoney(c.total_spent);
  modal.querySelector('#detail-orders').textContent = c.total_orders;
  modal.querySelector('#detail-city').textContent = c.city || '—';
  modal.querySelector('#detail-status').innerHTML = statusBadge(c.status);

  // Orders
  const ordersList = modal.querySelector('#detail-orders-list');
  ordersList.innerHTML = custOrders.length
    ? custOrders.map(o => `
      <tr>
        <td><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent-blue)">${o.order_number}</span></td>
        <td>${statusBadge(o.status)}</td>
        <td>${formatMoney(o.total_amount)}</td>
        <td style="font-size:11px;color:var(--text-muted)">${formatDate(o.created_at)}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">Buyurtmalar yo'q</td></tr>`;

  // Interactions
  const timeline = modal.querySelector('#detail-timeline');
  timeline.innerHTML = interactions.length
    ? interactions.map(i => `
      <div class="timeline-item">
        <div class="timeline-icon">${interactionIcon(i.type)}</div>
        <div class="timeline-content">
          <div class="subject">${i.subject}</div>
          <div class="desc">${i.description || ''}</div>
          <div class="time">${formatDate(i.created_at)} · Natija: ${i.outcome || '—'}</div>
        </div>
      </div>
    `).join('')
    : '<div style="color:var(--text-muted);font-size:13px;padding:16px 0">Muloqotlar tarixi yo\'q</div>';

  openModal('customer-detail-modal');
}

async function saveCustomer(e) {
  e.preventDefault();
  const form = e.target;
  const editId = form.querySelector('[name="edit_id"]')?.value;
  const data = {
    company_name: form.company_name.value,
    contact_name: form.contact_name.value,
    email: form.email.value,
    phone: form.phone.value,
    address: form.address.value,
    city: form.city.value,
    country: form.country.value || "O'zbekiston",
    status: form.status.value,
    notes: form.notes.value,
  };
  try {
    if (editId) {
      await api.put(`/customers/${editId}`, data);
      toast('Mijoz yangilandi ✓');
    } else {
      await api.post('/customers', data);
      toast('Yangi mijoz qo\'shildi ✓');
    }
    closeModal('customer-modal');
    loadCustomers();
  } catch (e) {
    toast('Xato: ' + e.message, 'error');
  }
}

async function editCustomer(id) {
  const c = allCustomers.find(x => x.id === id);
  if (!c) return;
  const form = document.getElementById('customer-form');
  form.company_name.value = c.company_name;
  form.contact_name.value = c.contact_name;
  form.email.value = c.email;
  form.phone.value = c.phone || '';
  form.address.value = c.address || '';
  form.city.value = c.city || '';
  form.country.value = c.country || '';
  form.status.value = c.status;
  form.notes.value = c.notes || '';

  let hid = form.querySelector('[name="edit_id"]');
  if (!hid) { hid = document.createElement('input'); hid.type = 'hidden'; hid.name = 'edit_id'; form.appendChild(hid); }
  hid.value = id;

  document.getElementById('customer-modal-title').textContent = 'Mijozni tahrirlash';
  openModal('customer-modal');
}

async function deleteCustomer(id) {
  if (!confirm('Bu mijozni o\'chirmoqchimisiz?')) return;
  try {
    await api.delete(`/customers/${id}`);
    toast('Mijoz o\'chirildi');
    loadCustomers();
  } catch (e) {
    toast('Xato: ' + e.message, 'error');
  }
}

// ===== ORDERS =====
let allOrders = [];
let currentOrderFilter = '';

async function loadOrders(statusFilter = '') {
  currentOrderFilter = statusFilter;
  const tbody = document.getElementById('orders-body');
  tbody.innerHTML = `<tr><td colspan="7"><div class="loading-overlay"><div class="spinner"></div></div></td></tr>`;
  try {
    allOrders = await api.get(`/orders${statusFilter ? `?status_filter=${statusFilter}` : ''}`);
    renderOrders(allOrders);
  } catch (e) {
    toast('Buyurtmalarni yuklashda xato', 'error');
  }
}

function renderOrders(orders) {
  const tbody = document.getElementById('orders-body');
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">📦</div><div class="title">Buyurtmalar topilmadi</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent-blue)">${o.order_number}</span></td>
      <td>${o.customer ? `<strong>${o.customer.company_name}</strong>` : '—'}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="font-weight:600">${formatMoney(o.total_amount)}</td>
      <td style="color:var(--text-muted);font-size:12px">${formatDate(o.created_at)}</td>
      <td>
        <select class="form-control" style="padding:4px 8px;font-size:11px;width:140px" onchange="updateOrderStatus(${o.id}, this.value)" onclick="event.stopPropagation()">
          ${['pending','processing','shipped','delivered','cancelled'].map(s =>
            `<option value="${s}" ${s===o.status?'selected':''}>${{pending:'Kutilmoqda',processing:'Jarayonda',shipped:'Yuborildi',delivered:'Yetkazildi',cancelled:'Bekor'}[s]}</option>`
          ).join('')}
        </select>
      </td>
      <td onclick="event.stopPropagation()">
        <button class="btn btn-sm btn-danger" onclick="deleteOrder(${o.id})">🗑</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('order-count').textContent = orders.length;
}

async function updateOrderStatus(id, newStatus) {
  try {
    await api.put(`/orders/${id}/status`, { status: newStatus });
    toast('Status yangilandi ✓');
    loadOrders(currentOrderFilter);
  } catch (e) {
    toast('Xato: ' + e.message, 'error');
  }
}

async function saveOrder(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    customer_id: parseInt(form.customer_id.value),
    status: form.status.value,
    total_amount: parseFloat(form.total_amount.value) || 0,
    shipping_address: form.shipping_address.value,
    notes: form.notes.value,
    items: []
  };
  try {
    await api.post('/orders', data);
    toast('Buyurtma qo\'shildi ✓');
    closeModal('order-modal');
    loadOrders();
  } catch (e) {
    toast('Xato: ' + e.message, 'error');
  }
}

async function deleteOrder(id) {
  if (!confirm('Bu buyurtmani o\'chirmoqchimisiz?')) return;
  try {
    await api.delete(`/orders/${id}`);
    toast('Buyurtma o\'chirildi');
    loadOrders();
  } catch (e) {
    toast('Xato: ' + e.message, 'error');
  }
}

async function populateCustomerSelect(selectId) {
  const customers = await api.get('/customers').catch(() => []);
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">— Mijoz tanlang —</option>' +
    customers.map(c => `<option value="${c.id}">${c.company_name}</option>`).join('');
}

// ===== PRODUCTS =====
let allProducts = [];

async function loadProducts(category = '') {
  const tbody = document.getElementById('products-body');
  tbody.innerHTML = `<tr><td colspan="7"><div class="loading-overlay"><div class="spinner"></div></div></td></tr>`;
  try {
    allProducts = await api.get(`/products${category ? `?category=${encodeURIComponent(category)}` : ''}`);
    renderProducts(allProducts);
  } catch (e) {
    toast('Mahsulotlarni yuklashda xato', 'error');
  }
}

function renderProducts(products) {
  const tbody = document.getElementById('products-body');
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="icon">🧥</div><div class="title">Mahsulotlar topilmadi</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => {
    let stockColor = 'var(--accent-emerald)';
    let stockBg = 'var(--accent-emerald-dim)';
    if (p.stock_quantity <= 0) { stockColor = 'var(--accent-rose)'; stockBg = 'var(--accent-rose-dim)'; }
    else if (p.stock_quantity < 50) { stockColor = 'var(--accent-amber)'; stockBg = 'var(--accent-amber-dim)'; }

    const pct = Math.min((p.stock_quantity / 300) * 100, 100);

    return `
    <tr>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted)">${p.sku}</span></td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge badge-active" style="font-family:'Sora',sans-serif;font-size:11px">${p.category || '—'}</span></td>
      <td style="font-weight:600;color:var(--accent-emerald)">${formatMoney(p.price)}</td>
      <td>
        <div style="min-width:100px">
          <div style="font-size:13px;font-weight:600;color:${stockColor}">${p.stock_quantity} ${p.unit}</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${stockColor}"></div></div>
        </div>
      </td>
      <td style="color:var(--text-muted);font-size:12px">${formatDate(p.created_at)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-secondary" onclick="editProduct(${p.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">🗑</button>
        </div>
      </td>
    </tr>
  `}).join('');

  document.getElementById('product-count').textContent = products.length;
}

async function saveProduct(e) {
  e.preventDefault();
  const form = e.target;
  const editId = form.querySelector('[name="edit_id"]')?.value;
  const data = {
    name: form.name.value,
    sku: form.sku.value,
    category: form.category.value,
    price: parseFloat(form.price.value),
    stock_quantity: parseInt(form.stock_quantity.value),
    unit: form.unit.value,
    description: form.description.value,
  };
  try {
    if (editId) {
      await api.put(`/products/${editId}`, data);
      toast('Mahsulot yangilandi ✓');
    } else {
      await api.post('/products', data);
      toast('Mahsulot qo\'shildi ✓');
    }
    closeModal('product-modal');
    loadProducts();
  } catch (e) {
    toast('Xato: ' + e.message, 'error');
  }
}

async function editProduct(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  const form = document.getElementById('product-form');
  form.name.value = p.name;
  form.sku.value = p.sku;
  form.category.value = p.category || '';
  form.price.value = p.price;
  form.stock_quantity.value = p.stock_quantity;
  form.unit.value = p.unit;
  form.description.value = p.description || '';

  let hid = form.querySelector('[name="edit_id"]');
  if (!hid) { hid = document.createElement('input'); hid.type = 'hidden'; hid.name = 'edit_id'; form.appendChild(hid); }
  hid.value = id;

  document.getElementById('product-modal-title').textContent = 'Mahsulotni tahrirlash';
  openModal('product-modal');
}

async function deleteProduct(id) {
  if (!confirm('Bu mahsulotni o\'chirmoqchimisiz?')) return;
  try {
    await api.delete(`/products/${id}`);
    toast('Mahsulot o\'chirildi');
    loadProducts();
  } catch (e) {
    toast('Xato: ' + e.message, 'error');
  }
}

// ===== INTERACTIONS =====
async function loadInteractions() {
  const tbody = document.getElementById('interactions-body');
  tbody.innerHTML = `<tr><td colspan="6"><div class="loading-overlay"><div class="spinner"></div></div></td></tr>`;
  try {
    const data = await api.get('/interactions');
    renderInteractions(data);
  } catch (e) {
    toast('Muloqotlarni yuklashda xato', 'error');
  }
}

function renderInteractions(interactions) {
  const tbody = document.getElementById('interactions-body');
  if (!interactions.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">💬</div><div class="title">Muloqotlar topilmadi</div></div></td></tr>`;
    return;
  }
  const typeLabel = { call: '📞 Qo\'ng\'iroq', email: '✉️ Email', meeting: '🤝 Uchrashuv', note: '📝 Eslatma' };
  tbody.innerHTML = interactions.map(i => `
    <tr>
      <td><span style="font-size:15px">${interactionIcon(i.type)}</span> ${typeLabel[i.type] || i.type}</td>
      <td><strong>${i.customer ? i.customer.company_name : '—'}</strong></td>
      <td>${i.subject}</td>
      <td style="color:var(--text-secondary)">${i.description || '—'}</td>
      <td><span class="badge badge-active" style="font-family:'Sora';font-size:11px">${i.outcome || '—'}</span></td>
      <td style="color:var(--text-muted);font-size:12px">${formatDate(i.created_at)}</td>
    </tr>
  `).join('');
}

async function saveInteraction(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    customer_id: parseInt(form.customer_id.value),
    type: form.type.value,
    subject: form.subject.value,
    description: form.description.value,
    outcome: form.outcome.value,
  };
  try {
    await api.post('/interactions', data);
    toast('Muloqot qo\'shildi ✓');
    closeModal('interaction-modal');
    loadInteractions();
  } catch (e) {
    toast('Xato: ' + e.message, 'error');
  }
}

// ===== SEED =====
async function seedDatabase() {
  try {
    await api.post('/seed', {});
    toast('Demo ma\'lumotlar yuklandi ✓');
    loadPage(currentPage);
  } catch (e) {
    toast('Xato: ' + e.message, 'error');
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  navigate('dashboard');

  // Seed button
  document.getElementById('seed-btn')?.addEventListener('click', seedDatabase);

  // Customer form
  document.getElementById('customer-form')?.addEventListener('submit', saveCustomer);
  document.getElementById('add-customer-btn')?.addEventListener('click', () => {
    document.getElementById('customer-modal-title').textContent = 'Yangi mijoz qo\'shish';
    openModal('customer-modal');
  });

  // Customer search
  document.getElementById('customer-search')?.addEventListener('input', (e) => {
    loadCustomers(e.target.value);
  });

  // Order form
  document.getElementById('order-form')?.addEventListener('submit', saveOrder);
  document.getElementById('add-order-btn')?.addEventListener('click', async () => {
    await populateCustomerSelect('order-customer-id');
    openModal('order-modal');
  });

  // Product form
  document.getElementById('product-form')?.addEventListener('submit', saveProduct);
  document.getElementById('add-product-btn')?.addEventListener('click', () => {
    document.getElementById('product-modal-title').textContent = 'Yangi mahsulot qo\'shish';
    openModal('product-modal');
  });

  // Interaction form
  document.getElementById('interaction-form')?.addEventListener('submit', saveInteraction);
  document.getElementById('add-interaction-btn')?.addEventListener('click', async () => {
    await populateCustomerSelect('interaction-customer-id');
    openModal('interaction-modal');
  });

  // Order status filter tabs
  document.querySelectorAll('[data-order-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-order-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadOrders(btn.dataset.orderFilter);
    });
  });
});
