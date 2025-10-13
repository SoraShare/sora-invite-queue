import { Clock, Users, TrendingUp, Zap } from 'lucide-react';
import { QueuePosition, QueueStats } from '@/types/queue';
import { config } from '@/lib/supabase';
import { CommunityStats } from '@/components/CommunityStats';

interface QueueCardProps {
  position: QueuePosition | null;
  stats: QueueStats;
  isInQueue: boolean;
  isLoading: boolean;
  onQueryInvitationCode: () => Promise<void>;
  onLeaveQueue: () => Promise<void>;
}

export function QueueCard({ 
  position, 
  stats, 
  isInQueue, 
  isLoading, 
  onQueryInvitationCode, 
  onLeaveQueue
}: QueueCardProps) {
  const formatWaitTime = (hours: number): string => {
    if (hours < 1) return 'Less than 1 hour';
    if (hours < 24) return `${Math.round(hours)} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days}d ${remainingHours}h`;
  };

  const formatJoinedDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="card max-w-2xl mx-auto">

      {/* Main Queue Status */}
      {isInQueue && position ? (
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              position.isPriority 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-primary-100 text-primary-800'
            }`}>
              {position.isPriority && <Zap className="w-4 h-4 mr-1" />}
              {position.isPriority ? 'Priority Queue' : 'Standard Queue'}
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-1">
            Position #{position.position}
          </h2>
          
          <p className="text-gray-600 mb-2">
            Estimated wait: {formatWaitTime(position.estimatedWaitTime)}
          </p>

          <p className="text-sm text-blue-600 mb-4">
            🔔 You'll be automatically notified when an invitation code becomes available!
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Joined: {formatJoinedDate(position.joinedAt)}
              </div>
            </div>
          </div>

          <button
            onClick={onLeaveQueue}
            disabled={isLoading}
            className="btn-secondary w-full sm:w-auto"
          >
            {isLoading ? 'Processing...' : 'Leave Queue'}
          </button>
        </div>
      ) : (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Get Your Sora Invitation Code
          </h2>
          <p className="text-gray-600 mb-4">
            Click below to query for an available invitation code. If none are available, you'll automatically join the queue.
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
            <ul className="text-sm text-blue-800 space-y-1 text-left max-w-md mx-auto">
              <li>• Click "Query Invitation Code" to check for available codes</li>
              <li>• If codes are available, you'll receive one immediately</li>
              <li>• If not available, you'll join the queue automatically</li>
              <li>• Queue operates on a first-come, first-served basis</li>
            </ul>
          </div>

          <button
            onClick={onQueryInvitationCode}
            disabled={isLoading}
            className="btn-primary text-lg px-8 py-3 mb-4"
          >
            {isLoading ? 'Processing...' : 'Query Invitation Code'}
          </button>

          {(stats?.availableCodes ?? 0) === 0 && (
            <p className="text-blue-600 text-sm">
              💡 No codes currently available - clicking above will join you to the queue
            </p>
          )}

          {(stats?.availableCodes ?? 0) > 0 && (
            <p className="text-green-600 text-sm">
              ✨ {stats?.availableCodes} invitation code{stats?.availableCodes === 1 ? '' : 's'} available - click above to get yours!
            </p>
          )}
        </div>
      )}

      {/* Queue Statistics */}
      {config.queueStatsEnabled && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">In Queue</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {isLoading ? '...' : (stats?.totalInQueue ?? 0).toLocaleString()}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Avg Wait</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {isLoading ? '...' : formatWaitTime(stats?.averageWaitTime ?? 0)}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Processed</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {isLoading ? '...' : (stats?.totalProcessed ?? 0).toLocaleString()}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-sm">Available</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {isLoading ? '...' : (stats?.availableCodes ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Community Statistics */}
      {config.communityReturnRateEnabled && (
        <CommunityStats 
          stats={stats} 
          className="mt-6 pt-4 border-t border-gray-200" 
        />
      )}
    </div>
  );
}