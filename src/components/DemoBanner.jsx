import { AlertTriangle, X, Info } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';

const DemoBanner = () => {
  const { configStatus } = useApp();
  const [dismissed, setDismissed] = useState(false);
  const [demoDismissed, setDemoDismissed] = useState(false);

  const missingConfigs = [];
  if (!configStatus.firebase) missingConfigs.push('Firebase');
  if (!configStatus.gemini) missingConfigs.push('Gemini API');
  const hasConfigIssues = missingConfigs.length > 0;
  const isFullyConfigured = configStatus.firebase && configStatus.gemini;

  return (
    <>
      {/* Config warning banner */}
      {hasConfigIssues && !dismissed && (
        <div className="bg-amber-500/90 dark:bg-amber-600/90 text-amber-950 dark:text-amber-50 px-4 py-2 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>
              <strong>Config Required:</strong> {missingConfigs.join(' & ')} not configured. 
              Add your keys to <code className="bg-amber-600/30 dark:bg-amber-700/40 px-1 rounded">.env</code> to enable real-time features.
            </span>
          </div>
          <button 
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-amber-600/30 dark:hover:bg-amber-700/40 rounded"
            aria-label="Dismiss banner"
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      {/* Demo mode indicator - always show until dismissed */}
      {isFullyConfigured && !demoDismissed && (
        <div className="bg-sky-500/90 dark:bg-sky-600/90 text-white dark:text-white px-4 py-2 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={16} />
            <span>
              <strong>POC Demo:</strong> Email notifications and magic links are simulated. 
              Real authentication would be enabled in production.
            </span>
          </div>
          <button 
            onClick={() => setDemoDismissed(true)}
            className="p-1 hover:bg-sky-600/50 dark:hover:bg-sky-700/50 rounded"
            aria-label="Dismiss demo banner"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
};

export default DemoBanner;
