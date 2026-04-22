import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.04em]',
  {
    variants: {
      variant: {
        default: 'bg-[#f7f2f3] text-[#7d1522]',
        secondary: 'bg-zinc-100 text-zinc-700',
        destructive: 'bg-[#fdecec] text-[#b3261e]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
