-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create birthday_pages table
CREATE TABLE public.birthday_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_name TEXT NOT NULL,
  birthday_date DATE NOT NULL,
  theme TEXT NOT NULL DEFAULT 'elegant' CHECK (theme IN ('elegant', 'playful', 'minimalist', 'retro')),
  creator_message TEXT,
  cover_photo_url TEXT,
  allow_photos BOOLEAN NOT NULL DEFAULT true,
  require_names BOOLEAN NOT NULL DEFAULT true,
  close_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'delivered', 'draft')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on birthday_pages
ALTER TABLE public.birthday_pages ENABLE ROW LEVEL SECURITY;

-- Birthday pages policies - creators can manage their own pages
CREATE POLICY "Users can view their own pages"
  ON public.birthday_pages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view pages by id for contribution/birthday view"
  ON public.birthday_pages FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own pages"
  ON public.birthday_pages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pages"
  ON public.birthday_pages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pages"
  ON public.birthday_pages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create messages table
CREATE TABLE public.birthday_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.birthday_pages(id) ON DELETE CASCADE NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.birthday_messages ENABLE ROW LEVEL SECURITY;

-- Messages policies - anyone can add messages (public contribution)
CREATE POLICY "Anyone can view messages for a page"
  ON public.birthday_messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add messages"
  ON public.birthday_messages FOR INSERT
  WITH CHECK (true);

-- Page owners can delete messages
CREATE POLICY "Page owners can delete messages"
  ON public.birthday_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.birthday_pages
      WHERE id = page_id AND user_id = auth.uid()
    )
  );

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('birthday-photos', 'birthday-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view birthday photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'birthday-photos');

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'birthday-photos');

CREATE POLICY "Anyone can upload contribution photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'birthday-photos');

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_birthday_pages_updated_at
  BEFORE UPDATE ON public.birthday_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages (so contributions appear live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.birthday_messages;