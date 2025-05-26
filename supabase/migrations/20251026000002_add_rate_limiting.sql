
-- Add rate limiting functionality for production readiness

-- Create rate limiting table to track requests
CREATE TABLE IF NOT EXISTS public.rate_limit_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address or user ID
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_endpoint ON public.rate_limit_requests(identifier, endpoint, window_start);

-- Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_limit INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 1
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Calculate window start time
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Clean up old entries (older than the window)
  DELETE FROM public.rate_limit_requests 
  WHERE window_start < v_window_start;
  
  -- Get current request count for this identifier and endpoint
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM public.rate_limit_requests
  WHERE identifier = p_identifier 
    AND endpoint = p_endpoint 
    AND window_start >= v_window_start;
  
  -- Check if limit is exceeded
  IF v_current_count >= p_limit THEN
    RETURN FALSE; -- Rate limit exceeded
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limit_requests (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, NOW())
  ON CONFLICT (identifier, endpoint, window_start) 
  DO UPDATE SET request_count = rate_limit_requests.request_count + 1;
  
  RETURN TRUE; -- Request allowed
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO anon;

-- Enable RLS on rate limit table
ALTER TABLE public.rate_limit_requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow the function to manage rate limit data
CREATE POLICY "Rate limit function can manage requests" ON public.rate_limit_requests
  FOR ALL USING (true) WITH CHECK (true);

-- Create a cleanup function to run periodically
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete entries older than 1 hour
  DELETE FROM public.rate_limit_requests 
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;

-- Create a global rate limiting function for edge functions
CREATE OR REPLACE FUNCTION public.global_rate_limit_check(
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_action TEXT DEFAULT 'api_call',
  p_limit_per_hour INTEGER DEFAULT 100
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_identifier TEXT;
  v_current_count INTEGER;
BEGIN
  -- Use user_id if available, otherwise use IP address
  v_identifier := COALESCE(p_user_id::TEXT, p_ip_address, 'anonymous');
  
  -- Check rate limit (using 1-hour window)
  RETURN public.check_rate_limit(v_identifier, p_action, p_limit_per_hour, 60);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.global_rate_limit_check(UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_rate_limit_check(UUID, TEXT, TEXT, INTEGER) TO anon;
