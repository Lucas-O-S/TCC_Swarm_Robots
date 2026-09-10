import type { HTMLAttributes } from 'react';
import styles from './Obstacle.module.css';

interface ObstacleProps extends HTMLAttributes<HTMLDivElement> {
  width: number;
  height: number;
  label?: string;
}


export function Obstacle({ width, height, label, className = '', style, ...rest }: ObstacleProps) {
  return (
    <div
      className={`${styles.obstacle} ${className}`}
      style={{ width, height, ...style }}
      title={label}
      {...rest}
    />
  );
}
