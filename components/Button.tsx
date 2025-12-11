import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  type = 'button',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]";
  
  const variants = {
    // Orange/Amber Gradient for Primary Actions
    primary: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:to-orange-600 border border-transparent",
    secondary: "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white shadow-sm",
    outline: "border-2 border-slate-600 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white hover:border-slate-500",
    ghost: "bg-transparent hover:bg-white/10 text-slate-300 hover:text-white"
  };

  const sizes = {
    sm: "h-9 px-3 text-xs uppercase tracking-wide",
    md: "h-11 px-5 text-sm",
    lg: "h-14 px-8 text-base"
  };

  return (
    <button 
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};