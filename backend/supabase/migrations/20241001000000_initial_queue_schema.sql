-- Create Core Queue Management Database Schema
-- This implements the database structure for the Sora Invite Queue MVP
-- Following the requirements from the project specification

-- Create users table to extend Supabase auth.users
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS queue_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  position integer,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'allocated', 'expired', 'completed')),
  priority boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  allocated_at timestamp with time zone,
  expires_at timestamp with time zone
);

-- Create invitation_codes table for code management
CREATE TABLE IF NOT EXISTS invitation_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code_hash text, -- Store hash for security, not plain text
  submitted_by uuid REFERENCES users(id),
  allocated_to uuid REFERENCES users(id),
  status text DEFAULT 'available' CHECK (status IN ('available', 'allocated', 'used')),
  created_at timestamp with time zone DEFAULT now(),
  allocated_at timestamp with time zone
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS queue_entries_user_id_idx ON queue_entries(user_id);
CREATE INDEX IF NOT EXISTS queue_entries_status_idx ON queue_entries(status);
CREATE INDEX IF NOT EXISTS queue_entries_priority_position_idx ON queue_entries(priority DESC, position ASC);
CREATE INDEX IF NOT EXISTS queue_entries_created_at_idx ON queue_entries(created_at);
CREATE INDEX IF NOT EXISTS invitation_codes_status_idx ON invitation_codes(status);
CREATE INDEX IF NOT EXISTS invitation_codes_allocated_to_idx ON invitation_codes(allocated_to);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for queue_entries table
CREATE POLICY "Users can view own queue entries" ON queue_entries 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue entries" ON queue_entries 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue entries" ON queue_entries 
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow reading queue stats for all authenticated users
CREATE POLICY "Authenticated users can view queue stats" ON queue_entries 
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for invitation_codes table  
CREATE POLICY "Users can view codes allocated to them" ON invitation_codes 
  FOR SELECT USING (auth.uid() = allocated_to);

CREATE POLICY "Users can submit codes" ON invitation_codes 
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

-- Allow reading code availability stats for all authenticated users
CREATE POLICY "Authenticated users can view code availability" ON invitation_codes 
  FOR SELECT TO authenticated USING (status = 'available');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get next queue position (handles priority logic)
CREATE OR REPLACE FUNCTION get_next_queue_position(is_premium boolean DEFAULT false)
RETURNS integer AS $$
DECLARE
  next_position integer;
BEGIN
  IF is_premium THEN
    -- For premium users, get position after existing priority users
    SELECT COALESCE(MAX(position), 0) + 1 INTO next_position
    FROM queue_entries 
    WHERE status = 'waiting' AND priority = true;
  ELSE
    -- For regular users, get position after all waiting users
    SELECT COALESCE(MAX(position), 0) + 1 INTO next_position
    FROM queue_entries 
    WHERE status = 'waiting';
  END IF;
  
  RETURN next_position;
END;
$$ language 'plpgsql';

-- Function to recalculate queue positions (maintains FIFO with priority)
CREATE OR REPLACE FUNCTION recalculate_queue_positions()
RETURNS void AS $$
BEGIN
  -- Update positions: priority users first (by created_at), then regular users (by created_at)
  WITH ordered_queue AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY priority DESC, created_at ASC) as new_position
    FROM queue_entries 
    WHERE status = 'waiting'
  )
  UPDATE queue_entries 
  SET position = ordered_queue.new_position
  FROM ordered_queue 
  WHERE queue_entries.id = ordered_queue.id;
END;
$$ language 'plpgsql';

-- Function to process queue allocation (admin/automated function)
CREATE OR REPLACE FUNCTION process_queue_allocation()
RETURNS json AS $$
DECLARE
  next_entry record;
  available_code record;
  result json;
BEGIN
  -- Get next person in queue (priority first, then FIFO)
  SELECT * INTO next_entry
  FROM queue_entries
  WHERE status = 'waiting'
  ORDER BY priority DESC, position ASC
  LIMIT 1;

  -- Return if no one in queue
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'No one in queue');
  END IF;

  -- Get available code
  SELECT * INTO available_code
  FROM invitation_codes
  WHERE status = 'available'
  LIMIT 1;

  -- Return if no codes available
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'No available codes');
  END IF;

  -- Allocate code to user
  UPDATE invitation_codes
  SET 
    allocated_to = next_entry.user_id,
    status = 'allocated',
    allocated_at = now()
  WHERE id = available_code.id;

  -- Update queue entry
  UPDATE queue_entries
  SET 
    status = 'allocated',
    allocated_at = now(),
    expires_at = now() + interval '48 hours'
  WHERE id = next_entry.id;

  -- Recalculate positions for remaining queue
  PERFORM recalculate_queue_positions();

  -- Return success result
  SELECT json_build_object(
    'success', true,
    'allocated_user_id', next_entry.user_id,
    'code_id', available_code.id,
    'expires_at', now() + interval '48 hours'
  ) INTO result;

  RETURN result;
END;
$$ language 'plpgsql';

-- Function to get queue statistics
CREATE OR REPLACE FUNCTION get_queue_statistics()
RETURNS json AS $$
DECLARE
  stats json;
BEGIN
  SELECT json_build_object(
    'total_in_queue', (SELECT COUNT(*) FROM queue_entries WHERE status = 'waiting'),
    'total_processed', (SELECT COUNT(*) FROM queue_entries WHERE status IN ('allocated', 'completed')),
    'available_codes', (SELECT COUNT(*) FROM invitation_codes WHERE status = 'available'),
    'total_allocated', (SELECT COUNT(*) FROM queue_entries WHERE status = 'allocated'),
    'total_returned', (SELECT COUNT(*) FROM invitation_codes WHERE submitted_by IS NOT NULL),
    'priority_in_queue', (SELECT COUNT(*) FROM queue_entries WHERE status = 'waiting' AND priority = true),
    'regular_in_queue', (SELECT COUNT(*) FROM queue_entries WHERE status = 'waiting' AND priority = false)
  ) INTO stats;

  RETURN stats;
END;
$$ language 'plpgsql';

-- Function to clean up expired queue entries
CREATE OR REPLACE FUNCTION cleanup_expired_entries()
RETURNS integer AS $$
DECLARE
  expired_count integer;
BEGIN
  -- Mark expired allocated entries as expired
  UPDATE queue_entries 
  SET status = 'expired'
  WHERE status = 'allocated' 
    AND expires_at < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Return expired codes to available pool
  UPDATE invitation_codes
  SET 
    status = 'available',
    allocated_to = NULL,
    allocated_at = NULL
  WHERE allocated_to IN (
    SELECT user_id FROM queue_entries WHERE status = 'expired'
  );

  RETURN expired_count;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically recalculate positions when queue changes
CREATE OR REPLACE FUNCTION trigger_recalculate_positions()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if it's a relevant change to waiting entries
  IF (TG_OP = 'INSERT' AND NEW.status = 'waiting') OR
     (TG_OP = 'UPDATE' AND (OLD.status = 'waiting' OR NEW.status = 'waiting')) OR
     (TG_OP = 'DELETE' AND OLD.status = 'waiting') THEN
    PERFORM recalculate_queue_positions();
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ language 'plpgsql';

CREATE TRIGGER queue_position_trigger
  AFTER INSERT OR UPDATE OR DELETE ON queue_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_positions();

-- Enable real-time subscriptions for the tables
ALTER PUBLICATION supabase_realtime ADD TABLE queue_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE invitation_codes;

-- Insert some sample invitation codes for development/testing
-- Note: Sample users will be created through Supabase Auth signup flow
INSERT INTO invitation_codes (code_hash, status) VALUES
  ('demo_code_hash_1', 'available'),
  ('demo_code_hash_2', 'available'),
  ('demo_code_hash_3', 'available')
ON CONFLICT DO NOTHING;

-- Create view for queue statistics (easier querying)
CREATE OR REPLACE VIEW queue_stats_view AS
SELECT 
  (SELECT COUNT(*) FROM queue_entries WHERE status = 'waiting') as total_in_queue,
  (SELECT COUNT(*) FROM queue_entries WHERE status IN ('allocated', 'completed')) as total_processed,
  (SELECT COUNT(*) FROM invitation_codes WHERE status = 'available') as available_codes,
  (SELECT COUNT(*) FROM queue_entries WHERE status = 'waiting' AND priority = true) as priority_in_queue,
  (SELECT COUNT(*) FROM queue_entries WHERE status = 'waiting' AND priority = false) as regular_in_queue,
  CASE 
    WHEN (SELECT COUNT(*) FROM queue_entries WHERE status = 'allocated') > 0 
    THEN (SELECT COUNT(*) FROM invitation_codes WHERE submitted_by IS NOT NULL)::float / 
         (SELECT COUNT(*) FROM queue_entries WHERE status = 'allocated')::float * 100
    ELSE 0 
  END as return_rate_percentage;