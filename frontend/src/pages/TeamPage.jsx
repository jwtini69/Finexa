import React, { useState, useEffect } from 'react';
import { getOrgUsers, createOrgUser } from '../api/auth';
import { ArtifactCard } from '../components/Card';
import { PillButton } from '../components/PillButton';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Shield, Key } from 'lucide-react';

export function TeamPage() {
  const { user, org } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    email: '',
    password: '',
    role: 'VIEWER',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getOrgUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching org users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await createOrgUser(inviteForm.email, inviteForm.password, inviteForm.role);
      setIsInviteModalOpen(false);
      setInviteForm({ email: '', password: '', role: 'VIEWER' });
      fetchUsers();
    } catch (err) {
      alert(`Could not create user: ${err.message}`);
    }
  };

  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <span className="text-slate-gray text-[13px] uppercase tracking-widest font-medium mb-1 block">
            Access Management
          </span>
          <h1 className="font-signifier text-4xl font-normal text-ink-black tracking-tight">
            Team & Multi-Tenant RBAC
          </h1>
          <p className="text-body text-slate-gray mt-1">
            Organization: <strong className="text-ink-black font-medium">{org?.name || 'Your Organization'}</strong> ({org?.id})
          </p>
        </div>

        {canManage && (
          <PillButton
            variant="filled"
            size="md"
            onClick={() => setIsInviteModalOpen(true)}
            icon={UserPlus}
          >
            Add Team Member
          </PillButton>
        )}
      </div>

      {/* Users Table Card */}
      <ArtifactCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-fog-white text-[12px] uppercase tracking-wider text-slate-gray border-b border-mist-gray">
              <tr>
                <th className="py-3.5 px-6 font-medium">User Email</th>
                <th className="py-3.5 px-6 font-medium">RBAC Role</th>
                <th className="py-3.5 px-6 font-medium">User ID</th>
                <th className="py-3.5 px-6 font-medium">Added Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist-gray">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-gray">
                    Loading team members...
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.email === user?.email;
                  return (
                    <tr key={u.id} className="hover:bg-fog-white/60 transition-colors">
                      <td className="py-4 px-6 font-medium text-ink-black flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-mist-gray flex items-center justify-center text-slate-gray font-medium text-xs">
                          {u.email.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span>{u.email}</span>
                          {isCurrent && (
                            <span className="ml-2 text-[11px] bg-fog-white text-slate-gray px-2 py-0.5 rounded-full border border-mist-gray">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`text-[11px] font-medium uppercase px-2.5 py-0.5 rounded-full ${
                            u.role === 'OWNER'
                              ? 'bg-blush-peach text-sienna-brown font-semibold'
                              : u.role === 'ADMIN'
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-mist-gray text-slate-gray'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-[12px] text-slate-gray">
                        {u.id}
                      </td>
                      <td className="py-4 px-6 text-slate-gray text-[13px]">
                        {new Date(u.created_at || Date.now()).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </ArtifactCard>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Add New Team Member"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-ink-black mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="engineer@company.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              className="w-full px-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink-black mb-1">
              Initial Password
            </label>
            <input
              type="password"
              required
              placeholder="Minimum 8 characters"
              value={inviteForm.password}
              onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
              className="w-full px-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink-black mb-1">
              RBAC Role
            </label>
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              className="w-full px-4 py-2.5 bg-fog-white border border-mist-gray rounded-inputs text-ink-black text-[14px] focus:outline-none focus:border-ink-black"
            >
              <option value="VIEWER">VIEWER (Read-only dashboards)</option>
              <option value="ADMIN">ADMIN (Configure budgets & acknowledge alerts)</option>
              <option value="OWNER">OWNER (Full org access & user provisioning)</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <PillButton variant="ghost" size="md" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </PillButton>
            <PillButton variant="filled" size="md" type="submit">
              Create User
            </PillButton>
          </div>
        </form>
      </Modal>

    </div>
  );
}
