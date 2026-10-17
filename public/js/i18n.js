/* ===================== i18n (Arabic default + English) =====================
   Interface strings live here. Restaurant content (names, descriptions,
   page texts...) is stored as { ar, en } objects in the config and read
   with tField(). Admin pages set window.FORCE_LANG from their own toggle. */
const I18N = {
  ar: {
    nav_levels: 'المستويات', nav_gifts: 'الهدايا', nav_home: 'الرئيسية', nav_notifications: 'الإشعارات', nav_orders: 'طلباتي',
    menu: 'القائمة', menu_login: 'تسجيل الدخول', menu_logout: 'تسجيل الخروج', menu_privacy: 'سياسة الخصوصية', menu_returns: 'سياسة الإرجاع والاستبدال',
    lang_switch: 'EN', lang_switch_full: 'English',
    cart: 'السلة', back: 'رجوع', close: 'إغلاق', add_to_cart: 'أضف إلى السلة', item_added: 'تمت الإضافة إلى السلة',
    empty_cart: 'سلتك فارغة', go_to_menu: 'تصفّح القائمة', total: 'الإجمالي', checkout: 'إتمام الطلب', remove: 'حذف',
    notes: 'ملاحظات', notes_ph: 'ملاحظات اختيارية', no_products: 'لا توجد منتجات', branches_title: 'اختر الفرع',
    pickup: 'استلام', delivery: 'توصيل', name: 'الاسم', phone: 'رقم الجوال', address: 'عنوان التوصيل', zone: 'منطقة التوصيل',
    select_zone: 'اختر منطقة التوصيل', order_notes: 'ملاحظات الطلب (اختياري)', place_order: 'إرسال الطلب',
    subtotal: 'المجموع', invoice_discount: 'خصم الفاتورة', level_discount: 'خصم {level}', delivery_fee: 'التوصيل',
    delivery_discount: 'خصم التوصيل', free: 'مجاني', tax: 'الضريبة', points_to_earn: 'ستكسب {n} نقطة عند تسليم الطلب',
    gift: 'هدية', gifts_in_cart: 'هداياك', points: 'نقاطك', pts: 'نقطة', order_summary: 'ملخص الطلب',
    pickup_info: 'بيانات الاستلام', delivery_info: 'بيانات التوصيل', only_pickup: 'الاستلام من الفرع هو الخيار المتاح حالياً.',
    only_delivery: 'التوصيل هو الخيار المتاح حالياً.', no_zones: 'لا توجد مناطق توصيل لهذا الفرع.',
    minimum_order: 'الحد الأدنى لطلب التوصيل {amount}', required: 'يرجى تعبئة الحقول المطلوبة.', phone_invalid: 'رقم الجوال غير صحيح.',
    order_failed: 'تعذّر إرسال الطلب، حاول مرة أخرى.', order_sent_title: 'تم استلام طلبك', order_sent_text: 'رقم طلبك #{n}. يمكنك متابعة حالته من صفحة طلباتي.',
    view_my_orders: 'متابعة طلباتي', login_required_to_order: 'سجّل الدخول لإتمام طلبك', sign_in_failed: 'تعذّر تسجيل الدخول، حاول مرة أخرى.',
    logout_confirm: 'هل تريد تسجيل الخروج؟ ستُزال الهدايا من سلتك.', logged_out: 'تم تسجيل الخروج', logged_in: 'تم تسجيل الدخول',
    hello: 'أهلاً {name}', available_points: 'رصيدك المتاح', lifetime_points: 'مجموع نقاطك', current_level: 'مستواك',
    no_level_yet: 'لم تصل لأي مستوى بعد', next_level: 'تبقّى {n} نقطة للوصول إلى {level}', max_level: 'وصلت لأعلى مستوى',
    level_achieved: 'محقّق', level_current: 'مستواك الحالي', level_locked: 'مقفل', points_needed: 'تبقّى {n} نقطة',
    permanent_discount: 'خصم دائم {p}%', requires_points: '{n} نقطة', tier_title: 'هدايا {n} نقطة', add_gift: 'استبدال',
    gift_added: 'أُضيفت الهدية إلى سلتك', need_more_points: 'تحتاج {n} نقطة إضافية', in_cart: 'في السلة',
    reserved_note: 'نقاط الهدايا محجوزة لهذه الجلسة وتُخصم نهائياً عند إرسال الطلب.', insufficient_points: 'رصيد نقاطك لا يكفي لهذه الهدايا.',
    view_gifts: 'الهدايا', view_levels: 'المستويات', points_unit: 'نقطة',
    status_pending: 'قيد الانتظار', status_preparing: 'قيد التحضير', status_delivered: 'تم التسليم', status_cancelled: 'ملغي',
    order_number: 'طلب #{n}', points_pending: '+{n} نقطة عند التسليم', points_done: '+{n} نقطة أُضيفت لحسابك',
    gift_points_used: '−{n} نقطة للهدايا', gift_points_refunded: 'أُعيدت {n} نقطة إلى حسابك',
    enable_push: 'تفعيل الإشعارات', push_enabled: 'الإشعارات مفعّلة على هذا الجهاز', push_blocked: 'الإشعارات محظورة من إعدادات المتصفح.',
    push_unsupported: 'هذا المتصفح لا يدعم الإشعارات.', push_ios_title: 'لتلقّي الإشعارات على iPhone',
    push_ios_steps: 'اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»، وافتح الموقع من الأيقونة الجديدة ثم فعّل الإشعارات.',
    push_failed: 'تعذّر تفعيل الإشعارات.', loading: 'جارٍ التحميل…', retry: 'إعادة المحاولة', load_error: 'تعذّر تحميل بيانات المطعم. تحقّق من اتصالك بالإنترنت.',
    site_setup: 'الموقع قيد الإعداد', all_rights: 'جميع الحقوق محفوظة', items_count: '{n} صنف', branch: 'الفرع',
    product_unavailable: 'أحد المنتجات لم يعد متاحاً، حدّث سلتك.', invalid_option: 'خيارات أحد المنتجات تغيّرت، أعد إضافته.',
    zone_required: 'يرجى اختيار منطقة التوصيل.', below_minimum: 'الحد الأدنى لطلب التوصيل {amount}.', empty_cart_err: 'سلتك فارغة.',
    invalid_gift: 'إحدى الهدايا لم تعد متاحة.', address_required: 'يرجى إدخال عنوان التوصيل.', name_required: 'يرجى إدخال الاسم.',
    gift_only_note: 'هدية مجانية', open: 'عرض', change_branch: 'تغيير الفرع', see_all: 'عرض الكل', minutes_ago: 'منذ {n} د', hours_ago: 'منذ {n} س', just_now: 'الآن',
    track_order: 'حالة الطلب', order_type: 'نوع الطلب', type_pickup: 'استلام من الفرع', type_delivery: 'توصيل',
    /* cashier */
    cashier_panel: 'لوحة الكاشير', cashier_login: 'دخول الكاشير', username: 'اسم المستخدم', password: 'كلمة المرور', login: 'دخول',
    invalid_login: 'بيانات الدخول غير صحيحة', too_many_attempts: 'محاولات كثيرة، انتظر قليلاً ثم حاول.', start_shift: 'ابدأ استقبال الطلبات',
    start_shift_note: 'اضغط للبدء حتى يعمل التنبيه الصوتي للطلبات الجديدة.', tab_new: 'جديدة', tab_preparing: 'قيد التحضير',
    tab_done: 'تم التسليم اليوم', tab_cancelled: 'ملغاة اليوم', accept: 'قبول', reject: 'رفض', mark_delivered: 'تم التسليم', cancel_order: 'إلغاء',
    print: 'طباعة', confirm_reject: 'رفض هذا الطلب؟', confirm_cancel: 'إلغاء هذا الطلب؟', no_orders_here: 'لا توجد طلبات هنا',
    connection_lost: 'انقطع الاتصال… جارٍ إعادة المحاولة', logout: 'خروج', customer: 'الزبون', items: 'الأصناف', gifts_label: 'الهدايا',
    new_order_alert: 'طلب جديد!', status_updated: 'تم تحديث الحالة', action_failed: 'تعذّر تنفيذ العملية', customer_points_spent: 'لا يمكن إعادة فتح الطلب: الزبون صرف نقاط الهدايا.',
    receipt_order: 'طلب', receipt_date: 'التاريخ', receipt_thanks: 'شكراً لطلبكم', account_disabled: 'تم إيقاف هذا الحساب',
    restaurant_busy: 'المطعم مشغول حالياً، لا يمكن استقبال طلباتكم الآن.', busy: 'مشغول', busy_on: 'وضع مشغول مفعّل: الموقع لا يستقبل طلبات جديدة', busy_on_toast: 'تم إيقاف استقبال الطلبات', busy_off_toast: 'عاد استقبال الطلبات'
  },
  en: {
    nav_levels: 'Levels', nav_gifts: 'Gifts', nav_home: 'Home', nav_notifications: 'Alerts', nav_orders: 'My Orders',
    menu: 'Menu', menu_login: 'Sign in', menu_logout: 'Sign out', menu_privacy: 'Privacy Policy', menu_returns: 'Return & Exchange Policy',
    lang_switch: 'ع', lang_switch_full: 'العربية',
    cart: 'Cart', back: 'Back', close: 'Close', add_to_cart: 'Add to Cart', item_added: 'Added to cart',
    empty_cart: 'Your cart is empty', go_to_menu: 'Browse the menu', total: 'Total', checkout: 'Checkout', remove: 'Remove',
    notes: 'Notes', notes_ph: 'Optional notes', no_products: 'No products', branches_title: 'Choose a branch',
    pickup: 'Pickup', delivery: 'Delivery', name: 'Name', phone: 'Mobile number', address: 'Delivery address', zone: 'Delivery zone',
    select_zone: 'Select delivery zone', order_notes: 'Order notes (optional)', place_order: 'Place Order',
    subtotal: 'Subtotal', invoice_discount: 'Order discount', level_discount: '{level} discount', delivery_fee: 'Delivery',
    delivery_discount: 'Delivery discount', free: 'Free', tax: 'Tax', points_to_earn: 'You will earn {n} points when this order is delivered',
    gift: 'Gift', gifts_in_cart: 'Your gifts', points: 'Your points', pts: 'pts', order_summary: 'Order Summary',
    pickup_info: 'Pickup details', delivery_info: 'Delivery details', only_pickup: 'Pickup is currently the only available option.',
    only_delivery: 'Delivery is currently the only available option.', no_zones: 'No delivery zones are set for this branch.',
    minimum_order: 'Minimum delivery order is {amount}', required: 'Please complete the required fields.', phone_invalid: 'Please enter a valid mobile number.',
    order_failed: 'We could not send your order. Please try again.', order_sent_title: 'Order received', order_sent_text: 'Your order number is #{n}. You can track it from My Orders.',
    view_my_orders: 'Track my orders', login_required_to_order: 'Sign in to complete your order', sign_in_failed: 'Sign-in failed. Please try again.',
    logout_confirm: 'Sign out? Gifts will be removed from your cart.', logged_out: 'Signed out', logged_in: 'Signed in',
    hello: 'Hi {name}', available_points: 'Available points', lifetime_points: 'Lifetime points', current_level: 'Your level',
    no_level_yet: 'No level reached yet', next_level: '{n} points to reach {level}', max_level: 'You reached the top level',
    level_achieved: 'Achieved', level_current: 'Your current level', level_locked: 'Locked', points_needed: '{n} points to go',
    permanent_discount: '{p}% permanent discount', requires_points: '{n} points', tier_title: '{n}-point gifts', add_gift: 'Redeem',
    gift_added: 'Gift added to your cart', need_more_points: 'You need {n} more points', in_cart: 'In cart',
    reserved_note: 'Gift points are held for this session and only deducted when you place the order.', insufficient_points: 'You do not have enough points for these gifts.',
    view_gifts: 'Gifts', view_levels: 'Levels', points_unit: 'points',
    status_pending: 'Pending', status_preparing: 'Preparing', status_delivered: 'Delivered', status_cancelled: 'Cancelled',
    order_number: 'Order #{n}', points_pending: '+{n} pts on delivery', points_done: '+{n} pts added to your account',
    gift_points_used: '−{n} pts for gifts', gift_points_refunded: '{n} pts returned to your account',
    enable_push: 'Enable notifications', push_enabled: 'Notifications are on for this device', push_blocked: 'Notifications are blocked in your browser settings.',
    push_unsupported: 'This browser does not support notifications.', push_ios_title: 'To get notifications on iPhone',
    push_ios_steps: 'Tap Share, then “Add to Home Screen”. Open the site from the new icon and enable notifications.',
    push_failed: 'Could not enable notifications.', loading: 'Loading…', retry: 'Try again', load_error: 'Could not load the restaurant. Check your internet connection.',
    site_setup: 'This site is being set up', all_rights: 'All rights reserved', items_count: '{n} items', branch: 'Branch',
    product_unavailable: 'An item is no longer available. Please update your cart.', invalid_option: 'An item’s options changed. Please add it again.',
    zone_required: 'Please select a delivery zone.', below_minimum: 'Minimum delivery order is {amount}.', empty_cart_err: 'Your cart is empty.',
    invalid_gift: 'A gift is no longer available.', address_required: 'Please enter your delivery address.', name_required: 'Please enter your name.',
    gift_only_note: 'Free gift', open: 'Open', change_branch: 'Change branch', see_all: 'See all', minutes_ago: '{n}m ago', hours_ago: '{n}h ago', just_now: 'just now',
    track_order: 'Order status', order_type: 'Order type', type_pickup: 'Pickup', type_delivery: 'Delivery',
    cashier_panel: 'Cashier', cashier_login: 'Cashier sign in', username: 'Username', password: 'Password', login: 'Sign in',
    invalid_login: 'Invalid username or password', too_many_attempts: 'Too many attempts. Please wait and try again.', start_shift: 'Start receiving orders',
    start_shift_note: 'Tap to start so the new-order alarm can play.', tab_new: 'New', tab_preparing: 'Preparing',
    tab_done: 'Delivered today', tab_cancelled: 'Cancelled today', accept: 'Accept', reject: 'Reject', mark_delivered: 'Delivered', cancel_order: 'Cancel',
    print: 'Print', confirm_reject: 'Reject this order?', confirm_cancel: 'Cancel this order?', no_orders_here: 'No orders here',
    connection_lost: 'Connection lost… retrying', logout: 'Sign out', customer: 'Customer', items: 'Items', gifts_label: 'Gifts',
    new_order_alert: 'New order!', status_updated: 'Status updated', action_failed: 'Action failed', customer_points_spent: 'Cannot reopen: the customer already spent the gift points.',
    receipt_order: 'Order', receipt_date: 'Date', receipt_thanks: 'Thank you for your order', account_disabled: 'This account is disabled',
    restaurant_busy: 'The restaurant is busy right now and cannot accept your order.', busy: 'Busy', busy_on: 'Busy mode is on: the website is not accepting new orders', busy_on_toast: 'Orders paused', busy_off_toast: 'Orders resumed'
  }
};

function getLang() {
  if (window.FORCE_LANG) return window.FORCE_LANG;
  try {
    const saved = localStorage.getItem('site_lang');
    if (saved === 'ar' || saved === 'en') return saved;
  } catch (e) { /* storage blocked */ }
  const def = window.Store && Store.data && Store.data.settings && Store.data.settings.defaultLang;
  return def === 'en' ? 'en' : 'ar';
}

function setLang(lang) {
  try { localStorage.setItem('site_lang', lang === 'en' ? 'en' : 'ar'); } catch (e) { /* ignore */ }
}

function t(key, vars = {}) {
  const lang = getLang();
  const s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

/* Reads a bilingual content field; falls back to the other language so a
   half-translated menu never shows blanks. */
function tField(field, lang) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  lang = lang || getLang();
  return field[lang] || field[lang === 'ar' ? 'en' : 'ar'] || '';
}

function applyDocDir() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}
