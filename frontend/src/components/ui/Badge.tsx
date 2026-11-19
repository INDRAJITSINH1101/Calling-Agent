import React from 'react';
import { Flame, Sun, Snowflake, Ban } from 'lucide-react';
import { ScoreBucket } from '../../types/crm';

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

const badgeVariants: Record<NonNullable<BadgeProps['variant']>, React.CSSProperties> = {
  default: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.12)'
  },
  success: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.3)'
  },
  warning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(245, 158, 11, 0.3)'
  },
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.3)'
  },
  info: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)'
  },
  purple: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    color: '#c084fc',
    border: '1px solid rgba(168, 85, 247, 0.3)'
  },
  neutral: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    color: '#94a3b8',
    border: '1px solid #334155'
  }
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'sm',
  icon,
  children,
  style,
  onClick,
  title
}) => {
  const isClickable = Boolean(onClick);
  const sizeStyle: React.CSSProperties =
    size === 'xs'
      ? { padding: '2px 6px', fontSize: '10px' }
      : size === 'lg'
      ? { padding: '4px 12px', fontSize: '13px' }
      : { padding: '2px 8px', fontSize: '11px' };

  return (
    <span
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontWeight: 700,
        borderRadius: '999px',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.15s ease',
        ...sizeStyle,
        ...badgeVariants[variant],
        ...style
      }}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};

export const ScoreBadge: React.FC<{
  score: number;
  bucket: ScoreBucket;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ score, bucket, onClick }) => {
  let variant: BadgeProps['variant'] = 'default';
  let Icon = Snowflake;

  if (bucket === 'HOT') {
    variant = 'danger';
    Icon = Flame;
  } else if (bucket === 'WARM') {
    variant = 'warning';
    Icon = Sun;
  } else if (bucket === 'COLD') {
    variant = 'info';
    Icon = Snowflake;
  } else if (bucket === 'SUPPRESSED') {
    variant = 'neutral';
    Icon = Ban;
  }

  return (
    <Badge
      variant={variant}
      icon={<Icon size={11} />}
      onClick={onClick}
      title="Click to view Transparent Scoring Breakdown"
    >
      {score} {bucket}
    </Badge>
  );
};
