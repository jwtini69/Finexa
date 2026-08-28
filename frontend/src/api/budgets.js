import { apiRequest } from './client';

export async function getBudgets() {
  return apiRequest('/api/budgets');
}

export async function createBudget(budgetData) {
  return apiRequest('/api/budgets', {
    method: 'POST',
    body: JSON.stringify(budgetData),
  });
}

export async function deleteBudget(id) {
  return apiRequest(`/api/budgets/${id}`, {
    method: 'DELETE',
  });
}
