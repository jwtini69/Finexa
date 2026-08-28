import { apiRequest, setStoredToken, setStoredUser } from './client';

export async function loginUser(email, password) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setStoredToken(data.access_token);
  setStoredUser({
    id: data.user_id,
    organizationId: data.organization_id,
    email: data.email,
    role: data.role,
  });

  return data;
}

export async function registerOrg(organizationName, ownerEmail, password) {
  const data = await apiRequest('/api/orgs/register', {
    method: 'POST',
    body: JSON.stringify({
      organization_name: organizationName,
      owner_email: ownerEmail,
      password: password,
    }),
  });
  return data;
}

export async function getCurrentOrg() {
  return apiRequest('/api/orgs/me');
}

export async function getOrgUsers() {
  return apiRequest('/api/orgs/users');
}

export async function createOrgUser(email, password, role) {
  return apiRequest('/api/orgs/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}
