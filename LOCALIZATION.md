# Adding a language

The application separates simulation algorithms, message catalogs, and locale metadata. The built-in catalogs are complete for **Bahasa Indonesia (`id`)** and **English (`en`)**, including all 28 chapters, exercises, result messages, and the original three visual labs.

## Files

| File | Purpose |
|---|---|
| `dist/locales/registry.js` | Available language codes, native display names, Intl locales, text direction, and catalog paths |
| `dist/locales/id.json` | Default/fallback messages |
| `dist/locales/en.json` | English messages with the same keys |
| `dist/i18n.js` | Catalog loading, fallback, interpolation, plural variants, formatting, preference, and document language |
| `dist/modules/group-*.js` | Shared chapter definitions and algorithms, referencing translation keys through `t()` |
| `dist/course.js` | Shared course UI |
| `dist/app.js` | Shared visual-lab UI and algorithms |

## Add a catalog

1. Copy `dist/locales/en.json` to a new catalog, for example `dist/locales/de.json`.
2. Translate **values only**. Preserve keys and all named placeholders such as `{count}`, `{capacity}`, and `{title}`. Do not translate code identifiers, URLs, equations, or enum IDs. Do not add HTML: catalog messages are plain text. Keep intentionally empty unit messages empty.
3. Add one entry to `languages` in `dist/locales/registry.js`:

```js
{ code: 'de', name: 'Deutsch', intl: 'de-DE', dir: 'ltr', file: 'locales/de.json' }
```

4. Run `npm run check:locales`. Use `node scripts/check-locales.cjs --strict` to require every registered catalog to be complete. Run `npm test` for model and integration regressions.
5. Start `npm run dev`, open `http://localhost:8000/?lang=de`, and review lessons, exercises, dynamic results, mobile layouts, and the visual labs. No application or simulation changes are needed to register the new language.

For an RTL language, use `dir: 'rtl'` and the matching Intl locale. The course shell includes direction-aware styling; a native speaker should still check the translated UI and diagrams. Missing messages fall back individually to Indonesian. A missing requested catalog falls back to the default at initial load; a failed language switch retains the active language and shows an error.

## Complete sentences and placeholders

Prefer one key for a complete message, allowing translators to reorder its parts:

```js
t('c19.lab.result.capacity', { count: activeConsumers, capacity })
```

```json
{
  "c19.lab.result.capacity": "{count} consumers provide {capacity} events/s."
}
```

Numeric parameters use the active language's `Intl.NumberFormat`. `I18n.format(value, options)` accepts additional number-format options. Parameter values are inserted as plain text, never evaluated as code.

Optional plural variants use the categories from `Intl.PluralRules`:

```json
{
  "example.items": "{count} items",
  "example.items.one": "{count} item",
  "example.items.other": "{count} items"
}
```

Call `t('example.items', { count })`. Categories such as `zero`, `two`, `few`, and `many` can be added for languages that use them. Without a matching variant, the base message is used. Base catalog keys should stay stable as content evolves; add descriptive new keys rather than reusing an old key for a different meaning.

## Runtime behavior

- Initial language: supported `?lang=` value, then saved device preference, then Indonesian. Unknown language codes resolve to Indonesian.
- Selecting a language updates `html[lang]`, `html[dir]`, translated labels, number formatting, and the URL query parameter. The chapter hash is preserved.
- Language preference is saved in `localStorage` when available. Storage denial does not prevent switching.
- Course parameters are held in memory. Switching languages preserves the active chapter, tab, and values. The existing visual-lab iframe remains mounted and changes locale in place.
- Navigating away from a visual lab still resets that lab when revisited, as before.
- Catalogs load over HTTP from the same origin. Serve `dist/`; opening HTML through `file://` is not supported.

## Validation scope

Tests check ID/EN key and placeholder parity, defaults/presets/control boundaries against pre-localization numerical fixtures, all 168 chapter/mode/language combinations, 374 UI event paths, locale selection, persistence, fallback, plural rules, RTL metadata, and legacy-lab state preservation. The DOM harness tests behavior, not visual rendering. Real-browser, translated-layout, and native-speaker review remain useful before adding a new locale.
