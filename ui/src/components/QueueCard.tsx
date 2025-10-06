import React from 'react';
import { Clock, Users, TrendingUp, Zap } from 'lucide-react';
import { QueuePosition, QueueStats } from '@/types/queue';

interface QueueCardProps {
  position: QueuePosition | null;
  stats: QueueStats;
  isInQueue: boolean;
  isLoading: boolean;
  onJoinQueue: () => Promise<void>;
  onLeaveQueue: () => Promise<void>;
  isConnected: boolean;
}

export function QueueCard({ 
  position, 
  stats, 
  isInQueue, 
  isLoading, 
  onJoinQueue, 
  onLeaveQueue, 
  isConnected 
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
      {/* Connection Status */}
      <div className={`flex items-center gap-2 mb-4 text-sm ${
        isConnected ? 'text-success-600' : 'text-warning-600'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-success-500 animate-pulse' : 'bg-warning-500'
        }`} />
        {isConnected ? 'Connected - Live updates' : 'Reconnecting...'}
      </div>

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
          
          <p className="text-gray-600 mb-4">
            Estimated wait: {formatWaitTime(position.estimatedWaitTime)}
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
            Join the Sora Invite Queue
          </h2>
          <p className="text-gray-600 mb-6">
            Fair, transparent access to OpenAI Sora invitations through our community-driven platform.
          </p>

          <button
            onClick={onJoinQueue}
            disabled={isLoading || stats.availableCodes === 0}
            className="btn-primary text-lg px-8 py-3"
          >
            {isLoading ? 'Joining...' : 'Join Queue'}
          </button>

          {stats.availableCodes === 0 && (
            <p className="text-warning-600 text-sm mt-2">
              No codes currently available. New codes are added as community members return them.
            </p>
          )}
        </div>
      )}

      {/* Queue Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">In Queue</span>
          </div>
          <div className="text-xl font-semibold text-gray-900">
            {isLoading ? '...' : stats.totalInQueue.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Avg Wait</span>
          </div>
          <div className="text-xl font-semibold text-gray-900">
            {isLoading ? '...' : formatWaitTime(stats.averageWaitTime)}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Processed</span>
          </div>
          <div className="text-xl font-semibold text-gray-900">
            {isLoading ? '...' : stats.totalProcessed.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Available</span>
          </div>
          <div className="text-xl font-semibold text-gray-900">
            {isLoading ? '...' : stats.availableCodes.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Community Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Community return rate</span>
          <span className="font-medium text-gray-900">
            {isLoading ? '...' : `${stats.returnRate}%`}
          </span>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-success-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(stats.returnRate, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Higher return rates mean faster queue processing for everyone
        </p>
      </div>
    </div>
  );
}