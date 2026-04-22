import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-12 w-full resize-none rounded-2xl border border-zinc-300 bg-white px-4 py-3.5 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#7d1522] focus:ring-4 focus:ring-[#7d1522]/10 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
