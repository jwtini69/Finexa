import { apiRequest } from './client';

export async function getAnomalies(status = 'ALL') {
  const query = status && status !== 'ALL' ? `?status=${status}` : '';
  return apiRequest(`/api/anomalies${query}`);
}

export async function acknowledgeAnomaly(id) {
  return apiRequest(`/api/anomalies/${id}/acknowledge`, {
    method: 'POST',
  });
}

export async function resolveAnomaly(id) {
  return apiRequest(`/api/anomalies/${id}/resolve`, {
    method: 'POST',
  });
}
