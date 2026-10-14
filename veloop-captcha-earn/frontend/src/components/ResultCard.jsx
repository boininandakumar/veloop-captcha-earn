import styles from "../pages/CaptchaEarn/CaptchaEarn.module.css";
import ClaimButton from "./ClaimButton.jsx";
import { CheckIcon, CrossIcon, GemIcon, ShieldIcon } from "./Icons.jsx";

const fmt = (n) => Number(n || 0).toFixed(2);
const gems = (n) => `+${Number(n)} ${Number(n) === 1 ? "Gem" : "Gems"}`;

export default function ResultCard({ result, reward, prevBalance, newBalance, onClaim, onNoThanks, claimed, claiming }) {
  const ok = result === "CORRECT";
  const shownNew = claimed ? newBalance : prevBalance + reward; // preview until the backend confirms the claim

  return (
    <div className={`${styles.resultWrap} ${ok ? styles.resultSuccess : styles.resultFail}`}>
      {ok && (
        <div className={styles.confetti} aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ "--i": i }} />)}
        </div>
      )}
      <div className={styles.resultIconRing}>
        <span className={styles.resultIcon}>{ok ? <CheckIcon /> : <CrossIcon />}</span>
      </div>

      <h3 className={styles.resultTitle}>{ok ? "Verification Complete!" : "Verification Unsuccessful"}</h3>
      <p className={styles.resultSub}>
        {ok ? "You earned" : "The selected code doesn't match the image shown. Please try again with a new challenge."}
      </p>

      <div className={styles.resultReward}>
        <GemIcon size="1.3em" />
        <span>{gems(reward)}</span>
      </div>

      <div className={styles.balanceCard}>
        <div><strong>{fmt(prevBalance)}</strong><small>Previous Balance</small></div>
        <span className={styles.balanceArrow}>→</span>
        <div><strong className={styles.newBalance}>{fmt(shownNew)}</strong><small>New Balance</small></div>
      </div>

      {!claimed && <ClaimButton onClaim={onClaim} onNoThanks={onNoThanks} claiming={claiming} />}

      <div className={styles.infoNote}>
        <ShieldIcon />
        <span>
          {claimed
            ? "Your reward has been added to your account."
            : ok
            ? "Add the reward to your balance, or skip it and get a new code."
            : "Security checks keep your account safe."}
        </span>
      </div>
    </div>
  );
}