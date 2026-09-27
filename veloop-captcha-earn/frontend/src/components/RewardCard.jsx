import styles from "../pages/CaptchaEarn/CaptchaEarn.module.css";

export default function RewardCard({ balance, correctReward, wrongReward }) {
  return (
    <div className={styles.rewardCard}>
      <div className={styles.rewardCardHeader}>
        <span className={styles.gemDot} />
        <span>Earn Gems</span>
      </div>
      <p className={styles.rewardCardSub}>
        Complete a quick security check to earn rewards.
      </p>
      <div className={styles.rewardCardStats}>
        <div>
          <span className={styles.statLabel}>Balance</span>
          <span className={styles.statValue}>{balance.toFixed(2)}</span>
        </div>
        <div>
          <span className={styles.statLabel}>Correct</span>
          <span className={styles.statValueSmall}>+{correctReward} Gem</span>
        </div>
        <div>
          <span className={styles.statLabel}>Wrong</span>
          <span className={styles.statValueSmall}>+{wrongReward} Gem</span>
        </div>
      </div>
    </div>
  );
}
