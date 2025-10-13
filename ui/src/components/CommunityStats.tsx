import React from 'react';
import { QueueStats } from '@/types/queue';

interface CommunityStatsProps {
  stats: QueueStats | null;
  className?: string;
}

export const CommunityStats: React.FC<CommunityStatsProps> = ({ stats, className = "" }) => {
  if (!stats) return null;

  return (
    <div className={`mt-8 w-full ${className}`}>
      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4 text-center">
        Community Statistics
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 max-w-full mx-auto">
        <div className="card text-center">
          <div className="text-lg sm:text-2xl font-bold text-primary-600">
            {stats.totalInQueue}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">In Queue</div>
        </div>
        <div className="card text-center">
          <div className="text-lg sm:text-2xl font-bold text-primary-600">
            {stats.totalProcessed}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">Processed</div>
        </div>
        <div className="card text-center">
          <div className="text-lg sm:text-2xl font-bold text-primary-600">
            {stats.availableCodes}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">Available</div>
        </div>
        <div className="card text-center">
          <div className="text-lg sm:text-2xl font-bold text-primary-600">
            {stats.returnRate}%
          </div>
          <div className="text-xs sm:text-sm text-gray-600">Return Rate</div>
        </div>
      </div>
    </div>
  );
};