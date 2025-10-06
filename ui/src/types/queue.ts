// Core database types based on the project schema
export interface User {
  id: string;
  linkedin_id?: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  subscription_status: 'free' | 'premium';
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QueueEntry {
  id: string;
  user_id: string;
  position: number;
  status: 'waiting' | 'allocated' | 'expired' | 'completed';
  priority: boolean;
  created_at: string;
  allocated_at?: string;
  expires_at?: string;
  user?: User; // Joined user data
}

export interface InvitationCode {
  id: string;
  code_hash?: string;
  submitted_by?: string;
  allocated_to?: string;
  status: 'available' | 'allocated' | 'used';
  created_at: string;
  allocated_at?: string;
}

// Queue management types
export interface QueueStats {
  totalInQueue: number;
  averageWaitTime: number; // in hours
  totalProcessed: number;
  availableCodes: number;
  returnRate: number; // percentage
}

export interface QueuePosition {
  position: number;
  estimatedWaitTime: number; // in hours
  isPriority: boolean;
  status: QueueEntry['status'];
  joinedAt: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface QueueJoinResponse extends ApiResponse {
  data?: {
    queueEntry: QueueEntry;
    position: QueuePosition;
  };
}

export interface QueueStatusResponse extends ApiResponse {
  data?: {
    position: QueuePosition;
    stats: QueueStats;
  };
}

// Real-time update types
export interface RealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: QueueEntry;
  old?: QueueEntry;
}

// Component props interfaces
export interface QueueCardProps {
  position: QueuePosition;
  stats: QueueStats;
  onJoinQueue: () => Promise<void>;
  onLeaveQueue: () => Promise<void>;
  isLoading?: boolean;
}

export interface QueueStatsProps {
  stats: QueueStats;
  isLoading?: boolean;
}

export interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
}