-- Fix RLS policy for geofences table to allow backend operations
-- Drop existing restrictive policy if any
DROP POLICY IF EXISTS "Service role can manage geofences" ON geofences;

-- Create permissive policy that allows all operations
-- This allows the backend (using service role key) to insert, update, delete
CREATE POLICY "Allow all operations on geofences"
ON geofences
FOR ALL
USING (true)
WITH CHECK (true);

