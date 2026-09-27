import styles from "../pages/CaptchaEarn/CaptchaEarn.module.css";

export default function CheckingState() {
  return (
    <div className={styles.checkingWrap}>
      <div className={styles.checkingRing}>
        <div className={styles.checkingCore} />
      </div>
      <h3 className={styles.checkingTitle}>Verifying...</h3>
      <p className={styles.checkingSub}>
        Please wait while we check your answer.
      </p>
      <p className={styles.checkingNote}>Do not close this screen while verification is in progress.</p>
    </div>
  );
}
