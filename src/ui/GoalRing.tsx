import styles from './GoalRing.module.css'

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** The home card's ring: how much of the goal is reached, filled from the top clockwise; "—" while unknown. */
export default function GoalRing({ percent }: { percent?: number }) {
  const filled = (Math.min(Math.max(percent ?? 0, 0), 100) / 100) * CIRCUMFERENCE
  return (
    <div className={styles.ring}>
      <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
        <circle className={styles.track} cx="48" cy="48" r={RADIUS} />
        {filled > 0 && (
          <circle className={styles.fill} cx="48" cy="48" r={RADIUS} strokeDasharray={`${filled} ${CIRCUMFERENCE}`} transform="rotate(-90 48 48)" />
        )}
      </svg>
      <span className={styles.percent}>{percent === undefined ? '—' : `%${percent}`}</span>
    </div>
  )
}
