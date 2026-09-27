import styles from "../pages/CaptchaEarn/CaptchaEarn.module.css";

export default function ClaimButton({ onClaim, onNoThanks, claiming }) {
  return (
    <div className={styles.claimRow}>
      <button className={styles.claimBtn} onClick={onClaim} disabled={claiming}>
        {claiming ? "Adding to balance..." : "Add to Balance"}
      </button>
      <button className={styles.noThanksBtn} onClick={onNoThanks} disabled={claiming}>
        Maybe Later
      </button>
    </div>
  );
}
