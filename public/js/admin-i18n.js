/* ===================== Admin i18n (Arabic default + English) =====================
   The admin panel is written with English source strings wrapped in L():
     L('Save Changes')                 -> 'حفظ التغييرات' (ar) / 'Save Changes' (en)
     L('Level {n}', { n: 2 })          -> 'المستوى 2'     / 'Level 2'
   ADMIN_AR maps the English text to its Arabic translation; any string that
   is missing falls back to the English text. The chosen language is kept in
   localStorage 'admin_lang' and also sets window.FORCE_LANG so the shared
   helpers (t(), tField(), fmtMoney(), fmtDate()) follow it.
   Load this file before i18n.js/admin.js. Static HTML can use data-l
   (text), data-l-title / data-l-placeholder attributes, and a button with
   [data-admin-lang-toggle] becomes the language switch. */
(function () {
  let lang = 'ar';
  try { const s = localStorage.getItem('admin_lang'); if (s === 'ar' || s === 'en') lang = s; } catch (e) { /* storage blocked */ }
  window.ADMIN_LANG = lang;
  window.FORCE_LANG = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
})();

const ADMIN_AR = {
  /* shell & login */
  'Admin Panel': 'لوحة التحكم',
  'Admin Sign in': 'دخول لوحة التحكم',
  'View website ↗': 'عرض الموقع ↗',
  'Sign out': 'تسجيل الخروج',
  'Password': 'كلمة المرور',
  'Sign in': 'دخول',
  '← Back to website': '→ العودة إلى الموقع',
  'Wrong password': 'كلمة المرور غير صحيحة',
  'Too many attempts. Wait 10 minutes.': 'محاولات كثيرة. انتظر 10 دقائق ثم حاول مجدداً.',
  'Sign-in failed: {msg}': 'تعذّر تسجيل الدخول: {msg}',
  'Could not reach the server.': 'تعذّر الاتصال بالخادم.',
  'Retry': 'إعادة المحاولة',

  /* sections */
  'Orders': 'الطلبات',
  'Branches': 'الفروع',
  'Products': 'المنتجات',
  'Categories': 'الفئات',
  'Delivery Zones': 'مناطق التوصيل',
  'Discounts': 'الخصومات',
  'Points, Gifts & Levels': 'النقاط والهدايا والمستويات',
  'Homepage': 'الصفحة الرئيسية',
  'Menu Slider': 'سلايدر القائمة',
  'Pages': 'الصفحات',
  'Notifications': 'الإشعارات',
  'Cashiers': 'الكاشير',
  'Colors': 'الألوان',
  'Restaurant Settings': 'إعدادات المطعم',
  'Footer & Contact': 'التذييل والتواصل',
  'Backup & Data': 'النسخ الاحتياطي والبيانات',

  /* common */
  '+ Add': '+ إضافة',
  'Edit': 'تعديل',
  'Delete': 'حذف',
  'Save': 'حفظ',
  'Save Changes': 'حفظ التغييرات',
  'Cancel': 'إلغاء',
  'Saved': 'تم الحفظ',
  'Saving…': 'جارٍ الحفظ…',
  'Imported': 'تم الاستيراد',
  'Created': 'تم الإنشاء',
  'Save failed — check your connection and try again': 'فشل الحفظ — تحقّق من اتصالك وحاول مجدداً',
  'The data was changed from another tab or device. The page will reload with the latest data.': 'تم تعديل البيانات من تبويب أو جهاز آخر. ستُعاد تحميل الصفحة بأحدث البيانات.',
  'Remove image': 'إزالة الصورة',
  'Image upload failed: {msg}': 'فشل رفع الصورة: {msg}',
  'Upload failed': 'فشل الرفع',
  'Available in branches': 'متاح في الفروع',
  'Leave all unchecked to show in every branch.': 'اترك الكل بدون تحديد ليظهر في جميع الفروع.',
  'Image': 'الصورة',
  'Name': 'الاسم',
  'Name is required': 'الاسم مطلوب',
  'Description': 'الوصف',
  'Display order': 'ترتيب العرض',
  'Type': 'النوع',
  'Value': 'القيمة',
  'Title': 'العنوان',
  'Text': 'النص',
  'Button': 'الزر',
  'Loading…': 'جارٍ التحميل…',
  'Could not load.': 'تعذّر التحميل.',
  'Failed: {msg}': 'فشلت العملية: {msg}',
  'Arabic': 'العربية',
  'English': 'الإنجليزية',

  /* orders */
  'Pending': 'قيد الانتظار',
  'Preparing': 'قيد التحضير',
  'Delivered': 'تم التسليم',
  'Cancelled': 'ملغي',
  '{n} pts': '{n} نقطة',
  'Free': 'مجاني',
  'Delivery': 'توصيل',
  'Pickup': 'استلام',
  'Subtotal': 'المجموع',
  'Order discount': 'خصم الفاتورة',
  'Level discount': 'خصم المستوى',
  'Delivery discount': 'خصم التوصيل',
  'Tax': 'الضريبة',
  'Total': 'الإجمالي',
  'Print': 'طباعة',
  'Period': 'الفترة',
  'Today': 'اليوم',
  'Yesterday': 'أمس',
  'Last 7 days': 'آخر 7 أيام',
  'Last 30 days': 'آخر 30 يوماً',
  'Custom…': 'مخصّص…',
  'From': 'من',
  'To': 'إلى',
  'Status': 'الحالة',
  'All': 'الكل',
  'Branch': 'الفرع',
  'All branches': 'كل الفروع',
  'Open': 'مفتوحة',
  'Delivered sales': 'مبيعات مُسلّمة',
  'No orders for this filter.': 'لا توجد طلبات لهذا الفلتر.',
  'Status updated': 'تم تحديث الحالة',
  'Cannot reopen: the customer already spent the refunded gift points.': 'لا يمكن إعادة فتح الطلب: الزبون صرف نقاط الهدايا المُعادة.',
  'Update failed': 'فشل التحديث',
  'Delete order #{n}? This cannot be undone.': 'حذف الطلب #{n}؟ لا يمكن التراجع عن ذلك.',
  'Order deleted': 'تم حذف الطلب',
  'Delete failed': 'فشل الحذف',
  'Could not load orders: {err}. Check that the Firestore rules from the README are published.': 'تعذّر تحميل الطلبات: {err}. تأكّد من نشر قواعد Firestore الموضّحة في README.',
  'Firebase is not configured yet (see README).': 'لم يتم إعداد Firebase بعد (راجع README).',

  /* branches */
  'Multiple branches (customers choose a branch first)': 'فروع متعددة (يختار الزبون الفرع أولاً)',
  'Delivery only': 'توصيل فقط',
  'Pickup only': 'استلام فقط',
  'Pickup & Delivery': 'استلام وتوصيل',
  'No branches yet.': 'لا توجد فروع بعد.',
  'Delete this branch?': 'حذف هذا الفرع؟',
  'Edit branch': 'تعديل الفرع',
  'New branch': 'فرع جديد',
  'Branch name': 'اسم الفرع',
  'Order options': 'خيارات الطلب',

  /* categories + category bar */
  'Category bar': 'شريط الفئات',
  'How the categories look at the top of the menu page.': 'طريقة ظهور الفئات أعلى صفحة القائمة.',
  'Circles with images': 'دوائر بالصور',
  'Text buttons': 'أزرار نصية',
  'Square cards': 'بطاقات مربعة',
  'Keep the category bar visible while scrolling (sticky)': 'تثبيت شريط الفئات أثناء التمرير',
  'Order: {n}': 'الترتيب: {n}',
  'No categories yet.': 'لا توجد فئات بعد.',
  'Delete this category?': 'حذف هذه الفئة؟',
  'Edit category': 'تعديل الفئة',
  'New category': 'فئة جديدة',
  'Category name': 'اسم الفئة',

  /* products */
  'Single choice — different prices (e.g. size)': 'اختيار واحد — أسعار مختلفة (مثل الحجم)',
  'Single choice — no price': 'اختيار واحد — بدون سعر',
  'Multiple choice — add price': 'اختيار متعدد — بسعر إضافي',
  'Multiple choice — no price': 'اختيار متعدد — بدون سعر',
  'No products yet.': 'لا توجد منتجات بعد.',
  'Delete this product?': 'حذف هذا المنتج؟',
  'Edit product': 'تعديل المنتج',
  'New product': 'منتج جديد',
  'Price': 'السعر',
  '+ Price': '+ سعر',
  'Price comes from the first option of the size/price group.': 'السعر يُؤخذ من أول خيار في مجموعة الحجم/السعر.',
  'Category': 'الفئة',
  'Discount %': 'نسبة الخصم %',
  'Options & add-ons': 'الخيارات والإضافات',
  '+ Add option group': '+ إضافة مجموعة خيارات',
  'Group name (AR)': 'اسم المجموعة (عربي)',
  'Group name (EN)': 'اسم المجموعة (إنجليزي)',
  'Option (AR)': 'الخيار (عربي)',
  'Option (EN)': 'الخيار (إنجليزي)',
  '+ Option': '+ خيار',
  'Delete group': 'حذف المجموعة',

  /* delivery */
  'No branch has delivery enabled.': 'لا يوجد فرع مفعّل فيه التوصيل.',
  'New zone name': 'اسم المنطقة الجديدة',
  'Delivery fee': 'رسوم التوصيل',
  '+ Add zone': '+ إضافة منطقة',
  'No zones for this branch yet.': 'لا توجد مناطق لهذا الفرع بعد.',
  'Delete zone?': 'حذف المنطقة؟',
  'Zone name is required': 'اسم المنطقة مطلوب',

  /* discounts */
  'Percentage %': 'نسبة مئوية %',
  'Fixed amount': 'مبلغ ثابت',
  'Free delivery': 'توصيل مجاني',
  'Order from': 'الطلب من',
  'Up to (empty = no limit)': 'حتى (فارغ = بلا حد)',
  'No rules yet.': 'لا توجد قواعد بعد.',
  '+ Add range': '+ إضافة نطاق',
  'Order (invoice) discounts': 'خصومات الفاتورة',
  'Discount on the order subtotal by price range, e.g. 100–150 → 5%, 200–250 → 10%. When ranges overlap the one with the highest “from” wins.': 'خصم على مجموع الطلب حسب نطاق السعر، مثلاً 100–150 ← 5%، 200–250 ← 10%. عند تداخل النطاقات يُطبَّق النطاق صاحب أعلى قيمة «من».',
  'Delivery discounts': 'خصومات التوصيل',
  'Discount on the delivery fee by order subtotal: a percentage, a fixed amount, or free delivery.': 'خصم على رسوم التوصيل حسب مجموع الطلب: نسبة مئوية أو مبلغ ثابت أو توصيل مجاني.',
  'Minimum order & tax': 'الحد الأدنى للطلب والضريبة',
  'Minimum delivery order': 'الحد الأدنى لطلب التوصيل',
  'Tax rate %': 'نسبة الضريبة %',
  '“Up to” must be greater than “from”': 'يجب أن تكون قيمة «حتى» أكبر من «من»',
  'Percentage cannot exceed 100': 'لا يمكن أن تتجاوز النسبة 100',

  /* loyalty */
  'Points': 'النقاط',
  'Loyalty program enabled': 'تفعيل برنامج الولاء',
  'Customers earn 1 point for every … {cur} spent': 'يكسب الزبون نقطة واحدة مقابل كل … {cur}',
  'Points are calculated on the order total after discounts and without the delivery fee, and are added only when the order is marked Delivered. Gift points are deducted when the order is placed and returned if it is cancelled.': 'تُحسب النقاط على إجمالي الطلب بعد الخصومات وبدون رسوم التوصيل، وتُضاف فقط عند تحويل الطلب إلى «تم التسليم». تُخصم نقاط الهدايا عند إرسال الطلب وتُعاد إذا أُلغي.',
  'Levels (Silver → Gold → Diamond)': 'المستويات (فضي ← ذهبي ← ماسي)',
  'A level is reached with lifetime earned points (spending points on gifts never lowers a level). Each level gives a permanent discount on every order.': 'يُحقَّق المستوى بمجموع النقاط المكتسبة (صرف النقاط على الهدايا لا يُخفّض المستوى). كل مستوى يمنح خصماً دائماً على كل طلب.',
  'Level {n}': 'المستوى {n}',
  'Level name': 'اسم المستوى',
  'Points required': 'النقاط المطلوبة',
  'Permanent discount %': 'الخصم الدائم %',
  'Level image': 'صورة المستوى',
  'Save levels': 'حفظ المستويات',
  'Gift categories': 'فئات الهدايا',
  'Each category has a points cost and up to 3 gifts. Customers can redeem any number of gifts (including the same gift more than once) as long as they have enough points.': 'لكل فئة تكلفة بالنقاط وحتى 3 هدايا. يمكن للزبون استبدال أي عدد من الهدايا (حتى الهدية نفسها أكثر من مرة) ما دام رصيده يكفي.',
  '+ Add category': '+ إضافة فئة',
  'Save gifts': 'حفظ الهدايا',
  'Category {n}': 'الفئة {n}',
  'Delete category': 'حذف الفئة',
  'Points per gift in this category': 'نقاط كل هدية في هذه الفئة',
  'Gift {n}': 'الهدية {n}',
  'Gift name (leave empty to skip)': 'اسم الهدية (اتركه فارغاً لتجاهلها)',
  'Gift image': 'صورة الهدية',
  'No gift categories yet.': 'لا توجد فئات هدايا بعد.',
  'Delete this gift category?': 'حذف فئة الهدايا هذه؟',
  'Each level must need more points than the one before': 'يجب أن يحتاج كل مستوى نقاطاً أكثر من المستوى الذي قبله',

  /* homepage */
  'Hero': 'الواجهة الرئيسية',
  'Small line above title': 'سطر صغير فوق العنوان',
  'Background image': 'صورة الخلفية',
  'Sign-in card': 'بطاقة تسجيل الدخول',
  'Google button text': 'نص زر Google',
  'Categories section': 'قسم الفئات',
  'Small line': 'سطر صغير',
  'Featured products': 'منتجات مميزة',
  'Product button': 'زر المنتج',
  'Bottom call to action': 'الدعوة السفلية لاتخاذ إجراء',

  /* slider */
  'Menu page slider': 'سلايدر صفحة القائمة',
  'Add image (16:7 recommended)': 'إضافة صورة (يُفضّل 16:7)',
  'Seconds per slide': 'ثوانٍ لكل شريحة',

  /* pages */
  'Sign in page (menu)': 'صفحة تسجيل الدخول (القائمة)',
  'Privacy policy (menu)': 'سياسة الخصوصية (القائمة)',
  'Return & exchange policy (menu)': 'سياسة الإرجاع والاستبدال (القائمة)',
  'Levels (bottom bar)': 'المستويات (الشريط السفلي)',
  'Gifts (bottom bar)': 'الهدايا (الشريط السفلي)',
  'Notifications (bottom bar)': 'الإشعارات (الشريط السفلي)',
  'My Orders (bottom bar)': 'طلباتي (الشريط السفلي)',
  'Text under the title': 'النص تحت العنوان',
  'Page content': 'محتوى الصفحة',
  'Message when signed out': 'رسالة عند عدم تسجيل الدخول',
  'Button text': 'نص الزر',
  'Message when empty': 'رسالة عند عدم وجود بيانات',
  'Each page shows its 16:9 image right under the header. Home is edited in “Homepage”. The sign-in button uses the Secondary color from “Colors”.': 'تظهر صورة كل صفحة (16:9) أسفل الهيدر مباشرة. تُعدَّل الرئيسية من «الصفحة الرئيسية». يستخدم زر تسجيل الدخول اللون الثانوي من «الألوان».',
  'Page': 'الصفحة',
  'Top image (16:9)': 'الصورة العلوية (16:9)',
  'Preview page ↗': 'معاينة الصفحة ↗',

  /* notifications */
  'Send a notification': 'إرسال إشعار',
  'Sent as a push notification to every customer who enabled notifications (Android, desktop, and iPhone when the site is added to the home screen), and shown on the Notifications page.': 'يُرسل كإشعار فوري لكل زبون فعّل الإشعارات (أندرويد والكمبيوتر وiPhone عند إضافة الموقع إلى الشاشة الرئيسية)، ويظهر في صفحة الإشعارات.',
  'Message': 'الرسالة',
  'Link (optional, e.g. /menu or /gifts)': 'رابط (اختياري، مثل ‎/menu أو ‎/gifts)',
  'Image (optional)': 'صورة (اختياري)',
  'Send notification': 'إرسال الإشعار',
  'Sent notifications': 'الإشعارات المرسلة',
  'Nothing sent yet.': 'لم يُرسل شيء بعد.',
  'Remove from the Notifications page?': 'إزالة من صفحة الإشعارات؟',
  'Title is required': 'العنوان مطلوب',
  'Send this notification to all customers now?': 'إرسال هذا الإشعار لجميع الزبائن الآن؟',
  'Saved, but push sending failed (check Firebase settings)': 'تم الحفظ، لكن فشل إرسال الإشعار الفوري (تحقّق من إعدادات Firebase)',
  'Notification sent': 'تم إرسال الإشعار',
  'Send failed': 'فشل الإرسال',

  /* cashiers */
  'Cashier accounts': 'حسابات الكاشير',
  'Each cashier signs in at {url} and only sees the orders of their branch, with a sound alert that keeps ringing until each new order is accepted or rejected. Cashiers cannot open the admin panel or delete orders.': 'يسجّل كل كاشير دخوله من {url} ويرى طلبات فرعه فقط، مع تنبيه صوتي يستمر حتى قبول كل طلب جديد أو رفضه. لا يستطيع الكاشير فتح لوحة التحكم أو حذف الطلبات.',
  'Add cashier': 'إضافة كاشير',
  'Display name': 'الاسم الظاهر',
  'Downtown cashier': 'كاشير الفرع الرئيسي',
  'Username': 'اسم المستخدم',
  'Password (min 6)': 'كلمة المرور (6 أحرف على الأقل)',
  'Create cashier': 'إنشاء حساب كاشير',
  'Disabled': 'موقوف',
  'New password': 'كلمة مرور جديدة',
  'Disable': 'إيقاف',
  'Enable': 'تفعيل',
  'No cashiers yet.': 'لا يوجد كاشير بعد.',
  'New password (min 6 characters):': 'كلمة المرور الجديدة (6 أحرف على الأقل):',
  'Password changed': 'تم تغيير كلمة المرور',
  'Delete this cashier account?': 'حذف حساب الكاشير هذا؟',
  'Could not load cashiers ({err}). Check the Firebase settings.': 'تعذّر تحميل حسابات الكاشير ({err}). تحقّق من إعدادات Firebase.',
  'Cashier created': 'تم إنشاء حساب الكاشير',
  'Username: 3–32 letters, numbers, . _ -': 'اسم المستخدم: 3–32 حرفاً إنجليزياً أو أرقاماً أو . _ -',
  'Password must be at least 6 characters': 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
  'Username already exists': 'اسم المستخدم موجود مسبقاً',
  'Fill in all fields': 'يرجى تعبئة جميع الحقول',

  /* colors */
  'Header': 'الهيدر',
  'Secondary (buttons, sign-in, accents)': 'اللون الثانوي (الأزرار وتسجيل الدخول واللمسات)',
  'Homepage background': 'خلفية الصفحة الرئيسية',
  'Branches page background': 'خلفية صفحة الفروع',
  'Menu & cart background': 'خلفية القائمة والسلة',
  'Checkout background': 'خلفية صفحة إتمام الطلب',
  'Solid': 'لون واحد',
  'Gradient': 'تدرّج',
  'Color 1': 'اللون 1',
  'Color 2': 'اللون 2',
  'Angle': 'الزاوية',

  /* general */
  'Restaurant settings': 'إعدادات المطعم',
  'Logo': 'الشعار',
  'Also used as the app icon when customers add the site to their home screen.': 'يُستخدم أيضاً كأيقونة التطبيق عند إضافة الموقع إلى الشاشة الرئيسية.',
  'Restaurant name': 'اسم المطعم',
  'Restaurant name is required': 'اسم المطعم مطلوب',
  'Currency': 'العملة',
  'Time zone': 'المنطقة الزمنية',
  'Default site language': 'لغة الموقع الافتراضية',
  'Receipt width': 'عرض الإيصال',
  '80 mm': '80 مم',
  '58 mm': '58 مم',
  'A4 / normal printer': 'A4 / طابعة عادية',
  'Receipt language': 'لغة الإيصال',
  'Kuwaiti Dinar': 'دينار كويتي',
  'Saudi Riyal': 'ريال سعودي',
  'UAE Dirham': 'درهم إماراتي',
  'Qatari Riyal': 'ريال قطري',
  'Bahraini Dinar': 'دينار بحريني',
  'Omani Rial': 'ريال عماني',
  'Jordanian Dinar': 'دينار أردني',
  'Egyptian Pound': 'جنيه مصري',
  'Israeli Shekel': 'شيكل',
  'Moroccan Dirham': 'درهم مغربي',
  'Turkish Lira': 'ليرة تركية',
  'US Dollar': 'دولار أمريكي',
  'Euro': 'يورو',
  'British Pound': 'جنيه إسترليني',
  'Canadian Dollar': 'دولار كندي',
  'Australian Dollar': 'دولار أسترالي',
  'Indian Rupee': 'روبية هندية',

  /* footer */
  'Footer & contact': 'التذييل والتواصل',
  'Phone': 'الهاتف',
  'Email': 'البريد الإلكتروني',
  'Address': 'العنوان',
  'Social links': 'روابط التواصل الاجتماعي',

  /* backup & data */
  'Backup': 'النسخ الاحتياطي',
  'Download all menu and site settings as a file. Orders and customer points stay in Firebase.': 'نزّل كل بيانات القائمة وإعدادات الموقع كملف. الطلبات ونقاط الزبائن تبقى في Firebase.',
  'Download backup': 'تنزيل نسخة احتياطية',
  'Restore / import': 'استعادة / استيراد',
  'Replace all site settings with a backup file. This overwrites the current menu.': 'استبدال كل إعدادات الموقع بملف نسخة احتياطية. سيتم استبدال القائمة الحالية.',
  'Demo data': 'بيانات تجريبية',
  'Replace everything with the bilingual demo restaurant (useful for showing the template).': 'استبدال كل شيء بمطعم تجريبي ثنائي اللغة (مفيد لعرض القالب).',
  'Load demo data': 'تحميل البيانات التجريبية',
  'Not a valid backup': 'الملف ليس نسخة احتياطية صالحة',
  'Replace ALL current settings with this file?': 'استبدال كل الإعدادات الحالية بهذا الملف؟',
  'Replace ALL current settings with the demo restaurant?': 'استبدال كل الإعدادات الحالية بالمطعم التجريبي؟',

  /* first run / load error */
  'Welcome! Set up the site': 'أهلاً بك! لنُجهّز الموقع',
  'No restaurant data yet. Start from the bilingual demo and edit it, or restore a backup file.': 'لا توجد بيانات للمطعم بعد. ابدأ من المطعم التجريبي ثنائي اللغة وعدّله، أو استعد ملف نسخة احتياطية.',
  'Start from demo': 'البدء من التجربة',
  'Restore backup': 'استعادة نسخة احتياطية',
  'Could not load the restaurant data': 'تعذّر تحميل بيانات المطعم',
  'Nothing was changed. Editing is disabled until the data loads, so the restaurant\'s data can never be overwritten by mistake.': 'لم يتم تغيير أي شيء. التعديل معطّل حتى تُحمَّل البيانات، حتى لا تُستبدل بيانات المطعم بالخطأ.'
};

function adminLang() { return window.ADMIN_LANG === 'en' ? 'en' : 'ar'; }

/* Translate an English source string for the admin UI; {name} placeholders
   are filled from vars (values are inserted as-is: escape them first when
   they come from user data and the result goes into HTML). */
function L(text, vars) {
  const s = (adminLang() === 'ar' && Object.prototype.hasOwnProperty.call(ADMIN_AR, text)) ? ADMIN_AR[text] : text;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s;
}

function setAdminLang(lang) {
  try { localStorage.setItem('admin_lang', lang === 'en' ? 'en' : 'ar'); } catch (e) { /* storage blocked */ }
}

/* Translates static markup and wires the language toggle button. */
function applyAdminI18n(root = document) {
  root.querySelectorAll('[data-l]').forEach(el => { el.textContent = L(el.getAttribute('data-l') || el.textContent.trim()); });
  root.querySelectorAll('[data-l-title]').forEach(el => { el.title = L(el.getAttribute('data-l-title')); });
  root.querySelectorAll('[data-l-placeholder]').forEach(el => { el.placeholder = L(el.getAttribute('data-l-placeholder')); });
  root.querySelectorAll('[data-admin-lang-toggle]').forEach(btn => {
    btn.textContent = adminLang() === 'ar' ? 'English' : 'العربية';
    btn.setAttribute('lang', adminLang() === 'ar' ? 'en' : 'ar');
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => { setAdminLang(adminLang() === 'ar' ? 'en' : 'ar'); location.reload(); });
  });
  const title = document.querySelector('title[data-l]');
  if (title) document.title = L(title.getAttribute('data-l'));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => applyAdminI18n());
else applyAdminI18n();
