
import { createErrorResponse } from "../_shared/corsUtils.ts";

export async function sendInvitationEmail(
  email: string,
  company: any,
  invitation: any,
  baseUrl: string,
  resendApiKey: string
) {
  const inviteUrl = `${baseUrl}/register?token=${invitation.token}`;
  const fromEmail = "invites@resend.dev";
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject: `You've been invited to join ${company.name} on Dr. Scale`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366F1; margin: 0;">Dr. Scale</h1>
            <p style="color: #666; margin: 5px 0 0 0;">AI Sales Call Analysis Platform</p>
          </div>
          
          <h2 style="color: #333;">You've been invited to join ${company.name}</h2>
          <p style="color: #555; line-height: 1.6;">You've been invited to join <strong>${company.name}</strong> as a <strong>${invitation.role}</strong> on Dr. Scale, the AI sales call analysis platform.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-size: 14px;"><strong>Note:</strong> This invitation will expire in 7 days.</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">If you have trouble with the button above, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; font-size: 12px; color: #888; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${inviteUrl}</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eaeaea;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you didn't expect this invitation, you can safely ignore this email.<br>
            This email was sent by Dr. Scale on behalf of ${company.name}.
          </p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Failed to send email:", errorData);
    
    if (errorData?.message?.includes("domain is not verified")) {
      throw createErrorResponse(
        "Email service domain not verified. Please complete domain verification in Resend.", 
        503, 
        { hint: "Check Resend dashboard to verify the domain." }
      );
    }
    
    throw createErrorResponse("Failed to send invitation email", 500);
  }

  const emailData = await response.json();
  console.log("Email sent successfully:", emailData);
  return emailData;
}
