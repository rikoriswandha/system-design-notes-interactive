// Build-side helpers shared by every chapter figure. Figures are built in Node from the vendored
// anatomy kit (figures/kit) and emitted as one classic script per chapter in dist/figures/.
import * as k from "./kit/iso-kit.mjs";

export { k };

// One card size for the whole set, so every chapter's figure has the same scale and frame.
export const WIDTH = 600;
export const HEIGHT = 380;

const pad = (id) => String(id).padStart(2, "0");
export const keyOf = (id, name) => `fig.c${pad(id)}.${name}`;
const attr = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Painter helpers bound to a projection.
export function painter(P) {
  return {
    at: (point) => k.iso(point, P),
    S: (paths, style) => k.solidSvg(paths, style),
    L: (d, style) => k.lineSvg(d, style),
    D: (points, style) => k.dotsSvg(points, style),
    halo: (plan, z, h, extra = "") => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}"${extra}/>`,
    byDepth: (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], a[2] || 0], P) - k.depthOf([b[0], b[1], b[2] || 0], P)),
  };
}

function swatch(mark) {
  if (mark === "raised" || mark === "flat" || mark === "lit") {
    const body = mark === "flat" ? "M2 6.5 8 3.5 14 6.5 8 9.5Z" : "M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z";
    const crease = mark === "flat" ? "" : `<path class="iso-swatch-crease" d="M2 4.5 8 7.5 14 4.5"/>`;
    return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="${body}"/>${crease}</svg>`;
  }
  return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>`;
}

/**
 * The card around a chapter figure. Every visible word is a catalog key (fig.cNN.*) that the course
 * fills in at mount and on every language change; nothing localized is baked into the markup.
 *
 *  id      chapter number
 *  body    SVG body markup (array or string), painted back to front
 *  keys    legend entries: [{ mark: "lit" | "raised" | "flat" | "dim" | "dotted" | "dashed" | "edge", key: "key.0" }]
 *  role    stage role: "slider" (one continuous control) or "group" (discrete choices / buttons)
 *  stage   extra attributes for the focusable stage element, e.g. { "aria-valuemin": 0 }
 *  controls optional HTML placed under the drawing inside the plate (buttons). Use data-fig-text keys for labels.
 *
 * Keys every figure must define in figures/cNN/strings.json: title, hint, label (what the drawing is),
 * aria (how to operate the stage), caption, and one key.N per legend entry.
 */
export function plate({ id, width = WIDTH, height = HEIGHT, body, keys = [], role = "slider", stage = {}, controls = "" }) {
  const text = (name, extra = "") => `data-fig-text="${keyOf(id, name)}"${extra}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg" viewBox="0 0 ${width} ${height}" role="img" data-fig-aria="${keyOf(id, "label")}">${Array.isArray(body) ? body.join("") : body}</svg>`;
  const extra = Object.entries(stage).map(([name, value]) => ` ${name}="${attr(value)}"`).join("");
  const corners =
    `<div class="iso-plate-corners" aria-hidden="true">` +
    `<span class="iso-plate-corner" data-corner="fig" data-fig-text="fig.ui.number" data-fig-number="${id}"></span>` +
    `<span class="iso-plate-corner" data-corner="title" ${text("title")}></span>` +
    `<span class="iso-plate-corner" data-corner="hint" ${text("hint")}></span>` +
    `<span class="iso-plate-corner" data-corner="readout" data-readout></span>` +
    `</div>`;
  const legend =
    `<figcaption class="iso-legend">` +
    (keys.length ? `<span class="iso-keys">${keys.map((entry) => `<span class="iso-key">${swatch(entry.mark)}<span ${text(entry.key)}></span></span>`).join("")}</span>` : "") +
    `<span class="iso-caption" ${text("caption")}></span>` +
    `</figcaption>`;
  return (
    `<figure class="iso-figure" data-figure="${id}">` +
    `<div class="iso-plate">${corners}` +
    `<div class="iso-stage" tabindex="0" role="${role}" data-fig-aria="${keyOf(id, "aria")}"${extra}>${svg}</div>` +
    controls +
    `<span class="iso-live" aria-live="polite" data-live></span>` +
    `</div>${legend}</figure>`
  );
}
