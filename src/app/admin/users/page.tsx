"use client";

import { useEffect, useState } from "react";
import { Users, Shield, ShieldCheck, UserCheck, Plus, Edit3, Trash2, Key, X, CheckCircle2, AlertCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer } from "@/components/admin/AdminTable";

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "STUDENT";
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  lastLogin?: string | null;
  createdAt?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "EDITOR",
    password: "",
  });
  const [inviteStatus, setInviteStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/api/admin/users");
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch admin users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setInviteStatus(null);

    try {
      const res = await fetch("http://localhost:8000/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (data.success) {
        setInviteStatus({ success: true, message: data.message });
        setInviteForm({ firstName: "", lastName: "", email: "", role: "EDITOR", password: "" });
        fetchUsers();
        setTimeout(() => {
          setIsInviteModalOpen(false);
          setInviteStatus(null);
        }, 1500);
      } else {
        setInviteStatus({ success: false, message: data.message || "Failed to create user" });
      }
    } catch {
      setInviteStatus({ success: false, message: "Could not connect to backend server." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const q = search.toLowerCase();
    return (
      fullName.includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#1769E0]/10 text-[#1769E0]">Super Admin</span>;
      case "ADMIN":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 text-purple-700">Admin</span>;
      case "EDITOR":
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-700">Senior Editor</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700">Student</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>;
      case "INVITED":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">Invited</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200">Suspended</span>;
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin & Staff Permissions"
        description="Manage editorial team credentials, role-based access control, and PostgreSQL database accounts."
        count={users.length}
        countLabel="users"
        addLabel="Invite Team Member"
        onAdd={() => setIsInviteModalOpen(true)}
      />

      {/* Role Definitions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E4E8EF] rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-[#1769E0] font-bold text-sm mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Super Admin</span>
          </div>
          <p className="text-xs text-[#667085]">
            Full platform control, user permission management, database connections, and system settings.
          </p>
        </div>

        <div className="bg-white border border-[#E4E8EF] rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-sm mb-1">
            <Shield className="h-4 w-4" />
            <span>Admin</span>
          </div>
          <p className="text-xs text-[#667085]">
            Full operational management across universities, scholarships, immigration deadlines, and news.
          </p>
        </div>

        <div className="bg-white border border-[#E4E8EF] rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-1">
            <UserCheck className="h-4 w-4" />
            <span>Senior Editor</span>
          </div>
          <p className="text-xs text-[#667085]">
            Publishing, editing and drafting news articles, country dossiers, and editorial guides.
          </p>
        </div>
      </div>

      <AdminTableContainer
        title="Active Team Members & Users"
        count={filteredUsers.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, role..."
        footerNote="All user credentials and roles are synced live with PostgreSQL (abroad_bulletin)"
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F7F9FC] border-b border-[#E4E8EF] text-[#667085] font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Last Active</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4E8EF]">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-[#667085]">
                  Loading team members from PostgreSQL...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-[#667085]">
                  No team members matched your search filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const initials = `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase() || "US";
                const formattedDate = u.lastLogin
                  ? new Date(u.lastLogin).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Never";

                return (
                  <tr key={u.id} className="hover:bg-[#F7F9FC]/60 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#1769E0]/10 text-[#1769E0] font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[#111827] group-hover:text-[#1769E0] transition-colors">
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="text-xs text-[#667085]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {getStatusBadge(u.status)}
                    </td>
                    <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                      {formattedDate}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          title="Edit Permissions"
                          className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#F7F9FC] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </AdminTableContainer>

      {/* Invite Team Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-[#E4E8EF] p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E4E8EF] pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Invite Team Member</h3>
                <p className="text-xs text-[#667085]">Add a staff member with designated administrative role</p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1.5 rounded-lg text-[#667085] hover:bg-[#F7F9FC] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {inviteStatus && (
              <div
                className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-xs ${
                  inviteStatus.success
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {inviteStatus.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{inviteStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                    className="w-full h-9 px-3 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] focus:outline-none focus:border-[#1769E0]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#374151] block mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jenkins"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                    className="w-full h-9 px-3 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] focus:outline-none focus:border-[#1769E0]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#374151] block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="editor@abroadbulletin.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full h-9 px-3 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] focus:outline-none focus:border-[#1769E0]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#374151] block mb-1">Assigned Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full h-9 px-3 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] focus:outline-none focus:border-[#1769E0]"
                >
                  <option value="EDITOR">Senior Editor (News & Guides)</option>
                  <option value="ADMIN">Admin (Content & Operations)</option>
                  <option value="SUPER_ADMIN">Super Admin (Full System Access)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#374151] block mb-1">Initial Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Default: Staff@123456"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  className="w-full h-9 px-3 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] focus:outline-none focus:border-[#1769E0]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E8EF]">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#4B5563] bg-[#F7F9FC] hover:bg-[#E4E8EF] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Inviting..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
