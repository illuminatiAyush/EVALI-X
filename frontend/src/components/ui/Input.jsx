import { forwardRef } from 'react';

const Input = forwardRef(({ 
  className = '', 
  size = 'md', 
  error = false,
  label,
  id,
  ...props 
}, ref) => {
  
  const sizeStyles = size === 'lg' ? "px-4 py-3 text-base" : "px-3 py-2 text-sm";
  
  const baseStyles = "w-full bg-background border rounded-md font-sans transition-all duration-200 outline-none disabled:opacity-60 disabled:cursor-not-allowed";
  
  const stateStyles = error 
    ? "border-danger focus:ring-2 focus:ring-danger/20" 
    : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <div className="w-full flex flex-col gap-sm">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`${baseStyles} ${sizeStyles} ${stateStyles} ${className}`}
        {...props}
      />
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
