import { useState, useEffect, useCallback } from 'react';
import { QueueService } from '@/services/queueService';
import { QueuePosition, QueueStats } from '@/types/queue';
import { getCurrentUser } from '@/lib/supabase';

export interface UseQueueReturn {
  position: QueuePosition | null;
  stats: QueueStats | null;
  isLoading: boolean;
  isInQueue: boolean;
  error: string | null;
  joinQueue: () => Promise<void>;
  leaveQueue: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  isConnected: boolean;
}

export function useQueue(): UseQueueReturn {
  const [position, setPosition] = useState<QueuePosition | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getUserId = async () => {
      const user = await getCurrentUser();
      setUserId(user?.id || null);
    };
    getUserId();
  }, []);

  // Load queue status
  const loadQueueStatus = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await QueueService.getCurrentStatus(userId);
      
      if (response.success && response.data) {
        setPosition(response.data.position);
        setStats(response.data.stats);
      } else {
        // User not in queue, just get stats
        const stats = await QueueService.getQueueStats();
        setStats(stats);
        setPosition(null);
      }
    } catch (err) {
      setError('Failed to load queue status');
      console.error('Error loading queue status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Join queue
  const joinQueue = useCallback(async () => {
    if (!userId) {
      setError('Please login first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if user is premium (simplified - would get from user profile)
      const isPremium = false; // TODO: Get from user profile
      
      const response = await QueueService.joinQueue(userId, isPremium);
      
      if (response.success && response.data) {
        setPosition(response.data.position);
        await loadQueueStatus(); // Refresh stats
      } else {
        setError(response.error || 'Failed to join queue');
      }
    } catch (err) {
      setError('Failed to join queue');
      console.error('Error joining queue:', err);
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
        await loadQueueStatus(); // Refresh stats
      } else {
        setError(response.error || 'Failed to leave queue');
      }
    } catch (err) {
      setError('Failed to leave queue');
      console.error('Error leaving queue:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadQueueStatus]);

  // Refresh status
  const refreshStatus = useCallback(async () => {
    await loadQueueStatus();
  }, [loadQueueStatus]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!userId) return;

    let subscription: any = null;

    const setupRealtimeSubscription = () => {
      try {
        subscription = QueueService.subscribeToQueueUpdates(userId, () => {
          // Refresh status when queue updates
          loadQueueStatus();
        });

        // Monitor connection status
        subscription.on('system', {}, (status: string) => {
          setIsConnected(status === 'online');
        });

        setIsConnected(true);
      } catch (err) {
        console.error('Error setting up realtime subscription:', err);
        setIsConnected(false);
      }
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [userId, loadQueueStatus]);

  // Load initial data
  useEffect(() => {
    if (userId) {
      loadQueueStatus();
    }
  }, [userId, loadQueueStatus]);

  // Auto-refresh every 30 seconds as fallback
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      loadQueueStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, loadQueueStatus]);

  return {
    position,
    stats,
    isLoading,
    isInQueue: !!position,
    error,
    joinQueue,
    leaveQueue,
    refreshStatus,
    isConnected,
  };
}