import { useState, useEffect, useCallback } from 'react';
import { QueueService } from '@/services/queueService';
import { QueuePosition, QueueStats } from '@/types/queue';

export interface UseQueueReturn {
  position: QueuePosition | null;
  stats: QueueStats | null;
  isLoading: boolean;
  isInQueue: boolean;
  error: string | null;
  queryInvitationCode: () => Promise<string | null>;
  leaveQueue: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function useQueue(userId?: string): UseQueueReturn {
  const [position, setPosition] = useState<QueuePosition | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load queue status
  const loadQueueStatus = useCallback(async () => {
    if (!userId) {
      setPosition(null);
      setStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await QueueService.getCurrentStatus(userId);
      
      if (response.success && response.data) {
        setPosition(response.data.position);
        setStats(response.data.stats);
      } else {
        const stats = await QueueService.getQueueStats();
        setStats(stats);
        setPosition(null);
      }
    } catch (err) {
      setError('Failed to load queue status');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Query for invitation code - try to get one first, join queue if none available
  const queryInvitationCode = useCallback(async (): Promise<string | null> => {
    if (!userId) {
      setError('Please login first');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First try to get an available invitation code
      const codeResponse = await QueueService.getAvailableInvitationCode(userId);
      
      if (codeResponse.success && codeResponse.code) {
        // Got a code! Refresh status to show updated stats
        await loadQueueStatus();
        return codeResponse.code;
      }

      // No codes available, join the queue
      const isPremium = false; // TODO: Get from user profile
      const joinResponse = await QueueService.joinQueue(userId, isPremium);
      
      if (joinResponse.success && joinResponse.data) {
        setPosition(joinResponse.data.position);
        const freshStats = await QueueService.getQueueStats();
        setStats(freshStats);
        return null;
      } else {
        setError(joinResponse.error || 'Failed to join queue');
        return null;
      }
    } catch (err) {
      setError('Failed to query invitation code');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadQueueStatus]);

  // Leave queue
  const leaveQueue = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await QueueService.leaveQueue(userId);
      
      if (response.success) {
        setPosition(null);
        await loadQueueStatus();
      } else {
        setError(response.error || 'Failed to leave queue');
      }
    } catch (err) {
      setError('Failed to leave queue');
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadQueueStatus]);

  // Refresh status
  const refreshStatus = useCallback(async () => {
    await loadQueueStatus();
  }, [loadQueueStatus]);

  // Load initial data when userId changes
  useEffect(() => {
    if (userId) {
      loadQueueStatus();
    } else {
      setPosition(null);
      setStats(null);
      setError(null);
      setIsLoading(false);
    }
  }, [userId, loadQueueStatus]);

  return {
    position,
    stats,
    isLoading,
    isInQueue: !!position,
    error,
    queryInvitationCode,
    leaveQueue,
    refreshStatus,
  };
}