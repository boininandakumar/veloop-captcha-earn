import { useEffect, useState, useCallback } from "react";
import { captchaApi, walletApi } from "../../services/api";
import styles from "./CaptchaEarn.module.css";

const PHASES = {
  LOADING: "loading",
  IDLE: "idle",
  CHECKING: "checking",
  RESULT: "result",
};

export default function CaptchaEarn() {
  const [phase, setPhase] = useState(PHASES.LOADING);
  const [challenge, setChallenge] = useState(null);
  const [result, setResult] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const loadChallenge = useCallback(async () => {
    setPhase(PHASES.LOADING);
    setResult(null);
    setError(null);
    try {
      const { data } = await captchaApi.getCurrent();
      setChallenge(data.challenge);
      setPhase(PHASES.IDLE);
    } catch (err) {
      setError("Couldn't load a challenge. Please try again.");
      setPhase(PHASES.IDLE);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    try {
      const { data } = await walletApi.getGems();
      setBalance(data.gemBalance);
    } catch {
      /* non-fatal, balance chip just shows a dash */
    }
  }, []);

  useEffect(() => {
    loadChallenge();
    loadBalance();
  }, [loadChallenge, loadBalance]);

  async function handleSelect(option) {
    if (phase !== PHASES.IDLE) return;
    setPhase(PHASES.CHECKING);

    const minAnimation = new Promise((res) => setTimeout(res, 550));
    try {
      const [{ data }] = await Promise.all([
        captchaApi.verify(challenge.challengeId, option),
        minAnimation,
      ]);
      setResult(data);
      setPhase(PHASES.RESULT);
    } catch (err) {
      await minAnimation;
      setError(err?.response?.data?.message || "Verification failed. Please try again.");
      setResult({ result: "ERROR" });
      setPhase(PHASES.RESULT);
    }
  }

  async function handleClaim() {
    setClaiming(true);
    try {
      const { data } = await captchaApi.claim(challenge.challengeId);
      setBalance(data.wallet.newBalance);
      setTimeout(() => loadChallenge(), 900);
    } catch (err) {
      setError(err?.response?.data?.message || "Claim failed.");
    } finally {
      setClaiming(false);
    }
  }

  async function handleNoThanks() {
    try {
      await captchaApi.noThanks(challenge.challengeId);
    } catch {
      /* moving to a new challenge regardless */
    }
    loadChallenge();
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>&#9670;</span>
            <span>VELoop Rewards</span>
          </div>
          <div className={styles.balanceChip}>
            <span className={styles.gemIcon}>&#9670;</span>
            {balance === null ? "—" : balance.toFixed(2)}
          </div>
        </header>

        <div className={styles.body}>
          {phase === PHASES.LOADING && (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Preparing your challenge…</p>
            </div>
          )}

          {phase === PHASES.IDLE && challenge && (
            <>
              <div className={styles.earnBanner}>
                <div>
                  <p className={styles.earnTitle}>Earn Gems</p>
                  <p className={styles.earnSubtitle}>
                    Complete a quick security check to earn rewards.
                  </p>
                </div>
                <div className={styles.rewardPill}>+1 Gem</div>
              </div>

              <p className={styles.instruction}>Select the matching code</p>
              <div className={styles.question}>
                {challenge.question.split("").map((ch, i) => (
                  <span key={i} className={styles.questionChar}>{ch}</span>
                ))}
              </div>

              <div className={styles.optionsGrid}>
                {challenge.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={styles.optionCard}
                    onClick={() => handleSelect(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <button type="button" className={styles.refreshLink} onClick={loadChallenge}>
                &#8635; New code
              </button>

              <p className={styles.trustNote}>
                This helps protect your account from automated access.
              </p>
            </>
          )}

          {phase === PHASES.CHECKING && (
            <div className={styles.checkingState}>
              <div className={styles.scanRing}>
                <div className={styles.scanCore} />
              </div>
              <p className={styles.checkingTitle}>Verifying…</p>
              <p className={styles.checkingSubtitle}>
                Please wait while we check your answer.
              </p>
            </div>
          )}

          {phase === PHASES.RESULT && result && (
            <div className={styles.resultState}>
              {result.result === "CORRECT" && (
                <>
                  <div className={`${styles.resultIcon} ${styles.success}`}>&#10003;</div>
                  <p className={styles.resultTitle}>Verification Complete!</p>
                  <p className={styles.resultSubtitle}>You earned</p>
                  <div className={styles.rewardBig}>
                    <span className={styles.gemIcon}>&#9670;</span>
                    +{result.reward.amount} Gem
                  </div>
                </>
              )}
              {result.result === "WRONG" && (
                <>
                  <div className={`${styles.resultIcon} ${styles.warn}`}>&#8212;</div>
                  <p className={styles.resultTitle}>Not Quite Right</p>
                  <p className={styles.resultSubtitle}>
                    That code didn't match, but you still earned
                  </p>
                  <div className={styles.rewardBig}>
                    <span className={styles.gemIcon}>&#9670;</span>
                    +{result.reward.amount} Gem
                  </div>
                </>
              )}
              {result.result === "ERROR" && (
                <>
                  <div className={`${styles.resultIcon} ${styles.error}`}>&#10005;</div>
                  <p className={styles.resultTitle}>Verification Unsuccessful</p>
                  <p className={styles.resultSubtitle}>{error}</p>
                </>
              )}

              {result.result !== "ERROR" ? (
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.claimButton}
                    onClick={handleClaim}
                    disabled={claiming}
                  >
                    {claiming ? "Adding…" : "Add to Balance"}
                  </button>
                  <button type="button" className={styles.laterButton} onClick={handleNoThanks}>
                    Maybe Later
                  </button>
                </div>
              ) : (
                <div className={styles.actionRow}>
                  <button type="button" className={styles.claimButton} onClick={loadChallenge}>
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
