import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      'app.title': 'Pediatric Psychology Knowledge Base',
      'app.search': 'Search',
      'app.search.placeholder': 'Search for guidance...',
      'app.language': 'Language',
      'app.role': 'Role',
      'app.export': 'Export',
      'app.cards.found': '{{count}} card found',
      'app.cards.found_plural': '{{count}} cards found',
      'app.card.view': 'View Card',
      'app.card.export': 'Export Card',
      'app.login': 'Login',
      'app.logout': 'Logout',
      'app.dashboard': 'Dashboard',
      'app.admin': 'Admin',
      'app.loading': 'Loading...',
      'app.error': 'An error occurred',
      'app.no_results': 'No results found',
      'app.try_different_search': 'Try a different search term',
    },
  },
  hi: {
    translation: {
      'app.title': 'बाल मनोविज्ञान ज्ञान आधार',
      'app.search': 'खोजें',
      'app.search.placeholder': 'मार्गदर्शन खोजें...',
      'app.language': 'भाषा',
      'app.role': 'भूमिका',
      'app.export': 'निर्यात',
      'app.cards.found': '{{count}} कार्ड मिला',
      'app.cards.found_plural': '{{count}} कार्ड मिले',
      'app.card.view': 'कार्ड देखें',
      'app.card.export': 'कार्ड निर्यात करें',
      'app.login': 'लॉगिन',
      'app.logout': 'लॉगआउट',
      'app.dashboard': 'डैशबोर्ड',
      'app.admin': 'व्यवस्थापक',
      'app.loading': 'लोड हो रहा है...',
      'app.error': 'एक त्रुटि हुई',
      'app.no_results': 'कोई परिणाम नहीं मिला',
      'app.try_different_search': 'एक अलग खोज शब्द आजमाएं',
    },
  },
  ar: {
    translation: {
      'app.title': 'قاعدة معرفة علم النفس للأطفال',
      'app.search': 'بحث',
      'app.search.placeholder': 'ابحث عن إرشادات...',
      'app.language': 'اللغة',
      'app.role': 'الدور',
      'app.export': 'تصدير',
      'app.cards.found': 'تم العثور على {{count}} بطاقة',
      'app.cards.found_plural': 'تم العثور على {{count}} بطاقات',
      'app.card.view': 'عرض البطاقة',
      'app.card.export': 'تصدير البطاقة',
      'app.login': 'تسجيل الدخول',
      'app.logout': 'تسجيل الخروج',
      'app.dashboard': 'لوحة التحكم',
      'app.admin': 'المسؤول',
      'app.loading': 'جاري التحميل...',
      'app.error': 'حدث خطأ',
      'app.no_results': 'لم يتم العثور على نتائج',
      'app.try_different_search': 'جرب مصطلح بحث مختلف',
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;