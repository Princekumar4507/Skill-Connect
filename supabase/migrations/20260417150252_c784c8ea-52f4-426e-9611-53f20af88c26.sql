-- Enable realtime for messages table (full row data on UPDATE for read receipts)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;