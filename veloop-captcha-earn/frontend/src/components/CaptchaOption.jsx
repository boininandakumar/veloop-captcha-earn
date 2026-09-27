import styles from "../pages/CaptchaEarn/CaptchaEarn.module.css";

/**
 * Premium interactive option card (spec section 14 - explicitly NOT a
 * generic radio button). Responds to hover/press/focus/selection states
 * via CSS classes; locks (disabled) the instant a selection is made,
 * per the "no Submit button" flow (section 15).
 */
export default function CaptchaOption({ value, index, selected, locked, onSelect }) {
  const isSelected = selected === value;

  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onSelect(value)}
      className={`${styles.optionCard} ${isSelected ? styles.optionSelected : ""} ${
        locked && !isSelected ? styles.optionDimmed : ""
      }`}
    >
      <span className={styles.optionIndex}>{index + 1}</span>
      <span className={styles.optionText}>{value}</span>
      {isSelected && <span className={styles.optionCheck}>✓</span>}
    </button>
  );
}
