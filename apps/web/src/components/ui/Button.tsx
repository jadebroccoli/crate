import { type ReactNode, type CSSProperties, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'ghost' | 'primary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = 'ghost', children, style, ...props }: ButtonProps) {
  const base: CSSProperties = {
    fontFamily: 'var(--font-ui)',
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '8px 18px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all 120ms ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    ...style,
  };

  const variantStyle: CSSProperties =
    variant === 'primary'
      ? {
          background: 'var(--c-accent-bg)',
          color: 'var(--c-accent)',
          border: '1px solid var(--c-accent-border)',
        }
      : {
          background: 'transparent',
          color: 'var(--c-text-muted)',
          border: '1px solid var(--c-border)',
        };

  return (
    <button
      {...props}
      style={{ ...base, ...variantStyle, ...style }}
      onMouseEnter={(e) => {
        if (variant === 'ghost') {
          e.currentTarget.style.background = 'var(--c-surface-2)';
          e.currentTarget.style.color = 'var(--c-text-primary)';
          e.currentTarget.style.borderColor = 'var(--c-border-hover)';
        } else {
          e.currentTarget.style.background = 'var(--c-accent)';
          e.currentTarget.style.color = 'var(--c-bg)';
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'ghost') {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--c-text-muted)';
          e.currentTarget.style.borderColor = 'var(--c-border)';
        } else {
          e.currentTarget.style.background = 'var(--c-accent-bg)';
          e.currentTarget.style.color = 'var(--c-accent)';
        }
      }}
    >
      {children}
    </button>
  );
}
