import { forwardRef } from 'react';
import { motion } from 'framer-motion';

const Card = forwardRef(({ 
  children, 
  p = 'md', // padding size equivalent
  className = '', 
  interactive = false, // If true, adds hover/active states
  ...props 
}, ref) => {

  const paddingMap = {
    sm: 'p-md',  // 16px
    md: 'p-lg',  // 24px
    lg: 'p-xl',  // 32px
  };

  const baseStyles = "bg-surface border border-border rounded-2xl shadow-sm transition-all duration-300";
  const interactiveStyles = interactive ? "cursor-pointer hover:border-brand hover:shadow-cyan-glow" : "";
  
  return (
    <motion.div
      ref={ref}
      whileTap={interactive ? { scale: 0.99, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" } : {}}
      className={`${baseStyles} ${paddingMap[p] || paddingMap.md} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
});

Card.displayName = 'Card';

export default Card;
