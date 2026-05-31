// src/components/ui/LoadingSkeleton.tsx

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'chart';
}

export const Skeleton = ({ className, variant = 'default', ...props }: SkeletonProps) => {
  const baseClasses = "animate-pulse bg-muted rounded-md";
  
  const variants = {
    default: "h-4 w-full",
    card: "h-32 w-full rounded-lg",
    text: "h-4 w-3/4",
    avatar: "h-10 w-10 rounded-full",
    chart: "h-48 w-full rounded-lg"
  };

  return (
    <div className={cn(baseClasses, variants[variant], className)} {...props} />
  );
};

export const TradeFormSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="h-12 w-full bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-10 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-10 bg-muted animate-pulse rounded" />
      <div className="h-12 bg-muted animate-pulse rounded" />
    </div>
  );
};

export const MarketListSkeleton = () => {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Skeleton variant="avatar" className="h-8 w-8" />
            <div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12 mt-1" />
            </div>
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16 mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const PositionsSkeleton = () => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="card" className="h-20" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 border rounded-lg">
          <div className="flex justify-between mb-2">
            <div className="flex items-center gap-2">
              <Skeleton variant="avatar" className="h-8 w-8" />
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16 mt-1" />
              </div>
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        </div>
      ))}
    </div>
  );
};