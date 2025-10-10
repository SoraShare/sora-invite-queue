import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { Gift, Send, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';

export const DonateCode = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addCodeField = () => {
    setCodes([...codes, '']);
  };

  const removeCodeField = (index: number) => {
    if (codes.length > 1) {
      setCodes(codes.filter((_, i) => i !== index));
    }
  };

  const updateCode = (index: number, value: string) => {
    // Allow only alphanumeric characters and convert to uppercase
    const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // Limit to 6 characters
    const limitedValue = sanitizedValue.slice(0, 6);
    
    const newCodes = [...codes];
    newCodes[index] = limitedValue;
    setCodes(newCodes);
  };

  const handleSubmitCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validCodes = codes.filter(code => code.trim().length === 6);
    
    if (validCodes.length === 0) {
      toast.error('Please enter at least one valid 6-character invitation code');
      return;
    }
    
    const invalidCodes = codes.filter(code => code.trim().length > 0 && code.trim().length !== 6);
    if (invalidCodes.length > 0) {
      toast.error('All invitation codes must be exactly 6 characters long');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Implement API call to submit invitation codes
      // await submitInvitationCodes(validCodes);
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Thank you! ${validCodes.length} invitation code(s) submitted successfully.`);
      setCodes(['']);
    } catch (error) {
      toast.error('Failed to submit invitation codes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full mb-4">
          <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Donate Invitation Codes
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
          Help the community by sharing your unused Sora invitation codes. 
          Your contribution helps others access this amazing AI tool fairly.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Before donating your codes:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Make sure the invitation codes are unused and valid</li>
                <li>• Only submit codes you own and have permission to share</li>
                <li>• Codes will be distributed fairly through our queue system</li>
                <li>• You'll receive community recognition for your contribution</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Donation Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmitCodes} className="space-y-6">
            <div>
              <label htmlFor="invitationCodes" className="block text-sm font-medium text-gray-700 mb-2">
                Sora Invitation Codes
              </label>
              {codes.map((code, index) => (
                <div key={index} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => updateCode(index, e.target.value)}
                    placeholder="Enter 6-character code (e.g., ABC123)"
                    maxLength={6}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-lg tracking-wider"
                    disabled={isSubmitting}
                  />
                  {codes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCodeField(index)}
                      className="p-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addCodeField}
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 transition-colors mt-2"
                disabled={isSubmitting}
              >
                <Plus className="w-4 h-4" />
                Add another code
              </button>
              
              <p className="mt-2 text-sm text-gray-500">
                Enter 6-character invitation codes containing only letters and numbers. Lowercase letters will be automatically converted to uppercase.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">Verified contributor: {user?.user_metadata?.full_name || user?.email}</p>
                  <p>Your donation will be attributed to your account for transparency.</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || codes.every(code => code.trim().length !== 6)}
              className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Donate Codes
                </>
              )}
            </button>
          </form>
        </div>

        {/* Community Impact */}
        <div className="mt-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Community Impact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-primary-600">127</div>
              <div className="text-sm text-gray-600">Codes Donated</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-primary-600">89</div>
              <div className="text-sm text-gray-600">People Helped</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};