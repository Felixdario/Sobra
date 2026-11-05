import { chooseScenario } from './devData';
import styles from './DevDataSwitch.module.css';
import { SCENARIO_LABELS, SCENARIOS, type Scenario } from './scenarios';

const OPTIONS = ['demo', ...SCENARIOS] as const;

/**
 * Dev-only chrome (break-ui): flips the data under the whole app between the real API and the
 * scenarios. Plain on purpose, it is not part of the design under test.
 */
export function DevDataSwitch({ active }: { active: Scenario | null }) {
  const current = active ?? 'demo';
  return (
    <div className={styles.switch} role="group" aria-label="Dados de desenvolvimento">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={styles.option}
          aria-pressed={option === current}
          onClick={() => option !== current && chooseScenario(option)}
        >
          {SCENARIO_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
