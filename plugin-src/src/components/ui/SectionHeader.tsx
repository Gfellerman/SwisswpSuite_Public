import React from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  action,
}) => {
  return (
    <div className="animate-in fade-in slide-in-from-top-4 mb-12 flex flex-col gap-6 duration-700 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-6">
        <div className="bg-swiss-red h-12 w-1.5 rounded-full shadow-[0_0_15px_var(--color-swiss-red)]"></div>
        <div className="flex flex-col">
          <h2 className="text-foreground dark:text-foreground text-4xl leading-tight font-black tracking-tight uppercase">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-[12px] font-bold tracking-[0.2em] text-neutral-700 uppercase">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};
