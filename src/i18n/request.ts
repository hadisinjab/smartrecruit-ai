import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
 
export default getRequestConfig(async ({requestLocale}) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;
  
  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  
  try {
    const base = (await import(`../messages/en.json`)).default;
    const specific = (await import(`../messages/${locale}.json`)).default;
    const messages = {...base, ...specific};
    return {
      locale,
      messages
    };
  } catch (error) {
    return {
      locale,
      messages: (await import(`../messages/en.json`)).default
    };
  }
});
