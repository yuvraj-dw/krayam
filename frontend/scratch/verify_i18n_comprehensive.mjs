import { translations } from '../src/i18n/translations.ts';
import { operatorTranslations } from '../src/i18n/operatorTranslations.ts';
import { isRtlLanguage, translateCrop, translateStatus, translateUnit, formatLocalizedDate } from '../src/i18n/helpers.ts';
import { INDIAN_LANGUAGES } from '../src/i18n/languages.ts';

console.log('=== KRAYAM FULL I18N VERIFICATION SUITE ===\n');

// 1. Check all 11 languages exist in translations
const expectedLangs = ['en', 'hi', 'bn', 'mr', 'te', 'ta', 'gu', 'ur', 'kn', 'or', 'pa'];
let passed = 0;
let failed = 0;

function assert(condition, desc) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

console.log('1. Verifying Language Coverage in Translations:');
for (const lang of expectedLangs) {
  assert(!!translations[lang], `translations[${lang}] is defined`);
  assert(!!operatorTranslations[lang], `operatorTranslations[${lang}] is defined`);
}

// 2. Check Key Completeness
console.log('\n2. Verifying Key Parity across All 11 Languages:');
const enKeys = Object.keys(translations.en);
console.log(`Total Farmer Translation Keys: ${enKeys.length}`);

for (const lang of expectedLangs) {
  if (lang === 'en') continue;
  const langKeys = Object.keys(translations[lang]);
  const missing = enKeys.filter(k => !translations[lang][k]);
  assert(missing.length === 0, `${lang}: Has all ${enKeys.length} farmer keys (missing: ${missing.length})`);
}

const enOpKeys = Object.keys(operatorTranslations.en);
console.log(`Total Operator Translation Keys: ${enOpKeys.length}`);

for (const lang of expectedLangs) {
  if (lang === 'en') continue;
  const missing = enOpKeys.filter(k => !operatorTranslations[lang][k]);
  assert(missing.length === 0, `${lang}: Has all ${enOpKeys.length} operator keys (missing: ${missing.length})`);
}

// 3. Test RTL Support
console.log('\n3. Verifying RTL Detection:');
assert(isRtlLanguage('ur') === true, 'Urdu is identified as RTL');
assert(isRtlLanguage('hi') === false, 'Hindi is identified as LTR');
assert(isRtlLanguage('en') === false, 'English is identified as LTR');
assert(isRtlLanguage('pa') === false, 'Punjabi is identified as LTR');

// 4. Test Crop Translation
console.log('\n4. Verifying Crop Translation Helper:');
const cropsToTest = ['wheat', 'paddy', 'mustard', 'soybean', 'cotton', 'gram', 'maize', 'barley'];
for (const crop of cropsToTest) {
  const hiCrop = translateCrop(crop, 'hi');
  const paCrop = translateCrop(crop, 'pa');
  const urCrop = translateCrop(crop, 'ur');
  assert(hiCrop && hiCrop !== crop, `Crop '${crop}' translates in Hindi -> '${hiCrop}'`);
  assert(paCrop && paCrop !== crop, `Crop '${crop}' translates in Punjabi -> '${paCrop}'`);
  assert(urCrop && urCrop !== crop, `Crop '${crop}' translates in Urdu -> '${urCrop}'`);
}

// 5. Test Status Translation
console.log('\n5. Verifying Operational Status Translation Helper:');
const statusesToTest = ['CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'IN_QUEUE', 'TURN_APPROACHING', 'NO_SHOW', 'CHECKED_IN'];
for (const st of statusesToTest) {
  const hiStatus = translateStatus(st, 'hi');
  const mrStatus = translateStatus(st, 'mr');
  const bnStatus = translateStatus(st, 'bn');
  assert(hiStatus && hiStatus !== st, `Status '${st}' translates in Hindi -> '${hiStatus}'`);
  assert(mrStatus && mrStatus !== st, `Status '${st}' translates in Marathi -> '${mrStatus}'`);
  assert(bnStatus && bnStatus !== st, `Status '${st}' translates in Bengali -> '${bnStatus}'`);
}

// 6. Test Unit Translation
console.log('\n6. Verifying Weight Unit Translation Helper:');
assert(translateUnit('Qtl', 'hi') === 'क्विंटल', 'Qtl translates to क्विंटल in Hindi');
assert(translateUnit('Quintal', 'pa') === 'ਕੁਇੰਟਲ', 'Quintal translates to ਕੁਇੰਟਲ in Punjabi');
assert(translateUnit('kg', 'hi') === 'किग्रा', 'kg translates to किग्रा in Hindi');

// 7. Test Date Localization
console.log('\n7. Verifying Date Localization:');
const testDate = new Date('2026-09-17T12:00:00Z');
const hiDate = formatLocalizedDate(testDate, 'hi');
const paDate = formatLocalizedDate(testDate, 'pa');
const enDate = formatLocalizedDate(testDate, 'en');
console.log(`  Hindi Date: ${hiDate}`);
console.log(`  Punjabi Date: ${paDate}`);
console.log(`  English Date: ${enDate}`);
assert(hiDate.length > 0, 'Hindi formatted date generated');
assert(paDate.length > 0, 'Punjabi formatted date generated');
assert(enDate.length > 0, 'English formatted date generated');

console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL I18N TESTS PASSED PERFECTLY!\n');
}
