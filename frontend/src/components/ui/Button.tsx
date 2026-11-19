import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'amber' | 'sky';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    letterSpacing: '0.2px'
  },
  secondary: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#f8fafc',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
  },
  outline: {
    background: 'rgba(255, 255, 255, 0.03)',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
  },
  danger: {
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.15) 100%)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none'
  },
  amber: {
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.12) 100%)',
    color: '#fbbf24',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)'
  },
  sky: {
    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18) 0%, rgba(2, 132, 199, 0.12) 100%)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    boxShadow: '0 2px 8px rgba(56, 189, 248, 0.15)'
  }
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  xs: { padding: '4px 8px', fontSize: '11px', borderRadius: '6px', gap: '4px' },
  sm: { padding: '6px 12px', fontSize: '12px', borderRadius: '8px', gap: '6px' },
  md: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', gap: '8px' },
  lg: { padding: '10px 20px', fontSize: '14px', borderRadius: '10px', gap: '10px' }
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'outline',
  size = 'sm',
  icon,
  loading = false,
  disabled,
  children,
  style,
  ...rest
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'all 0.15s ease',
    outline: 'none',
    whiteSpace: 'nowrap',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style
  };

  return (
    <button disabled={disabled || loading} style={baseStyle} {...rest}>
      {loading ? (
        <div
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
      ) : (
        icon
      )}
      {children && <span>{children}</span>}
    </button>
  );
};
