import React, { createContext, useState, useEffect, useContext } from 'react';

const LanguageContext = createContext(null);

const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    create_invoice: "Create Invoice",
    banana_rates: "Banana Rates",
    billing_history: "Billing History",
    reports: "Analytics & Reports",
    business_profile: "Business Profile",
    logout: "Log Out",
    welcome: "Welcome back",
    
    // Dashboard Stats
    todays_revenue: "Today's Revenue",
    bills_today: "Bills Generated Today",
    customers_visited: "Customers Visited",
    pending_payments: "Pending Payments",
    todays_rates: "Today's Banana Rates",
    quick_utilities: "Quick Utilities",
    
    // Invoicing process steps
    step_customer: "Customer Details",
    step_weighing: "Weighing Terminals",
    step_calculations: "Calculations",
    step_payments: "Payments",
    step_invoice: "Issued Invoice",
    
    // Customer Details
    customer_name: "Customer Name",
    customer_phone: "Customer Phone Number",
    customer_place: "Customer Place / Address",
    date_auto: "Date (Auto Generated)",
    time_auto: "Time (Auto Generated)",
    proceed_weighing: "Proceed to Weighing",
    customer_name_placeholder: "Enter name",
    customer_phone_placeholder: "Enter phone number",
    customer_place_placeholder: "Enter place / address",
    date_auto_placeholder: "Date",
    time_auto_placeholder: "Time",
    proceed_weighing_btn: "Proceed to Weighing",
    
    // Weighing step
    variety_type: "Banana Variety Type",
    billing_unit: "Billing Unit",
    rate_per: "Rate per",
    removable_wt: "Removable weight per Piece (Kg)",
    add_row: "Add Row to this variety table",
    add_variety: "Add another banana variety table (+ Group)",
    proceed_calc: "Process Calculations",
    back: "Back",
    sno: "S.No",
    pieces_qty: "Banana Pieces (Qty)",
    pieces_bunches: "Piece Count / Bunches",
    weight_kg: "Weight (Kg)",
    action: "Action",
    
    // Calculations step
    calc_title: "Step 3: Calculation & Weight Removals",
    breakdown_title: "Deductions & Rates breakdown per variety",
    gross_weight: "Gross Weight",
    removable_weight: "Removable Weight",
    net_weight: "Net Weight",
    final_amount: "Final Amount",
    total_pieces: "Total Pieces",
    total_gross: "Total Gross Weight",
    total_removable: "Total Removable",
    subtotal: "Subtotal",
    proceed_payments: "Proceed to Payments",
    
    // Payments step
    payment_mode: "Payment Mode",
    paid_amount: "Paid Amount (Rs.)",
    balance_due: "Balance Amount Due",
    ledger_status: "Payment Ledger Status",
    settled: "SETTLED",
    partially_settled: "PARTIALLY SETTLED",
    not_settled: "NOT SETTLED",
    issue_bill: "Settle and Issue Bill",
    
    // Profile settings
    profile_settings: "Business Profile Settings",
    profile_subtitle: "Manage your business address, signature, and phone details that display on bills",
    billing_owner: "Billing Owner / Operator Name",
    weighing_center: "Business / Weighing Center Name",
    operator_phone: "Operator Contact Phone",
    location: "Native Place / Location",
    district: "District Name",
    save_changes: "Save Changes",
    auth_signature: "Authorized Signature",
    digital_pad: "Option 1: Digital Drawing Pad",
    upload_scan: "Option 2: Upload Scan File",
    
    // Settings / Language select
    language_select: "App Language (மொழி / भाषा)",
    english: "English",
    tamil: "தமிழ் (Tamil)",
    hindi: "हिन्दी (Hindi)",
    
    // Logic error validations
    logic_error_title: "Validation Error",
    zero_weight_error: "Cannot add a new row because there is an entry with 0 or empty weight. Please enter valid weights first.",
    invalid_weight_msg: "Please enter a valid weight (greater than 0) for all entries.",
    invalid_pieces_msg: "Please enter a valid piece count (greater than 0) for all entries."
  },
  ta: {
    // Navigation
    dashboard: "முகப்புப்பலகை",
    create_invoice: "பில் உருவாக்கு",
    banana_rates: "வாழைக்காய் விலை",
    billing_history: "பில் வரலாறு",
    reports: "பகுப்பாய்வு மற்றும் அறிக்கைகள்",
    business_profile: "வணிக சுயவிவரம்",
    logout: "வெளியேறு",
    welcome: "மீண்டும் வருக",
    
    // Dashboard Stats
    todays_revenue: "இன்றைய வருவாய்",
    bills_today: "இன்று உருவாக்கப்பட்ட பில்கள்",
    customers_visited: "வருகை தந்த வாடிக்கையாளர்கள்",
    pending_payments: "நிலுவையில் உள்ள தொகைகள்",
    todays_rates: "இன்றைய வாழைக்காய் விலை",
    quick_utilities: "விரைவுப் பயன்பாடுகள்",
    
    // Invoicing process steps
    step_customer: "வாடிக்கையாளர் விவரங்கள்",
    step_weighing: "எடை மேடை",
    step_calculations: "கணக்கீடுகள்",
    step_payments: "பணம் செலுத்துதல்",
    step_invoice: "வழங்கப்பட்ட பில்",
    
    // Customer Details
    customer_name: "வாடிக்கையாளர் பெயர்",
    customer_phone: "வாடிக்கையாளர் தொலைபேசி எண்",
    customer_place: "வாடிக்கையாளர் இடம் / முகவரி",
    date_auto: "தேதி (தானியங்கி)",
    time_auto: "நேரம் (தானியங்கி)",
    proceed_weighing: "எடை போட தொடரவும்",
    customer_name_placeholder: "பெயரை உள்ளிடவும்",
    customer_phone_placeholder: "தொலைபேसी எண்ணை உள்ளிடவும்",
    customer_place_placeholder: "முகவரியை உள்ளிடவும்",
    date_auto_placeholder: "தேதி",
    time_auto_placeholder: "நேரம்",
    proceed_weighing_btn: "எடை போட தொடரவும்",
    
    // Weighing step
    variety_type: "வாழை வகை",
    billing_unit: "பில்லிங் அலகு",
    rate_per: "அதற்கான விலை",
    removable_wt: "ஒரு காய்க்கான கழிவு எடை (கிலோ)",
    add_row: "இந்த அட்டவணையில் வரிசையைச் சேர்க்கவும்",
    add_variety: "மற்றொரு வாழை வகை அட்டவணையைச் சேர்க்கவும் (+ குழு)",
    proceed_calc: "கணக்கீடுகளைச் செயலாக்கவும்",
    back: "பின்செல்",
    sno: "வரிசை எண்",
    pieces_qty: "வாழைக்காய் எண்ணிக்கை (அளவு)",
    pieces_bunches: "காய் எண்ணிக்கை / தார்",
    weight_kg: "எடை (கிலோ)",
    action: "செயல்பாடு",
    
    // Calculations step
    calc_title: "படி 3: கணக்கீடு & எடை கழிவுகள்",
    breakdown_title: "ஒவ்வொரு வாழை வகைக்கான கழிவுகள் & கட்டண விவரம்",
    gross_weight: "மொத்த எடை",
    removable_weight: "கழிவு எடை",
    net_weight: "நிகர எடை",
    final_amount: "இறுதித் தொகை",
    total_pieces: "மொத்த எண்ணிக்கை",
    total_gross: "மொத்த எடை",
    total_removable: "மொத்த கழிவு எடை",
    subtotal: "துணைத் தொகை",
    proceed_payments: "பணம் செலுத்தலுக்குத் தொடரவும்",
    
    // Payments step
    payment_mode: "பணம் செலுத்தும் முறை",
    paid_amount: "செலுத்திய தொகை (ரூ.)",
    balance_due: "நிலுவைத் தொகை",
    ledger_status: "பணம் செலுத்தும் நிலை",
    settled: "முழுமையாக செலுத்தப்பட்டது",
    partially_settled: "பகுதியாக செலுத்தப்பட்டது",
    not_settled: "செலுத்தப்படவில்லை",
    issue_bill: "பில் வழங்கவும்",
    
    // Profile settings
    profile_settings: "வணிக சுயவிவர அமைப்புகள்",
    profile_subtitle: "பில்லில் தோன்றும் உங்கள் வணிக முகவரி, கையொப்பம் மற்றும் தொலைபேசி விவரங்களை நிர்வகிக்கவும்",
    billing_owner: "பில்லிங் உரிமையாளர் / ஆபரேட்டர் பெயர்",
    weighing_center: "வணிகம் / எடை மையத்தின் பெயர்",
    operator_phone: "ஆபரேட்டர் தொலைபேசி எண்",
    location: "சொந்த ஊர் / இருப்பிடம்",
    district: "மாவட்டத்தின் பெயர்",
    save_changes: "மாற்றங்களைச் சேமிக்கவும்",
    auth_signature: "அங்கீகரிக்கப்பட்ட கையொப்பம்",
    digital_pad: "விருப்பம் 1: டிஜிட்டல் வரைதல் பலகை",
    upload_scan: "விருப்பம் 2: கோப்பைப் பதிவேற்றவும்",
    
    // Settings / Language select
    language_select: "பயன்பாட்டு மொழி (Language)",
    english: "ஆங்கிலம் (English)",
    tamil: "தமிழ் (Tamil)",
    hindi: "இந்தி (Hindi)",
    
    // Logic error validations
    logic_error_title: "சரிபார்ப்பு பிழை",
    zero_weight_error: "பூஜ்ஜிய அல்லது வெற்று எடை கொண்ட பதிவு இருப்பதால் புதிய வரிசையைச் சேர்க்க முடியாது. முதலில் சரியான எடையை உள்ளிடவும்.",
    invalid_weight_msg: "அனைத்து பதிவுகளுக்கும் தயவுசெய்து சரியான எடையை (0 ஐ விட அதிகமான) உள்ளிடவும்.",
    invalid_pieces_msg: "அனைத்து பதிவுகளுக்கும் தயவுசெய்து சரியான எண்ணிக்கையை (0 ஐ விட அதிகமான) உள்ளிடவும்."
  },
  hi: {
    // Navigation
    dashboard: "डैशबोर्ड",
    create_invoice: "बिल बनाएं",
    banana_rates: "केले के भाव",
    billing_history: "बिल इतिहास",
    reports: "विश्लेषण और रिपोर्ट",
    business_profile: "व्यापार प्रोफ़ाइल",
    logout: "लॉग आउट",
    welcome: "स्वागत है",
    
    // Dashboard Stats
    todays_revenue: "आज का राजस्व",
    bills_today: "आज बनाए गए बिल",
    customers_visited: "ग्राहक जो आए",
    pending_payments: "लंबित भुगतान",
    todays_rates: "आज के केले के भाव",
    quick_utilities: "त्वरित उपयोगिताएँ",
    
    // Invoicing process steps
    step_customer: "ग्राहक विवरण",
    step_weighing: "वजन टर्मिनल",
    step_calculations: "गणना",
    step_payments: "भुगतान",
    step_invoice: "जारी किया गया बिल",
    
    // Customer Details
    customer_name: "ग्राहक का नाम",
    customer_phone: "ग्राहक फोन नंबर",
    customer_place: "ग्राहक स्थान / पता",
    date_auto: "दिनांक (स्वचालित)",
    time_auto: "समय (स्वचालित)",
    proceed_weighing: "वजन के लिए आगे बढ़ें",
    customer_name_placeholder: "नाम दर्ज करें",
    customer_phone_placeholder: "फ़ोन नंबर दर्ज करें",
    customer_place_placeholder: "स्थान / पता दर्ज करें",
    date_auto_placeholder: "दिनांक",
    time_auto_placeholder: "समय",
    proceed_weighing_btn: "वजन के लिए आगे बढ़ें",
    
    // Weighing step
    variety_type: "केले की किस्म",
    billing_unit: "बिलिंग इकाई",
    rate_per: "दर प्रति",
    removable_wt: "प्रति पीस घटाया जाने वाला वजन (किलोग्राम)",
    add_row: "इस तालिका में पंक्ति जोड़ें",
    add_variety: "एक और केले की किस्म तालिका जोड़ें (+ समूह)",
    proceed_calc: "गणना प्रक्रिया शुरू करें",
    back: "पीछे",
    sno: "क्र.सं.",
    pieces_qty: "केले के टुकड़े (मात्रा)",
    pieces_bunches: "पीस गिनती / गुच्छे",
    weight_kg: "वजन (किग्रा)",
    action: "कार्रवाई",
    
    // Calculations step
    calc_title: "चरण 3: गणना और वजन में कटौती",
    breakdown_title: "प्रति किस्म कटौती और दरों का विवरण",
    gross_weight: "कुल वजन",
    removable_weight: "कटौती योग्य वजन",
    net_weight: "शुद्ध वजन",
    final_amount: "अंतिम राशि",
    total_pieces: "कुल मात्रा",
    total_gross: "कुल वजन",
    total_removable: "कुल कटौती",
    subtotal: "उप-योग",
    proceed_payments: "भुगतान के लिए आगे बढ़ें",
    
    // Payments step
    payment_mode: "भुगतान का प्रकार",
    paid_amount: "भुगतान की गई राशि (रु.)",
    balance_due: "शेष देय राशि",
    ledger_status: "भुगतान की स्थिति",
    settled: "चुक्ता किया गया",
    partially_settled: "आंशिक रूप से चुक्ता",
    not_settled: "अवैतनिक",
    issue_bill: "बिल जारी करें",
    
    // Profile settings
    profile_settings: "व्यवसाय प्रोफ़ाइल सेटिंग्स",
    profile_subtitle: "बिल पर प्रदर्शित होने वाले अपने व्यवसाय का पता, हस्ताक्षर और फोन विवरण प्रबंधित करें",
    billing_owner: "बिलिंग स्वामी / ऑपरेटर का नाम",
    weighing_center: "व्यवसाय / वजन केंद्र का नाम",
    operator_phone: "ऑपरेटर संपर्क फोन",
    location: "मूल स्थान / पता",
    district: "जिले का नाम",
    save_changes: "बदलाव सहेजें",
    auth_signature: "अधिकृत हस्ताक्षर",
    digital_pad: "विकल्प 1: डिजिटल ड्राइंग पैड",
    upload_scan: "विकल्प 2: स्कैन फ़ाइल अपलोड करें",
    
    // Settings / Language select
    language_select: "ऐप की भाषा (Language)",
    english: "अंग्रेजी (English)",
    tamil: "तमिल (Tamil)",
    hindi: "हिन्दी (Hindi)",
    
    // Logic error validations
    logic_error_title: "सत्यापन त्रुटि",
    zero_weight_error: "0 या खाली वजन वाली प्रविष्टि होने के कारण नई पंक्ति नहीं जोड़ी जा सकती। कृपया पहले वैध वजन दर्ज करें।",
    invalid_weight_msg: "कृपया सभी प्रविष्टियों के लिए एक वैध वजन (0 से अधिक) दर्ज करें।",
    invalid_pieces_msg: "कृपया सभी प्रविष्टियों के लिए एक वैध मात्रा (0 से अधिक) दर्ज करें।"
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('banana_language') || 'en');

  useEffect(() => {
    localStorage.setItem('banana_language', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
