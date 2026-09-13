import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  id?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  noPadding = false,
  id,
  onClick,
}) => {
  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-card dark:bg-secondary border-border dark:border-border/10 hover:border-border dark:hover:border-border/20 dark:text-foreground overflow-hidden rounded-3xl border text-neutral-900 backdrop-blur-md transition-all duration-300 ${className}`}
    >
      {noPadding ? children : <div className="p-8">{children}</div>}
    </div>
  );
};
