import styles from "../pages/CaptchaEarn/CaptchaEarn.module.css";
import ClaimButton from "./ClaimButton.jsx";

export default function ResultCard({ result, reward, prevBalance, newBalance, onClaim, onNoThanks, onTryAgain, claimed, claiming }) {
  const isCorrect = result === "CORRECT";

  return (
    <div className={`${styles.resultWrap} ${isCorrect ? styles.resultSuccess : styles.resultFail}`}>
      <div className={styles.resultIconRing}>
        <span className={styles.resultIcon}>{isCorrect ? "✓" : "✕"}</span>
      </div>

      <h3 className={styles.resultTitle}>
        {isCorrect ? "Verification Complete!" : "Verification Unsuccessful"}
      </h3>
      <p className={styles.resultSub}>
        {isCorrect
          ? "You earned:"
          : "The selected code doesn't match the image shown. Please try again with a new challenge."}
      </p>

      {isCorrect && (
        <div className={styles.resultReward}>
          <span className={styles.gemDot} />
          <span>+{reward} Gem</span>
        </div>
      )}

      {isCorrect && !claimed && (
        <ClaimButton onClaim={onClaim} onNoThanks={onNoThanks} claiming={claiming} />
      )}

      {isCorrect && claimed && (
        <div className={styles.balanceMove}>
          <span>{prevBalance.toFixed(2)}</span>
          <span>→</span>
          <span className={styles.newBalance}>{newBalance.toFixed(2)}</span>
        </div>
      )}

      {!isCorrect && (
        <div className={styles.claimRow}>
          <button className={styles.tryAgainBtn} onClick={onTryAgain}>Try Again</button>
          <button className={styles.noThanksBtn} onClick={onTryAgain}>Get New Code</button>
        </div>
      )}
    </div>
  );
}
