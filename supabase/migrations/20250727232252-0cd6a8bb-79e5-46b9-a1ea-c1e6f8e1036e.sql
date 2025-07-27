-- Fix the trigger to use the correct column name
DROP TRIGGER IF EXISTS update_rabbit_holes_updated_at ON public.rabbit_holes;

-- Create a new function that updates last_updated_at instead of updated_at
CREATE OR REPLACE FUNCTION public.update_last_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger with the correct function
CREATE TRIGGER update_rabbit_holes_last_updated_at
    BEFORE UPDATE ON public.rabbit_holes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_last_updated_at_column();