-- Create Core Queue Management Database Schema
-- This implements the database structure for the Sora Invite Queue MVP
-- Following the requirements from the project specification

-- Create users table to extend Supabase auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  linkedin_id text UNIQUE,
  email text,
  full_name text,
  avatar_url text,
  subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium')),
  subscription_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create queue_entries table for FIFO queue management
CREATE TABLE IF NOT EXISTS public.queue_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  position integer,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'allocated', 'expired', 'completed')),
  priority boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  allocated_at timestamp with time zone,
  expires_at timestamp with time zone
);

-- Create invitation_codes table for code management
CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code_hash text, -- Store hash for security, not plain text
  submitted_by uuid REFERENCES public.users(id),
  allocated_to uuid REFERENCES public.users(id),
  status text DEFAULT 'available' CHECK (status IN ('available', 'allocated', 'used')),
  created_at timestamp with time zone DEFAULT now(),
  allocated_at timestamp with time zone
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS queue_entries_user_id_idx ON public.queue_entries(user_id);
CREATE INDEX IF NOT EXISTS queue_entries_status_idx ON public.queue_entries(status);
CREATE INDEX IF NOT EXISTS queue_entries_priority_position_idx ON public.queue_entries(priority DESC, position ASC);
CREATE INDEX IF NOT EXISTS queue_entries_created_at_idx ON public.queue_entries(created_at);
CREATE INDEX IF NOT EXISTS invitation_codes_status_idx ON public.invitation_codes(status);
CREATE INDEX IF NOT EXISTS invitation_codes_allocated_to_idx ON public.invitation_codes(allocated_to);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.users 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for queue_entries table
CREATE POLICY "Users can view own queue entries" ON public.queue_entries 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue entries" ON public.queue_entries 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue entries" ON public.queue_entries 
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow reading queue stats for all authenticated users
CREATE POLICY "Authenticated users can view queue stats" ON public.queue_entries 
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for invitation_codes table  
CREATE POLICY "Users can view codes allocated to them" ON public.invitation_codes 
  FOR SELECT USING (auth.uid() = allocated_to);

CREATE POLICY "Users can submit codes" ON public.invitation_codes 
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

-- Allow reading code availability stats for all authenticated users
CREATE POLICY "Authenticated users can view code availability" ON public.invitation_codes 
  FOR SELECT TO authenticated USING (status = 'available');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create trigger to automatically update updated_at on users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to process queue allocation (admin/automated function)
CREATE OR REPLACE FUNCTION public.process_queue_allocation()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_entry record;
  available_code record;
  result json;
BEGIN
  -- Get next person in queue (priority first, then FIFO)
  SELECT * INTO next_entry
  FROM public.queue_entries
  WHERE status = 'waiting'
  ORDER BY priority DESC, position ASC
  LIMIT 1;

  -- Return if no one in queue
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'No one in queue');
  END IF;

  -- Get available code
  SELECT * INTO available_code
  FROM public.invitation_codes
  WHERE status = 'available'
  LIMIT 1;

  -- Return if no codes available
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'No available codes');
  END IF;

  -- Allocate code to user
  UPDATE public.invitation_codes
  SET 
    allocated_to = next_entry.user_id,
    status = 'allocated',
    allocated_at = now()
  WHERE id = available_code.id;

  -- Update queue entry
  UPDATE public.queue_entries
  SET 
    status = 'allocated',
    allocated_at = now(),
    expires_at = now() + interval '48 hours'
  WHERE id = next_entry.id;
  
  -- Return success result
  SELECT json_build_object(
    'success', true,
    'allocated_user_id', next_entry.user_id,
    'code_id', available_code.id,
    'expires_at', now() + interval '48 hours'
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to get queue statistics
CREATE OR REPLACE FUNCTION public.get_queue_statistics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total_waiting integer;
  total_allocated integer;
  avg_wait_time interval;
  result json;
BEGIN
  SELECT count(*) INTO total_waiting
  FROM public.queue_entries
  WHERE status = 'waiting';

  SELECT count(*) INTO total_allocated
  FROM public.queue_entries
  WHERE status = 'allocated';

  SELECT avg(allocated_at - created_at) INTO avg_wait_time
  FROM public.queue_entries
  WHERE status = 'allocated' AND allocated_at IS NOT NULL;

  SELECT json_build_object(
    'total_waiting', total_waiting,
    'total_allocated', total_allocated,
    'average_wait_time_minutes', EXTRACT(epoch FROM avg_wait_time) / 60
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to cleanup expired entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_entries()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cleaned_count integer;
BEGIN
  -- Remove expired entries and move codes back to available
  UPDATE public.invitation_codes 
  SET 
    allocated_to = NULL,
    status = 'available',
    allocated_at = NULL
  FROM public.queue_entries qe
  WHERE invitation_codes.allocated_to = qe.user_id
    AND qe.status = 'allocated'
    AND qe.expires_at < now();

  -- Remove expired queue entries
  DELETE FROM public.queue_entries
  WHERE status = 'allocated' 
    AND expires_at < now();

  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$;

-- Create a trigger to automatically set position on INSERT only
CREATE OR REPLACE FUNCTION public.trigger_set_queue_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only set position for new waiting entries on INSERT
  IF TG_OP = 'INSERT' AND NEW.status = 'waiting' THEN
    -- Calculate position based on current queue
    SELECT COALESCE(MAX(position), 0) + 1 INTO NEW.position
    FROM public.queue_entries 
    WHERE status = 'waiting';
    
    -- Adjust for priority - priority users go to the front
    IF NEW.priority = true THEN
      -- Get count of existing priority users
      SELECT COALESCE(MAX(position), 0) INTO NEW.position
      FROM public.queue_entries 
      WHERE status = 'waiting' AND priority = true;
      NEW.position = NEW.position + 1;
      
      -- Move all non-priority users down
      UPDATE public.queue_entries 
      SET position = position + 1 
      WHERE status = 'waiting' 
        AND priority = false 
        AND position >= NEW.position;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to set position automatically on insert
CREATE TRIGGER queue_position_trigger
  BEFORE INSERT ON public.queue_entries
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_queue_position();

-- Trigger to recalculate positions when users leave queue  
CREATE OR REPLACE FUNCTION public.trigger_cleanup_positions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only cleanup positions when a waiting user is deleted
  IF TG_OP = 'DELETE' AND OLD.status = 'waiting' THEN
    -- Move everyone after the deleted position up by 1
    UPDATE public.queue_entries 
    SET position = position - 1 
    WHERE status = 'waiting' AND position > OLD.position;
  END IF;
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER queue_cleanup_trigger
  AFTER DELETE ON public.queue_entries
  FOR EACH ROW EXECUTE FUNCTION public.trigger_cleanup_positions();

-- Enable real-time subscriptions for the tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitation_codes;

-- Insert some sample invitation codes for development/testing
-- Note: Sample users will be created through Supabase Auth signup flow
INSERT INTO public.invitation_codes (code_hash, status) VALUES
  ('demo_code_hash_1', 'available'),
  ('demo_code_hash_2', 'available'),
  ('demo_code_hash_3', 'available')
ON CONFLICT DO NOTHING;

-- Create view for queue statistics (easier querying)
CREATE OR REPLACE VIEW public.queue_stats_view AS
SELECT 
  (SELECT COUNT(*) FROM public.queue_entries WHERE status = 'waiting') as total_in_queue,
  (SELECT COUNT(*) FROM public.queue_entries WHERE status IN ('allocated', 'completed')) as total_processed,
  (SELECT COUNT(*) FROM public.invitation_codes WHERE status = 'available') as available_codes,
  (SELECT COUNT(*) FROM public.queue_entries WHERE status = 'waiting' AND priority = true) as priority_in_queue,
  (SELECT COUNT(*) FROM public.queue_entries WHERE status = 'waiting' AND priority = false) as regular_in_queue,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.queue_entries WHERE status = 'allocated') > 0 
    THEN (SELECT COUNT(*) FROM public.invitation_codes WHERE submitted_by IS NOT NULL)::float / 
         (SELECT COUNT(*) FROM public.queue_entries WHERE status = 'allocated')::float * 100
    ELSE 0 
  END as return_rate_percentage;