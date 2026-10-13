'use strict';
// Mounts the chapter figure (dist/figures/cNN.js, built by figures/build.mjs) above a lab and keeps it in
// step with the lab's controls. Figures are optional: if a script fails to load or mount, the lab still works.
(() => {
  const scripts = new Map();
  const pad = id => String(id).padStart(2, '0');
  const supported = () => typeof document.createElement === 'function' && !!document.head && typeof requestAnimationFrame === 'function';
  function load(src) {
    if (scripts.has(src)) return scripts.get(src);
    const task = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(script);
    });
    scripts.set(src, task);
    task.catch(() => scripts.delete(src));
    return task;
  }
  let active = null, token = 0;
  const i18n = () => window.I18n;
  function localize(root, id) {
    const t = i18n().t;
    root.querySelectorAll('[data-fig-text]').forEach(el => { el.textContent = t(el.dataset.figText, { number: Number(el.dataset.figNumber ?? id) }); });
    root.querySelectorAll('[data-fig-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.figAria)));
  }
  function contextFor(id, root, options) {
    const stage = root.querySelector('.iso-stage'), readout = root.querySelector('[data-readout]'), live = root.querySelector('[data-live]');
    // aria-valuetext only exists for sliders; any other stage role gets its status through aria-describedby.
    let status = null;
    if (stage.getAttribute('role') !== 'slider') {
      status = document.createElement('span');
      status.className = 'iso-live';
      status.id = `fig-c${pad(id)}-status`;
      stage.after(status);
      stage.setAttribute('aria-describedby', status.id);
    }
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    const prefix = `fig.c${pad(id)}.`;
    return {
      id, root, stage, svg: stage.querySelector('svg'),
      t: (name, params) => i18n().t(/^(fig|c\d\d|ui|legacy)\./.test(name) ? name : prefix + name, params),
      format: (value, opts) => i18n().format(value, opts),
      get locale() { return i18n().locale; },
      get state() { return options.state(); },
      get result() { return options.result(); },
      model: state => (options.model ? options.model(state) : null),
      get frame() { return options.frame ? options.frame() : null; },
      reduced: () => still.matches,
      set: values => options.set ? options.set(values) : false,
      readout(text) { if (readout && readout.textContent !== text) readout.textContent = text; },
      describe(text) {
        if (status) { if (status.textContent !== text) status.textContent = text; }
        else if (stage.getAttribute('aria-valuetext') !== text) stage.setAttribute('aria-valuetext', text);
      },
      announce(text) { if (live) live.textContent = text; },
    };
  }
  function detach() {
    token++;
    if (!active) return;
    try { active.api?.destroy?.(); } catch (error) { console.error('Figure cleanup failed', active.id, error); }
    active.root.remove();
    active = null;
  }
  async function attach(host, chapter, options) {
    if (!host) return;
    host.classList.add('iso');
    host.dataset.theme = 'light';
    if (active && active.id === chapter.id) {
      host.appendChild(active.root);
      active.options = options;
      if (active.locale !== i18n().locale) {
        active.locale = i18n().locale;
        localize(active.root, active.id);
        active.api?.relocalize?.();
      }
      active.api?.update?.(options.state(), options.result());
      return;
    }
    detach();
    if (!supported()) return;
    const mine = ++token;
    try {
      await load('figures/kit.js');
      await load(`figures/c${pad(chapter.id)}.js`);
    } catch (error) { console.warn(error.message); return; }
    if (mine !== token) return;
    const figure = window.COURSE_FIGURES?.[chapter.id];
    if (!figure) return;
    const shell = document.createElement('div');
    shell.innerHTML = figure.markup;
    const root = shell.firstElementChild;
    localize(root, chapter.id);
    host.appendChild(root);
    const entry = { id: chapter.id, root, options, locale: i18n().locale, api: null };
    active = entry;
    try {
      const view = { state: () => entry.options.state(), result: () => entry.options.result(), model: s => entry.options.model?.(s) ?? null, set: v => entry.options.set?.(v), frame: () => entry.options.frame?.() };
      entry.api = figure.mount(root, contextFor(chapter.id, root, view), window.IsoKit, figure.data) || null;
      entry.api?.update?.(options.state(), options.result());
    } catch (error) {
      console.error('Figure failed to mount', chapter.id, error);
      root.remove();
      if (active === entry) active = null;
    }
  }
  function update(id, state, result) {
    if (!active || active.id !== id) return;
    try { active.api?.update?.(state, result); } catch (error) { console.error('Figure update failed', id, error); }
  }
  function relocalize() {
    if (!active) return;
    active.locale = i18n().locale;
    localize(active.root, active.id);
    active.api?.relocalize?.();
  }
  window.CourseFigures = { attach, update, detach, relocalize };
})();
