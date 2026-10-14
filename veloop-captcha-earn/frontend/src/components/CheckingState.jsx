import styles from "../pages/CaptchaEarn/CaptchaEarn.module.css";
import { LockIcon, ShieldIcon } from "./Icons.jsx";

export default function CheckingState() {
  return (
    <div className={styles.checkingWrap} role="status" aria-live="polite">
      <div className={styles.verifyOrb}>
        <span className={styles.orbRing} />
        <span className={styles.orbRing2} />
        <span className={styles.orbCore}>
          <LockIcon />
        </span>
      </div>
      <h3 className={styles.checkingTitle}>Verifying...</h3>
      <p className={styles.checkingSub}>Please wait while we check your answer.</p>
      <p className={styles.checkingLabel}>Checking your answer...</p>
      <div className={styles.progressTrack}>
        <div className={styles.progressBar} />
      </div>
      <div className={styles.infoNote}>
        <ShieldIcon />
        <span>Do not close this screen while verification is in progress.</span>
      </div>
    </div>
  );
}