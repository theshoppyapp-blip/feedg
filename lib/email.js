const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (INTERNAL_API_KEY) {
    headers['x-internal-api-key'] = INTERNAL_API_KEY;
  }

  return headers;
}

export async function sendWelcomeEmail({ email, name }) {
  return fetch(`${API_URL}/api/send-email`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      to: email,
      emailType: 'welcome',
      data: { name },
    }),
  });
}

export async function sendOrderConfirmationEmail({ to, name, itemName, amount }) {
  return fetch(`${API_URL}/api/send-email`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      to,
      emailType: 'order-confirmation',
      data: { name, itemName, amount },
    }),
  });
}
