import React from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, action }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center gap-6">
        <div className="w-1.5 h-12 bg-swiss-red rounded-full shadow-[0_0_15px_var(--color-swiss-red)]"></div>
        <div className="flex flex-col">
          <h2 className="text-4xl font-black text-foreground dark:text-foreground tracking-tight leading-tight uppercase">{title}</h2>
          {description && <p className="text-[12px] font-bold text-neutral-700 mt-1 uppercase tracking-[0.2em]">{description}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};
