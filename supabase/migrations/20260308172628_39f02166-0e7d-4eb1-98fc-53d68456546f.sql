CREATE OR REPLACE FUNCTION public.send_connection_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  notification_type text;
  recipient uuid;
  actor uuid;
  edge_url text;
  req_headers jsonb;
  req_body jsonb;
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

  edge_url := rtrim(COALESCE(current_setting('app.settings.supabase_url', true), ''), '/') || '/functions/v1/send-email-notification';
  IF edge_url = '/functions/v1/send-email-notification' THEN
    RETURN NEW;
  END IF;

  req_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.service_role_key', true), '')
  );

  req_body := jsonb_build_object(
    'type', notification_type,
    'recipient_user_id', recipient,
    'actor_user_id', actor
  );

  BEGIN
    EXECUTE 'SELECT net.http_post(url := $1, headers := $2, body := $3)'
    USING edge_url, req_headers, req_body;
  EXCEPTION
    WHEN SQLSTATE '3F000' OR SQLSTATE '42883' THEN
      NULL;
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_message_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  participant record;
  edge_url text;
  req_headers jsonb;
  req_body jsonb;
BEGIN
  edge_url := rtrim(COALESCE(current_setting('app.settings.supabase_url', true), ''), '/') || '/functions/v1/send-email-notification';
  IF edge_url = '/functions/v1/send-email-notification' THEN
    RETURN NEW;
  END IF;

  req_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.service_role_key', true), '')
  );

  FOR participant IN
    SELECT user_id FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LOOP
    req_body := jsonb_build_object(
      'type', 'new_message',
      'recipient_user_id', participant.user_id,
      'actor_user_id', NEW.sender_id,
      'metadata', jsonb_build_object('preview', left(NEW.content, 100))
    );

    BEGIN
      EXECUTE 'SELECT net.http_post(url := $1, headers := $2, body := $3)'
      USING edge_url, req_headers, req_body;
    EXCEPTION
      WHEN SQLSTATE '3F000' OR SQLSTATE '42883' THEN
        NULL;
      WHEN OTHERS THEN
        NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$function$;