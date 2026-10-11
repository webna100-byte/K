/* ===================== Receipt printing =====================
   Builds a self-contained receipt sized for 80mm / 58mm thermal printers
   (or A4) and prints it from a hidden iframe. Works with any printer the
   device can reach, including Bluetooth/USB thermal printers set up in the
   OS print dialog. */
function printReceipt(order, config) {
  if (!order) return;
  const s = config.settings || {};
  const opts = s.receipt || {};
  const lang = opts.lang === 'en' ? 'en' : 'ar';
  const width = opts.paperWidth === 'a4' ? null : (Number(opts.paperWidth) || 80);
  const tf = f => tField(f, lang);
  const L = lang === 'ar'
    ? { order: 'طلب', date: 'التاريخ', branch: 'الفرع', type: 'النوع', pickup: 'استلام', delivery: 'توصيل', customer: 'الزبون', phone: 'الجوال', address: 'العنوان', zone: 'المنطقة', notes: 'ملاحظات', subtotal: 'المجموع', inv: 'خصم الفاتورة', level: 'خصم المستوى', fee: 'التوصيل', feeDisc: 'خصم التوصيل', tax: 'الضريبة', total: 'الإجمالي', gift: 'هدية', free: 'مجاني', thanks: 'شكراً لطلبكم', pts: 'نقطة' }
    : { order: 'Order', date: 'Date', branch: 'Branch', type: 'Type', pickup: 'Pickup', delivery: 'Delivery', customer: 'Customer', phone: 'Phone', address: 'Address', zone: 'Zone', notes: 'Notes', subtotal: 'Subtotal', inv: 'Order discount', level: 'Level discount', fee: 'Delivery', feeDisc: 'Delivery discount', tax: 'Tax', total: 'TOTAL', gift: 'Gift', free: 'Free', thanks: 'Thank you for your order', pts: 'pts' };
  const dec = Pricing.currencyDecimals(order.currency || s.currency || 'USD');
  const cur = (CURRENCIES.find(c => c.code === (order.currency || s.currency)) || {});
  const money = n => `${Number(Pricing.round(n, dec)).toFixed(dec)} ${lang === 'ar' ? (cur.symbol || '') : (cur.symbolEn || '')}`;
  const esc = escapeHtml;
  const date = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: s.timezone || undefined }).format(new Date(order.createdAtMs));
  const row = (a, b, cls = '') => `<tr class="${cls}"><td>${a}</td><td class="r">${b}</td></tr>`;
  const items = (order.items || []).map(i => `<tr><td>${i.qty}× ${esc(tf(i.name))}${tf(i.options) || i.notes ? `<div class="sub">${esc([tf(i.options), i.notes].filter(Boolean).join(' • '))}</div>` : ''}</td><td class="r">${money(i.lineTotal)}</td></tr>`).join('')
    + (order.gifts || []).map(g => `<tr><td>${g.qty}× ${esc(tf(g.name))}<div class="sub">${L.gift} · ${g.points} ${L.pts}</div></td><td class="r">${L.free}</td></tr>`).join('');
  const html = `<!DOCTYPE html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>#${order.number}</title><style>
    @page { size: ${width ? width + 'mm auto' : 'A4'}; margin: ${width ? '2mm' : '12mm'}; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Tahoma, Arial, sans-serif; color: #000; font-size: ${width === 58 ? 11 : 12.5}px; width: ${width ? (width - 4) + 'mm' : 'auto'}; }
    h1 { font-size: 1.35em; text-align: center; margin: 2px 0; }
    .c { text-align: center; } .num { font-size: 1.9em; font-weight: 700; text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; } td { padding: 2px 0; vertical-align: top; } .r { text-align: end; white-space: nowrap; padding-inline-start: 6px; }
    .sub { font-size: .85em; color: #333; } hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
    .total td { font-weight: 700; font-size: 1.2em; padding-top: 4px; } .notes { border: 1px solid #000; padding: 4px; margin: 4px 0; font-weight: 700; }
    .big { font-weight: 700; }
  </style></head><body>
    ${s.logo ? `<div class="c"><img src="${esc(s.logo)}" style="max-height:48px;max-width:60%;filter:grayscale(1)"></div>` : ''}
    <h1>${esc(tf(s.restaurantName))}</h1>
    <div class="c">${esc(tf(order.branchName))}</div>
    <div class="num">${L.order} #${order.number}</div>
    <div class="c big">${order.type === 'delivery' ? L.delivery : L.pickup}</div>
    <div class="c">${esc(date)}</div>
    <hr>
    <table>
      ${row(L.customer, esc(order.customer?.name || ''))}
      ${row(L.phone, `<span dir="ltr">${esc(order.customer?.phone || '')}</span>`)}
      ${order.zone ? row(L.zone, esc(tf(order.zone.name))) : ''}
    </table>
    ${order.address ? `<div><b>${L.address}:</b> ${esc(order.address)}</div>` : ''}
    ${order.notes ? `<div class="notes">${L.notes}: ${esc(order.notes)}</div>` : ''}
    <hr><table>${items}</table><hr>
    <table>
      ${row(L.subtotal, money(order.subtotal))}
      ${order.invoiceDiscount ? row(L.inv, '−' + money(order.invoiceDiscount)) : ''}
      ${order.levelDiscount ? row(L.level, '−' + money(order.levelDiscount)) : ''}
      ${order.type === 'delivery' ? row(L.fee, money(order.deliveryFee || 0)) : ''}
      ${order.deliveryDiscount ? row(L.feeDisc, '−' + money(order.deliveryDiscount)) : ''}
      ${order.tax ? row(L.tax, money(order.tax)) : ''}
      ${row(L.total, money(order.total), 'total')}
    </table>
    <hr><div class="c">${L.thanks}</div>
  </body></html>`;
  let frame = document.getElementById('printFrame');
  if (frame) frame.remove();
  frame = document.createElement('iframe');
  frame.id = 'printFrame';
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  let printed = false;
  const go = () => { if (printed) return; printed = true; frame.contentWindow.focus(); frame.contentWindow.print(); };
  const img = doc.querySelector('img');
  if (img && !img.complete) { img.onload = go; img.onerror = go; setTimeout(go, 1500); } else setTimeout(go, 150);
}
