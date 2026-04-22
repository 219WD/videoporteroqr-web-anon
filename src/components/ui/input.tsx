import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-12 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3.5 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#7d1522] focus:ring-4 focus:ring-[#7d1522]/10 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
