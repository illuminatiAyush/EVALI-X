import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  color = 'brand',
  className = '', 
  loading = false,
  disabled = false,
  to,
  href,
  ...props 
}, ref) => {
  
  let actualVariant = variant;
  if (color === 'red') actualVariant = 'danger';
  
  const baseStyles = "relative inline-flex items-center justify-center font-sans font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-60 disabled:cursor-not-allowed";
  
  const paddingStyles = "px-md py-[10px] text-sm"; // using md spacing (16px) for px
  
  const variants = {
    primary: "bg-brand text-white hover:bg-brand-hover shadow-soft",
    subtle: "bg-brand/10 text-brand hover:bg-brand/20 dark:bg-brand/20 dark:hover:bg-brand/30 dark:text-cyan-300",
    outline: "border border-border text-text hover:bg-surface dark:hover:bg-surface",
    danger: "bg-danger text-white hover:bg-danger-hover shadow-soft",
  };

  const combinedClassName = `${baseStyles} ${paddingStyles} ${variants[actualVariant]} ${className}`;
  const MotionLink = motion(Link);
  const MotionA = motion.a;

  const content = (
    <>
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </>
  );

  const animationProps = {
    whileHover: { y: disabled || loading ? 0 : -2 },
    whileTap: { scale: disabled || loading ? 1 : 0.98 }
  };

  if (to) {
    return (
      <MotionLink ref={ref} to={to} className={combinedClassName} {...animationProps} {...props}>
        {content}
      </MotionLink>
    );
  }

  if (href) {
    return (
      <MotionA ref={ref} href={href} className={combinedClassName} {...animationProps} {...props}>
        {content}
      </MotionA>
    );
  }

  return (
    <motion.button
      ref={ref}
      className={combinedClassName}
      disabled={disabled || loading}
      {...animationProps}
      {...props}
    >
      {content}
    </motion.button>
  );
});

Button.displayName = 'Button';

export default Button;
