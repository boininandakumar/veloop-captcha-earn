const crypto = require("crypto");

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I to avoid ambiguity

function randomChar() {
  return CHARSET[crypto.randomInt(0, CHARSET.length)];
}

/**
 * Generates a 6-character alphanumeric CAPTCHA string, e.g. "A7K2P9".
 * Uses crypto.randomInt (CSPRNG) rather than Math.random for
 * server-side-authoritative, non-guessable challenge text.
 */
function generateCaptchaText(length = 6) {
  let text = "";
  for (let i = 0; i < length; i++) text += randomChar();
  return text;
}

/**
 * Produces a "similar-looking" variant of the correct answer by
 * swapping/shuffling a couple of characters, per spec section 7:
 * two similar-but-wrong options + one completely different option.
 */
function similarVariant(correct) {
  const chars = correct.split("");
  // swap two random distinct positions
  let i = crypto.randomInt(0, chars.length);
  let j = crypto.randomInt(0, chars.length);
  while (j === i) j = crypto.randomInt(0, chars.length);
  [chars[i], chars[j]] = [chars[j], chars[i]];
  // also mutate one character to guarantee it's not identical to correct
  const k = crypto.randomInt(0, chars.length);
  chars[k] = randomChar();
  const candidate = chars.join("");
  return candidate === correct ? similarVariant(correct) : candidate;
}

function completelyDifferent(correct) {
  let candidate;
  do {
    candidate = generateCaptchaText(correct.length);
  } while (
    candidate === correct ||
    // ensure it doesn't accidentally share more than 1 character position with correct
    candidate.split("").filter((c, idx) => c === correct[idx]).length > 1
  );
  return candidate;
}

/**
 * Builds the full 4-option challenge set server-side.
 * Returns { captchaText, correctOption, options } where options is a
 * shuffled array of 4 strings containing exactly one match to captchaText.
 */
function buildChallenge() {
  const captchaText = generateCaptchaText();
  const correctOption = captchaText;
  const similar1 = similarVariant(captchaText);
  const similar2 = similarVariant(captchaText);
  const different = completelyDifferent(captchaText);

  const options = [correctOption, similar1, similar2, different];
  // Fisher-Yates shuffle using CSPRNG
  for (let i = options.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }

  return { captchaText, correctOption, options };
}

module.exports = { generateCaptchaText, buildChallenge };
