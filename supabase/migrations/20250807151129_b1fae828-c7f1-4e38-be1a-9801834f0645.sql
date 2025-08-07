-- Phase 1: Critical Security Fixes

-- 1. Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies - users can only see/modify their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- 2. Add user_id columns to tables that need user ownership
ALTER TABLE public.rabbit_holes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.exploration_rules ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Update RLS policies to require authentication and user ownership

-- Drop existing public policies on rabbit_holes
DROP POLICY IF EXISTS "Anyone can create rabbit holes" ON public.rabbit_holes;
DROP POLICY IF EXISTS "Anyone can update rabbit holes" ON public.rabbit_holes;
DROP POLICY IF EXISTS "Rabbit holes are publicly viewable" ON public.rabbit_holes;

-- New secure rabbit_holes policies
CREATE POLICY "Users can view their own rabbit holes" 
ON public.rabbit_holes 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rabbit holes" 
ON public.rabbit_holes 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rabbit holes" 
ON public.rabbit_holes 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Drop existing public policies on exploration_rules
DROP POLICY IF EXISTS "Anyone can create rules" ON public.exploration_rules;
DROP POLICY IF EXISTS "Anyone can delete rules" ON public.exploration_rules;
DROP POLICY IF EXISTS "Anyone can update rules" ON public.exploration_rules;
DROP POLICY IF EXISTS "Rules are publicly viewable" ON public.exploration_rules;

-- New secure exploration_rules policies
CREATE POLICY "Users can view their own rules" 
ON public.exploration_rules 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rules" 
ON public.exploration_rules 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules" 
ON public.exploration_rules 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules" 
ON public.exploration_rules 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Secure answers table - users can only access answers from their rabbit holes
DROP POLICY IF EXISTS "Answers are publicly viewable" ON public.answers;
DROP POLICY IF EXISTS "Anyone can create answers" ON public.answers;
DROP POLICY IF EXISTS "Anyone can update answers" ON public.answers;

CREATE POLICY "Users can view answers from their rabbit holes" 
ON public.answers 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rabbit_holes 
    WHERE rabbit_holes.id = answers.rabbit_hole_id 
    AND rabbit_holes.user_id = auth.uid()
  )
);

CREATE POLICY "System can create answers" 
ON public.answers 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rabbit_holes 
    WHERE rabbit_holes.id = answers.rabbit_hole_id 
    AND rabbit_holes.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update answers from their rabbit holes" 
ON public.answers 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rabbit_holes 
    WHERE rabbit_holes.id = answers.rabbit_hole_id 
    AND rabbit_holes.user_id = auth.uid()
  )
);

-- Secure events table
DROP POLICY IF EXISTS "Events are publicly viewable" ON public.events;
DROP POLICY IF EXISTS "Anyone can create events" ON public.events;

CREATE POLICY "Users can view events from their rabbit holes" 
ON public.events 
FOR SELECT 
TO authenticated
USING (
  rabbit_hole_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.rabbit_holes 
    WHERE rabbit_holes.id = events.rabbit_hole_id 
    AND rabbit_holes.user_id = auth.uid()
  )
);

CREATE POLICY "System can create events" 
ON public.events 
FOR INSERT 
TO authenticated
WITH CHECK (
  rabbit_hole_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.rabbit_holes 
    WHERE rabbit_holes.id = events.rabbit_hole_id 
    AND rabbit_holes.user_id = auth.uid()
  )
);

-- 4. Create trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Add updated_at trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();