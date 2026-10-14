import styles from "../pages/CaptchaEarn/CaptchaEarn.module.css";
import { CheckIcon } from "./Icons.jsx";

export default function CaptchaOption({ value, index, selected, locked, onSelect }) {
  const isSelected = selected === value;
  return (
    <button
      type="button"
      disabled={locked}
      aria-pressed={isSelected}
      onClick={() => onSelect(value)}
      className={`${styles.optionCard} ${isSelected ? styles.optionSelected : ""} ${locked && !isSelected ? styles.optionDimmed : ""}`}
      style={{ animationDelay: `${120 + index * 70}ms` }}
    >
      <span className={styles.optionText}>{value}</span>
      {isSelected && (
        <span className={styles.optionCheck}>
          <CheckIcon />
        </span>
      )}
    </button>
  );
}