/**
 * Skeleton loader component for content placeholders
 * Provides visual feedback during data loading with shimmer animation
 */

const Skeleton = ({ className = '', variant = 'text', width, height, count = 1 }) => {
  const baseClasses = 'animate-pulse bg-slate-200 dark:bg-slate-700 rounded';

  const variantClasses = {
    text: 'h-4 rounded',
    title: 'h-6 rounded',
    circle: 'rounded-full',
    rect: 'rounded-lg',
    card: 'rounded-xl',
  };

  const style = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  const elements = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClasses} ${variantClasses[variant] || ''} ${className}`}
      style={style}
    />
  ));

  return count === 1 ? elements[0] : <div className="space-y-2">{elements}</div>;
};

/**
 * Pre-built skeleton layouts for common use cases
 */

// Card skeleton with title and content lines
export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}>
    <Skeleton variant="title" className="w-1/3 mb-4" />
    <Skeleton variant="text" className="w-full mb-2" />
    <Skeleton variant="text" className="w-4/5 mb-2" />
    <Skeleton variant="text" className="w-2/3" />
  </div>
);

// Stats card skeleton
export const SkeletonStats = ({ className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <Skeleton variant="text" className="w-24 h-4" />
      <Skeleton variant="circle" width={20} height={20} />
    </div>
    <Skeleton variant="title" className="w-16 h-8 mb-1" />
    <Skeleton variant="text" className="w-32 h-3" />
  </div>
);

// List item skeleton
export const SkeletonListItem = ({ className = '' }) => (
  <div className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 ${className}`}>
    <Skeleton variant="circle" width={40} height={40} />
    <div className="flex-1">
      <Skeleton variant="text" className="w-1/3 mb-2" />
      <Skeleton variant="text" className="w-1/2 h-3" />
    </div>
  </div>
);

// Table row skeleton
export const SkeletonTableRow = ({ cols = 4, className = '' }) => (
  <div className={`flex items-center gap-4 p-4 ${className}`}>
    {Array.from({ length: cols }, (_, i) => (
      <Skeleton key={i} variant="text" className={i === 0 ? 'w-1/4' : 'flex-1'} />
    ))}
  </div>
);

// Dashboard skeleton layout
export const SkeletonDashboard = () => (
  <div className="space-y-6">
    {/* Stats row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SkeletonStats />
      <SkeletonStats />
      <SkeletonStats />
    </div>
    {/* Main content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <SkeletonCard />
      </div>
      <SkeletonCard />
    </div>
  </div>
);

// Survey response skeleton
export const SkeletonResponse = ({ className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <Skeleton variant="title" className="w-1/2 mb-2" />
        <Skeleton variant="text" className="w-32 h-3" />
      </div>
      <Skeleton variant="rect" width={48} height={32} />
    </div>
    <Skeleton variant="text" className="w-full mb-2" />
    <Skeleton variant="text" className="w-3/4" />
  </div>
);

export default Skeleton;
