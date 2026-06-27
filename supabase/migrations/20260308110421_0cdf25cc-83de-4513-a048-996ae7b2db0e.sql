
-- Function to send email notification via edge function on connection events
CREATE OR REPLACE FUNCTION public.send_connection_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notification_type text;
  recipient uuid;
  actor uuid;
  edge_url text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    notification_type := 'connection_request';
    recipient := NEW.receiver_id;
    actor := NEW.sender_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    notification_type := 'connection_accepted';
    recipient := NEW.sender_id;
    actor := NEW.receiver_id;
  ELSE
    RETURN NEW;
  END IF;

  edge_url := rtrim(current_setting('app.settings.supabase_url', true), '/') || '/functions/v1/send-email-notification';
  
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', notification_type,
      'recipient_user_id', recipient,
      'actor_user_id', actor
    )
  );

  RETURN NEW;
END;
$$;

-- Function to send email notification for new messages
CREATE OR REPLACE FUNCTION public.send_message_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  participant record;
  edge_url text;
BEGIN
  edge_url := rtrim(current_setting('app.settings.supabase_url', true), '/') || '/functions/v1/send-email-notification';

  FOR participant IN
    SELECT user_id FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LOOP
    PERFORM net.http_post(
      url := edge_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'new_message',
        'recipient_user_id', participant.user_id,
        'actor_user_id', NEW.sender_id,
        'metadata', jsonb_build_object('preview', left(NEW.content, 100))
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_connection_send_email
  AFTER INSERT OR UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.send_connection_email_notification();

CREATE TRIGGER on_message_send_email
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_message_email_notification();
