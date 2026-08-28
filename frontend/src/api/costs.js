import { apiRequest } from './client';

export async function getCostSummary(range = '7d', from, to) {
  const params = new URLSearchParams();
  if (range) params.append('range', range);
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  return apiRequest(`/api/costs/summary?${params.toString()}`);
}

export async function getCostTimeseries(range = '7d', interval = 'hour', from, to) {
  const params = new URLSearchParams();
  if (range) params.append('range', range);
  if (interval) params.append('interval', interval);
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  return apiRequest(`/api/costs/timeseries?${params.toString()}`);
}

export async function getCostBreakdown(range = '7d', by = 'service', from, to) {
  const params = new URLSearchParams();
  if (range) params.append('range', range);
  if (by) params.append('by', by);
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  return apiRequest(`/api/costs/breakdown?${params.toString()}`);
}
