import React from 'react';
import { cn } from '../../lib/utils';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, className, label }) => {
    return (
        <label className={cn("relative inline-flex items-center cursor-pointer", className)}>
            <div
                role="switch"
                aria-checked={checked}
                tabIndex={0}
                className={`w-11 h-6 rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${checked ? 'bg-green-500' : 'bg-red-500'}`}
                onClick={() => onChange(!checked)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange(!checked)}
            >
                <div
                    className="bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300"
                    style={{ transform: checked ? 'translateX(1.25rem)' : 'translateX(0)' }}
                />
            </div>
            {label && <span className="ml-3 text-sm font-medium text-gray-900 dark:text-foreground">{label}</span>}
        </label>
    );
};
