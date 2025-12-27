-- Create speed_violations table for storing speed limit violations
CREATE TABLE IF NOT EXISTS speed_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id TEXT NOT NULL,
  vehicle_name TEXT NOT NULL,
  speed INTEGER NOT NULL,
  speed_limit INTEGER NOT NULL,
  excess_speed INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries by vehicle and date
CREATE INDEX IF NOT EXISTS idx_speed_violations_vehicle_id ON speed_violations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_speed_violations_timestamp ON speed_violations(timestamp);

-- Enable RLS
ALTER TABLE speed_violations ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for all operations
DROP POLICY IF EXISTS "Allow all operations on speed_violations" ON speed_violations;
CREATE POLICY "Allow all operations on speed_violations"
ON speed_violations
FOR ALL
USING (true)
WITH CHECK (true);


