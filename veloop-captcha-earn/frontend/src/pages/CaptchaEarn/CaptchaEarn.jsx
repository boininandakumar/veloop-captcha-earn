import { useCallback, useEffect, useState } from "react";
import { captchaApi, walletApi } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import CaptchaChallenge from "../../components/CaptchaChallenge.jsx";
import CheckingState from "../../components/CheckingState.jsx";
import ResultCard from "../../components/ResultCard.jsx";
import { BackIcon, GemIcon } from "../../components/Icons.jsx";
import styles from "./CaptchaEarn.module.css";

const toNum = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Phases: loading -> challenge -> scanning -> checking -> result -> (claim | no thanks) -> challenge
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
      if (err.response?.status === 401) return logout();
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
      const [res] = await Promise.all([captchaApi.getCurrent(), refreshBalance()]);
      setChallenge(res.data.challenge);
      setPhase("challenge");
    } catch (err) {
      handleApiError(err, "Could not load the challenge. Please check that the backend is running.");
      setPhase("error");
    }
  }, [refreshBalance, handleApiError]);

  useEffect(() => {
    captchaApi
      .config()
      .then((res) => setConfig({ correctReward: toNum(res.data.correctReward, 1), wrongReward: toNum(res.data.wrongReward, 0.5) }))
      .catch(() => {});
    loadChallenge();
  }, [loadChallenge]);

  // No Submit button: choosing an option locks everything and starts verification.
  async function handleSelect(value) {
    if (phase !== "challenge") return;
    setSelected(value);
    setPhase("scanning"); // selection highlight + scanning animation (~0.6s, UI only)
    const verifyPromise = captchaApi.verify(challenge.challengeId, value); // the REAL result comes from the backend
    try {
      await wait(600);
      setPhase("checking");
      const [res] = await Promise.all([verifyPromise, wait(500)]);
      setPrevBalance(balance);
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
      /* still move on to a brand new challenge */
    }
    loadChallenge();
  }

  async function handleNewCode() {
    try {
      const res = await captchaApi.requestNew();
      setChallenge(res.data.challenge);
      setSelected(null);
      setResult(null);
      setClaimed(false);
      setErrorMsg("");
      setPhase("challenge");
    } catch (err) {
      handleApiError(err, "Could not get a new code.");
    }
  }

  const inChallenge = phase === "challenge" || phase === "scanning";

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={logout} aria-label="Sign out" title="Sign out">
          <BackIcon />
        </button>
        <div className={styles.brand}>
          <span>VELOOP</span>
          <small>REWARDS</small>
        </div>
        <div className={styles.balancePill} aria-label="Gem balance">
          <GemIcon size="1.1em" />
          {balance.toFixed(2)}
        </div>
      </div>

      <div className={styles.phone}>
        {phase === "loading" && <p className={styles.loadingText}>Loading challenge…</p>}

        {phase === "error" && (
          <div className={styles.resultWrap}>
            <p className={styles.errorText}>{errorMsg}</p>
            <button className={styles.continueBtn} onClick={loadChallenge}>Try again</button>
          </div>
        )}

        {inChallenge && challenge && (
          <>
            <h1 className={styles.pageTitle}>Earn <span>Gems</span></h1>
            <p className={styles.pageSub}>Complete a quick security check to earn rewards.</p>
            <CaptchaChallenge
              challenge={challenge}
              selected={selected}
              locked={phase === "scanning"}
              scanning={phase === "scanning"}
              onSelect={handleSelect}
              onNewCode={handleNewCode}
            />
            <div className={styles.rewardBanner}>
              <GemIcon size="1.9em" />
              <div>
                <small>Complete verification to earn</small>
                <strong>+{config.correctReward} {config.correctReward === 1 ? "Gem" : "Gems"}</strong>
              </div>
            </div>
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
          />
        )}

        {claimed && phase === "result" && (
          <button className={styles.continueBtn} onClick={handleNewCode}>Continue Earning →</button>
        )}

        {phase !== "error" && errorMsg && <p className={styles.errorText}>{errorMsg}</p>}
      </div>

      <button className={styles.logoutLink} onClick={logout}>
        Sign out {user ? `(${user.email})` : ""}
      </button>
    </div>
  );
}