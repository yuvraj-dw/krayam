import fs from 'fs';

let code = fs.readFileSync('src/i18n/operatorTranslations.ts', 'utf8');

// 1. Remove duplicate interface entries
code = code.replace(/\n\s*allStatuses:\s*string;\s*\n\s*allSlots:\s*string;\s*\n}/g, '\n}');

// 2. Remove the duplicate added keys near predictedWaitTime
code = code.replace(/("predictedWaitTime":\s*"[^"]*",\s*\r?\n)\s*"allStatuses":\s*"[^"]*",\s*\r?\n\s*"allSlots":\s*"[^"]*",\s*\r?\n/g, '$1');

fs.writeFileSync('src/i18n/operatorTranslations.ts', code, 'utf8');
console.log('Successfully cleaned duplicate entries');
