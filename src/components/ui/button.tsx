import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7d1522]/10 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        default: 'bg-[#7d1522] text-white hover:bg-[#69111d]',
        secondary: 'bg-[#f3f3f3] text-[#7d1522] hover:bg-[#ececec]',
        outline: 'border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50',
        ghost: 'bg-transparent text-zinc-800 hover:bg-zinc-100',
        destructive: 'bg-[#b3261e] text-white hover:bg-[#9f221c]',
      },
      size: {
        default: 'h-12 px-4 py-3',
        sm: 'h-10 rounded-xl px-3',
        lg: 'h-14 rounded-2xl px-5',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
