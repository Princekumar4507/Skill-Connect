
-- Marketplace listings table
CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Books',
  condition TEXT NOT NULL DEFAULT 'Good',
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active listings" ON public.marketplace_listings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create listings" ON public.marketplace_listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their listings" ON public.marketplace_listings
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their listings" ON public.marketplace_listings
  FOR DELETE USING (auth.uid() = seller_id);

-- Trigger for updated_at
CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for listing images
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace-images', 'marketplace-images', true);

CREATE POLICY "Anyone can view marketplace images" ON storage.objects
  FOR SELECT USING (bucket_id = 'marketplace-images');

CREATE POLICY "Authenticated users can upload marketplace images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'marketplace-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their marketplace images" ON storage.objects
  FOR DELETE USING (bucket_id = 'marketplace-images' AND auth.uid() IS NOT NULL);
