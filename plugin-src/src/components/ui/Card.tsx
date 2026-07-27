import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  id?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false, id, onClick }) => {
  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-card dark:bg-secondary backdrop-blur-md rounded-3xl border border-border dark:border-border/10 shadow-premium overflow-hidden transition-all duration-300 hover:border-border dark:hover:border-border/20 text-neutral-900 dark:text-foreground ${className}`}
    >
      {noPadding ? children : <div className="p-8">{children}</div>}
    </div>
  );
};
