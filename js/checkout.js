/* Premium email checkout — no database, no WhatsApp. */
(async function () {
  await Store.ready;
  const data = Store.get();
  const branchId = Store.getSelectedBranch();
  const branch = data.branches.find(b => b.id === branchId) || data.branches[0] || null;
  const pickupEnabled = !(branch && branch.pickupEnabled === false);
  const deliveryEnabled = !(branch && branch.deliveryEnabled === false);
  const settings = data.settings;
  const deliveryZones = (branch && Array.isArray(branch.deliveryZones)) ? branch.deliveryZones : [];
  const cart = Store.getCart();

  if (!cart.length) { location.replace('cart.html'); return; }

  const splashLogo = settings.logo;
  if (splashLogo) { const img = document.getElementById('splashLogo'); img.src = splashLogo; img.style.display = 'block'; }
  applyDocDir(); applyPageColors('checkout');
  document.title = t('checkout'); renderHeader({showBack:true, backHref:'cart.html'}); renderFooter();
  document.getElementById('pageTitle').textContent = 'Checkout';
  document.getElementById('pickupLabel').textContent = 'Pickup';
  document.getElementById('deliveryLabel').textContent = 'Delivery';
  document.getElementById('infoTitle').textContent = 'Pickup Information';
  document.getElementById('nameLabel').innerHTML = 'Name <span class="req">*</span>';
  document.getElementById('phoneLabel').innerHTML = 'Phone <span class="req">*</span>';
  document.getElementById('locationLabel').innerHTML = 'Delivery Address <span class="req">*</span>';
  document.getElementById('zoneLabel').innerHTML = 'Delivery Zone <span class="req">*</span>';
  document.getElementById('notesLabel').textContent = 'Order Notes (Optional)';
  document.getElementById('summaryTitle').textContent = 'Order Summary';
  document.getElementById('totalLabel').textContent = 'Total';
  document.querySelector('#sendBtn span').textContent = 'Place Order';

  const pickupTab=document.getElementById('pickupTab'), deliveryTab=document.getElementById('deliveryTab');
  const locationGroup=document.getElementById('locationGroup'), zoneGroup=document.getElementById('zoneGroup');
  const zoneSelect=document.getElementById('custZone'), notice=document.getElementById('deliveryNotice');
  let orderType = pickupEnabled ? 'pickup' : 'delivery';

  if (!pickupEnabled) pickupTab.style.display='none';
  if (!deliveryEnabled) deliveryTab.style.display='none';
  if (!pickupEnabled && !deliveryEnabled) pickupTab.style.display='flex';
  if (!pickupEnabled && deliveryEnabled) notice.textContent='Delivery is currently the only available option.';
  else if (pickupEnabled && !deliveryEnabled) notice.textContent='Pickup is currently the only available option.';
  else notice.textContent = deliveryZones.length
    ? `Free delivery on orders of ${fmtMoney(Number(settings.freeDeliveryThreshold || 0))} or more.`
    : 'No delivery zones are configured for this branch.';

  zoneSelect.innerHTML = deliveryZones.length
    ? `<option value="">Select delivery zone</option>` + deliveryZones.map(z=>`<option value="${escapeHtml(z.id)}">${escapeHtml(tField(z.name))} — ${fmtMoney(Number(z.price)||0)}</option>`).join('')
    : '<option value="">No delivery zones available</option>'; 

  pickupTab.addEventListener('click',()=>setOrderType('pickup'));
  deliveryTab.addEventListener('click',()=>setOrderType('delivery'));
  setOrderType(orderType);
  zoneSelect.addEventListener('change',renderSummary);

  function setOrderType(type){
    if(type==='pickup'&&!pickupEnabled) type='delivery';
    if(type==='delivery'&&!deliveryEnabled) type='pickup';
    orderType=type;
    pickupTab.classList.toggle('active',type==='pickup'); deliveryTab.classList.toggle('active',type==='delivery');
    locationGroup.style.display=type==='delivery'?'block':'none'; zoneGroup.style.display=type==='delivery'&&deliveryEnabled?'block':'none';
    document.getElementById('custLocation').required=type==='delivery'; zoneSelect.required=type==='delivery' && deliveryZones.length>0;
    document.getElementById('infoTitle').textContent=type==='pickup'?'Pickup Information':'Delivery Information'; renderSummary();
  }
  function subtotal(){return cart.reduce((s,i)=>s+Number(i.unitPrice)*Number(i.qty),0);}
  function selectedZone(){return deliveryZones.find(z=>z.id===zoneSelect.value)||null;}
  function deliveryFee(){
    if(orderType!=='delivery'||!deliveryEnabled) return 0;
    if(subtotal()>=Number(settings.freeDeliveryThreshold||0) && Number(settings.freeDeliveryThreshold||0)>0) return 0;
    const z=selectedZone(); return z ? Number(z.price)||0 : 0;
  }
  function tax(){return subtotal()*((Number(settings.taxRate)||0)/100);}
  function total(){return subtotal()+deliveryFee()+tax();}
  function summarize(item){
    const parts=[]; (item.optionGroupsSnapshot||[]).forEach(g=>{const sel=item.selections[g.id]; if(!sel)return; const vals=Array.isArray(sel)?sel:[sel]; const names=vals.map(id=>{const o=(g.options||[]).find(x=>x.id===id);return o?tField(o.name):''}).filter(Boolean); if(names.length)parts.push(`${tField(g.name)}: ${names.join(', ')}`);}); if(item.notes)parts.push(`Notes: ${item.notes}`); return parts.join(' • ');
  }
  function renderSummary(){
    const box=document.getElementById('orderSummary'); const sub=subtotal(), fee=deliveryFee(), tx=tax();
    box.innerHTML=cart.map(i=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:.9rem"><div><strong>${i.qty}x ${escapeHtml(tField(i.productName))}</strong><div class="mini-note">${escapeHtml(summarize(i))}</div></div><span>${fmtMoney(i.unitPrice*i.qty)}</span></div>`).join('');
    box.insertAdjacentHTML('beforeend',`<div class="checkout-line"><span>Subtotal</span><span>${fmtMoney(sub)}</span></div>`);
    if(orderType==='delivery') box.insertAdjacentHTML('beforeend',`<div class="checkout-line"><span>Delivery</span><span>${fee?fmtMoney(fee):'Free'}</span></div>`);
    if(tx>0) box.insertAdjacentHTML('beforeend',`<div class="checkout-line"><span>Tax</span><span>${fmtMoney(tx)}</span></div>`);
    document.getElementById('totalValue').textContent=fmtMoney(total());
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  renderSummary();

  document.getElementById('checkoutForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const email=String(settings.restaurantEmail||'').trim();
    if(!email){toast('Restaurant email is not configured.');return;}
    const name=document.getElementById('custName').value.trim(), phone=document.getElementById('custPhone').value.trim(), address=document.getElementById('custLocation').value.trim(), notes=document.getElementById('custNotes').value.trim();
    const min=Number(settings.minimumOrder)||0;
    if(!name||!phone||(orderType==='delivery'&&(!address||!deliveryEnabled))){toast('Please complete the required fields.');return;}
    if(orderType==='delivery'&&subtotal()<min){toast(`Delivery minimum order is ${fmtMoney(min)}.`);return;}
    if(orderType==='delivery'&&!deliveryZones.length){toast('No delivery zones are configured for this branch.');return;}
    if(orderType==='delivery'&&deliveryZones.length&&!zoneSelect.value){toast('Please select a delivery zone.');return;}
    const fee=deliveryFee(), tx=tax(), grand=total(), zone=selectedZone();
    const lines=[`RESTAURANT ORDER`,`${tField(settings.restaurantName)}${branch?` — ${tField(branch.name)}`:''}`,``,`Order Type: ${orderType==='pickup'?'Pickup':'Delivery'}`,`Customer: ${name}`,`Phone: ${phone}`];
    if(orderType==='delivery'){lines.push(`Address: ${address}`);if(zone)lines.push(`Delivery Zone: ${tField(zone.name)}`)}
    if(notes)lines.push(`Notes: ${notes}`); lines.push('','ITEMS');
    cart.forEach(i=>{lines.push(`${i.qty}x ${tField(i.productName)} — ${fmtMoney(i.unitPrice*i.qty)}`);const s=summarize(i);if(s)lines.push(`  ${s}`)});
    lines.push('',`Subtotal: ${fmtMoney(subtotal())}`);if(orderType==='delivery')lines.push(`Delivery: ${fee?fmtMoney(fee):'Free'}`);if(tx>0)lines.push(`Tax: ${fmtMoney(tx)}`);lines.push(`TOTAL: ${fmtMoney(grand)}`);
    const btn=document.getElementById('sendBtn'); btn.disabled=true; btn.classList.add('loading');
    try{
      const escaped = lines.join('\n').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
      const res=await fetch('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:`New order from ${name}`,text:lines.join('\n'),html:escaped.replace(/\n/g,'<br>')})});
      if(!res.ok) { const err=await res.json().catch(()=>({})); throw new Error(err.error||'send failed'); }
      Store.saveCart([]); updateCartCount();
      document.querySelector('.page-content').innerHTML=`<div class="admin-card" style="text-align:center;padding:48px 24px"><div style="font-size:48px">✓</div><h1>Order Received</h1><p class="mini-note">Thank you, ${escapeHtml(name)}. Your order has been sent to the restaurant.</p><a class="btn-primary" href="/menu.html" style="display:inline-flex;text-decoration:none;margin-top:14px">Back to Menu</a></div>`;
    }catch(err){console.error(err);toast('We could not send the order. Please try again.');btn.disabled=false;btn.classList.remove('loading');}
  });
  renderIcons(); hideSplash();
})();
