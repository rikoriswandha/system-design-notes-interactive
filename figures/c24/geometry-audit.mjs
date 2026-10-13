import * as A from "../kit/audit.mjs";

export const EASE = { tray: 0.22, regulator: 0.24 };

// These are the same exponential followers as live.js, sampled at real frame
// boundaries, including reversals. The audit never substitutes spring motion.
function motionStates(scheme) {
  const n = scheme === "ec" ? 12 : 3;
  const maximum = Math.min(n, 6);
  const frames = [], depth = [];
  const pose = (failed, regulator, inspected = -1) => Object.fromEntries([
    ...Array.from({ length: n }, (_, i) => [`${scheme}.${i}`, i < failed ? 1 : i === inspected ? 1 / 6 : 0]),
    ["regulator", regulator],
  ]);
  const save = (shares, label, index, rest = false) => {
    const state = { shares: { ...shares }, label };
    frames.push(state);
    if (rest || index % 4 === 0) depth.push(state);
  };
  const replay = (initial, target, label, reversalAt = null) => {
    const here = { ...initial };
    let want = target;
    for (let frame = 0; frame <= 150; frame++) {
      if (frame === reversalAt) want = initial;
      for (const name of Object.keys(here)) {
        const seconds = name === "regulator" ? EASE.regulator : EASE.tray;
        const travel = name === "regulator" ? 147 : 30;
        here[name] += (want[name] - here[name]) * (1 - Math.exp(-1 / 60 / seconds));
        if (Math.abs(here[name] - want[name]) * travel < 0.015) here[name] = want[name];
      }
      save(here, `${label} frame ${frame}`, frame);
      if (Object.keys(here).every(name => here[name] === want[name])) break;
    }
  };
  for (let failed = 0; failed <= maximum; failed++) {
    for (const reg of [0, 0.5, 1]) save(pose(failed, reg), `${scheme} failed ${failed}, regulator ${reg}`, 0, true);
    for (let selected = failed; selected < n; selected++) {
      save(pose(failed, 0, selected), `${scheme} inspect ${selected}, failed ${failed}`, 0, true);
      replay(pose(failed, 0), pose(failed, 0, selected), `${scheme} inspection ${selected}`);
      replay(pose(failed, 1, selected), pose(failed, 1), `${scheme} inspection closes ${selected}`);
    }
    for (let next = 0; next <= maximum; next++) {
      if (next === failed) continue;
      for (const reg of [0, 1]) {
        const from = pose(failed, reg), to = pose(next, 1 - reg);
        replay(from, to, `${scheme} failure ${failed} to ${next}`);
        for (const at of [8, 24, 48]) replay(from, to, `${scheme} failure reversal ${failed} to ${next}`, at);
      }
    }
  }
  return { frames, depth };
}

export function settleRack(assemblies, P, argv) {
  const orders = {}, counts = {};
  for (const scheme of ["ec", "replica"]) {
    const R = A.recorder(P, { ground: shape => shape.owner === "stand.base" });
    for (const assembly of assemblies) {
      if (assembly.scheme && assembly.scheme !== scheme) continue;
      const shapes = assembly.shapes.map((shape, i) => R.solid({ ...shape, name: `${assembly.name}.solid.${i}`, owner: assembly.name }));
      const at = shapes.reduce((sum, shape) => {
        const b = A.boundsOf(shape);
        return sum.map((v, i) => v + (b.min[i] + b.max[i]) / 2 / shapes.length);
      }, [0, 0, 0]);
      R.put({ name: assembly.name, piece: assembly.name, move: assembly.move, at, svg: assembly.svg, shapes });
    }
    const states = motionStates(scheme);
    A.settle(R, P, { states: states.depth });
    orders[scheme] = R.items.map(item => ({ name: item.name, key: item.key, lift: item.move.reduce((v, x, i) => v + x * R.V[i], 0) }));
    counts[scheme] = R.solids.length;
    A.auditOrExit(R, P, { argv, apart: false, frames: states.frames });
  }
  return { orders, counts };
}
