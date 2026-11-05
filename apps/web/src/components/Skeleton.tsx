import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

type SkeletonProps = {
  width?: CSSProperties['width'];
  height: CSSProperties['height'];
  className?: string;
};

export function Skeleton({ width = '100%', height, className = '' }: SkeletonProps) {
  return (
    <span
      className={`${styles.skeleton} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
