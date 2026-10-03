import { useCallback, useEffect, useState } from "react";
import { captchaApi, walletApi } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import CaptchaChallenge from "../../components/CaptchaChallenge.jsx";
import CheckingState from "../../components/CheckingState.jsx";
import ResultCard from "../../components/ResultCard.jsx";
import RewardCard from "../../components/RewardCard.jsx";
import styles from "./CaptchaEarn.module.css";

// Always returns a real number, so .toFixed() can never crash the page.
function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Phases: loading -> challenge -> checking -> result -> (claim or forfeit) -> challenge
export default function CaptchaEarn() {
  const { user, logout } = useAuth();
  const [phase, setPhase] = useState("loading");
  const [challenge, setChallenge] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [balance, setBalance] = useState(0);
  const [prevBalance, setPrevBalance] = useState(0);
  const [config, setConfig] = useState({ correctReward: 1, wrongReward: 0.5 });
  const [errorMsg, setErrorMsg] = useState("");

  const refreshBalance = useCallback(async () => {
    const res = await walletApi.getGems();
    const value = toNum(res.data?.balance);
    setBalance(value);
    return value;
  }, []);

  const handleApiError = useCallback(
    (err, fallback) => {
      if (err.response?.status === 401) {
        logout();
        return;
      }
      setErrorMsg(err.response?.data?.message || fallback);
    },
    [logout]
  );

  const loadChallenge = useCallback(async () => {
    setPhase("loading");
    setSelected(null);
    setResult(null);
    setClaimed(false);
    setErrorMsg("");
    try {
      const [challengeRes] = await Promise.all([captchaApi.getCurrent(), refreshBalance()]);
      setChallenge(challengeRes.data.challenge);
      setPhase("challenge");
    } catch (err) {
      handleApiError(err, "Could not load the challenge. Please check that the backend is running.");
      setPhase("error");
    }
  }, [refreshBalance, handleApiError]);

  useEffect(() => {
    captchaApi
      .config()
      .then((res) =>
        setConfig({
          correctReward: toNum(res.data.correctReward, 1),
          wrongReward: toNum(res.data.wrongReward, 0.5),
        })
      )
      .catch(() => {});
    loadChallenge();
  }, [loadChallenge]);

  async function handleSelect(value) {
    if (phase !== "challenge") return;
    setSelected(value);
    setPhase("checking");

    const verifyPromise = captchaApi.verify(challenge.challengeId, value);
    const minAnimation = new Promise((r) => setTimeout(r, 500));

    try {
      const [res] = await Promise.all([verifyPromise, minAnimation]);
      setResult(res.data);
      setPhase("result");
    } catch (err) {
      handleApiError(err, "Verification failed. Please try again.");
      setPhase("challenge");
      setSelected(null);
    }
  }

  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await captchaApi.claim(challenge.challengeId);
      setPrevBalance(balance);
      setBalance(toNum(res.data.balance, balance));
      setClaimed(true);
    } catch (err) {
      handleApiError(err, "Claim failed.");
    } finally {
      setClaiming(false);
    }
  }

  async function handleNoThanks() {
    try {
      await captchaApi.noThanks(challenge.challengeId);
    } catch (_) {
      // even if forfeit fails, still move on to a new challenge
    }
    loadChallenge();
  }

  async function handleNewCode() {
    try {
      const res = await captchaApi.requestNew();
      setChallenge(res.data.challenge);
      setSelected(null);
      setResult(null);
      setErrorMsg("");
      setPhase("challenge");
    } catch (err) {
      handleApiError(err, "Could not get a new code.");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.logoDot} />
          VELOOP REWARDS
        </div>
        <div className={styles.balancePill}>
          <span className={styles.gemDot} />
          {balance.toFixed(2)}
        </div>
      </div>

      <div className={styles.phone}>
        {phase === "loading" && <p className={styles.loadingText}>Loading challenge…</p>}

        {phase === "error" && (
          <div className={styles.resultWrap}>
            <p className={styles.errorText}>{errorMsg}</p>
            <button className={styles.continueBtn} onClick={loadChallenge}>
              Try again
            </button>
          </div>
        )}

        {phase === "challenge" && challenge && (
          <>
            <RewardCard
              balance={balance}
              correctReward={config.correctReward}
              wrongReward={config.wrongReward}
            />
            <CaptchaChallenge
              challenge={challenge}
              selected={selected}
              locked={false}
              onSelect={handleSelect}
              onNewCode={handleNewCode}
            />
          </>
        )}

        {phase === "checking" && <CheckingState />}

        {phase === "result" && result && (
          <ResultCard
            result={result.result}
            reward={toNum(result.reward?.amount)}
            prevBalance={prevBalance}
            newBalance={balance}
            claimed={claimed}
            claiming={claiming}
            onClaim={handleClaim}
            onNoThanks={handleNoThanks}
            onTryAgain={handleNoThanks}
          />
        )}

        {claimed && phase === "result" && (
          <button className={styles.continueBtn} onClick={handleNewCode}>
            Continue Earning →
          </button>
        )}

        {phase !== "error" && errorMsg && <p className={styles.errorText}>{errorMsg}</p>}
      </div>

      <button className={styles.logoutLink} onClick={logout}>
        Sign out {user ? `(${user.email})` : ""}
      </button>
    </div>
  );
}