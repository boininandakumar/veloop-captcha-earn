import { useMemo } from "react";
import styles from "../pages/CaptchaEarn/CaptchaEarn.module.css";
import CaptchaOption from "./CaptchaOption.jsx";
import { RefreshIcon, ShieldIcon } from "./Icons.jsx";

// DIFFICULTY: 1 = a little hard, 2 = hard, 3 = very hard. Change this one number.
const LEVEL = 2;

const TILT = [0, 12, 20, 28][LEVEL];   // how much letters rotate (degrees)
const SHIFT = [0, 5, 8, 11][LEVEL];    // how much letters move up/down (px)
const SKEW = [0, 4, 10, 15][LEVEL];    // how much letters lean (degrees)
const FONTS = [
  '"Segoe UI", Arial, sans-serif',
  '"Courier New", monospace',
  '"Trebuchet MS", sans-serif',
  "Verdana, sans-serif",
];

// Small seeded random generator: the same code always gets the same look.
function seeded(text) {
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

export default function CaptchaChallenge({ challenge, selected, locked, scanning, onSelect, onNewCode }) {
  const code = challenge.captchaText || "";

  const look = useMemo(() => {
    const r = seeded(code);
    const chars = code.split("").map((c) => ({
      c,
      rot: (r() * TILT * 2 - TILT).toFixed(1),
      y: Math.round(r() * SHIFT * 2 - SHIFT),
      k: (r() * SKEW * 2 - SKEW).toFixed(1),
      s: (0.88 + r() * 0.34).toFixed(2),
      font: LEVEL >= 2 ? FONTS[Math.floor(r() * FONTS.length)] : FONTS[0],
      w: r() > 0.5 ? 900 : 700,
    }));
    const wave = () =>
      `M0 ${(14 + r() * 32).toFixed(1)} C 80 ${(4 + r() * 52).toFixed(1)}, 180 ${(4 + r() * 52).toFixed(1)}, 300 ${(14 + r() * 32).toFixed(1)}`;
    const colors = ["rgba(96,165,250,0.75)", "rgba(167,139,250,0.7)", "rgba(244,114,182,0.6)", "rgba(125,211,252,0.7)"];
    const lines = Array.from({ length: LEVEL + 2 }, (_, i) => ({ d: wave(), color: colors[i % colors.length], w: (1.4 + r() * 0.9).toFixed(1) }));
    const dots = Array.from({ length: 14 + LEVEL * 10 }, () => ({ x: r() * 300, y: r() * 60, r: 0.8 + r() * 1.5 }));
    return { chars, lines, dots };
  }, [code]);

  return (
    <>
      <div className={`${styles.captchaBox} ${scanning ? styles.scanning : ""}`}>
        <div className={styles.captchaChars} role="img" aria-label={`CAPTCHA code ${code.split("").join(" ")}`}>
          {look.chars.map((ch, i) => (
            <span
              key={i}
              className={styles.captchaChar}
              style={{
                "--rot": `${ch.rot}deg`,
                "--y": `${ch.y}px`,
                "--k": `${ch.k}deg`,
                "--s": ch.s,
                fontFamily: ch.font,
                fontWeight: ch.w,
                animationDelay: `${i * 60}ms`,
              }}
            >
              {ch.c}
            </span>
          ))}
          <svg className={styles.captchaNoise} viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
            {look.lines.map((l, i) => (
              <path key={i} d={l.d} fill="none" stroke={l.color} strokeWidth={l.w} />
            ))}
            {look.dots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="rgba(147,197,253,0.45)" />
            ))}
          </svg>
        </div>
        <button type="button" className={styles.newCodeBtn} onClick={onNewCode} disabled={locked}>
          <RefreshIcon /> New Code
        </button>
      </div>

      <p className={styles.selectLabel}>Select the matching code</p>
      <div className={styles.optionsGrid}>
        {challenge.options.map((opt, i) => (
          <CaptchaOption key={opt + i} value={opt} index={i} selected={selected} locked={locked} onSelect={onSelect} />
        ))}
      </div>

      <div className={styles.infoNote}>
        <ShieldIcon />
        <span>This helps protect your account from automated access.</span>
      </div>
    </>
  );
}