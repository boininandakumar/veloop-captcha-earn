import styles from "../pages/CaptchaEarn/CaptchaEarn.module.css";
import CaptchaOption from "./CaptchaOption.jsx";

export default function CaptchaChallenge({ challenge, selected, locked, onSelect, onNewCode }) {
  return (
    <div className={styles.challengeCard}>
      <div className={styles.challengeHeader}>
        <span>Select the matching code</span>
        <button className={styles.newCodeBtn} onClick={onNewCode} disabled={locked}>
          ↻ New Code
        </button>
      </div>

      <div className={styles.captchaTextWrap}>
        {challenge.captchaText.split("").map((ch, i) => (
          <span key={i} className={styles.captchaChar}>{ch}</span>
        ))}
      </div>

      <div className={styles.optionsGrid}>
        {challenge.options.map((opt, i) => (
          <CaptchaOption
            key={opt + i}
            value={opt}
            index={i}
            selected={selected}
            locked={locked}
            onSelect={onSelect}
          />
        ))}
      </div>

      <p className={styles.helperNote}>
        <span className={styles.eyeIcon}>◎</span> This helps protect your account from automated access.
      </p>
    </div>
  );
}
