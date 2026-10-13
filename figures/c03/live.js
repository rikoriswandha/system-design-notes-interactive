export default function mount(root, ctx, K, DATA) {
  const { k } = K;
  const { P, cx, cy, z, gx, gy, knobs, defaults, stopRadii } = DATA;
  const stage = ctx.stage;
  const names = ['scope', 'high', 'wrap', 'total'];
  const ranges = { scope: [1, 20, 1], high: [5, 30, 1], wrap: [1, 10, 1], total: [30, 90, 5] };
  const sectors = Object.fromEntries(['scope', 'high', 'deep', 'wrap', 'short', 'over'].map(name =>
    [name, root.querySelector(`[data-sector="${name}"]`)]));
  const stops = [0, 1, 2].map(i => root.querySelector(`[data-stop="${i}"]`));
  const counters = names.map((_, i) => root.querySelector(`[data-count="${i}"]`));
  const scale = root.querySelector('[data-part="tick-scale"]');
  const needle = root.querySelector('[data-part="share"]');
  const hand = root.querySelector('[data-part="hand"]');
  const grooves = root.querySelector('[data-part="deep-grooves"]');
  const totalText = root.querySelector('[data-part="total"]');
  const shareText = root.querySelector('[data-part="share-value"]');
  const capRings = names.map((_, i) => root.querySelector(`[data-cap="${i}"] .iso-line`));
  let state = null, result = null, selected = 0, preview = null;
  let frame = 0, last = 0, visible = true, timer = 0;
  let touring = false, tourIndex = 0, tourTimer = 0, hovered = false, focused = false, dead = false;
  let scan = 0, values = [0, 0, 0, 0, 0, 0, 0], targets = values.slice();
  let stopOrder = '', geometryDirty = true, renderedScan = NaN, scaleTotal = null, described = '';
  const attr = (element, name, value) => {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  };
  const text = (element, value) => {
    if (element.textContent !== value) element.textContent = value;
  };

  function annulus(inner, outer, start, end) {
    if (end - start < 0.0001) return '';
    const points = [], steps = Math.max(2, Math.ceil((end - start) * 100));
    for (let i = 0; i <= steps; i++) {
      const a = (start + (end - start) * i / steps) * Math.PI * 2;
      points.push([Math.sin(a) * outer, -Math.cos(a) * outer]);
    }
    for (let i = steps; i >= 0; i--) {
      const a = (start + (end - start) * i / steps) * Math.PI * 2;
      points.push([Math.sin(a) * inner, -Math.cos(a) * inner]);
    }
    return k.pathOf(points, true);
  }
  function words() {
    if (!state) return;
    ctx.readout(ctx.t('readout', {
      deep: ctx.format(result.metrics[0].value),
      over: ctx.format(result.metrics[1].value),
      gap: ctx.format(result.metrics[2].value)
    }));
    const description = ctx.t('selection', {
      name: ctx.t(`control.${names[selected]}`), value: ctx.format(state[names[selected]]),
      share: ctx.format(result.metrics[3].value)
    });
    if (description !== described) { ctx.describe(description); described = description; }
    text(totalText, ctx.t('minutes', { value: ctx.format(state.total) }));
    counters.forEach((counter, i) => { text(counter, ctx.format(state[names[i]])); });
    text(shareText, ctx.format(result.metrics[3].value / 100, { style: 'percent', maximumFractionDigits: 0 }));
    capRings.forEach((ring, i) => attr(ring, 'data-tone', focused && i === selected ? 'mid' : 'faint'));
  }
  function draw() {
    if (geometryDirty) {
      let start = 0;
      ['scope', 'high', 'deep', 'wrap'].forEach((name, i) => {
        const end = start + values[i];
        attr(sectors[name], 'd', annulus(16, 46, Math.min(start, 1), Math.min(end, 1)));
        start = end;
      });
      const deepStart = Math.min(values[0] + values[1], 1);
      const deepEnd = Math.min(values[0] + values[1] + values[2], 1);
      attr(grooves, 'd', [24, 32, 40].map(radius => annulus(radius, radius + 0.15, deepStart, deepEnd)).join(''));
      attr(sectors.short, 'd', annulus(50, 52, Math.min(values[0], 1), Math.min(values[0] + values[4], 1)));
      attr(sectors.over, 'd', annulus(61, 63, 0, Math.min(values[5], 1)));
      const ends = [values[0], values[0] + values[1], deepEnd];
      const ordered = [];
      ends.forEach((fraction, i) => {
        const angle = Math.min(fraction, 1) * Math.PI * 2;
        const original = defaults[i] * Math.PI * 2;
        attr(stops[i], 'transform', k.translateAlong(P, [
          (Math.sin(angle) - Math.sin(original)) * stopRadii[i],
          (-Math.cos(angle) + Math.cos(original)) * stopRadii[i], 0
        ]));
        ordered.push({ index: i, depth: k.depthOf([cx + Math.sin(angle) * stopRadii[i], cy - Math.cos(angle) * stopRadii[i], z + 2], P) });
      });
      ordered.sort((a, b) => a.depth - b.depth);
      const nextOrder = ordered.map(item => item.index).join('');
      if (nextOrder !== stopOrder) {
        ordered.forEach(item => hand.parentElement.parentElement.insertBefore(stops[item.index], hand.parentElement));
        stopOrder = nextOrder;
      }
      const shareAngle = values[6] * Math.PI * 2;
      attr(needle, 'd', k.lineOnTop([gx, gy],
        [gx + Math.sin(shareAngle) * 16, gy - Math.cos(shareAngle) * 16], 17.1, P));
      geometryDirty = false;
    }
    if (scan !== renderedScan) {
      const angle = scan * Math.PI * 2, sx = Math.sin(angle), sy = -Math.cos(angle);
      const point = (distance, width) => [sx * distance - sy * width, sy * distance + sx * width];
      attr(hand, 'd', k.pathOf([point(-7, 1.5), point(40, 1.3), point(44, 0), point(40, -1.3), point(-7, -1.5)], true));
      renderedScan = scan;
    }
  }
  function tick(now) {
    frame = 0;
    if (dead || !visible) return;
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const calm = ctx.reduced();
    let moving = false;
    values = values.map((value, i) => {
      let next = calm ? targets[i] : value + (targets[i] - value) * (1 - Math.exp(-dt / 0.24));
      if (Math.abs(next - targets[i]) < 0.00005) next = targets[i]; else moving = true;
      if (next !== value) geometryDirty = true;
      return next;
    });
    // A timer chooses real stop locations; rAF only runs during the eased travel.
    const boundaries = [0, Math.min(values[0], 1), Math.min(values[0] + values[1], 1), Math.min(values[0] + values[1] + values[2], 1)];
    const targetScan = preview !== null ? preview : touring && !calm
      ? boundaries[tourIndex] : boundaries[focused && selected < 3 ? selected + 1 : 3];
    const delta = ((targetScan - scan + 1.5) % 1) - 0.5;
    scan = calm || Math.abs(delta) <= 0.0005 ? targetScan % 1
      : (scan + delta * (1 - Math.exp(-dt / 0.3)) + 1) % 1;
    if (!calm && Math.abs(delta) > 0.0005) moving = true;
    draw();
    if (moving) frame = requestAnimationFrame(tick);
  }
  function run() {
    if (!frame && visible && !dead) { last = 0; frame = requestAnimationFrame(tick); }
  }
  function scheduleTour() {
    clearTimeout(tourTimer);
    if (!touring || !visible || hovered || focused || dead || ctx.reduced()) return;
    tourTimer = setTimeout(() => {
      tourIndex = (tourIndex + 1) % 4;
      run(); scheduleTour();
    }, 2200);
  }
  function resume(delay) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!hovered && !focused && !ctx.reduced()) {
        touring = true; tourIndex = 0; run(); scheduleTour();
      }
    }, delay);
  }
  function pause() { touring = false; clearTimeout(timer); clearTimeout(tourTimer); run(); }
  function change(direction, extreme) {
    if (!state) return;
    const key = names[selected], [min, max, step] = ranges[key];
    const value = extreme === undefined ? Math.max(min, Math.min(max, state[key] + direction * step)) : extreme ? max : min;
    ctx.set({ [key]: value });
  }
  function worldAt(event, planeZ = z) {
    const box = ctx.svg.getBoundingClientRect();
    const sx = (event.clientX - box.left) * 600 / box.width - P.origin[0];
    const sy = (event.clientY - box.top) * 380 / box.height - P.origin[1];
    const camera = k.cameraOf(P);
    const u = sx / camera.k, v = (sy / camera.k + planeZ * camera.cosE) / camera.sinE;
    return [u * camera.sinA + v * camera.cosA, -u * camera.cosA + v * camera.sinA];
  }
  function pointer(event) {
    const [x, y] = worldAt(event);
    if (Math.hypot(x - cx, y - cy) > 64) { preview = null; run(); return; }
    preview = (Math.atan2(x - cx, -(y - cy)) / (Math.PI * 2) + 1) % 1;
    run();
  }
  function enter() { hovered = true; pause(); }
  function leave() { hovered = false; preview = null; pause(); resume(3600); }
  function press(event) {
    pause();
    const [kx, ky] = worldAt(event, 14);
    const knob = knobs.findIndex(([x, y]) => Math.hypot(kx - x, ky - y) < 11);
    if (knob >= 0) { selected = knob; change(event.shiftKey ? -1 : 1); }
    else {
      pointer(event);
      if (preview !== null && state) {
        // A press moves the selected stage's stop; wrap-up is measured backward from zero.
        const elapsed = preview * state.total;
        if (selected === 0) ctx.set({ scope: Math.max(1, Math.min(20, Math.round(elapsed))) });
        else if (selected === 1) ctx.set({ high: Math.max(5, Math.min(30, Math.round(elapsed - state.scope))) });
        else if (selected === 2) ctx.set({ wrap: Math.max(1, Math.min(10, Math.round(state.total - elapsed))) });
      }
    }
    stage.focus({ preventScroll: true });
    words();
  }
  function focus() { focused = true; pause(); words(); }
  function blur() { focused = false; preview = null; words(); resume(3600); }
  function keys(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) return;
    event.preventDefault(); pause(); preview = null;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      selected = (selected + (event.key === 'ArrowRight' ? 1 : 3)) % 4; words();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      change((event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 5 : 1));
    } else if (event.key === 'Home' || event.key === 'End') change(0, event.key === 'End');
    else if (event.key === 'Enter' || event.key === ' ') {
      const choices = ['low', 'medium', 'high'];
      const index = (choices.indexOf(state.ambiguity) + 1) % choices.length;
      ctx.set({ ambiguity: choices[index] });
      ctx.announce(ctx.t('c03.lab.controls.4.options.' + index + '.label'));
    } else { selected = 0; words(); }
    run();
  }
  function down(event) { pause(); pointer(event); }
  function cancel(event) {
    preview = null;
    if (event.pointerType === 'touch') hovered = false;
    pause();
    if (!focused) resume(3600);
  }
  const events = { pointerenter: enter, pointermove: pointer, pointerleave: leave, pointerdown: down, pointercancel: cancel, click: press, focus, blur, keydown: keys };
  Object.entries(events).forEach(([name, handler]) => stage.addEventListener(name, handler));
  const observer = new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) { run(); scheduleTour(); }
    else { cancelAnimationFrame(frame); clearTimeout(tourTimer); frame = 0; }
  }, { rootMargin: '120px 0px' });
  observer.observe(stage);
  resume(1400);
  return {
    update(nextState, nextResult) {
      if (!nextState || !nextResult) return;
      state = nextState; result = nextResult;
      targets = [...result.bars.map(bar => bar.value / state.total), result.metrics[2].value / state.total,
        result.metrics[1].value / state.total, result.metrics[3].value / 100];
      if (scaleTotal !== state.total) {
        const ticks = k.radialTicks(cx, cy, 60, state.total, 5, z, [1.2, 2.7], P);
        scale.innerHTML = k.lineSvg(ticks.minor, { tone: 'lo' }) + k.lineSvg(ticks.major, { tone: 'mid' });
        scaleTotal = state.total;
      }
      words(); run();
    },
    relocalize() { words(); ctx.announce(''); },
    destroy() {
      dead = true; cancelAnimationFrame(frame); clearTimeout(timer); clearTimeout(tourTimer); observer.disconnect();
      Object.entries(events).forEach(([name, handler]) => stage.removeEventListener(name, handler));
    }
  };
}
