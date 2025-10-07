/**
 * Cloudflare Email Worker for sugar@vows.social
 * Forwards Instagram challenge emails to Supabase webhook
 */

export default {
  async email(message, env, ctx) {
    const SUPABASE_URL = env.SUPABASE_URL || 'https://nidbhgqeyhrudtnizaya.supabase.co';
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w';

    try {
      console.log('Processing email from:', message.from);
      console.log('To:', message.to);
      console.log('Subject:', message.headers.get('subject'));

      // Extract email data
      const emailData = {
        from: message.from,
        to: message.to,
        subject: message.headers.get('subject') || '',
        text: '',
        html: ''
      };

      // Read email body
      const reader = message.raw.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const emailText = new TextDecoder().decode(
        new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
      );

      // Simple text extraction (you may want to parse MIME properly)
      emailData.text = emailText;

      console.log('Email body preview:', emailData.text.substring(0, 200));

      // Only forward Instagram-related emails
      const isInstagram =
        emailData.from.toLowerCase().includes('instagram') ||
        emailData.from.toLowerCase().includes('facebook') ||
        emailData.subject.toLowerCase().includes('instagram') ||
        emailData.subject.toLowerCase().includes('security code') ||
        emailData.subject.toLowerCase().includes('verification');

      if (!isInstagram) {
        console.log('Not an Instagram email, ignoring');
        return;
      }

      // Forward to Supabase webhook
      const webhookUrl = `${SUPABASE_URL}/functions/v1/instagram-challenge-email`;

      console.log('Forwarding to webhook:', webhookUrl);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();

      console.log('Webhook response:', result);

      if (result.success) {
        console.log('✅ Email processed successfully');
      } else {
        console.error('❌ Webhook failed:', result.error);
      }

    } catch (error) {
      console.error('Email processing error:', error);
      throw error;
    }
  }
};
