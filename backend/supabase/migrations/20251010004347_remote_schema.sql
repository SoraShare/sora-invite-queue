revoke delete on table "public"."invitation_codes" from "anon";

revoke insert on table "public"."invitation_codes" from "anon";

revoke references on table "public"."invitation_codes" from "anon";

revoke select on table "public"."invitation_codes" from "anon";

revoke trigger on table "public"."invitation_codes" from "anon";

revoke truncate on table "public"."invitation_codes" from "anon";

revoke update on table "public"."invitation_codes" from "anon";

revoke delete on table "public"."invitation_codes" from "authenticated";

revoke insert on table "public"."invitation_codes" from "authenticated";

revoke references on table "public"."invitation_codes" from "authenticated";

revoke select on table "public"."invitation_codes" from "authenticated";

revoke trigger on table "public"."invitation_codes" from "authenticated";

revoke truncate on table "public"."invitation_codes" from "authenticated";

revoke update on table "public"."invitation_codes" from "authenticated";

revoke delete on table "public"."invitation_codes" from "service_role";

revoke insert on table "public"."invitation_codes" from "service_role";

revoke references on table "public"."invitation_codes" from "service_role";

revoke select on table "public"."invitation_codes" from "service_role";

revoke trigger on table "public"."invitation_codes" from "service_role";

revoke truncate on table "public"."invitation_codes" from "service_role";

revoke update on table "public"."invitation_codes" from "service_role";

revoke delete on table "public"."queue_entries" from "anon";

revoke insert on table "public"."queue_entries" from "anon";

revoke references on table "public"."queue_entries" from "anon";

revoke select on table "public"."queue_entries" from "anon";

revoke trigger on table "public"."queue_entries" from "anon";

revoke truncate on table "public"."queue_entries" from "anon";

revoke update on table "public"."queue_entries" from "anon";

revoke delete on table "public"."queue_entries" from "authenticated";

revoke insert on table "public"."queue_entries" from "authenticated";

revoke references on table "public"."queue_entries" from "authenticated";

revoke select on table "public"."queue_entries" from "authenticated";

revoke trigger on table "public"."queue_entries" from "authenticated";

revoke truncate on table "public"."queue_entries" from "authenticated";

revoke update on table "public"."queue_entries" from "authenticated";

revoke delete on table "public"."queue_entries" from "service_role";

revoke insert on table "public"."queue_entries" from "service_role";

revoke references on table "public"."queue_entries" from "service_role";

revoke select on table "public"."queue_entries" from "service_role";

revoke trigger on table "public"."queue_entries" from "service_role";

revoke truncate on table "public"."queue_entries" from "service_role";

revoke update on table "public"."queue_entries" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_user_submission_stats(user_id uuid)
 RETURNS TABLE(total_submitted bigint, codes_allocated bigint, codes_available bigint, return_compliance_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  total_count bigint;
  allocated_count bigint;
  available_count bigint;
  compliance_rate decimal;
BEGIN
  -- Get total submissions by user
  SELECT COUNT(*) INTO total_count
  FROM public.invitation_codes
  WHERE submitted_by = user_id;

  -- Get codes that have been allocated to other users
  SELECT COUNT(*) INTO allocated_count
  FROM public.invitation_codes
  WHERE submitted_by = user_id AND status = 'allocated';

  -- Get codes that are still available
  SELECT COUNT(*) INTO available_count
  FROM public.invitation_codes
  WHERE submitted_by = user_id AND status = 'available';

  -- Calculate return compliance rate (allocated codes / total codes)
  IF total_count > 0 THEN
    compliance_rate := allocated_count::decimal / total_count::decimal;
  ELSE
    compliance_rate := 0;
  END IF;

  -- Return the results
  RETURN QUERY SELECT
    total_count,
    allocated_count,
    available_count,
    compliance_rate;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_entries()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_queue_statistics()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, linkedin_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'sub' -- LinkedIn user ID is usually in 'sub' field
  );
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_queue_allocation()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_cleanup_positions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_set_queue_position()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

create policy "Users can access own submission stats"
on "public"."invitation_codes"
as permissive
for select
to public
using (((auth.uid() = submitted_by) OR (auth.uid() = allocated_to)));




