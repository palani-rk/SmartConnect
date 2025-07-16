-- Migration: Create update_updated_at_column function
-- Created: 2025-07-03
-- Description: Creates the function needed for updated_at triggers

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;