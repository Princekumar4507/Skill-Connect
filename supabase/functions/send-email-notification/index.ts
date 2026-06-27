import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailPayload {
  type: "connection_request" | "connection_accepted" | "new_message";
  recipient_user_id: string;
  actor_user_id: string;
  metadata?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: EmailPayload = await req.json();
    const { type, recipient_user_id, actor_user_id, metadata } = payload;

    // Get recipient email from auth
    const { data: recipientAuth, error: recipientError } = await supabase.auth.admin.getUserById(recipient_user_id);
    if (recipientError || !recipientAuth?.user?.email) {
      console.error("Could not find recipient email:", recipientError);
      return new Response(JSON.stringify({ error: "Recipient not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get actor profile
    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", actor_user_id)
      .single();

    const actorName = actorProfile?.full_name || "Someone";
    const recipientEmail = recipientAuth.user.email;

    let subject = "";
    let htmlBody = "";

    switch (type) {
      case "connection_request":
        subject = `${actorName} wants to connect with you`;
        htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">New Connection Request</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">
              <strong>${actorName}</strong> has sent you a connection request on CampusConnect.
            </p>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">
              Log in to view their profile and respond to the request.
            </p>
            <div style="margin-top: 24px;">
              <a href="${Deno.env.get("SITE_URL") || "https://id-preview--0040f83a-95f2-4633-a9b3-c188d48374c0.lovable.app"}/connections" 
                 style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                View Request
              </a>
            </div>
          </div>`;
        break;

      case "connection_accepted":
        subject = `${actorName} accepted your connection request`;
        htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">Connection Accepted!</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">
              <strong>${actorName}</strong> has accepted your connection request. You're now connected!
            </p>
            <div style="margin-top: 24px;">
              <a href="${Deno.env.get("SITE_URL") || "https://id-preview--0040f83a-95f2-4633-a9b3-c188d48374c0.lovable.app"}/messages" 
                 style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Send a Message
              </a>
            </div>
          </div>`;
        break;

      case "new_message":
        subject = `New message from ${actorName}`;
        htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">New Message</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">
              <strong>${actorName}</strong> sent you a message${metadata?.preview ? `: "${metadata.preview.substring(0, 100)}${metadata.preview.length > 100 ? "..." : ""}"` : "."}.
            </p>
            <div style="margin-top: 24px;">
              <a href="${Deno.env.get("SITE_URL") || "https://id-preview--0040f83a-95f2-4633-a9b3-c188d48374c0.lovable.app"}/messages" 
                 style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Read Message
              </a>
            </div>
          </div>`;
        break;

      default:
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CampusConnect <onboarding@resend.dev>",
        to: [recipientEmail],
        subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email sent successfully:", resendData);
    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-email-notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
