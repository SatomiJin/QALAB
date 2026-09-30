import styles from './BrandMark.module.scss';

/**
 * The lab's mark: the author's "S" logo (Assets/Logos/logoiconnobg.png) in
 * Highlighter on an Ink tile, the same as the favicon. Fixed colours, like a
 * printed logo, so it reads the same in both themes. Decorative: the brand
 * name next to it is the accessible text.
 */
export function BrandMark() {
  return (
    <img
      src="/brand-mark.png"
      alt=""
      width={28}
      height={28}
      className={styles.mark}
      data-testid="brand-mark"
    />
  );
}
