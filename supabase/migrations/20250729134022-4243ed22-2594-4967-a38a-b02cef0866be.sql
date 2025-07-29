-- Add user comment support to answers table
ALTER TABLE public.answers 
ADD COLUMN user_comment TEXT NULL,
ADD COLUMN is_user_guided BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN comment_added_at TIMESTAMP WITH TIME ZONE NULL;