import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '', 
  loading = false,
  disabled = false,
  to,
  href,
  ...props 
}, ref) => {
  
  const base = "relative inline-flex items-center justify-center font-sans font-semibold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-300 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variants = {
    primary: "bg-brand text-white hover:bg-brand-hover shadow-sm focus:ring-brand/30",
    accent: "bg-accent text-white hover:bg-accent-hover shadow-sm focus:ring-accent/30",
    subtle: "bg-brand-light text-brand hover:bg-brand/20",
    outline: "border border-border text-text hover:bg-surface-muted hover:border-border-hover",
    danger: "bg-danger text-white hover:bg-danger-hover shadow-sm focus:ring-danger/30",
    ghost: "text-text-muted hover:bg-surface-muted hover:text-text",
  };

  const combinedClassName = `${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`;
  const MotionLink = motion(Link);

  const content = (
    <>
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </>
  );

  const anim = {
    whileHover: { y: disabled || loading ? 0 : -1 },
    whileTap: { scale: disabled || loading ? 1 : 0.98 }
  };

  if (to) {
    return <MotionLink ref={ref} to={to} className={combinedClassName} {...anim} {...props}>{content}</MotionLink>;
  }

  if (href) {
    const MotionA = motion.a;
    return <MotionA ref={ref} href={href} className={combinedClassName} {...anim} {...props}>{content}</MotionA>;
  }

  return (
    <motion.button ref={ref} className={combinedClassName} disabled={disabled || loading} {...anim} {...props}>
      {content}
    </motion.button>
  );
});

Button.displayName = 'Button';

export default Button;
