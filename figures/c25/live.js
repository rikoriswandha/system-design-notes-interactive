export default function mount(root, ctx, K, DATA) {
  const { k } = K;
  const stage = ctx.stage;
  const flaps = [...root.querySelectorAll('[data-shard]')].sort((a, b) => Number(a.dataset.shard) - Number(b.dataset.shard));
  const movers = [...root.querySelectorAll('[data-carriage], [data-bearing]')];
  const values = [...root.querySelectorAll('[data-value]')].sort((a, b) => Number(a.dataset.value) - Number(b.dataset.value));
  const shardValues = [...root.querySelectorAll('[data-shard-value]')].sort((a, b) => Number(a.dataset.shardValue) - Number(b.dataset.shardValue));
  const units = [...root.querySelectorAll('[data-unit]')].sort((a, b) => Number(a.dataset.unit) - Number(b.dataset.unit));
  const collectorCount = root.querySelector('[data-merge-count]');
  const needle = root.querySelector('[data-needle]');
  const buttons = [...root.querySelectorAll('g[data-mode]')].sort((a, b) => Number(a.dataset.mode) - Number(b.dataset.mode));
  const modes = ['single', 'hash', 'range'];
  const painterItems = DATA.sorting.map((item, index) => ({ ...item, node: root.querySelector(`[data-item="${item.id}"]`), slot: index }));
  const shardCenters = DATA.slots.map(([px, pz]) => k.iso([px, 17, pz], DATA.P));
  let highlighted = -1, highlightedCount = -1, drawnLoad = NaN, drawnX = NaN, description = '';
  let sortedAt = NaN;
  let state, result, count = 1, selected = 0, x = 0, target = 0, load = 0, loadTarget = 0;
  let raf = 0, last = 0, clock = 0, visible = true, timer = 0, touring = false, hovered = false, focused = false, dead = false;
  function text() {
    if (!result) return;
    values.forEach((el, i) => { el.textContent = ctx.format(result.metrics[i].value); });
    shardValues.forEach((el, i) => {
      el.textContent = i < count && (state.mode === 'hash' || i === 0) ? ctx.format(state.k) : '';
      el.setAttribute('font-size', state.k >= 1000 ? '7' : '10');
    });
    collectorCount.textContent = ctx.format(result.metrics[1].value);
    units.forEach((el, i) => { el.textContent = ctx.t(`unit.${i}`); });
    ctx.readout(ctx.t(count === 1 ? 'readout.one' : 'readout.many', { mode: ctx.t(`mode.${state.mode}`), n: ctx.format(count), k: ctx.format(result.metrics[1].value) }));
    const nextDescription = ctx.t(count === 1 ? 'description.one' : 'description.many', { mode: ctx.t(`mode.${state.mode}`), n: ctx.format(count), write: ctx.format(result.metrics[0].value), candidates: ctx.format(result.metrics[1].value), memory: ctx.format(result.metrics[2].value), util: ctx.format(result.metrics[3].value) });
    if (nextDescription !== description) { description = nextDescription; ctx.describe(description); }
  }
  function draw() {
    if (x !== drawnX) {
      const transform = k.translateAlong(DATA.P, [x, 0, 0]);
      movers.forEach(el => el.setAttribute('transform', transform));
      drawnX = x;
    }
    if (load !== drawnLoad) {
      const nx = DATA.needle.start + load * DATA.needle.span;
      needle.setAttribute('d', k.lineOnTop([nx, DATA.needle.y0], [nx, DATA.needle.y1], DATA.needle.z, DATA.P));
      drawnLoad = load;
    }
    if (x !== sortedAt) {
      const share = x / (DATA.travel * 7);
      painterItems.sort((a, b) => a.key + a.lift * share - b.key - b.lift * share);
      if (painterItems.some((item, index) => item.slot !== index)) {
        const fragment = document.createDocumentFragment();
        painterItems.forEach((item, index) => { fragment.appendChild(item.node); item.slot = index; });
        ctx.svg.insertBefore(fragment, needle);
      }
      sortedAt = x;
    }
  }
  function highlight() {
    if (highlighted === selected && highlightedCount === count) return;
    flaps.forEach((el, i) => el.setAttribute('opacity', i >= count ? '0.20' : i === selected ? '1' : '0.72'));
    highlighted = selected;
    highlightedCount = count;
  }
  const canTour = () => state?.mode === 'hash' && count > 1 && !ctx.reduced();
  function run() { if (!raf && visible && !dead && (touring || x !== target || load !== loadTarget)) { last = 0; raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
    last = now;
    if (!canTour()) touring = false;
    if (touring && state) {
      clock += dt;
      const gather = state.mode === 'hash' ? count : 1;
      selected = Math.floor(clock / 0.9) % gather;
      target = (selected % 8) * DATA.travel;
      highlight();
    }
    const ease = ctx.reduced() ? 1 : 1 - Math.exp(-dt / 0.24);
    x += (target - x) * ease;
    load += (loadTarget - load) * ease;
    if (Math.abs(target - x) < 0.02) x = target;
    if (Math.abs(loadTarget - load) < 0.0001) load = loadTarget;
    draw();
    if (visible && ((touring && canTour()) || x !== target || load !== loadTarget)) raf = requestAnimationFrame(tick);
  }
  function resume(delay) {
    clearTimeout(timer);
    if (canTour() && !hovered && !focused && visible) timer = setTimeout(() => {
      if (!canTour() || hovered || focused || !visible || dead) return;
      touring = true; clock = selected * 0.9; run();
    }, delay);
  }
  function hold() { touring = false; clearTimeout(timer); run(); }
  function preview(event) {
    hold();
    const rect = ctx.svg.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width * 600;
    const py = (event.clientY - rect.top) / rect.height * 380;
    let nearest = Infinity;
    for (let i = 0; i < count; i++) {
      const [sx, sy] = shardCenters[i];
      const distance = (sx - px) ** 2 + (sy - py) ** 2;
      if (distance < nearest) { selected = i; nearest = distance; }
    }
    target = (selected % 8) * DATA.travel;
    highlight();
    run();
  }
  function change(mode) {
    hold();
    if (ctx.set({ mode })) ctx.announce(ctx.t(`phase.${mode}`));
    resume(3600);
  }
  function press(event) {
    const hit = event.target.closest('g[data-mode]');
    if (hit) change(modes[Number(hit.dataset.mode)]);
  }
  function enter() { hovered = true; hold(); }
  function leave() { hovered = false; resume(3600); }
  function focus() { focused = true; hold(); text(); }
  function blur() { focused = false; resume(3600); }
  function keys(event) {
    if (!state) return;
    const index = modes.indexOf(state.mode);
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'Escape'].includes(event.key)) {
      event.preventDefault(); hold();
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') ctx.set({ shards: Math.max(1, Math.min(32, state.shards + (event.key === 'ArrowUp' ? 1 : -1))) });
      else if (event.key === 'Escape') { selected = 0; target = 0; highlight(); run(); }
      else change(modes[event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowLeft' ? 2 : 1)) % 3]);
    }
  }
  const listeners = [['pointerenter', enter], ['pointerleave', leave], ['pointermove', preview], ['click', press], ['focus', focus], ['blur', blur], ['keydown', keys]];
  listeners.forEach(([name, fn]) => stage.addEventListener(name, fn));
  const observer = new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) { run(); resume(1400); }
    else { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); }
  }, { rootMargin: '120px 0px' });
  observer.observe(stage);
  return {
    update(s, r) {
      if (!s || !r) return;
      const changed = state && state.mode !== s.mode;
      state = s; result = r; count = s.mode === 'single' ? 1 : s.shards;
      selected = changed ? 0 : Math.min(selected, count - 1); target = (selected % 8) * DATA.travel;
      loadTarget = r.bars[0].value / 100000;
      flaps.forEach((el, i) => { el.dataset.active = String(i < count); });
      highlighted = -1;
      highlight();
      buttons.forEach((el, i) => el.setAttribute('opacity', modes[i] === s.mode ? '1' : '0.35'));
      root.dataset.mode = s.mode; root.dataset.shards = String(count);
      text();
      if (ctx.reduced()) { x = target; load = loadTarget; draw(); }
      else run();
      resume(1400);
    },
    relocalize() { text(); ctx.announce(''); },
    destroy() { dead = true; cancelAnimationFrame(raf); clearTimeout(timer); observer.disconnect(); listeners.forEach(([name, fn]) => stage.removeEventListener(name, fn)); }
  };
}
