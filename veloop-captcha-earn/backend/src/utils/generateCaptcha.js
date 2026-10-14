const crypto = require("crypto");

// Mixed capital and small letters + numbers.
// Left out on purpose (too easy to mix up): 0 O o, 1 I l i, and small letters
// that look exactly like their capitals (c k o p s u v w x z).
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abdefghjmnqrty";
const DIGITS = "23456789";
const ALL = UPPER + LOWER + DIGITS;

const rand = (n) => crypto.randomInt(0, n);
const pick = (s) => s[rand(s.length)];

// 6 characters. Always has at least 2 capital and 2 small letters.
function generateCaptchaText(length = 6) {
  for (;;) {
    let text = "";
    for (let i = 0; i < length; i++) {
      const roll = rand(100);
      text += roll < 40 ? pick(UPPER) : roll < 80 ? pick(LOWER) : pick(DIGITS);
    }
    const up = [...text].filter((c) => UPPER.includes(c)).length;
    const low = [...text].filter((c) => LOWER.includes(c)).length;
    if (up >= 2 && low >= 2) return text;
  }
}

// Characters that look alike.
const LOOKALIKES = [
  ["B", "8"], ["S", "5"], ["Z", "2"], ["G", "6", "C"], ["U", "V", "W"],
  ["M", "N", "H"], ["E", "F"], ["P", "R"], ["K", "X"], ["T", "Y"],
  ["3", "8"], ["4", "A"], ["7", "T"],
  ["b", "d"], ["n", "h", "m"], ["q", "g", "9"], ["f", "t"], ["a", "e"], ["j", "y"], ["r", "n"],
];
const SIMILAR = {};
for (const group of LOOKALIKES) {
  for (const c of group) {
    SIMILAR[c] = SIMILAR[c] || new Set();
    group.forEach((o) => o !== c && SIMILAR[c].add(o));
  }
}

function lookalike(ch) {
  const pool = SIMILAR[ch] ? [...SIMILAR[ch]] : [];
  if (pool.length) return pool[rand(pool.length)];
  let c;
  do c = pick(ALL);
  while (c === ch);
  return c;
}

// Same letter, other case (only for letters whose capital and small form look different).
function caseFlip(ch) {
  if (LOWER.includes(ch)) return ch.toUpperCase();
  if (UPPER.includes(ch) && LOWER.includes(ch.toLowerCase())) return ch.toLowerCase();
  return null;
}

const replaceAt = (text, pos, ch) => text.slice(0, pos) + ch + text.slice(pos + 1);

function completelyDifferent(correct) {
  let candidate;
  do {
    candidate = generateCaptchaText(correct.length);
  } while (
    candidate === correct ||
    candidate.split("").filter((c, idx) => c === correct[idx]).length > 1
  );
  return candidate;
}

/**
 * 4 options: 1 correct + 2 similar + 1 completely different.
 * Each similar option changes exactly ONE character: one of them flips the
 * case of a letter, the other uses a look-alike character.
 */
function buildChallenge() {
  const captchaText = generateCaptchaText();
  const correctOption = captchaText;
  const positions = [...Array(captchaText.length).keys()];

  const flippable = positions.filter((i) => caseFlip(captchaText[i]));
  const p1 = flippable.length ? flippable[rand(flippable.length)] : positions[rand(positions.length)];
  const similar1 = flippable.length
    ? replaceAt(captchaText, p1, caseFlip(captchaText[p1]))
    : replaceAt(captchaText, p1, lookalike(captchaText[p1]));

  const others = positions.filter((i) => i !== p1);
  const p2 = others[rand(others.length)];
  const similar2 = replaceAt(captchaText, p2, lookalike(captchaText[p2]));

  let different = completelyDifferent(captchaText);
  while (different === similar1 || different === similar2) different = completelyDifferent(captchaText);

  const options = [correctOption, similar1, similar2, different];
  for (let i = options.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { captchaText, correctOption, options };
}

module.exports = { generateCaptchaText, buildChallenge };