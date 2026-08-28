import { apiRequest } from './client';

export async function getWebhooks() {
  return apiRequest('/api/webhooks');
}

export async function createWebhook(webhookData) {
  return apiRequest('/api/webhooks', {
    method: 'POST',
    body: JSON.stringify(webhookData),
  });
}

export async function deleteWebhook(id) {
  return apiRequest(`/api/webhooks/${id}`, {
    method: 'DELETE',
  });
}

export async function getWebhookDeliveries() {
  return apiRequest('/api/webhooks/deliveries');
}
