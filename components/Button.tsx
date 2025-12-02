import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none shadow-sm active:scale-95";
  
  const variants = {
    primary: "bg-industrial-900 text-white hover:bg-industrial-800 hover:shadow-md focus:ring-industrial-500 border border-transparent",
    secondary: "bg-gradient-to-r from-safety to-orange-600 text-white hover:to-orange-700 hover:shadow-orange-500/30 focus:ring-orange-500 border border-transparent",
    outline: "bg-white text-industrial-700 border border-industrial-200 hover:bg-industrial-50 hover:border-industrial-300 hover:text-industrial-900 focus:ring-industrial-500",
    ghost: "bg-transparent text-industrial-600 hover:bg-industrial-100 hover:text-industrial-900 shadow-none border border-transparent"
  };

  return (
    <button 
      type="button"
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};