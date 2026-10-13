export default function mount(root, ctx, K, DATA) {
  const stage = ctx.stage;
  const slider = [...root.querySelectorAll('[data-slider]')];
  const plugged = [...root.querySelectorAll('[data-device]')];
  const signal = root.querySelector('[data-signal]');
  const needle = root.querySelector('[data-needle]');
  const inboxCount = root.querySelector('[data-inbox-count]');
  const names = ['connections', 'heartbeat', 'inbox', 'delivery'];
  const timer = DATA.timer;
  const inbox = K.k.iso(DATA.inbox, DATA.P);
  const inboxSignal = K.k.iso(DATA.inboxSignal, DATA.P);
  const listeners = [];
  const layer = root.querySelector('[data-machine-layer]');
  const pieces = [...layer.children].map((el, order) => ({
    el, order, key: Number(el.dataset.depth), lift: Number(el.dataset.lift),
  }));
  let paintedX = -1;
  let state, result, selected = 0, device = 0;
  let frame = 0, last = 0, visible = true, destroyed = false;
  let hover = stage.matches(':hover'), clock = 0, heartbeatPhase = 0;
  let resume = performance.now() + 1400, x = 0, target = 0;
  let signalPhase = -1, signalOpacity = 0;
  let idleTimer = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let lastDescription = '', lastDevices = -1, lastAngle = NaN;
  let lastSignalX = NaN, lastSignalY = NaN, lastSignalOpacity = NaN;
  let lastTransform = '', lastNeedle = '';

  function listen(name, fn) {
    stage.addEventListener(name, fn);
    listeners.push([name, fn]);
  }
  function text() {
    if (!result) return;
    ctx.readout(ctx.t(`read.${names[selected]}`, { value: ctx.format(result.metrics[selected].value) }));
    const value = ctx.t('counter', { value: ctx.format(result.metrics[2].value) });
    if (inboxCount.textContent !== value) inboxCount.textContent = value;
  }
  function describe() {
    if (!state) return;
    const description = ctx.t('status', {
      members: ctx.format(state.members), devices: ctx.format(state.devices),
      heartbeat: ctx.format(state.heartbeat), online: ctx.format(state.online),
    });
    if (description !== lastDescription) { lastDescription = description; ctx.describe(description); }
  }
  function run() {
    if (!frame && visible && !destroyed) frame = requestAnimationFrame(tick);
  }
  function armTour() {
    clearTimeout(idleTimer);
    idleTimer = 0;
    if (!visible || destroyed || hover || stage.contains(document.activeElement) || ctx.reduced()) return;
    idleTimer = setTimeout(() => { idleTimer = 0; run(); }, Math.max(0, resume - performance.now()));
  }
  function pause() {
    resume = performance.now() + 3600;
    armTour();
    run();
  }
  function choose(n, announce = false) {
    selected = (n + 4) % 4;
    pause();
    text();
    if (announce) ctx.announce(ctx.t(`phase.${names[selected]}`));
  }
  function tick(now) {
    frame = 0;
    if (destroyed || !visible || !state) return;
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
    last = now;
    const reduced = ctx.reduced();
    const touring = !reduced && !hover && !stage.contains(document.activeElement) && now > resume;
    const prior = clock;
    if (touring) {
      clock += dt;
      // Integrating phase preserves the needle's position when interval changes.
      heartbeatPhase = (heartbeatPhase + dt / state.heartbeat) % 1;
      device = Math.floor(clock / 2) % state.devices;
    }
    x = reduced ? target : x + (target - x) * (1 - Math.exp(-dt / 0.2));
    if (Math.abs(x - target) < 0.001) x = target;
    if (paintedX !== x) {
      const transform = K.k.translateAlong(DATA.P, [x, 0, 0]);
      if (transform !== lastTransform) {
        for (const el of slider) el.setAttribute('transform', transform);
        lastTransform = transform;
      }
      const share = x / DATA.sliderTravel;
      pieces.sort((a, b) => a.key + a.lift * share - b.key - b.lift * share);
      const reordered = pieces.some((piece, index) => piece.order !== index);
      if (reordered) {
        const fragment = document.createDocumentFragment();
        pieces.forEach((piece, index) => { piece.order = index; fragment.append(piece.el); });
        layer.append(fragment);
      }
      paintedX = x;
    }

    const angle = heartbeatPhase * Math.PI * 2;
    if (angle !== lastAngle) {
      const path = K.k.lineOnTop(
        [timer[0], timer[1]],
        [timer[0] + 12 * Math.sin(angle), timer[1] - 12 * Math.cos(angle)],
        timer[2], DATA.P,
      );
      if (path !== lastNeedle) { needle.setAttribute('d', path); lastNeedle = path; }
      lastAngle = angle;
    }
    const i = Math.min(device, state.devices - 1);
    let point = DATA.jack[i];
    let opacity = 1;
    if (selected === 1) {
      const age = heartbeatPhase * state.heartbeat;
      opacity = reduced ? 0.55 : 0.3 + 0.7 * Math.exp(-age / 0.24);
    } else if (selected === 2) {
      point = inboxSignal;
    } else if (selected === 3) {
      opacity = state.online / 100;
      if (!reduced && touring) {
        // Trace one example delivery from the keyshelf toward the receiving socket.
        // This illustrative journey is deliberately not a message-rate counter.
        const route = DATA.cords[i];
        const at = (1 - (clock % 2) / 2) * (route.length - 1);
        const n = Math.floor(at), next = Math.min(n + 1, route.length - 1);
        point = [
          route[n][0] + (route[next][0] - route[n][0]) * (at - n),
          route[n][1] + (route[next][1] - route[n][1]) * (at - n),
        ];
      }
    }
    if (signalPhase !== selected) {
      signalPhase = selected;
      signalOpacity = 0;
    }
    signalOpacity = reduced ? opacity : signalOpacity + (opacity - signalOpacity) * (1 - Math.exp(-dt / 0.16));
    if (Math.abs(signalOpacity - opacity) < 0.001) signalOpacity = opacity;
    if (point[0] !== lastSignalX) { signal.setAttribute('cx', point[0]); lastSignalX = point[0]; }
    if (point[1] !== lastSignalY) { signal.setAttribute('cy', point[1]); lastSignalY = point[1]; }
    if (signalOpacity !== lastSignalOpacity) { signal.setAttribute('opacity', signalOpacity); lastSignalOpacity = signalOpacity; }

    if (touring && Math.floor(clock / 4) !== Math.floor(prior / 4)) {
      selected = (selected + 1) % 4;
      text();
    }
    const moving = x !== target || signalOpacity !== opacity;
    if (!reduced && (touring || moving)) run();
    else if (!touring) armTour();
  }
  function pointerPoint(event) {
    const matrix = ctx.svg.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  }
  function closestDevice(point) {
    let nearest = 0, distance = Infinity;
    for (let i = 0; i < DATA.sockets.length; i++) {
      const p = DATA.sockets[i];
      const d = (point.x - p[0]) ** 2 + (point.y - p[1]) ** 2;
      if (d < distance) { nearest = i; distance = d; }
    }
    return { nearest, distance };
  }
  listen('pointerenter', () => { hover = true; pause(); });
  listen('pointerleave', () => { hover = false; pause(); });
  listen('pointermove', event => {
    const p = pointerPoint(event);
    if (!p) return;
    const near = closestDevice(p);
    if (near.distance < 144) {
      device = near.nearest;
      choose(0);
    } else {
      const tp = K.k.iso(timer, DATA.P);
      if ((p.x - tp[0]) ** 2 + (p.y - tp[1]) ** 2 < 900) choose(1);
      else if ((p.x - inbox[0]) ** 2 + (p.y - inbox[1]) ** 2 < 2500) choose(2);
      else if (DATA.keys.some(key => (p.x - key[0]) ** 2 + (p.y - key[1]) ** 2 < 144)) choose(3);
      else pause();
    }
  });
  listen('click', event => {
    if (!state) return;
    const p = pointerPoint(event);
    const near = p && closestDevice(p);
    if (!near || near.distance >= 144) return;
    ctx.set({ devices: near.nearest + 1 });
    choose(0, true);
    describe();
  });
  listen('focus', () => { pause(); describe(); });
  listen('blur', pause);
  listen('keydown', event => {
    if (!state) return;
    let devices;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') devices = Math.min(4, state.devices + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') devices = Math.max(1, state.devices - 1);
    else if (event.key === 'Home') devices = 1;
    else if (event.key === 'End') devices = 4;
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); choose(selected + 1, true); return;
    } else if (event.key === 'Escape') {
      event.preventDefault(); choose(0); return;
    } else return;
    event.preventDefault();
    ctx.set({ devices });
    pause();
  });
  const observer = new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) { last = 0; armTour(); run(); }
    else { cancelAnimationFrame(frame); clearTimeout(idleTimer); idleTimer = 0; frame = 0; }
  }, { rootMargin: '120px 0px' });
  observer.observe(stage);
  const motionChange = () => { armTour(); run(); };
  motion.addEventListener('change', motionChange);
  armTour();
  return {
    update(s, r) {
      state = s; result = r;
      if (!state) return;
      target = (state.members - 2) / 98 * DATA.sliderTravel;
      if (lastDevices !== state.devices) {
        for (const el of plugged) {
          const opacity = Number(el.dataset.device) < state.devices ? '1' : '0';
          if (el.getAttribute('opacity') !== opacity) el.setAttribute('opacity', opacity);
        }
        lastDevices = state.devices;
      }
      device = Math.min(device, state.devices - 1);
      text(); describe(); run();
    },
    relocalize() { text(); describe(); ctx.announce(''); },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      clearTimeout(idleTimer);
      motion.removeEventListener('change', motionChange);
      observer.disconnect();
      for (const [name, fn] of listeners) stage.removeEventListener(name, fn);
    },
  };
}
