const LoadingSpinner = ({ size = 'md', light = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className="flex items-center justify-center">
      <div 
        className={`${sizeClasses[size]} rounded-full animate-spin ${
          light 
            ? 'border-white/30 border-t-white' 
            : 'border-sky-500/30 border-t-sky-500'
        }`}
      />
    </div>
  );
};

export default LoadingSpinner;
