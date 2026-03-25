GRANT SELECT ON TABLE public.editorial_pages TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read published editorial pages" ON public.editorial_pages;
CREATE POLICY "Public can read published editorial pages"
  ON public.editorial_pages
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');
