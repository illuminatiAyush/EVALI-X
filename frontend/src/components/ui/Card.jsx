import { forwardRef } from 'react';
import { motion } from 'framer-motion';

const Card = forwardRef(({ 
  children, 
  p = 'md',
  className = '', 
  interactive = false,
  ...props 
}, ref) => {

  const paddingMap = {
    '0': 'p-0',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
    xl: 'p-8',
  };

  const baseStyles = "bg-white border border-zinc-100 rounded-2xl shadow-soft transition-all duration-200";
  const interactiveStyles = interactive ? "cursor-pointer hover:border-teal-200 hover:shadow-md" : "";
  
  return (
    <motion.div
      ref={ref}
      whileTap={interactive ? { scale: 0.99 } : {}}
      className={`${baseStyles} ${paddingMap[p] || paddingMap.md} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
});

Card.displayName = 'Card';

export default Card;
