-- Create custom_themes table
CREATE TABLE public.custom_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎨',
  gradient_from TEXT NOT NULL,
  gradient_to TEXT NOT NULL,
  font TEXT NOT NULL DEFAULT 'sans',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;

-- Users can view their own themes
CREATE POLICY "Users can view their own themes"
ON public.custom_themes FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own themes
CREATE POLICY "Users can create their own themes"
ON public.custom_themes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own themes
CREATE POLICY "Users can update their own themes"
ON public.custom_themes FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own themes
CREATE POLICY "Users can delete their own themes"
ON public.custom_themes FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_custom_themes_updated_at
BEFORE UPDATE ON public.custom_themes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update birthday_pages theme constraint to allow custom themes (format: custom_<uuid>)
ALTER TABLE public.birthday_pages DROP CONSTRAINT IF EXISTS birthday_pages_theme_check;

-- Add new constraint that allows predefined themes OR custom_<uuid> format
ALTER TABLE public.birthday_pages ADD CONSTRAINT birthday_pages_theme_check 
CHECK (
  theme IN ('elegant', 'playful', 'minimalist', 'retro', 'tropical', 'cosmic', 'sunset', 'ocean', 'candyland', 'midnight')
  OR theme ~ '^custom_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);