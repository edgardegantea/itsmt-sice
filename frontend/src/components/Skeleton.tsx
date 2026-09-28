
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200/80 rounded-lg ${className}`} />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-8 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    </div>
  )
}
