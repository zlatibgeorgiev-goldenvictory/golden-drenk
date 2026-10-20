/**
 * GOLDEN DRENK V2 — Core Storefront, BigArena Checkout & Secret Portal Access
 * Stack: 100% Pure Vanilla JS | Currency: EUR | Market: Bulgaria
 */

(() => {
  'use strict';

  // --- CONFIGURATION ---
  const CONFIG = {
    CURRENCY: '€',
    PORTAL_PIN: '2738',
    PORTAL_URL: 'portal/index.html',
    BIGARENA_WEBHOOK_URL: '', // Ще се попълни при получаване на API/Webhook от BigArena
    STORAGE_KEYS: {
      CART: 'gd_v2_cart',
      ORDERS: 'gd_v2_orders',
      COOKIES_ACCEPTED: 'gd_v2_cookies_ok',
      DEV_UNLOCKED: 'gd_v2_dev_unlocked'
    }
  };

  // --- STATE ---
  let cart = loadFromStorage(CONFIG.STORAGE_KEYS.CART, []);
  let ordersHistory = loadFromStorage(CONFIG.STORAGE_KEYS.ORDERS, []);
  let selectedCourier = 'Speedy';

  // --- LEGAL CONTENT TEMPLATES (Ready for Company Details) ---
  const LEGAL_DOCS = {
    termsModal: {
      title: 'Общи условия за пазаруване',
      html: `
        <p><strong>1. Данни за Търговеца:</strong> Този онлайн магазин се управлява от <em>[ИМЕ НА ФИРМАТА ЕООД / ООД]</em>, ЕИК: <em>[ЕИК НОМЕР]</em>, със седалище и адрес на управление: гр. София, <em>[ТОЧЕН АДРЕС]</em>, имейл: hello@goldendrenk.com.</p>
        <p style="margin-top:10px;"><strong>2. Продукт и Цени:</strong> GOLDEN DRENK е функционална напитка на прах / хранителна добавка в индивидуални сашета (30 броя х 3.69g в кутия). Всички цени на сайта са крайни, обявени в Евро (EUR) с включен ДДС: Стартов пакет (1 кутия) – 30.00 €, Двоен пакет (2 кутии + подарък) – 54.00 €.</p>
        <p style="margin-top:10px;"><strong>3. Доставка и Плащане:</strong> Доставката на територията на Република България е БЕЗПЛАТНА за клиента и се извършва чрез куриерски фирми „Спиди“ АД или „Еконт Експрес“ ООД (чрез логистичен партньор BigArena Fulfillment). Плащането се извършва чрез Наложен платеж (ППП) при получаване на пратката с включена опция „Преглед преди плащане“.</p>
      `
    },
    privacyModal: {
      title: 'Политика за поверителност (GDPR)',
      html: `
        <p>Ние обработваме Вашите лични данни (Име, Фамилия, Телефонен номер и Адрес/Офис за доставка) единствено с цел изпълнение на договора за покупко-продажба от разстояние и доставяне на поръчаните продукти.</p>
        <p style="margin-top:10px;"><strong>Получатели на данни:</strong> Данните за доставка се предават по защитен криптиран път към нашия фулфилмент център (BigArena) и избрания от Вас куриер (Спиди или Еконт). Ние не продаваме и не предоставяме данните Ви на трети лица за маркетингови цели без изрично съгласие.</p>
      `
    },
    cookiesModal: {
      title: 'Политика за бисквитки (Cookies)',
      html: `
        <p>Сайтът използва само строго необходими технически записи в локалната памет на браузъра (LocalStorage), за да запази съдържанието на Вашата количка и историята на поръчките Ви на това устройство.</p>
      `
    },
    returnsModal: {
      title: 'Право на връщане и рекламации',
      html: `
        <p>Съгласно Закона за защита на потребителите (ЗЗП), имате право да се откажете от покупката в 14-дневен срок от получаването ѝ, при условие че кутията е в ненарушен търговски вид, фабрично запечатана и с ненарушена цялост на индивидуалните сашета (поради съображения, свързани с хигиената и безопасността на хранителните продукти).</p>
        <p style="margin-top:10px;">За връщане или рекламация се свържете с нас на: <strong>hello@goldendrenk.com</strong>.</p>
      `
    }
  };

  // --- INITIALIZATION ---
  document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    initEventListeners();
    initSecretPortalAccess();
    initCookieBanner();
  });

  // --- STORAGE HELPERS ---
  function loadFromStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Ignore storage quota errors
    }
  }

  // --- EVENT LISTENERS ---
  function initEventListeners() {
    // Add to Cart Buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sku');
        const name = btn.getAttribute('data-name');
        const price = parseFloat(btn.getAttribute('data-price'));
        addToCart(sku, name, price);
      });
    });

    // Open / Close Cart Drawer
    const openCartBtn = document.getElementById('openCartBtn');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartOverlay = document.getElementById('cartDrawerOverlay');

    if (openCartBtn) openCartBtn.addEventListener('click', () => toggleCartDrawer(true));
    if (closeCartBtn) closeCartBtn.addEventListener('click', () => toggleCartDrawer(false));
    if (cartOverlay) {
      cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) toggleCartDrawer(false);
      });
    }

    // Courier Toggle (Speedy / Econt)
    document.querySelectorAll('.courier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedCourier = btn.getAttribute('data-courier');
        document.querySelectorAll('.courier-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateAddressLabels();
      });
    });

    // Delivery Type Select (Office vs Address)
    const deliveryTypeSelect = document.getElementById('deliveryTypeSelect');
    if (deliveryTypeSelect) {
      deliveryTypeSelect.addEventListener('change', updateAddressLabels);
    }

    // Submit 1-Click Fast Order
    const checkoutForm = document.getElementById('fastCheckoutForm');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', handleOrderSubmit);
    }

    // Legal Modal Triggers
    document.querySelectorAll('[data-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalKey = btn.getAttribute('data-modal');
        openLegalModal(modalKey);
      });
    });

    const closeLegalBtn = document.getElementById('closeLegalModalBtn');
    const legalOverlay = document.getElementById('legalModalOverlay');
    if (closeLegalBtn) closeLegalBtn.addEventListener('click', () => legalOverlay.classList.remove('show'));
    if (legalOverlay) {
      legalOverlay.addEventListener('click', (e) => {
        if (e.target === legalOverlay) legalOverlay.classList.remove('show');
      });
    }

    // Generic Close Modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-close-modal');
        document.getElementById(targetId)?.classList.remove('show');
      });
    });

    // Customer Orders Modal
    const openOrdersBtn = document.getElementById('openOrdersModalBtn');
    if (openOrdersBtn) {
      openOrdersBtn.addEventListener('click', () => {
        renderCustomerOrders();
        document.getElementById('ordersHistoryModal')?.classList.add('show');
      });
    }
  }

  // --- CART LOGIC ---
  function addToCart(sku, name, price) {
    const existing = cart.find(item => item.sku === sku);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ sku, name, price, qty: 1 });
    }
    saveToStorage(CONFIG.STORAGE_KEYS.CART, cart);
    updateCartUI();
    toggleCartDrawer(true);
  }

  function changeItemQty(sku, delta) {
    const item = cart.find(i => i.sku === sku);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(i => i.sku !== sku);
    }
    saveToStorage(CONFIG.STORAGE_KEYS.CART, cart);
    updateCartUI();
  }

  function updateCartUI() {
    const badge = document.getElementById('cartBadgeCount');
    const itemsContainer = document.getElementById('drawerItemsList');
    const subtotalEl = document.getElementById('drawerSubtotal');
    const totalEl = document.getElementById('drawerTotal');

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    if (badge) badge.textContent = totalItems;
    if (subtotalEl) subtotalEl.textContent = `${subtotal.toFixed(2)} ${CONFIG.CURRENCY}`;
    if (totalEl) totalEl.textContent = `${subtotal.toFixed(2)} ${CONFIG.CURRENCY}`;

    if (!itemsContainer) return;

    if (cart.length === 0) {
      itemsContainer.innerHTML = `
        <div style="text-align:center; padding: 28px 12px; color: var(--text-muted); font-size: 14px;">
          Количката ти е празна. Избери Стартов (30.00 €) или Двоен пакет (54.00 €) с безплатна доставка.
        </div>
      `;
      return;
    }

    itemsContainer.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="item-info">
          <div class="item-title">${escapeHtml(item.name)}</div>
          <div class="item-price">${item.price.toFixed(2)} ${CONFIG.CURRENCY} • Безплатна доставка</div>
        </div>
        <div class="qty-controls">
          <button type="button" class="qty-btn" data-action="dec" data-sku="${item.sku}" aria-label="Намали количеството">&minus;</button>
          <span class="qty-val">${item.qty}</span>
          <button type="button" class="qty-btn" data-action="inc" data-sku="${item.sku}" aria-label="Увеличи количеството">&plus;</button>
        </div>
      </div>
    `).join('');

    itemsContainer.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sku');
        const delta = btn.getAttribute('data-action') === 'inc' ? 1 : -1;
        changeItemQty(sku, delta);
      });
    });
  }

  function toggleCartDrawer(open) {
    const overlay = document.getElementById('cartDrawerOverlay');
    if (!overlay) return;
    if (open) {
      updateCartUI();
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    } else {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function updateAddressLabels() {
    const typeSelect = document.getElementById('deliveryTypeSelect');
    const label = document.getElementById('deliveryAddressLabel');
    const input = document.getElementById('checkoutAddress');
    if (!typeSelect || !label || !input) return;

    const courierName = selectedCourier === 'Speedy' ? 'Спиди' : 'Еконт';
    if (typeSelect.value === 'office') {
      label.textContent = `Офис / Автомат на ${courierName} *`;
      input.placeholder = `Напр. Офис ${courierName} Централен / Автомат...`;
    } else {
      label.textContent = 'Точен личен / служебен адрес *';
      input.placeholder = 'ул. / ж.к., номер, блок, вход, ап...';
    }
  }

  // --- 1-CLICK ORDER SUBMISSION & BIGARENA PAYLOAD ---
  async function handleOrderSubmit(e) {
    e.preventDefault();
    const errorEl = document.getElementById('checkoutErrorMsg');
    const showError = (msg) => {
      if (!errorEl) return;
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    };

    if (errorEl) errorEl.style.display = 'none';

    if (cart.length === 0) {
      showError('Моля, добави поне един пакет в количката.');
      return;
    }

    const fullName = document.getElementById('checkoutName')?.value.trim() || '';
    const phone = document.getElementById('checkoutPhone')?.value.trim() || '';
    const city = document.getElementById('checkoutCity')?.value.trim() || '';
    const addressOrOffice = document.getElementById('checkoutAddress')?.value.trim() || '';
    const deliveryType = document.getElementById('deliveryTypeSelect')?.value || 'office';
    const consent = document.getElementById('checkoutLegalConsent')?.checked || false;

    if (fullName.length < 3) {
      showError('Моля, въведи Име и Фамилия.');
      return;
    }

    // Validate Bulgarian Phone (+359 or 08...)
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    const bgPhoneRegex = /^(\+359|00359|0)[89][0-9]{8}$/;
    if (!bgPhoneRegex.test(cleanPhone)) {
      showError('Моля, въведи валиден български мобилен телефон (напр. 0888 123 456).');
      return;
    }

    if (city.length < 2 || addressOrOffice.length < 3) {
      showError('Моля, попълни населено място и точен офис или адрес за доставка.');
      return;
    }

    if (!consent) {
      showError('Моля, отбележи съгласие с Общите условия и Политиката за поверителност.');
      return;
    }

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const orderId = 'GD-' + Math.floor(100000 + Math.random() * 900000);
    const createdAt = new Date().toISOString();

    // BigArena Fulfillment Standardized Order Payload
    const bigArenaPayload = {
      order_id: orderId,
      created_at: createdAt,
      fulfillment_center: 'BigArena_BG',
      payment_method: 'COD', // Наложен платеж
      cod_amount_eur: Number(totalAmount.toFixed(2)),
      shipping_cost_eur: 0.00,
      currency: 'EUR',
      customer: {
        full_name: fullName,
        phone: cleanPhone,
        country_code: 'BG',
        city: city,
        courier: selectedCourier,
        delivery_type: deliveryType, // 'office' or 'address'
        destination: addressOrOffice
      },
      line_items: cart.map(item => ({
        sku: item.sku,
        title: item.name,
        quantity: item.qty,
        unit_price_eur: item.price,
        sachets_count: item.sku === 'GD-BUNDLE-60' ? 60 * item.qty : 30 * item.qty,
        sachet_weight_g: 3.69
      }))
    };

    // Save locally for customer history & Portal inspection
    ordersHistory.unshift(bigArenaPayload);
    saveToStorage(CONFIG.STORAGE_KEYS.ORDERS, ordersHistory);

    // Optional Webhook Dispatch to BigArena if configured
    if (CONFIG.BIGARENA_WEBHOOK_URL) {
      try {
        await fetch(CONFIG.BIGARENA_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bigArenaPayload)
        });
      } catch {
        // Fallback: stored locally/logged if offline
      }
    }

    // Clear Cart & Show Success Modal
    cart = [];
    saveToStorage(CONFIG.STORAGE_KEYS.CART, cart);
    updateCartUI();
    toggleCartDrawer(false);
    e.target.reset();

    const orderNumEl = document.getElementById('successOrderNum');
    const orderDetailsEl = document.getElementById('successOrderDetails');
    if (orderNumEl) orderNumEl.textContent = `Поръчка № ${orderId}`;
    if (orderDetailsEl) {
      const courierBg = selectedCourier === 'Speedy' ? 'Спиди' : 'Еконт';
      orderDetailsEl.textContent = `Благодарим ти, ${fullName}! Пратката ти (${totalAmount.toFixed(2)} € с БЕЗПЛАТНА доставка чрез ${courierBg} до ${city}) се подготвя за изпращане.`;
    }

    document.getElementById('orderSuccessModal')?.classList.add('show');
  }

  function renderCustomerOrders() {
    const container = document.getElementById('customerOrdersContainer');
    if (!container) return;

    if (ordersHistory.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">Все още нямаш направени поръчки от това устройство.</p>`;
      return;
    }

    container.innerHTML = ordersHistory.map(ord => `
      <div style="background: var(--secondary-dark); border: 1px solid var(--border-solid); border-radius: 10px; padding: 14px; margin-bottom: 12px;">
        <div style="display:flex; justify-content:space-between; font-weight:700; color: var(--accent-gold-light); font-size:14px;">
          <span>№ ${escapeHtml(ord.order_id)}</span>
          <span>${ord.cod_amount_eur.toFixed(2)} € (Безплатна доставка)</span>
        </div>
        <div style="font-size:13px; color: var(--text-body); margin-top:6px;">
          ${ord.line_items.map(i => `${i.quantity}x${escapeHtml(i.title)}`).join(', ')}
        </div>
        <div style="font-size:12px; color: var(--text-muted); margin-top:6px;">
          Куриер: ${escapeHtml(ord.customer.courier)} • ${escapeHtml(ord.customer.city)}, ${escapeHtml(ord.customer.destination)}
        </div>
      </div>
    `).join('');
  }

  // --- LEGAL MODALS & COOKIES ---
  function openLegalModal(modalKey) {
    const doc = LEGAL_DOCS[modalKey];
    if (!doc) return;
    const titleEl = document.getElementById('legalModalTitle');
    const contentEl = document.getElementById('legalModalContent');
    const overlay = document.getElementById('legalModalOverlay');

    if (titleEl) titleEl.textContent = doc.title;
    if (contentEl) contentEl.innerHTML = doc.html;
    if (overlay) overlay.classList.add('show');
  }

  function initCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    const acceptBtn = document.getElementById('acceptCookiesBtn');
    if (!banner || !acceptBtn) return;

    const accepted = localStorage.getItem(CONFIG.STORAGE_KEYS.COOKIES_ACCEPTED);
    if (!accepted) {
      banner.style.display = 'flex';
    }

    acceptBtn.addEventListener('click', () => {
      localStorage.setItem(CONFIG.STORAGE_KEYS.COOKIES_ACCEPTED, 'true');
      banner.style.display = 'none';
    });
  }

  // --- SECRET COMMAND PORTAL ACCESS (PIN: 2738) ---
  function initSecretPortalAccess() {
    const devHeaderBtn = document.getElementById('devPortalHeaderBtn');
    const pinModal = document.getElementById('pinModalOverlay');
    const pinForm = document.getElementById('pinAccessForm');
    const pinInput = document.getElementById('portalPinInput');
    const pinError = document.getElementById('pinErrorMsg');
    const footerLogo = document.getElementById('footerLogoSecretTrigger');

    // Check URL parameter ?dev=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev') === 'true') {
      if (devHeaderBtn) devHeaderBtn.style.display = 'inline-flex';
    }

    // If already unlocked in current session, show header button
    if (sessionStorage.getItem(CONFIG.STORAGE_KEYS.DEV_UNLOCKED) === 'true') {
      if (devHeaderBtn) devHeaderBtn.style.display = 'inline-flex';
    }

    const openPinPrompt = () => {
      if (sessionStorage.getItem(CONFIG.STORAGE_KEYS.DEV_UNLOCKED) === 'true') {
        window.location.href = CONFIG.PORTAL_URL;
        return;
      }
      if (pinError) pinError.style.display = 'none';
      if (pinInput) pinInput.value = '';
      pinModal?.classList.add('show');
      setTimeout(() => pinInput?.focus(), 100);
    };

    if (devHeaderBtn) {
      devHeaderBtn.addEventListener('click', openPinPrompt);
    }

    // Desktop Shortcut: Ctrl + Shift + D
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd' || e.key === 'Д' || e.key === 'д')) {
        e.preventDefault();
        openPinPrompt();
      }
    });

    // Mobile Secret Trigger: 3 rapid taps on Footer Logo within 1.2 seconds
    let tapCount = 0;
    let tapTimer = null;
    if (footerLogo) {
      footerLogo.addEventListener('click', () => {
        tapCount += 1;
        clearTimeout(tapTimer);
        if (tapCount >= 3) {
          tapCount = 0;
          openPinPrompt();
        } else {
          tapTimer = setTimeout(() => { tapCount = 0; }, 1200);
        }
      });
    }

    // Verify PIN 2738
    if (pinForm) {
      pinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const entered = pinInput?.value.trim();
        if (entered === CONFIG.PORTAL_PIN) {
          sessionStorage.setItem(CONFIG.STORAGE_KEYS.DEV_UNLOCKED, 'true');
          window.location.href = CONFIG.PORTAL_URL;
        } else {
          if (pinError) pinError.style.display = 'block';
          if (pinInput) pinInput.value = '';
        }
      });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();