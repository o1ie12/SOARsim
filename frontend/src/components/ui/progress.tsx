import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
}

function Progress({ value, className, indicatorClassName }: ProgressProps) {
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
    >
      <div
        className={cn(
          "h-full w-full flex-1 bg-primary transition-all duration-300 ease-out",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - Math.min(Math.max(value, 0), 100)}%)` }}
      />
    </div>
  );
}

export { Progress };
