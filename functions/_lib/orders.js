export const STATUSES = ['pending', 'preparing', 'delivered', 'cancelled'];

/* What a cashier may do. The admin may move an order to any status. */
export const CASHIER_TRANSITIONS = {
  pending: ['preparing', 'cancelled'],
  preparing: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

export function dayKey(ms, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  } catch (e) {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

/* Newest-first document ids: Firestore returns documents in id order, so an
   inverted timestamp makes "my latest orders" a plain equality query that
   needs no composite index. */
export function orderId(now = Date.now()) {
  return String(9999999999999 - now).padStart(13, '0') + Math.random().toString(36).slice(2, 6);
}

/* Point/gift-refund bookkeeping for a status change. Pure, so it is easy
   to test: returns the order fields to write and the user point deltas. */
export function statusEffects(order, to) {
  const from = order.status;
  const pe = Number(order.pointsEarned) || 0;
  const gp = Number(order.giftPoints) || 0;
  let pointsAwarded = !!order.pointsAwarded;
  let giftRefunded = !!order.giftRefunded;
  let points = 0, lifetime = 0, needPoints = 0;
  if (to === 'delivered' && !pointsAwarded && pe > 0) { points += pe; lifetime += pe; pointsAwarded = true; }
  if (from === 'delivered' && to !== 'delivered' && pointsAwarded) { points -= pe; lifetime -= pe; pointsAwarded = false; }
  if (to === 'cancelled' && gp > 0 && !giftRefunded) { points += gp; giftRefunded = true; }
  if (from === 'cancelled' && to !== 'cancelled' && giftRefunded) { points -= gp; needPoints = gp; giftRefunded = false; }
  return { pointsAwarded, giftRefunded, points, lifetime, needPoints };
}

const tf = (f, lang) => (f && typeof f === 'object') ? (f[lang] || f.ar || f.en || '') : (f || '');

export function statusMessage(order, status, restaurantName) {
  const lang = order.lang === 'en' ? 'en' : 'ar';
  const name = tf(restaurantName, lang);
  const n = order.number;
  const text = {
    ar: {
      preparing: 'تم قبول طلبك وهو الآن قيد التحضير.',
      delivered: Number(order.pointsEarned) > 0 ? `تم تسليم طلبك. أُضيفت ${order.pointsEarned} نقطة إلى حسابك.` : 'تم تسليم طلبك. بالهناء والعافية!',
      cancelled: Number(order.giftPoints) > 0 ? 'تم إلغاء طلبك وأُعيدت نقاط الهدايا إلى حسابك.' : 'تم إلغاء طلبك.'
    },
    en: {
      preparing: 'Your order was accepted and is being prepared.',
      delivered: Number(order.pointsEarned) > 0 ? `Your order was delivered. ${order.pointsEarned} points were added to your account.` : 'Your order was delivered. Enjoy!',
      cancelled: Number(order.giftPoints) > 0 ? 'Your order was cancelled and your gift points were returned.' : 'Your order was cancelled.'
    }
  }[lang][status];
  if (!text) return null;
  return { title: `${name} · #${n}`, body: text };
}
