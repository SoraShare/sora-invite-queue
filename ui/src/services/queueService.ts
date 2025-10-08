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
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        return {
          success: false,
          error: `User profile error: ${userError.message}`
        };
      }

      if (!userProfile) {
        return {
          success: false,
          error: 'User profile not found. Please refresh the page and try again.'
        };
      }

      const { data: existingEntries, error: checkError } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'waiting');

      if (checkError) {
        return {
          success: false,
          error: `Database error: ${checkError.message}`
        };
      }

      if (existingEntries && existingEntries.length > 0) {
        return {
          success: false,
          error: 'You are already in the queue'
        };
      }

      const { data: queueEntry, error: insertError } = await supabase
        .from('queue_entries')
        .insert({
          user_id: userId,
          priority: isPremium,
          status: 'waiting'
        })
        .select('*')
        .single();

      if (insertError) {
        return {
          success: false,
          error: insertError.message
        };
      }

      // Get the current position info (position was set by database trigger)
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

      // Positions are automatically updated by database trigger
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
      const { data: entry, error } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      if (!entry) {
        return null;
      }

      const actualPosition = entry.position;
      const estimatedWaitTime = this.calculateEstimatedWaitTime(actualPosition);

      return {
        position: actualPosition,
        estimatedWaitTime,
        isPriority: entry.priority,
        status: entry.status,
        joinedAt: entry.created_at
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<QueueStats> {
    try {
      const { count: totalInQueue, error: queueError } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');

      if (queueError) throw queueError;

      const { count: totalProcessed, error: processedError } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .in('status', ['allocated', 'completed']);

      if (processedError) throw processedError;

      const { count: availableCodes, error: codesError } = await supabase
        .from('invitation_codes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');

      if (codesError) throw codesError;

      const { count: totalAllocated, error: allocatedError } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'allocated');

      if (allocatedError) throw allocatedError;

      const { count: totalReturned, error: returnedError } = await supabase
        .from('invitation_codes')
        .select('*', { count: 'exact', head: true })
        .not('submitted_by', 'is', null);

      if (returnedError) throw returnedError;

      const returnRate = totalAllocated && totalAllocated > 0 
        ? ((totalReturned || 0) / totalAllocated) * 100 
        : 0;

      const averageWaitTime = this.calculateAverageWaitTime(totalInQueue || 0);

      return {
        totalInQueue: totalInQueue || 0,
        averageWaitTime,
        totalProcessed: totalProcessed || 0,
        availableCodes: availableCodes || 0,
        returnRate: Math.round(returnRate * 100) / 100
      };

    } catch (error) {
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
   * Check if user is in queue (simple check)
   */
  static async isUserInQueue(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('queue_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'waiting')
        .limit(1);

      return (data && data.length > 0) || false;
    } catch (error) {
      console.error('Error checking if user in queue:', error);
      return false;
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
          // Positions are now managed by database triggers
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
   * Get an available invitation code for a user
   */
  static async getAvailableInvitationCode(userId: string): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
      // Check if there are any available codes
      const { data: availableCode, error: codeError } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('status', 'available')
        .limit(1)
        .single();

      if (codeError) {
        if (codeError.code === 'PGRST116') {
          // No available codes
          return { success: false, error: 'No invitation codes available' };
        }
        throw codeError;
      }

      // Mark the code as allocated to this user
      const { error: updateError } = await supabase
        .from('invitation_codes')
        .update({ 
          status: 'allocated',
          allocated_to: userId,
          allocated_at: new Date().toISOString()
        })
        .eq('id', availableCode.id);

      if (updateError) {
        throw updateError;
      }

      return { 
        success: true, 
        code: availableCode.code 
      };

    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to get invitation code' 
      };
    }
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

      // Positions are automatically updated by database triggers
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