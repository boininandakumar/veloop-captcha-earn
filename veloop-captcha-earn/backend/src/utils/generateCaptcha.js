const crypto = require("crypto");

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I to avoid ambiguity

// Characters that look alike. Wrong options are built from these so that
// all 4 choices look almost the same and the user must read carefully.
const LOOKALIKES = [
  ["B", "8"], ["S", "5"], ["Z", "2"], ["G", "6", "C"], ["U", "V", "W"],
  ["M", "N", "H"], ["E", "F"], ["P", "R"], ["K", "X"], ["T", "Y"],
  ["3", "8"], ["4", "A"], ["7", "T"],
];
const SIMILAR = {};
for (const group of LOOKALIKES) {
  for (const c of group) {
    SIMILAR[c] = SIMILAR[c] || new Set();
    group.forEach((o) => o !== c && SIMILAR[c].add(o));
  }
}

function randomChar() {
  return CHARSET[crypto.randomInt(0, CHARSET.length)];
}

function generateCaptchaText(length = 6) {
  let text = "";
  for (let i = 0; i < length; i++) text += randomChar();
  return text;
}

function lookalike(ch) {
  const pool = SIMILAR[ch] ? [...SIMILAR[ch]] : [];
  if (pool.length) return pool[crypto.randomInt(0, pool.length)];
  let c;
  do c = randomChar();
  while (c === ch);
  return c;
}

// Changes 1 or 2 characters of the answer into look-alike characters.
function similarVariant(correct) {
  const chars = correct.split("");
  const edits = crypto.randomInt(1, 3);
  const positions = new Set();
  while (positions.size < edits) positions.add(crypto.randomInt(0, chars.length));
  for (const pos of positions) chars[pos] = lookalike(chars[pos]);
  return chars.join("");
}

/**
 * Builds the 4-option challenge server-side: 1 correct + 3 look-alike
 * wrong options, all different from each other, shuffled.
 */
function buildChallenge() {
  const captchaText = generateCaptchaText();
  const variants = new Set();
  while (variants.size < 3) {
    const v = similarVariant(captchaText);
    if (v !== captchaText) variants.add(v);
  }
  const options = [captchaText, ...variants];
  for (let i = options.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { captchaText, correctOption: captchaText, options };
}

// Small seeded random generator so the same challenge always draws the same image.
function seededRandom(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws the CAPTCHA as a distorted SVG image (rotated letters, wavy noise
 * lines, dots). The client receives only this image, never the plain text.
 */
function renderCaptchaSvg(text, seed = text) {
  const rnd = seededRandom(String(seed));
  const r = (min, max) => min + rnd() * (max - min);
  const W = 340;
  const H = 110;
  const ink = ["#0b1b2b", "#0c4a6e", "#111827", "#075985", "#1e293b"];
  const curve = (stroke, width, opacity) => {
    const y = () => r(10, H - 10);
    return `<path d="M0 ${y().toFixed(1)} C ${r(70, 120).toFixed(1)} ${y().toFixed(1)}, ${r(200, 260).toFixed(1)} ${y().toFixed(1)}, ${W} ${y().toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}"/>`;
  };

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  s += `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0f2fe"/><stop offset="1" stop-color="#dcfce7"/></linearGradient></defs>`;
  s += `<rect width="${W}" height="${H}" fill="url(#g)"/>`;
  for (let i = 0; i < 4; i++) s += curve("#38bdf8", 2, 0.5);

  const step = (W - 40) / text.length;
  [...text].forEach((ch, i) => {
    const x = 20 + step * (i + 0.5);
    const y = H / 2 + 16 + r(-10, 10);
    const angle = r(-28, 28).toFixed(1);
    const size = r(40, 52).toFixed(0);
    const fill = ink[Math.floor(r(0, ink.length))];
    s += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${angle} ${x.toFixed(1)} ${y.toFixed(1)})" font-size="${size}" font-weight="800" font-family="Courier New, Consolas, monospace" text-anchor="middle" fill="${fill}">${ch}</text>`;
  });

  for (let i = 0; i < 3; i++) s += curve("#0f172a", 2, 0.45);
  for (let i = 0; i < 45; i++) {
    s += `<circle cx="${r(0, W).toFixed(1)}" cy="${r(0, H).toFixed(1)}" r="${r(0.8, 2).toFixed(1)}" fill="#0369a1" opacity="0.35"/>`;
  }
  s += `</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(s);
}

module.exports = { generateCaptchaText, buildChallenge, renderCaptchaSvg };