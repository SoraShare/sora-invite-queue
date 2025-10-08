-- Seed data for development and testing
-- This creates sample data to test the queue management system

-- Ensure we have some test invitation codes available
INSERT INTO public.invitation_codes (code_hash, status, created_at) VALUES
  ('test_code_hash_001', 'available', now()),
  ('test_code_hash_002', 'available', now()),
  ('test_code_hash_003', 'available', now()),
  ('test_code_hash_004', 'available', now()),
  ('test_code_hash_005', 'available', now()),
  ('demo_code_submitted_001', 'available', now()),
  ('demo_code_submitted_002', 'available', now()),
  ('demo_code_submitted_003', 'available', now()),
  ('demo_code_submitted_004', 'allocated', now()),
  ('demo_code_submitted_005', 'used', now());

-- Note: Demo users and queue entries will be created through the application
-- using proper Supabase Auth signup flow. Seed data only includes invitation codes.
-- User-related data (submitted_by, allocated_to) will be set when actual users interact with the system.

-- Queue positions are now automatically managed by database triggers
-- No manual recalculation needed

-- Clean up any expired entries
SELECT public.cleanup_expired_entries();

-- Show current queue statistics
SELECT * FROM public.queue_stats_view;