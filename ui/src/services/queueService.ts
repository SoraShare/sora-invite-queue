import { supabase } from '@/lib/supabase';
import { 
  QueueEntry, 
  QueuePosition, 
  QueueStats, 
  QueueJoinResponse, 
  QueueStatusResponse,
  User 
} from '@/types/queue';

export class QueueService {
  /**
   * Join the queue - implements FIFO with priority handling
   */
  static async joinQueue(userId: string, isPremium: boolean = false): Promise<QueueJoinResponse> {
    try {
      // Check if user is already in queue
      const { data: existingEntry } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .single();

      if (existingEntry) {
        return {
          success: false,
          error: 'You are already in the queue'
        };
      }

      // Get next position based on priority
      const position = await this.getNextPosition(isPremium);

      // Insert new queue entry
      const { data: queueEntry, error: insertError } = await supabase
        .from('queue_entries')
        .insert({
          user_id: userId,
          position: position,
          priority: isPremium,
          status: 'waiting',
          created_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (insertError) {
        return {
          success: false,
          error: insertError.message
        };
      }

      // Update all positions after this operation
      await this.updateQueuePositions();

      // Get the current position info
      const positionInfo = await this.getQueuePosition(userId);

      return {
        success: true,
        data: {
          queueEntry,
          position: positionInfo!
        }
      };

    } catch (error) {
      console.error('Error joining queue:', error);
      return {
        success: false,
        error: 'Failed to join queue. Please try again.'
      };
    }
  }

  /**
   * Leave the queue
   */
  static async leaveQueue(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('queue_entries')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'waiting');

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Update positions for remaining queue members
      await this.updateQueuePositions();

      return { success: true };
    } catch (error) {
      console.error('Error leaving queue:', error);
      return {
        success: false,
        error: 'Failed to leave queue. Please try again.'
      };
    }
  }

  /**
   * Get current queue position for a user
   */
  static async getQueuePosition(userId: string): Promise<QueuePosition | null> {
    try {
      const { data: entry } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .single();

      if (!entry) return null;

      // Calculate actual position considering priority
      const { count: priorityAhead } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting')
        .eq('priority', true)
        .lt('created_at', entry.created_at);

      const { count: regularAhead } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting')
        .eq('priority', false)
        .lt('created_at', entry.created_at);

      // Priority users go first, then regular users by timestamp
      const actualPosition = entry.priority 
        ? (priorityAhead || 0) + 1
        : (await this.getPriorityCount()) + (regularAhead || 0) + 1;

      // Calculate estimated wait time (simplified)
      const estimatedWaitTime = this.calculateEstimatedWaitTime(actualPosition);

      return {
        position: actualPosition,
        estimatedWaitTime,
        isPriority: entry.priority,
        status: entry.status,
        joinedAt: entry.created_at
      };

    } catch (error) {
      console.error('Error getting queue position:', error);
      return null;
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<QueueStats> {
    try {
      // Get total in queue
      const { count: totalInQueue } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');

      // Get total processed (allocated + completed)
      const { count: totalProcessed } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .in('status', ['allocated', 'completed']);

      // Get available codes
      const { count: availableCodes } = await supabase
        .from('invitation_codes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');

      // Calculate return rate (simplified)
      const { count: totalAllocated } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'allocated');

      const { count: totalReturned } = await supabase
        .from('invitation_codes')
        .select('*', { count: 'exact', head: true })
        .not('submitted_by', 'is', null);

      const returnRate = totalAllocated && totalAllocated > 0 
        ? ((totalReturned || 0) / totalAllocated) * 100 
        : 0;

      // Calculate average wait time (simplified - based on processing rate)
      const averageWaitTime = this.calculateAverageWaitTime(totalInQueue || 0);

      return {
        totalInQueue: totalInQueue || 0,
        averageWaitTime,
        totalProcessed: totalProcessed || 0,
        availableCodes: availableCodes || 0,
        returnRate: Math.round(returnRate * 100) / 100
      };

    } catch (error) {
      console.error('Error getting queue stats:', error);
      return {
        totalInQueue: 0,
        averageWaitTime: 0,
        totalProcessed: 0,
        availableCodes: 0,
        returnRate: 0
      };
    }
  }

  /**
   * Get current queue status for a user
   */
  static async getCurrentStatus(userId: string): Promise<QueueStatusResponse> {
    try {
      const [position, stats] = await Promise.all([
        this.getQueuePosition(userId),
        this.getQueueStats()
      ]);

      return {
        success: true,
        data: {
          position: position!,
          stats
        }
      };

    } catch (error) {
      console.error('Error getting current status:', error);
      return {
        success: false,
        error: 'Failed to get queue status'
      };
    }
  }

  /**
   * Subscribe to real-time queue updates
   */
  static subscribeToQueueUpdates(userId: string, callback: (entry: QueueEntry) => void) {
    return supabase
      .channel('queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries'
        },
        async (payload) => {
          // Update positions when queue changes
          await this.updateQueuePositions();
          
          // If this affects the current user, trigger callback
          if ((payload.new as any)?.user_id === userId || (payload.old as any)?.user_id === userId) {
            callback(payload.new as QueueEntry);
          }
        }
      )
      .subscribe();
  }

  // Private helper methods

  /**
   * Get next position in queue considering priority
   */
  private static async getNextPosition(isPriority: boolean): Promise<number> {
    if (isPriority) {
      const { count } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting')
        .eq('priority', true);
      
      return (count || 0) + 1;
    } else {
      const { count: totalCount } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');
      
      return (totalCount || 0) + 1;
    }
  }

  /**
   * Get count of priority users in queue
   */
  private static async getPriorityCount(): Promise<number> {
    const { count } = await supabase
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .eq('priority', true);
    
    return count || 0;
  }

  /**
   * Update queue positions for all waiting entries
   */
  private static async updateQueuePositions(): Promise<void> {
    try {
      // Get all waiting entries ordered by priority and creation time
      const { data: entries } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('status', 'waiting')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (!entries) return;

      // Update positions
      for (let i = 0; i < entries.length; i++) {
        await supabase
          .from('queue_entries')
          .update({ position: i + 1 })
          .eq('id', entries[i].id);
      }

    } catch (error) {
      console.error('Error updating queue positions:', error);
    }
  }

  /**
   * Calculate estimated wait time based on position
   */
  private static calculateEstimatedWaitTime(position: number): number {
    // Simplified calculation: assume 1 code allocation per hour
    // In a real system, this would be based on historical data
    const processRate = 1; // codes per hour
    return Math.max(1, Math.ceil(position / processRate));
  }

  /**
   * Calculate average wait time based on current queue length
   */
  private static calculateAverageWaitTime(queueLength: number): number {
    // Simplified calculation based on current queue length
    const processRate = 1; // codes per hour
    return queueLength > 0 ? queueLength / processRate : 0;
  }

  /**
   * Process queue - allocate next available code (admin function)
   */
  static async processQueue(): Promise<{ success: boolean; allocated?: QueueEntry; error?: string }> {
    try {
      // Get next person in queue (priority first, then FIFO)
      const { data: nextEntry } = await supabase
        .from('queue_entries')
        .select(`
          *,
          user:users(*)
        `)
        .eq('status', 'waiting')
        .order('priority', { ascending: false })
        .order('position', { ascending: true })
        .limit(1)
        .single();

      if (!nextEntry) {
        return {
          success: false,
          error: 'No one in queue'
        };
      }

      // Get available code
      const { data: availableCode } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('status', 'available')
        .limit(1)
        .single();

      if (!availableCode) {
        return {
          success: false,
          error: 'No available codes'
        };
      }

      // Allocate code to user (transaction would be better, but simplified for now)
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

      // Update code allocation
      const { error: codeError } = await supabase
        .from('invitation_codes')
        .update({
          allocated_to: nextEntry.user_id,
          status: 'allocated',
          allocated_at: now
        })
        .eq('id', availableCode.id);

      if (codeError) {
        return {
          success: false,
          error: codeError.message
        };
      }

      // Update queue entry
      const { error: queueError } = await supabase
        .from('queue_entries')
        .update({
          status: 'allocated',
          allocated_at: now,
          expires_at: expiresAt
        })
        .eq('id', nextEntry.id);

      if (queueError) {
        return {
          success: false,
          error: queueError.message
        };
      }

      // Update positions for remaining queue
      await this.updateQueuePositions();

      return {
        success: true,
        allocated: nextEntry
      };

    } catch (error) {
      console.error('Error processing queue:', error);
      return {
        success: false,
        error: 'Failed to process queue'
      };
    }
  }
}