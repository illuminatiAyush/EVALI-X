export default function Container({ children, className = '', ...props }) {
  return (
    <div className={`max-w-[1200px] mx-auto w-full px-md md:px-lg ${className}`} {...props}>
      {children}
    </div>
  );
}
