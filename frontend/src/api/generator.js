import { apiRequest } from './client';

export async function triggerBackfill(days = 14) {
  return apiRequest(`/api/generator/backfill?days=${days}`, {
    method: 'POST',
  });
}

export async function injectSpike(serviceName = 'EC2', resourceId = 'i-0a1b2c3d4e5f6001', spikeCost = 450.00) {
  return apiRequest('/api/generator/spike', {
    method: 'POST',
    body: JSON.stringify({
      service_name: serviceName,
      resource_id: resourceId,
      spike_cost: spikeCost,
    }),
  });
}

export async function triggerTick() {
  return apiRequest('/api/generator/tick', {
    method: 'POST',
  });
}

export async function toggleGenerator(enabled) {
  return apiRequest(`/api/generator/toggle?enabled=${enabled}`, {
    method: 'POST',
  });
}

export async function getGeneratorStatus() {
  return apiRequest('/api/generator/status');
}

export async function getSystemHealth() {
  return apiRequest('/actuator/health');
}
