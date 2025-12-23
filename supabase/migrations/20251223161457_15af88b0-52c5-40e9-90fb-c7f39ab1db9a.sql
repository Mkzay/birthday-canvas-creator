-- Drop the existing theme check constraint
ALTER TABLE public.birthday_pages DROP CONSTRAINT IF EXISTS birthday_pages_theme_check;

-- Add updated constraint with all 10 themes
ALTER TABLE public.birthday_pages ADD CONSTRAINT birthday_pages_theme_check 
CHECK (theme IN ('elegant', 'playful', 'minimalist', 'retro', 'tropical', 'cosmic', 'sunset', 'ocean', 'candyland', 'midnight'));