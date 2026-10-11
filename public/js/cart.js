/* ===================== Cart ===================== */
boot('cart', async (data) => {
  Store.ensureBranch();
  const dec = decimals();
  document.getElementById('pageTitle').textContent = t('cart');
  document.getElementById('totalLabel').textContent = t('subtotal');
  document.getElementById('checkoutBtn').textContent = t('checkout');

  /* Cart lines only store ids; names and prices always come from the
     current menu, so an admin price change shows up immediately. */
  function resolve(item) {
    const product = data.products.find(p => p.id === item.productId);
    if (!product || !Pricing.availableForBranch(product, Store.getSelectedBranch())) return null;
    try {
      const { price, selections } = Pricing.unitPrice(product, item.selections, dec);
      return { product, price, options: Pricing.optionSummary(product, selections, getLang()) };
    } catch (e) { return null; }
  }

  function render() {
    let cart = Store.getCart();
    const valid = cart.filter(i => resolve(i));
    if (valid.length !== cart.length) { Store.saveCart(valid); cart = valid; updateCartCount(); }
    const gifts = Store.getGiftCart();
    const list = document.getElementById('cartList');
    const giftList = document.getElementById('giftList');
    const summary = document.getElementById('cartSummary');

    if (!cart.length && !gifts.length) {
      list.innerHTML = `<div class="empty-state"><i data-lucide="shopping-bag"></i><p>${t('empty_cart')}</p><a href="/menu" class="btn-primary btn-inline">${t('go_to_menu')}</a></div>`;
      giftList.innerHTML = '';
      summary.classList.add('hidden');
      renderIcons();
      return;
    }

    list.innerHTML = cart.map(item => {
      const r = resolve(item);
      return `
      <div class="cart-item" data-id="${item.cartItemId}">
        <img src="${escapeHtml(r.product.image || PLACEHOLDER_IMG)}" alt="">
        <div class="cart-item-info">
          <h3>${tx(r.product.name)}</h3>
          ${r.options || item.notes ? `<div class="opts">${escapeHtml([r.options, item.notes ? `${t('notes')}: ${item.notes}` : ''].filter(Boolean).join(' • '))}</div>` : ''}
          <div class="cart-item-footer">
            <div class="qty-control"><button class="qty-minus" aria-label="-">−</button><span>${item.qty}</span><button class="qty-plus" aria-label="+">+</button></div>
            <span class="cart-item-price">${fmtMoney(r.price * item.qty)}</span>
          </div>
        </div>
        <button class="remove-x" aria-label="${t('remove')}"><i data-lucide="x"></i></button>
      </div>`;
    }).join('');

    giftList.innerHTML = gifts.length ? `<h2 class="section-sub">${t('gifts_in_cart')}</h2>` + gifts.map(g => {
      const found = Pricing.findGift(data.loyalty, g.giftId);
      if (!found) return '';
      return `
      <div class="cart-item gift-item" data-gift="${escapeHtml(g.giftId)}">
        <img src="${escapeHtml(found.gift.image || PLACEHOLDER_IMG)}" alt="">
        <div class="cart-item-info">
          <h3>${tx(found.gift.name)}</h3>
          <div class="opts"><i data-lucide="gift"></i> ${t('gift_only_note')} · ${fmtNumber(found.tier.points * g.qty)} ${t('pts')}</div>
          <div class="cart-item-footer"><span class="mini-note">× ${g.qty}</span><span class="cart-item-price">${t('free')}</span></div>
        </div>
        <button class="remove-x" aria-label="${t('remove')}"><i data-lucide="x"></i></button>
      </div>`;
    }).join('') + `<p class="mini-note">${t('reserved_note')}</p>` : '';

    const subtotal = cart.reduce((s, i) => s + resolve(i).price * i.qty, 0);
    document.getElementById('totalValue').textContent = fmtMoney(subtotal);
    summary.classList.remove('hidden');

    list.querySelectorAll('.cart-item').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('.remove-x').addEventListener('click', () => { Store.saveCart(Store.getCart().filter(i => i.cartItemId !== id)); updateCartCount(); render(); });
      row.querySelector('.qty-minus').addEventListener('click', () => changeQty(id, -1));
      row.querySelector('.qty-plus').addEventListener('click', () => changeQty(id, 1));
    });
    giftList.querySelectorAll('.gift-item').forEach(row => row.querySelector('.remove-x').addEventListener('click', () => {
      Store.saveGiftCart(Store.getGiftCart().filter(g => g.giftId !== row.dataset.gift));
      updateCartCount(); render();
    }));
    renderIcons();
  }

  function changeQty(id, delta) {
    const cart = Store.getCart();
    const item = cart.find(i => i.cartItemId === id);
    if (!item) return;
    item.qty = Math.min(99, item.qty + delta);
    Store.saveCart(item.qty <= 0 ? cart.filter(i => i.cartItemId !== id) : cart);
    updateCartCount();
    render();
  }

  document.getElementById('checkoutBtn').addEventListener('click', async () => {
    if (Store.isMultiBranch() && !Store.getSelectedBranch()) { location.href = '/branches'; return; }
    const user = await Auth.ready;
    if (!user) { toast(t('login_required_to_order')); setTimeout(() => { location.href = loginUrl('/checkout'); }, 700); return; }
    location.href = '/checkout';
  });

  render();
}, { colors: 'menu' });
