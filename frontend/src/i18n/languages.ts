import { Language } from '../types';

export interface LanguageOption {
  code: Language;
  name: string; // Native script name
  englishName: string;
  speakersShare: string; // Census % in India
  regionHint: string;
}

export const INDIAN_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', englishName: 'English', speakersShare: 'Official', regionHint: 'All India' },
  { code: 'hi', name: 'हिन्दी', englishName: 'Hindi', speakersShare: '43.6%', regionHint: 'North & Central India' },
  { code: 'bn', name: 'বাংলা', englishName: 'Bengali', speakersShare: '8.0%', regionHint: 'West Bengal, Tripura, Assam' },
  { code: 'mr', name: 'मराठी', englishName: 'Marathi', speakersShare: '6.9%', regionHint: 'Maharashtra, Goa' },
  { code: 'te', name: 'తెలుగు', englishName: 'Telugu', speakersShare: '6.7%', regionHint: 'Andhra Pradesh, Telangana' },
  { code: 'ta', name: 'தமிழ்', englishName: 'Tamil', speakersShare: '5.7%', regionHint: 'Tamil Nadu, Puducherry' },
  { code: 'gu', name: 'ગુજરાતી', englishName: 'Gujarati', speakersShare: '4.6%', regionHint: 'Gujarat, Daman & Diu' },
  { code: 'ur', name: 'اردو', englishName: 'Urdu', speakersShare: '4.2%', regionHint: 'UP, Bihar, Telangana, J&K' },
  { code: 'kn', name: 'ಕನ್ನಡ', englishName: 'Kannada', speakersShare: '3.6%', regionHint: 'Karnataka' },
  { code: 'or', name: 'ଓଡ଼ିଆ', englishName: 'Odia', speakersShare: '3.1%', regionHint: 'Odisha' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', speakersShare: '2.7%', regionHint: 'Punjab, Haryana, Delhi' },
];
