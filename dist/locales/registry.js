// Add a catalog and one entry here to offer another language. No simulation changes needed.
window.SDL_LOCALE_CONFIG = {
  defaultLocale: 'id',
  storageKey: 'system-design-lab.language',
  languages: [
    { code: 'id', name: 'Bahasa Indonesia', intl: 'id-ID', dir: 'ltr', file: 'locales/id.json' },
    { code: 'en', name: 'English', intl: 'en-US', dir: 'ltr', file: 'locales/en.json' }
  ]
};
