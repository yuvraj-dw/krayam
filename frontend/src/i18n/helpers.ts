import { Language } from '../types';

/**
 * Check if the selected language uses Right-to-Left (RTL) script (Urdu).
 */
export function isRtlLanguage(lang: Language): boolean {
  return lang === 'ur';
}

/**
 * Multi-language agricultural crop dictionary.
 * Preserves canonical backend crop IDs while displaying native terminology.
 */
const CROP_TRANSLATIONS: Record<string, Record<Language, string>> = {
  wheat: {
    en: 'Wheat',
    hi: 'गेहूँ',
    bn: 'গম',
    mr: 'गहू',
    te: 'గోధుమలు',
    ta: 'கோதுமை',
    gu: 'ઘઉં',
    ur: 'گندم',
    kn: 'ಗೋಧಿ',
    or: 'ଗହମ',
    pa: 'ਕਣਕ',
  },
  paddy: {
    en: 'Paddy / Rice',
    hi: 'धान / चावल',
    bn: 'ধান / চাল',
    mr: 'भात / तांदूळ',
    te: 'వరి / బియ్యం',
    ta: 'நெல் / அரிசி',
    gu: 'ડાંગર / ચોખા',
    ur: 'دھان / چاول',
    kn: 'ಭತ್ತ / ಅಕ್ಕಿ',
    or: 'ଧାନ / ଚାଉଳ',
    pa: 'ਝੋਨਾ / ਚੌਲ',
  },
  rice: {
    en: 'Rice',
    hi: 'चावल',
    bn: 'চাল',
    mr: 'तांदूळ',
    te: 'బియ్యం',
    ta: 'அரிசி',
    gu: 'ચોખા',
    ur: 'چاول',
    kn: 'ಅಕ್ಕಿ',
    or: 'ଚାଉଳ',
    pa: 'ਚੌਲ',
  },
  soybean: {
    en: 'Soybean',
    hi: 'सोयाबीन',
    bn: 'সয়াবিন',
    mr: 'सोयाबीन',
    te: 'సోయాబీన్',
    ta: 'சோயாபீன்',
    gu: 'સોયાબીન',
    ur: 'سویا بین',
    kn: 'ಸೋಯಾಬೀನ್',
    or: 'ସୋୟାବିନ',
    pa: 'ਸੋਇਆਬੀਨ',
  },
  mustard: {
    en: 'Mustard',
    hi: 'सरसों',
    bn: 'সরিষা',
    mr: 'मोहरी',
    te: 'ఆవాలు',
    ta: 'கடுகு',
    gu: 'રાય / સરસવ',
    ur: 'سرسوں',
    kn: 'ಸಾಸಿವೆ',
    or: 'ସୋରିଷ',
    pa: 'ਸਰ੍ਹੋਂ',
  },
  gram: {
    en: 'Gram (Chana)',
    hi: 'चना (ग्राम)',
    bn: 'ছোলা',
    mr: 'हरभरा / चणा',
    te: 'శనగలు',
    ta: 'கொண்டைக்கடலை',
    gu: 'ચણા',
    ur: 'چنا',
    kn: 'ಕಡಲೆ',
    or: 'ଚଣା',
    pa: 'ਛੋਲੇ',
  },
  chana: {
    en: 'Chana (Gram)',
    hi: 'चना',
    bn: 'ছোলা',
    mr: 'हरभरा',
    te: 'శనగలు',
    ta: 'கடலை',
    gu: 'ચણા',
    ur: 'چنا',
    kn: 'ಕಡಲೆ',
    or: 'ଚଣା',
    pa: 'ਛੋਲੇ',
  },
  maize: {
    en: 'Maize (Corn)',
    hi: 'मक्का',
    bn: 'ভুট্টা',
    mr: 'मका',
    te: 'మొక్కజొన్న',
    ta: 'மக்காச்சோளம்',
    gu: 'મકાઈ',
    ur: 'مکئی',
    kn: 'ಮೆಕ್ಕೆಜೋಳ',
    or: 'ମକା',
    pa: 'ਮੱਕੀ',
  },
  cotton: {
    en: 'Cotton',
    hi: 'कपास',
    bn: 'তুলা',
    mr: 'कापूस',
    te: 'పత్తి',
    ta: 'பருத்தி',
    gu: 'કપાસ',
    ur: 'کپاس',
    kn: 'ಹತ್ತಿ',
    or: 'କପା',
    pa: 'ਕਪਾਹ',
  },
  groundnut: {
    en: 'Groundnut',
    hi: 'मूंगफली',
    bn: 'চীনাবাদাম',
    mr: 'भुईमूग',
    te: 'వేరుశెనగ',
    ta: 'வேர்க்கடலை',
    gu: 'મગફળી',
    ur: 'مونگ پھلی',
    kn: 'ಕಡಲೆಕಾಯಿ',
    or: 'ଚିନାବାଦାମ',
    pa: 'ਮੂੰਗਫਲੀ',
  },
  bajra: {
    en: 'Bajra (Pearl Millet)',
    hi: 'बाजरा',
    bn: 'বাজরা',
    mr: 'बाजरी',
    te: 'సజ్జలు',
    ta: 'கம்பு',
    gu: 'બાજરી',
    ur: 'باجرہ',
    kn: 'ಸಜ್ಜೆ',
    or: 'ବାଜରା',
    pa: 'ਬਾਜਰਾ',
  },
  moong: {
    en: 'Moong (Green Gram)',
    hi: 'मूंग',
    bn: 'মুগ',
    mr: 'मूग',
    te: 'పెసలు',
    ta: 'பாசிப்பயறு',
    gu: 'મગ',
    ur: 'مونگ',
    kn: 'ಹೆಸರುಕಾಳು',
    or: 'ମୁଗ',
    pa: 'ਮੂੰਗ',
  },
  urad: {
    en: 'Urad (Black Gram)',
    hi: 'उड़द',
    bn: 'মাষকলাই',
    mr: 'उडीद',
    te: 'మినుములు',
    ta: 'உளுந்து',
    gu: 'અડદ',
    ur: 'ماش',
    kn: 'ಉದ್ದಿನಕಾಳು',
    or: 'ବିରି',
    pa: 'ਮਾਂਹ',
  },
  tur: {
    en: 'Arhar / Tur (Pigeon Pea)',
    hi: 'अरहर / तूर',
    bn: 'অড়হর',
    mr: 'तूर',
    te: 'కందులు',
    ta: 'துவரை',
    gu: 'તુવેર',
    ur: 'ارہر / دال تور',
    kn: 'ತೊಗರಿ',
    or: 'ହରଡ଼',
    pa: 'ਅਰਹਰ / ਤੂਰ',
  },
  barley: {
    en: 'Barley',
    hi: 'जौ',
    bn: 'যব',
    mr: 'जव',
    te: 'బార్లీ',
    ta: 'பார்லி',
    gu: 'જવ',
    ur: 'جو',
    kn: 'ಬಾರ್ಲಿ',
    or: 'ଯବ',
    pa: 'ਜੌਂ',
  },
  onion: {
    en: 'Onion',
    hi: 'प्याज़',
    bn: 'পেঁয়াজ',
    mr: 'कांदा',
    te: 'ఉల్లిపాయ',
    ta: 'வெங்காயம்',
    gu: 'ડુંગળી',
    ur: 'پیاز',
    kn: 'ಈರುಳ್ಳಿ',
    or: 'ପିଆଜ',
    pa: 'ਪਿਆਜ਼',
  },
  potato: {
    en: 'Potato',
    hi: 'आलू',
    bn: 'আলু',
    mr: 'बटाटा',
    te: 'బంగాళాదుంప',
    ta: 'உருளைக்கிழங்கு',
    gu: 'બટાકા',
    ur: 'آلو',
    kn: 'ಆಲೂಗಡ್ಡೆ',
    or: 'ଆଳୁ',
    pa: 'ਆਲੂ',
  },
  sugarcane: {
    en: 'Sugarcane',
    hi: 'गन्ना',
    bn: 'আখ',
    mr: 'ऊस',
    te: 'చెరకు',
    ta: 'கரும்பு',
    gu: 'શેરડી',
    ur: 'گنا',
    kn: 'ಕಬ್ಬು',
    or: 'ଆଖୁ',
    pa: 'ਗੰਨਾ',
  },
};

/**
 * Translate a crop name or ID into the user's selected language.
 */
export function translateCrop(cropNameOrId: string, lang: Language): string {
  if (!cropNameOrId) return '';
  const key = cropNameOrId.toLowerCase().trim();
  
  // Direct match
  if (CROP_TRANSLATIONS[key]) {
    return CROP_TRANSLATIONS[key][lang] || CROP_TRANSLATIONS[key].en;
  }
  
  // Partial match
  for (const [k, translations] of Object.entries(CROP_TRANSLATIONS)) {
    if (key.includes(k) || k.includes(key)) {
      return translations[lang] || translations.en;
    }
  }
  
  return cropNameOrId;
}

/**
 * Multi-language status mapping for operational workflow stages.
 */
const STATUS_TRANSLATIONS: Record<string, Record<Language, string>> = {
  confirmed: {
    en: 'Confirmed',
    hi: 'पुष्ट (स्वीकृत)',
    bn: 'নিশ্চিত',
    mr: 'पुष्टी झाली',
    te: 'ధృవీకరించబడింది',
    ta: 'உறுதிப்படுத்தப்பட்டது',
    gu: 'પુષ્ટિ થયેલ',
    ur: 'تصدیق شدہ',
    kn: 'ದೃಢಪಡಿಸಲಾಗಿದೆ',
    or: 'ନିଶ୍ଚିତ',
    pa: 'ਪੁਸ਼ਟੀ ਹੋਈ',
  },
  processing: {
    en: 'Processing',
    hi: 'प्रक्रियाधीन (तौल जारी)',
    bn: 'প্রক্রিয়াকরণ চলছে',
    mr: 'प्रक्रिया सुरू आहे',
    te: 'ప్రక్రియలో ఉంది',
    ta: 'செயலாக்கத்தில் உள்ளது',
    gu: 'પ્રક્રિયા હેઠળ',
    ur: 'جاری عمل',
    kn: 'ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ',
    or: 'ପ୍ରକ୍ରିୟାକରଣ ଚାଲିଛି',
    pa: 'ਪ੍ਰਕਿਰਿਆ ਅਧੀਨ',
  },
  completed: {
    en: 'Completed',
    hi: 'पूर्ण हुआ',
    bn: 'সম্পন্ন',
    mr: 'पूर्ण झाले',
    te: 'పూర్తయింది',
    ta: 'முடிந்தது',
    gu: 'પૂર્ણ થયું',
    ur: 'مکمل ہو گیا',
    kn: 'ಪೂರ್ಣಗೊಂಡಿದೆ',
    or: 'ସମ୍ପୂର୍ଣ୍ଣ ହୋଇଛି',
    pa: 'ਮੁਕੰਮਲ ਹੋਇਆ',
  },
  cancelled: {
    en: 'Cancelled',
    hi: 'रद्द किया गया',
    bn: 'বাতিল',
    mr: 'रद्द केले',
    te: 'రద్దు చేయబడింది',
    ta: 'ரத்து செய்யப்பட்டது',
    gu: 'રદ કરેલ',
    ur: 'منسوخ',
    kn: 'ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ',
    or: 'ବାତିଲ ହୋଇଛି',
    pa: 'ਰੱਦ ਕੀਤਾ ਗਿਆ',
  },
  no_show: {
    en: 'No Show',
    hi: 'अनुपस्थित',
    bn: 'অনুপস্থিত',
    mr: 'अनुपस्थित',
    te: 'హాజరు కాలేదు',
    ta: 'வரவில்லை',
    gu: 'ગેરહાજર',
    ur: 'غیر حاضر',
    kn: 'ಗೈರುಹಾಜರಿ',
    or: 'ଅନୁପସ୍ଥିତ',
    pa: 'ਗੈਰ-ਹਾਜ਼ਰ',
  },
  checked_in: {
    en: 'Checked In',
    hi: 'गेट आगमन दर्ज',
    bn: 'চেক ইন সম্পন্ন',
    mr: 'आगमन नोंदवले',
    te: 'చెకిన్ పూర్తయింది',
    ta: 'செக்-இன் செய்யப்பட்டது',
    gu: 'આગમન નોંધાયેલ',
    ur: 'آمد درج ہے',
    kn: 'ಚೆಕ್ ಇನ್ ಆಗಿದೆ',
    or: 'ଚେକ୍ ଇନ୍ ହୋଇଛି',
    pa: 'ਚੈੱਕ-ਇਨ ਹੋਇਆ',
  },
  in_queue: {
    en: 'Waiting in Yard',
    hi: 'मंडी कतार में',
    bn: 'লাইনে অপেক্ষারত',
    mr: 'रांगेत प्रतीक्षेत',
    te: 'క్యూలో వేచి ఉంది',
    ta: 'வரிசையில் காத்திருக்கிறது',
    gu: 'કતારમાં પ્રતીક્ષા',
    ur: 'قطار میں منتظر',
    kn: 'ಸರದಿಯಲ್ಲಿ ಕಾಯುತ್ತಿದ್ದಾರೆ',
    or: 'ଧାଡ଼ିରେ ଅପେକ୍ଷା',
    pa: 'ਕਤਾਰ ਵਿੱਚ ਉਡੀਕ',
  },
  turn_approaching: {
    en: 'Turn Approaching',
    hi: 'आपकी बारी आने वाली है',
    bn: 'আপনার পালা আসছে',
    mr: 'तुमची पाळी येत आहे',
    te: 'మీ వంతు వస్తోంది',
    ta: 'உங்கள் முறை வருகிறது',
    gu: 'તમારો વારો આવી રહ્યો છે',
    ur: 'آپ کی باری آنے والی ہے',
    kn: 'ನಿಮ್ಮ ಸರದಿ ಹತ್ತಿರದಲ್ಲಿದೆ',
    or: 'ଆପଣଙ୍କ ପାଳି ଆସୁଛି',
    pa: 'ਤੁਹਾਡੀ ਵਾਰੀ ਆ ਰਹੀ ਹੈ',
  },
  rescheduled: {
    en: 'Rescheduled',
    hi: 'पुनर्निर्धारित',
    bn: 'পুনর্নির্ধারিত',
    mr: 'पुन्हा नियोजित',
    te: 'రీషెడ్యూల్ చేయబడింది',
    ta: 'மறுதிட்டமிடப்பட்டது',
    gu: 'પુનઃનિર્ધારિત',
    ur: 'دوبارہ شیڈول',
    kn: 'ಮರುಹೊಂದಿಸಲಾಗಿದೆ',
    or: 'ପୁନଃନିର୍ଦ୍ଧାରିତ',
    pa: 'ਮੁੜ-ਨਿਰਧਾਰਿਤ',
  },
  pending: {
    en: 'Pending',
    hi: 'लंबित',
    bn: 'মুলতুবি',
    mr: 'प्रलंबित',
    te: 'పెండింగ్‌లో ఉంది',
    ta: 'நிலுவையில் உள்ளது',
    gu: 'બાકી',
    ur: 'زیر التوا',
    kn: 'ಬಾಕಿ ಇದೆ',
    or: 'ବକେୟା',
    pa: 'ਬਕਾਇਆ',
  },
  paid: {
    en: 'Paid / Credited',
    hi: 'भुगतान पूर्ण (खाते में जमा)',
    bn: 'পরিশোধিত',
    mr: 'जमा झाले',
    te: 'చెల్లించబడింది',
    ta: 'செலுத்தப்பட்டது',
    gu: 'ચુકવેલ',
    ur: 'ادا شدہ / جمع',
    kn: 'ಪಾವತಿಸಲಾಗಿದೆ',
    or: 'ପ୍ରଦତ୍ତ',
    pa: 'ਭੁਗਤਾਨ ਹੋਇਆ',
  },
  credited: {
    en: 'Credited to Bank',
    hi: 'बैंक खाते में जमा',
    bn: 'ব্যাংক অ্যাকাউন্টে জমা',
    mr: 'बँकेत जमा झाले',
    te: 'బ్యాంకులో జమ అయింది',
    ta: 'வங்கியில் வரவு வைக்கப்பட்டது',
    gu: 'બેંક ખાતામાં જમા',
    ur: 'بینک میں جمع',
    kn: 'ಖಾತೆಗೆ ಜಮೆಯಾಗಿದೆ',
    or: 'ବ୍ୟାଙ୍କ ଜମା',
    pa: 'ਬੈਂਕ ਵਿੱਚ ਜਮ੍ਹਾਂ',
  },
  failed: {
    en: 'Failed',
    hi: 'विफल',
    bn: 'ব্যর্থ',
    mr: 'अयशस्वी',
    te: 'విఫలమైంది',
    ta: 'தோல்வி',
    gu: 'નિષ્ફળ',
    ur: 'ناکام',
    kn: 'ವಿಫಲವಾಗಿದೆ',
    or: 'ବିଫଳ',
    pa: 'ਅਸਫਲ',
  },
  scheduled: {
    en: 'Scheduled',
    hi: 'निर्धारित',
    bn: 'নির্ধারিত',
    mr: 'नियोजित',
    te: 'షెడ్యూల్ చేయబడింది',
    ta: 'திட்டமிடப்பட்டது',
    gu: 'નિર્ધારિત',
    ur: 'شیڈول شدہ',
    kn: 'ನಿಗದಿಪಡಿಸಲಾಗಿದೆ',
    or: 'ନିର୍ଦ୍ଧାରିତ',
    pa: 'ਨਿਰਧਾਰਿਤ',
  },
};

/**
 * Translate a status string into the selected language.
 */
export function translateStatus(status: string, lang: Language): string {
  if (!status) return '';
  const key = status.toLowerCase().replace(/[\s-]/g, '_').trim();
  if (STATUS_TRANSLATIONS[key]) {
    return STATUS_TRANSLATIONS[key][lang] || STATUS_TRANSLATIONS[key].en;
  }
  // Try matching words
  for (const [k, translations] of Object.entries(STATUS_TRANSLATIONS)) {
    if (key.includes(k) || k.includes(key)) {
      return translations[lang] || translations.en;
    }
  }
  return status;
}

/**
 * Multi-language weight units.
 */
const UNIT_TRANSLATIONS: Record<string, Record<Language, string>> = {
  quintal: {
    en: 'Quintal',
    hi: 'क्विंटल',
    bn: 'কুইন্টাল',
    mr: 'क्विंटल',
    te: 'క్వింటాల్',
    ta: 'குவிண்டால்',
    gu: 'ક્વિન્ટલ',
    ur: 'کوئنٹل',
    kn: 'ಕ್ವಿಂಟಾಲ್',
    or: 'କ୍ୱିଣ୍ଟାଲ',
    pa: 'ਕੁਇੰਟਲ',
  },
  quintals: {
    en: 'Quintals',
    hi: 'क्विंटल',
    bn: 'কুইন্টাল',
    mr: 'क्विंटल',
    te: 'క్వింటాళ్లు',
    ta: 'குவிண்டால்கள்',
    gu: 'ક્વિન્ટલ',
    ur: 'کوئنٹل',
    kn: 'ಕ್ವಿಂಟಾಲ್‌ಗಳು',
    or: 'କ୍ୱିଣ୍ଟାଲ',
    pa: 'ਕੁਇੰਟਲ',
  },
  qtl: {
    en: 'Qtl',
    hi: 'क्विंटल',
    bn: 'কুইন্টাল',
    mr: 'क्विंटल',
    te: 'క్వింటాల్',
    ta: 'குவிண்டால்',
    gu: 'ક્વિન્ટલ',
    ur: 'کوئنٹل',
    kn: 'ಕ್ವಿಂಟಾಲ್',
    or: 'କ୍ୱିଣ୍ଟାଲ',
    pa: 'ਕੁਇੰਟਲ',
  },
  kg: {
    en: 'Kg',
    hi: 'किग्रा',
    bn: 'কেজি',
    mr: 'किग्रॅ',
    te: 'కిలో',
    ta: 'கிலோ',
    gu: 'કિગ્રા',
    ur: 'کلو',
    kn: 'ಕೆಜಿ',
    or: 'କେଜି',
    pa: 'ਕਿਲੋ',
  },
};

/**
 * Translate a weight unit string into the selected language.
 */
export function translateUnit(unit: string, lang: Language): string {
  if (!unit) return '';
  const key = unit.toLowerCase().trim();
  if (UNIT_TRANSLATIONS[key]) {
    return UNIT_TRANSLATIONS[key][lang] || UNIT_TRANSLATIONS[key].en;
  }
  return unit;
}

/**
 * Localize date string into the user's language locale.
 */
export function formatLocalizedDate(date: string | Date, lang: Language): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    
    const localeMap: Record<Language, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      bn: 'bn-IN',
      mr: 'mr-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      gu: 'gu-IN',
      ur: 'ur-PK',
      kn: 'kn-IN',
      or: 'or-IN',
      pa: 'pa-IN',
    };
    
    return d.toLocaleDateString(localeMap[lang] || 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(date);
  }
}
