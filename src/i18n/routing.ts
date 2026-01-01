import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  // Supported locales (admin area uses /[locale]/...)
  locales: ['en', 'ar'],

  // Used when no locale matches
  defaultLocale: 'en'
});
