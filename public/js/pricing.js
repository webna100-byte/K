/* ===================== Pricing (shared) =====================
   One source of truth for every price on the site. The browser uses it to
   show the cart/checkout totals, and the Cloudflare order function imports
   the very same file to recompute everything server-side, so nothing a
   visitor changes in their browser can alter what they actually pay or
   how many points they spend/earn.
=============================================================== */
(function (root) {
  const THREE_DECIMALS = ['KWD', 'BHD', 'OMR', 'JOD', 'TND', 'LYD', 'IQD'];
  const ZERO_DECIMALS = ['JPY'];

  function currencyDecimals(code) {
    if (THREE_DECIMALS.includes(code)) return 3;
    if (ZERO_DECIMALS.includes(code)) return 0;
    return 2;
  }

  function round(n, dec) {
    const f = Math.pow(10, dec);
    return Math.round((Number(n) || 0) * f + Number.EPSILON) / f;
  }

  function pricingGroup(product) {
    return (product.optionGroups || []).find(g => g.type === 'single_price' && g.options && g.options.length);
  }

  function rawBasePrice(product) {
    const pg = pricingGroup(product);
    if (pg) return Number(pg.options[0].priceDelta) || 0;
    return Number(product.price) || 0;
  }

  function discounted(price, product, dec) {
    const pct = Number(product.discountPercent) || 0;
    return pct > 0 ? round(price * (1 - pct / 100), dec) : price;
  }

  function productBasePrice(product, dec = 2) {
    return discounted(rawBasePrice(product), product, dec);
  }

  function availableForBranch(item, branchId) {
    return !item.branchIds || !item.branchIds.length || item.branchIds.includes(branchId);
  }

  function err(code, extra) { const e = new Error(code); e.code = code; Object.assign(e, extra || {}); return e; }

  /* Validates the chosen options against the product's current definition
     and returns the unit price plus a normalized copy of the selections. */
  function unitPrice(product, selections, dec) {
    selections = selections && typeof selections === 'object' ? selections : {};
    const pg = pricingGroup(product);
    const normalized = {};
    let total;
    if (pg) {
      const opt = pg.options.find(o => o.id === selections[pg.id]) || pg.options[0];
      normalized[pg.id] = opt.id;
      total = discounted(Number(opt.priceDelta) || 0, product, dec);
    } else {
      total = productBasePrice(product, dec);
    }
    (product.optionGroups || []).forEach(g => {
      if (g === pg) return;
      const sel = selections[g.id];
      const opts = g.options || [];
      if (g.type === 'single_price' || g.type === 'single_flat') {
        if (!opts.length) return;
        const opt = opts.find(o => o.id === sel) || opts[0];
        normalized[g.id] = opt.id;
        if (g.type === 'single_price') total += Number(opt.priceDelta) || 0;
      } else {
        const ids = Array.isArray(sel) ? sel : [];
        const valid = opts.filter(o => ids.includes(o.id));
        if (valid.length !== new Set(ids).size) throw err('invalid_option', { productId: product.id });
        normalized[g.id] = valid.map(o => o.id);
        if (g.type === 'multi_priced') valid.forEach(o => { total += Number(o.priceDelta) || 0; });
      }
    });
    return { price: round(total, dec), selections: normalized };
  }

  function optionSummary(product, selections, lang) {
    const tf = f => (f && typeof f === 'object') ? (f[lang] || f.en || f.ar || '') : (f || '');
    const parts = [];
    (product.optionGroups || []).forEach(g => {
      const sel = selections[g.id];
      if (sel == null) return;
      const ids = Array.isArray(sel) ? sel : [sel];
      const names = ids.map(id => (g.options || []).find(o => o.id === id)).filter(Boolean).map(o => tf(o.name));
      if (names.length) parts.push(`${tf(g.name)}: ${names.join('، ')}`);
    });
    return parts.join(' • ');
  }

  function matchRule(rules, subtotal) {
    return (rules || [])
      .filter(r => subtotal >= (Number(r.min) || 0) && (r.max === null || r.max === undefined || r.max === '' || subtotal <= Number(r.max)))
      .sort((a, b) => (Number(b.min) || 0) - (Number(a.min) || 0))[0] || null;
  }

  function sortedLevels(loyalty) {
    return [...((loyalty && loyalty.levels) || [])].sort((a, b) => (Number(a.points) || 0) - (Number(b.points) || 0));
  }

  /* Highest level whose threshold the customer's lifetime points reached. */
  function levelFor(loyalty, lifetimePoints) {
    if (!loyalty || loyalty.enabled === false) return null;
    let current = null;
    sortedLevels(loyalty).forEach(l => { if ((Number(lifetimePoints) || 0) >= (Number(l.points) || 0)) current = l; });
    return current;
  }

  function findGift(loyalty, giftId) {
    for (const tier of (loyalty && loyalty.tiers) || []) {
      const gift = (tier.gifts || []).find(g => g.id === giftId);
      if (gift) return { gift, tier };
    }
    return null;
  }

  /* input: { branchId, type: 'pickup'|'delivery', zoneId, items: [{productId, qty, selections, notes}], gifts: [{giftId, qty}] }
     customer: { lifetimePoints }
     Throws Error with .code on anything invalid. */
  function computeOrder(config, input, customer) {
    const settings = config.settings || {};
    const dec = currencyDecimals(settings.currency || 'USD');
    const loyalty = config.loyalty || {};
    const loyaltyOn = loyalty.enabled !== false;
    const branch = (config.branches || []).find(b => b.id === input.branchId);
    if (!branch) throw err('invalid_branch');
    const type = input.type === 'delivery' ? 'delivery' : 'pickup';
    if (type === 'pickup' && branch.pickupEnabled === false) throw err('pickup_disabled');
    if (type === 'delivery' && branch.deliveryEnabled === false) throw err('delivery_disabled');

    const items = Array.isArray(input.items) ? input.items : [];
    const gifts = Array.isArray(input.gifts) ? input.gifts : [];
    if (!items.length && !gifts.length) throw err('empty_cart');
    if (items.length > 100 || gifts.length > 30) throw err('too_many_items');

    const lines = items.map(it => {
      const qty = Math.floor(Number(it.qty));
      if (!(qty >= 1 && qty <= 99)) throw err('qty_invalid');
      const product = (config.products || []).find(p => p.id === it.productId);
      if (!product || !availableForBranch(product, branch.id)) throw err('product_unavailable', { productId: it.productId });
      const category = (config.categories || []).find(c => c.id === product.categoryId);
      if (category && !availableForBranch(category, branch.id)) throw err('product_unavailable', { productId: it.productId });
      const { price, selections } = unitPrice(product, it.selections, dec);
      return {
        productId: product.id,
        name: product.name,
        image: product.image || '',
        qty,
        selections,
        options: { ar: optionSummary(product, selections, 'ar'), en: optionSummary(product, selections, 'en') },
        notes: String(it.notes || '').slice(0, 300),
        unitPrice: price,
        lineTotal: round(price * qty, dec)
      };
    });

    let giftPoints = 0;
    const giftLines = gifts.map(g => {
      if (!loyaltyOn) throw err('loyalty_disabled');
      const qty = Math.floor(Number(g.qty));
      if (!(qty >= 1 && qty <= 20)) throw err('qty_invalid');
      const found = findGift(loyalty, g.giftId);
      if (!found) throw err('invalid_gift', { giftId: g.giftId });
      const points = (Number(found.tier.points) || 0) * qty;
      giftPoints += points;
      return { giftId: found.gift.id, tierId: found.tier.id, name: found.gift.name, image: found.gift.image || '', qty, points };
    });

    const subtotal = round(lines.reduce((s, l) => s + l.lineTotal, 0), dec);

    const invRule = matchRule((config.discounts || {}).invoice, subtotal);
    let invoiceDiscount = 0;
    if (invRule && subtotal > 0) {
      invoiceDiscount = invRule.type === 'fixed' ? Math.min(subtotal, Number(invRule.value) || 0) : subtotal * (Number(invRule.value) || 0) / 100;
      invoiceDiscount = round(Math.min(invoiceDiscount, subtotal), dec);
    }

    const level = levelFor(loyalty, customer && customer.lifetimePoints);
    const afterInvoice = subtotal - invoiceDiscount;
    const levelDiscount = level ? round(afterInvoice * (Number(level.discountPercent) || 0) / 100, dec) : 0;
    const net = round(Math.max(0, afterInvoice - levelDiscount), dec);

    let zone = null, deliveryFee = 0, deliveryDiscount = 0;
    if (type === 'delivery') {
      const zones = Array.isArray(branch.deliveryZones) ? branch.deliveryZones : [];
      if (!zones.length) throw err('no_zones');
      zone = zones.find(z => z.id === input.zoneId);
      if (!zone) throw err('zone_required');
      const min = Number(settings.minimumOrder) || 0;
      if (subtotal < min) throw err('below_minimum', { minimum: min });
      deliveryFee = round(Number(zone.price) || 0, dec);
      const delRule = matchRule((config.discounts || {}).delivery, subtotal);
      if (delRule && deliveryFee > 0) {
        if (delRule.type === 'free') deliveryDiscount = deliveryFee;
        else if (delRule.type === 'fixed') deliveryDiscount = Math.min(deliveryFee, Number(delRule.value) || 0);
        else deliveryDiscount = deliveryFee * (Number(delRule.value) || 0) / 100;
        deliveryDiscount = round(Math.min(deliveryDiscount, deliveryFee), dec);
      }
    }

    const tax = round(net * (Number(settings.taxRate) || 0) / 100, dec);
    const total = round(net + (deliveryFee - deliveryDiscount) + tax, dec);
    const perPoint = Number(loyalty.amountPerPoint) || 0;
    const pointsEarned = loyaltyOn && perPoint > 0 ? Math.floor(net / perPoint + 1e-9) : 0;

    return {
      branch: { id: branch.id, name: branch.name },
      type,
      zone: zone ? { id: zone.id, name: zone.name } : null,
      lines,
      gifts: giftLines,
      giftPoints,
      subtotal,
      invoiceDiscount,
      invoiceRule: invRule ? { type: invRule.type, value: Number(invRule.value) || 0 } : null,
      level: level ? { id: level.id, name: level.name, discountPercent: Number(level.discountPercent) || 0 } : null,
      levelDiscount,
      net,
      deliveryFee,
      deliveryDiscount,
      tax,
      total,
      pointsEarned,
      currency: settings.currency || 'USD',
      decimals: dec
    };
  }

  root.Pricing = { currencyDecimals, round, pricingGroup, rawBasePrice, productBasePrice, availableForBranch, unitPrice, optionSummary, matchRule, sortedLevels, levelFor, findGift, computeOrder };
})(typeof globalThis !== 'undefined' ? globalThis : this);
