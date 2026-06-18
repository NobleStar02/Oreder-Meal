import { createContext, useContext, useEffect, useState } from "react";

const TRANSLATIONS = {
  tr: {
    // Nav Bar
    nav_menu: "Günün Menüsü",
    nav_orders: "Siparişlerim",
    nav_cart: "Sepet",
    nav_admin: "Yönetim",
    nav_login: "Giriş",
    nav_register: "Firma Kaydı",
    nav_logout: "Çıkış Yap",
    logo_title: "Doyuran Güveç",
    logo_subtitle: "Lokantası",
    
    // Landing
    hero_badge: "Bugün Mutfaktan Taze",
    hero_title: "Öğle yemeği siparişlerinizi tek tıkla bizden alın.",
    hero_desc: "WhatsApp'ta tek tek yazışmadan, fiş yazmadan. Doyuran Güveç Lokantası'nın günlük menüsünü görün, firma adınızla sipariş geçin — siparişiniz mutfağımıza otomatik olarak ulaşsın.",
    hero_cta_register: "Firma Olarak Kayıt Ol",
    hero_cta_menu: "Bugünün Menüsüne Geç",
    hero_cta_admin: "Yönetim Paneline Git",
    hero_cta_login: "Giriş Yap",
    hero_feat_dinner: "Akşam yemeği seçeneği",
    hero_feat_history: "Firma bazlı geçmiş",
    footer_text: "© {year} Doyuran Güveç Lokantası. Tüm hakları saklıdır.",
    footer_tag: "Günlük taze • Öğle paketi",

    // Login
    login_title: "Tekrar hoş geldiniz",
    login_desc: "Firma hesabınızla giriş yaparak günün menüsünü görüntüleyin.",
    login_email: "E-posta",
    login_password: "Şifre",
    login_submit: "Giriş Yap",
    login_submitting: "Giriş yapılıyor…",
    login_no_account: "Hesabınız yok mu?",
    login_create_firm: "Firma kaydı oluşturun",
    login_welcome: "Hoş geldiniz!",

    // Register
    reg_title: "Firma Kaydı Oluştur",
    reg_desc: "Birkaç bilgi yeterli — saniyeler içinde sipariş vermeye başlayın.",
    reg_company_name: "Firma Adı *",
    reg_company_name_placeholder: "Örn: Acme Yazılım A.Ş.",
    reg_contact_name: "Yetkili Kişi",
    reg_contact_name_placeholder: "Ad Soyad",
    reg_phone: "Telefon",
    reg_phone_placeholder: "0555 ...",
    reg_address: "Adres / Teslimat Notu",
    reg_address_placeholder: "Ofis adresi, kat, kapı no…",
    reg_email: "E-posta *",
    reg_password: "Şifre *",
    reg_submit: "Hesap Oluştur",
    reg_submitting: "Kaydediliyor…",
    reg_has_account: "Zaten hesabınız var mı?",
    reg_login_here: "Giriş yapın",
    reg_success: "Firma kaydınız oluşturuldu!",

    // MenuPage
    menu_today: "Bugünün Menüsü",
    menu_welcome: "Hoş geldiniz, {firm}.",
    menu_desc: "Yemekleri seçin, adetleri belirleyin, siparişinizi tek tıkla mutfağa iletin.",
    menu_loading: "Menü yükleniyor…",
    menu_no_menu_title: "Bugün için menü henüz yayınlanmadı",
    menu_no_menu_desc: "Lokanta sahibimiz menüyü yayınladığında burada görünecek.",
    menu_err_load: "Menü yüklenemedi",
    cart_title: "Sepet",
    cart_empty: "Sepetiniz boş",
    cart_dinner_label: "Akşam yemeği de istiyorum",
    cart_dinner_desc: "Menüden akşam için ürün seçin",
    cart_dinner_title: "Akşam Yemeği Seçimi",
    cart_dinner_selected: "Seçilenler",
    cart_dinner_add_more: "Menüden Ekle",
    cart_note_label: "Sipariş Notu",
    cart_note_placeholder: "Az tuzlu, çok ekmek vs.",
    cart_total_qty: "Toplam Adet",
    cart_order_submit: "Siparişi Gönder",
    cart_order_submitting: "Gönderiliyor…",
    cart_order_success: "Siparişiniz alındı! Sipariş no: #{no}",
    cart_mobile_count: "{count} ürün",

    // OrdersPage
    orders_title: "Siparişlerim",
    orders_desc: "Geçmiş siparişlerinizi ve durumlarını buradan takip edin.",
    orders_loading: "Yükleniyor…",
    orders_no_orders: "Henüz sipariş vermediniz",
    orders_view_today: "Bugünün menüsüne göz atın →",
    orders_not_found: "Bu sayfada sipariş bulunamadı.",
    orders_order_no: "Sipariş #{no}",
    orders_evening_meal: "🌙 Akşam Yemeği Var",
    orders_revised: "Düzeltildi ×{count}",
    orders_items_count: "{items} kalem · {qty} adet",
    orders_detail: "Sipariş Detayı",
    orders_note: "Not",
    orders_evening_meal_detail: "🌙 Akşam Yemeği: {time}",
    orders_print: "Fişi yazdır / görüntüle",
    orders_edit: "Siparişi Düzenle",
    orders_cant_edit: "Sipariş hazırlanmaya başlandığı için artık düzenlenemez.",
    orders_prev: "Önceki",
    orders_next: "Sonraki",
    orders_page: "Sayfa {page}",

    // Order status
    status_yeni: "Yeni",
    status_hazirlaniyor: "Hazırlanıyor",
    status_tamamlandi: "Tamamlandı",
    status_iptal: "İptal",

    // General Categories
    cat_soup: "Çorba",
    cat_soups: "Çorbalar",
    cat_main: "Ana Yemek",
    cat_side: "Yan Yemek",
    cat_sides: "Yan Lezzetler",
    cat_drink: "İçecek",
    cat_drinks: "İçecekler",
    cat_dessert: "Tatlı",
    cat_desserts: "Tatlılar",
    cat_other: "Diğer",
    menu_count_types: "{count} çeşit",
    menu_added_to_cart: "{name} sepete eklendi",
    menu_add_btn: "Ekle",
    confirm_title: "Siparişi Onayla",
    confirm_desc: "Lütfen siparişinizi kontrol edin hata olmaması için.",
    confirm_cancel: "Vazgeç",
    confirm_action: "Onayla ve Gönder",
    note_presets_label: "Hazır Notlar",
    note_preset_1: "Ekmek bol olsun",
    note_preset_2: "Kolay gelsin",
    note_preset_3: "Sıcak gelsin",
    note_preset_4: "Çatal-kaşık istemiyoruz",
    notification_title: "Doyuran Güveç Lokantası",
    notification_body: "Bugünün menüsü yayınlandı! Siparişinizi vermek için tıklayın.",
    notification_prompt: "Yeni günün menüsü yayınlandığında bildirim almak ister misiniz?",
    notification_enable_btn: "Bildirimleri Etkinleştir",
    edit_dialog_title: "Siparişi Düzenle — #{no}",
    edit_dialog_desc: "Adetleri değiştirin veya yeni yemek ekleyin. Kaydettiğinizde mutfağa 'DÜZELTİLDİ' notuyla tekrar iletilir.",
    edit_items_label: "Sipariş Kalemleri",
    edit_empty: "Sipariş boş. Aşağıdan yemek ekleyin.",
    edit_add_menu: "Bugünün Menüsünden Ekle",
    edit_submit_btn: "Düzeltmeyi Gönder",
    edit_saving: "Kaydediliyor…",
    edit_dinner_question: "Akşama hangi yemekleri istiyorsunuz?",
    edit_dinner_qty_btn: "Akşam Adet",
  },
  az: {
    // Nav Bar
    nav_menu: "Günün Menusu",
    nav_orders: "Sifarişlərim",
    nav_cart: "Səbət",
    nav_admin: "İdarəetmə",
    nav_login: "Giriş",
    nav_register: "Firma Qeydiyyatı",
    nav_logout: "Çıxış",
    logo_title: "Doyuran Güveç",
    logo_subtitle: "Restoranı",
    
    // Landing
    hero_badge: "Bu Gün Mətbəxdən Təzə",
    hero_title: "Nahar sifarişlərinizi tək kliklə bizdən alın.",
    hero_desc: "WhatsApp-da tək-tək yazışmadan, qəbz yazmadan. Doyuran Güveç Restoranının günlük menusunu görün, firma adınızla sifariş verin — sifarişiniz mətbəximizə avtomatik çatsın.",
    hero_cta_register: "Firma olaraq qeydiyyatdan keç",
    hero_cta_menu: "Bugünün Menusuna Keç",
    hero_cta_admin: "İdarəetmə Panelinə Get",
    hero_cta_login: "Daxil Ol",
    hero_feat_dinner: "Şam yeməyi seçimi",
    hero_feat_history: "Firma bazalı tarixçə",
    footer_text: "© {year} Doyuran Güveç Restoranı. Bütün hüquqlar qorunur.",
    footer_tag: "Günlük təzə • Nahar paketi",

    // Login
    login_title: "Yenidən xoş gəldiniz",
    login_desc: "Firma hesabınızla daxil olaraq günün menusunu görün.",
    login_email: "E-poçt",
    login_password: "Şifrə",
    login_submit: "Daxil Ol",
    login_submitting: "Giriş edilir…",
    login_no_account: "Hesabınız yoxdur?",
    login_create_firm: "Firma qeydiyyatı yaradın",
    login_welcome: "Xoş gəldiniz!",

    // Register
    reg_title: "Firma Qeydiyyatı Yaradın",
    reg_desc: "Bir neçə məlumat kifayətdir — saniyələr ərzində sifariş verməyə başlayın.",
    reg_company_name: "Firma Adı *",
    reg_company_name_placeholder: "Məs: Acme Proqram təminatı A.Ş.",
    reg_contact_name: "Səlahiyyətli Şəxs",
    reg_contact_name_placeholder: "Ad Soyad",
    reg_phone: "Telefon",
    reg_phone_placeholder: "0555 ...",
    reg_address: "Ünvan / Çatdırılma Qeydi",
    reg_address_placeholder: "Ofis ünvanı, mərtəbə, qapı nömrəsi…",
    reg_email: "E-poçt *",
    reg_password: "Şifrə *",
    reg_submit: "Hesab Yarat",
    reg_submitting: "Qeyd edilir…",
    reg_has_account: "Artıq hesabınız var?",
    reg_login_here: "Daxil olun",
    reg_success: "Firma qeydiyyatınız yaradıldı!",

    // MenuPage
    menu_today: "Bugünün Menusu",
    menu_welcome: "Xoş gəldiniz, {firm}.",
    menu_desc: "Yeməkləri seçin, sayını müəyyənləşdirin, sifarişinizi tək kliklə mətbəxə ötürün.",
    menu_loading: "Menu yüklənir…",
    menu_no_menu_title: "Bu gün üçün menu hələ dərc olunmayıb",
    menu_no_menu_desc: "Restoran sahibimiz menunu dərc etdikdə burada görünəcək.",
    menu_err_load: "Menu yüklənə bilmədi",
    cart_title: "Səbət",
    cart_empty: "Səbətiniz boşdur",
    cart_dinner_label: "Şam yeməyi də istəyirəm",
    cart_dinner_desc: "Menudan axşam üçün məhsul seçin",
    cart_dinner_title: "Şam Yeməyi Seçimi",
    cart_dinner_selected: "Seçilənlər",
    cart_dinner_add_more: "Menudan Əlavə Et",
    cart_note_label: "Sifariş Qeydi",
    cart_note_placeholder: "Az duzlu, çox çörək və s.",
    cart_total_qty: "Toplam Say",
    cart_order_submit: "Sifarişi Gönder",
    cart_order_submitting: "Göndərilir…",
    cart_order_success: "Sifarişiniz qəbul olundu! Sifariş №: #{no}",
    cart_mobile_count: "{count} məhsul",

    // OrdersPage
    orders_title: "Sifarişlərim",
    orders_desc: "Keçmiş sifarişlərinizi və statuslarını buradan izləyin.",
    orders_loading: "Yüklənir…",
    orders_no_orders: "Hələ sifariş verməmisiniz",
    orders_view_today: "Bugünün menusuna nəzər salın →",
    orders_not_found: "Bu səhifədə sifariş tapılmadı.",
    orders_order_no: "Sifariş #{no}",
    orders_evening_meal: "🌙 Şam Yeməyi Var",
    orders_revised: "Düzəliş edildi ×{count}",
    orders_items_count: "{items} növ · {qty} ədəd",
    orders_detail: "Sifariş Təfərrüatı",
    orders_note: "Qeyd",
    orders_evening_meal_detail: "🌙 Şam Yeməyi: {time}",
    orders_print: "Qəbzi çap et / göstər",
    orders_edit: "Sifarişi Düzəlt",
    orders_cant_edit: "Sifariş hazırlanmağa başladığı üçün artıq düzəldilə bilməz.",
    orders_prev: "Əvvəlki",
    orders_next: "Növbəti",
    orders_page: "Səhifə {page}",

    // Order status
    status_yeni: "Yeni",
    status_hazirlaniyor: "Hazırlanır",
    status_tamamlandi: "Tamamlandı",
    status_iptal: "Ləğv edildi",

    // General Categories
    cat_soup: "Çorba",
    cat_soups: "Çorbalar",
    cat_main: "Ana Yemek",
    cat_side: "Yan Yemek",
    cat_sides: "Yan Lezzetler",
    cat_drink: "İçecek",
    cat_drinks: "İçecekler",
    cat_dessert: "Tatlı",
    cat_desserts: "Tatlılar",
    cat_other: "Diğer",
    menu_count_types: "{count} növ",
    menu_added_to_cart: "{name} səbətə əlavə edildi",
    menu_add_btn: "Əlavə Et",
    confirm_title: "Sifarişi Təsdiqlə",
    confirm_desc: "Xahiş edirik sifarişinizi yoxlayın, xəta olmaması üçün.",
    confirm_cancel: "Vazgeç",
    confirm_action: "Təsdiqlə və Göndər",
    note_presets_label: "Hazır Qeydlər",
    note_preset_1: "Çörək bol olsun",
    note_preset_2: "Asan gelsin",
    note_preset_3: "İsti gəlsin",
    note_preset_4: "Çəngəl-bıçaq istəmirik",
    notification_title: "Doyuran Güveç Restoranı",
    notification_body: "Bugünün menusü dərc olundu! Sifarişinizi vermək üçün klikləyin.",
    notification_prompt: "Yeni günün menusü dərc olunduqda bildiriş almaq istəyirsinizmi?",
    notification_enable_btn: "Bildirişləri Aktiv Et",
    edit_dialog_title: "Sifarişi Düzəlt — #{no}",
    edit_dialog_desc: "Sayları dəyişin və ya yeni yemək əlavə edin. Yadda saxladıqda mətbəxə 'DÜZƏLİLDİ' qeydi ilə yenidən göndərilir.",
    edit_items_label: "Sifariş Növləri",
    edit_empty: "Sifariş boşdur. Aşağıdan yemək əlavə edin.",
    edit_add_menu: "Bugünün Menusundan Əlavə Et",
    edit_submit_btn: "Düzəlişi Göndər",
    edit_saving: "Qeyd edilir…",
    edit_dinner_question: "Axşam üçün hansı yeməkləri istəyirsiniz?",
    edit_dinner_qty_btn: "Axşam Sayı",
  },
  ar: {
    // Nav Bar
    nav_menu: "قائمة اليوم",
    nav_orders: "طلباتي",
    nav_cart: "السلة",
    nav_admin: "الإدارة",
    nav_login: "دخول",
    nav_register: "تسجيل الشركة",
    nav_logout: "تسجيل الخروج",
    logo_title: "طاجن دويوران",
    logo_subtitle: "مطعم",
    
    // Landing
    hero_badge: "طازج اليوم من المطبخ",
    hero_title: "اطلب وجبات الغداء الخاصة بك بنقرة واحدة منا.",
    hero_desc: "دون الحاجة للمراسلة على واتساب أو كتابة الفواتير. شاهد القائمة اليومية لمطعم طاجن دويوران، واطلب باسم شركتك - ليصل طلبك إلى مطبخنا تلقائياً.",
    hero_cta_register: "سجل كشركة",
    hero_cta_menu: "الانتقال إلى قائمة اليوم",
    hero_cta_admin: "الذهاب إلى لوحة التحكم",
    hero_cta_login: "تسجيل الدخول",
    hero_feat_dinner: "خيار وجبة العشاء",
    hero_feat_history: "سجل الطلبات لكل شركة",
    footer_text: "© {year} مطعم طاجن دويوران. جميع الحقوق محفوظة.",
    footer_tag: "طازج يومياً • وجبة غداء",

    // Login
    login_title: "مرحباً بك مجدداً",
    login_desc: "قم بتسجيل الدخول باستخدام حساب شركتك لعرض قائمة اليوم.",
    login_email: "البريد الإلكتروني",
    login_password: "كلمة المرور",
    login_submit: "تسجيل الدخول",
    login_submitting: "جاري الدخول…",
    login_no_account: "ليس لديك حساب؟",
    login_create_firm: "أنشئ حساب شركة جديد",
    login_welcome: "مرحباً بك!",

    // Register
    reg_title: "إنشاء حساب شركة",
    reg_desc: "بضع معلومات كافية - ابدأ الطلب خلال ثوانٍ معدودة.",
    reg_company_name: "اسم الشركة *",
    reg_company_name_placeholder: "مثال: شركة أكمي للبرمجيات",
    reg_contact_name: "الشخص المسؤول",
    reg_contact_name_placeholder: "الاسم الكامل",
    reg_phone: "الهاتف",
    reg_phone_placeholder: "0555 ...",
    reg_address: "العنوان / ملاحظة التوصيل",
    reg_address_placeholder: "عنوان المكتب، الطابق، رقم الباب…",
    reg_email: "البريد الإلكتروني *",
    reg_password: "كلمة المرور *",
    reg_submit: "إنشاء الحساب",
    reg_submitting: "جاري الحفظ…",
    reg_has_account: "لديك حساب بالفعل؟",
    reg_login_here: "سجل دخولك هنا",
    reg_success: "تم إنشاء حساب الشركة بنجاح!",

    // MenuPage
    menu_today: "قائمة طعام اليوم",
    menu_welcome: "أهلاً بك، {firm}.",
    menu_desc: "اختر الأطباق، حدد الكميات، وأرسل طلبك للمطبخ بنقرة واحدة.",
    menu_loading: "جاري تحميل القائمة…",
    menu_no_menu_title: "لم يتم نشر القائمة اليوم بعد",
    menu_no_menu_desc: "ستظهر القائمة هنا بمجرد أن ينشرها صاحب المطعم.",
    menu_err_load: "فشل في تحميل القائمة",
    cart_title: "السلة",
    cart_empty: "sلتك فارغة",
    cart_dinner_label: "أريد وجبة عشاء أيضاً",
    cart_dinner_desc: "اختر وجبات العشاء من القائمة",
    cart_dinner_title: "اختيار وجبة العشاء",
    cart_dinner_selected: "الوجبات المختارة",
    cart_dinner_add_more: "إضافة من القائمة",
    cart_note_label: "ملاحظة الطلب",
    cart_note_placeholder: "ملح خفيف، خبز إضافي، إلخ.",
    cart_total_qty: "العدد الإجمالي",
    cart_order_submit: "إرسال الطلب",
    cart_order_submitting: "جاري الإرسال…",
    cart_order_success: "تم استلام طلبك! رقم الطلب: #{no}",
    cart_mobile_count: "{count} منتج",

    // OrdersPage
    orders_title: "طلباتي",
    orders_desc: "تابع طلباتك السابقة وحالتها من هنا.",
    orders_loading: "جاري التحميل…",
    orders_no_orders: "لم تقم بالطلب بعد",
    orders_view_today: "تصفح قائمة طعام اليوم ←",
    orders_not_found: "لم يتم العثور على طلبات في هذه الصفحة.",
    orders_order_no: "طلب رقم #{no}",
    orders_evening_meal: "🌙 يتضمن عشاء",
    orders_revised: "تم التعديل ×{count}",
    orders_items_count: "{items} أصناف · {qty} قطع",
    orders_detail: "تفاصيل الطلب",
    orders_note: "ملاحظة",
    orders_evening_meal_detail: "🌙 وجبة العشاء: {time}",
    orders_print: "عرض / طباعة الفاتورة",
    orders_edit: "تعديل الطلب",
    orders_cant_edit: "لا يمكن تعديل الطلب لأنه قيد التحضير بالفعل.",
    orders_prev: "السابق",
    orders_next: "التالي",
    orders_page: "صفحة {page}",

    // Order status
    status_yeni: "جديد",
    status_hazirlaniyor: "قيد التحضير",
    status_tamamlandi: "تم التسليم",
    status_iptal: "تم الإلغاء",

    // General Categories
    cat_soup: "شوربة",
    cat_soups: "شوربة",
    cat_main: "طبق رئيسي",
    cat_side: "طبق جانبي",
    cat_sides: "طبق جانبي",
    cat_drink: "مشروب",
    cat_drinks: "مشروبات",
    cat_dessert: "حلوى",
    cat_desserts: "حلويات",
    cat_other: "أخرى",
    menu_count_types: "{count} أنواع",
    menu_added_to_cart: "تم إضافة {name} إلى السلة",
    menu_add_btn: "إضافة",
    confirm_title: "تأكيد الطلب",
    confirm_desc: "يرجى التحقق من طلبك لتجنب أي أخطاء.",
    confirm_cancel: "إلغاء",
    confirm_action: "تأكيد وإرسال",
    note_presets_label: "ملاحظات جاهزة",
    note_preset_1: "خبز إضافي",
    note_preset_2: "يعطيكم العافية",
    note_preset_3: "يرجى تقديمه ساخناً",
    note_preset_4: "لا نريد ملاعق وشوك",
    notification_title: "مطعم طاجن دويوران",
    notification_body: "تم نشر قائمة اليوم! انقر لتقديم طلبك.",
    notification_prompt: "هل تريد تلقي إشعار عند نشر قائمة طعام جديدة؟",
    notification_enable_btn: "تفعيل الإشعارات",
    edit_dialog_title: "تعديل الطلب — #{no}",
    edit_dialog_desc: "قم بتعديل الكميات أو إضافة أطباق جديدة. عند الحفظ، سيتم إرساله إلى المطبخ مرة أخرى مع ملاحظة 'معدل'.",
    edit_items_label: "أصناف الطلب",
    edit_empty: "الطلب فارغ. يرجى إضافة أطباق من الأسفل.",
    edit_add_menu: "إضافة من قائمة اليوم",
    edit_submit_btn: "إرسال التعديل",
    edit_saving: "جاري الحفظ…",
    edit_dinner_question: "ما هي الأطباق التي تريدها لوجبة العشاء؟",
    edit_dinner_qty_btn: "كمية العشاء",
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("order-meal-lang") || "tr";
  });

  useEffect(() => {
    localStorage.setItem("order-meal-lang", language);
    // Manage document metadata & direction
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const t = (key, params = {}) => {
    let text = TRANSLATIONS[language]?.[key] || TRANSLATIONS["tr"]?.[key] || key;
    Object.keys(params).forEach((p) => {
      text = text.replace(`{${p}}`, params[p]);
    });
    return text;
  };

  const changeLanguage = (lang) => {
    if (TRANSLATIONS[lang]) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, t, changeLanguage, isRtl: language === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
