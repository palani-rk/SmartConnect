export interface WelcomeEmailData {
  email: string
  organization_name: string
  role: string
  temporary_password?: string
  created_by: string
}

/**
 * Send welcome email to newly created user
 * TODO: Integrate with actual email service (SendGrid, etc.)
 */
export async function sendWelcomeEmail(emailData: WelcomeEmailData): Promise<void> {
  const { email, organization_name, role, temporary_password, created_by } = emailData
  
  // For now, just log the email content
  // In production, this would call your email service
  console.log('Welcome email would be sent:', {
    to: email,
    subject: `Welcome to ${organization_name}`,
    content: {
      organization: organization_name,
      role: role,
      has_temp_password: !!temporary_password,
      temporary_password: temporary_password,
      created_by: created_by,
      login_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/auth/login`
    }
  })
  
  // TODO: Implement actual email sending
  // Example with SendGrid:
  /*
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email }],
        subject: `Welcome to ${organization_name}`
      }],
      from: { email: 'noreply@yourapp.com', name: 'Your App' },
      content: [{
        type: 'text/html',
        value: generateEmailHTML(emailData)
      }]
    })
  })
  
  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.statusText}`)
  }
  */
}

function generateEmailHTML(emailData: WelcomeEmailData): string {
  const { organization_name, role, temporary_password, created_by } = emailData
  
  return `
    <h2>Welcome to ${organization_name}!</h2>
    <p>Your account has been created by a ${created_by} user with the role: <strong>${role}</strong></p>
    
    ${temporary_password ? `
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>Temporary Login Credentials</h3>
        <p><strong>Email:</strong> ${emailData.email}</p>
        <p><strong>Temporary Password:</strong> <code>${temporary_password}</code></p>
        <p style="color: #e74c3c;"><strong>Important:</strong> Please change this password after your first login.</p>
      </div>
    ` : ''}
    
    <p>You can access the platform at: <a href="${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/auth/login">Login here</a></p>
    
    <p>If you have any questions, please contact your administrator.</p>
  `
}