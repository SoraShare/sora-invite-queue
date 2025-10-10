import { useEffect } from 'react';
import { QueueCard } from '@/components/QueueCard';
import { useQueue } from '@/hooks/useQueue';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { Clock } from 'lucide-react';

export const RequestCode = () => {
  const { user } = useAuth();
  
  const {
    position,
    stats,
    isLoading,
    isInQueue,
    error,
    queryInvitationCode,
    leaveQueue,
  } = useQueue(user?.id);

  // Show error toasts
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleQueryInvitationCode = async () => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    try {
      const invitationCode = await queryInvitationCode();
      if (invitationCode) {
        toast.success(`Invitation code: ${invitationCode}`);
      } else if (!error) {
        toast.success('Joined the queue! You will be notified when a code is available.');
      }
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleLeaveQueue = async () => {
    try {
      await leaveQueue();
      toast.success('Left the queue');
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary-100 rounded-full mb-4">
          <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Request an Invitation Code
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
          Join our fair and transparent queue system to receive a Sora invitation code. 
          All codes are distributed on a first-come, first-served basis.
        </p>
      </div>

      {/* Queue Management - QueueCard handles all statistics and queue functionality */}
      <QueueCard
        position={position}
        stats={stats || {
          totalInQueue: 0,
          averageWaitTime: 0,
          totalProcessed: 0,
          availableCodes: 0,
          returnRate: 0,
        }}
        isInQueue={isInQueue}
        isLoading={isLoading}
        onQueryInvitationCode={handleQueryInvitationCode}
        onLeaveQueue={handleLeaveQueue}
      />

      {/* How It Works */}
      <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
              <span className="text-lg font-bold text-primary-600">1</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Query for Codes</h3>
            <p className="text-sm text-gray-600">
              Click "Query Invitation Code" to check for available codes
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
              <span className="text-lg font-bold text-primary-600">2</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Join the Queue</h3>
            <p className="text-sm text-gray-600">
              If no codes are available, you'll automatically join the fair queue
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
              <span className="text-lg font-bold text-primary-600">3</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Get Notified</h3>
            <p className="text-sm text-gray-600">
              Receive your invitation code when it's your turn
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};