import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ButtonGroupOption<T extends string = string> {
  id: T;
  label: string;
}

export interface ButtonGroupProps<T extends string = string> {
  options: readonly ButtonGroupOption<T>[] | ButtonGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'default' | 'xs' | 'lg';
}

export function ButtonGroup<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = 'default',
}: ButtonGroupProps<T>) {
  return (
    <div
      className={cn('inline-flex rounded-xl shadow-xs border-0 p-0', className)}
      role="group"
      aria-label="Button group"
    >
      {options.map((opt, index) => {
        const isSelected = value === opt.id;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;

        return (
          <Button
            key={opt.id}
            type="button"
            variant={isSelected ? 'primary' : 'outline'}
            size={size}
            onClick={() => onChange(opt.id)}
            className={cn(
              'relative text-xs font-semibold cursor-pointer transition-all focus:z-10 hover:z-10',
              !isFirst && '-ml-px',
              isFirst && 'rounded-r-none',
              isLast && 'rounded-l-none',
              !isFirst && !isLast && 'rounded-none',
              isSelected
                ? 'z-10 border-primary bg-primary text-primary-foreground shadow-xs'
                : 'bg-background text-foreground border-border hover:bg-muted/60'
            )}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
