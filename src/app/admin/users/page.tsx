"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Shield,
  ShieldCheck,
  UserCheck,
  Plus,
  Edit3,
  Trash2,
  Key,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminGet, adminPost, adminPatch, adminDelete } from "@/lib/api/apiClient";

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

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "EDITOR",
    password: "",
  });
  const [inviteStatus, setInviteStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Edit user & password reset modal state
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    role: "EDITOR",
    status: "ACTIVE",
    password: "",
  });
  const [editStatus, setEditStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete user state
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminGet<{ success: boolean; users: UserItem[] }>("/admin/users");
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch (err: any) {
      console.error("Failed to fetch admin users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (u: UserItem) => {
    setEditUser(u);
    setEditForm({
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      role: u.role || "EDITOR",
      status: u.status || "ACTIVE",
      password: "",
    });
    setEditStatus(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setIsUpdating(true);
    setEditStatus(null);

    try {
      const payload: Record<string, string> = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        role: editForm.role,
        status: editForm.status,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const data = await adminPatch<{ success: boolean; message: string }>(
        `/admin/users/${editUser.id}`,
        payload
      );
      if (data.success) {
        setEditStatus({ success: true, message: data.message });
        fetchUsers();
        setTimeout(() => {
          setEditUser(null);
          setEditStatus(null);
        }, 1100);
      } else {
        setEditStatus({
          success: false,
          message: data.message || "Failed to update user.",
        });
      }
    } catch (err: any) {
      setEditStatus({
        success: false,
        message: err?.message || "Could not connect to backend server.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const data = await adminDelete<{ success: boolean; message: string }>(
        `/admin/users/${deleteTarget.id}`
      );
      if (data.success) {
        setDeleteTarget(null);
        fetchUsers();
      } else {
        alert(data.message || "Failed to delete user.");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete user. Server unreachable.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setInviteStatus(null);

    try {
      const data = await adminPost<{
        success: boolean;
        message: string;
        temporaryPassword?: string | null;
      }>(
        "/admin/users/invite",
        inviteForm
      );
      if (data.success) {
        setInviteStatus({ success: true, message: data.message });
        if (data.temporaryPassword) {
          setCreatedTempPassword(data.temporaryPassword);
        }
        setInviteForm({
          firstName: "",
          lastName: "",
          email: "",
          role: "EDITOR",
          password: "",
        });
        fetchUsers();
        if (!data.temporaryPassword) {
          setTimeout(() => {
            setIsInviteModalOpen(false);
            setInviteStatus(null);
          }, 1100);
        }
      } else {
        setInviteStatus({
          success: false,
          message: data.message || "Failed to create user",
        });
      }
    } catch {
      setInviteStatus({
        success: false,
        message: "Could not connect to backend server.",
      });
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
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#1769E0] border border-blue-200/80">
            Super Admin
          </span>
        );
      case "ADMIN":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
            Admin
          </span>
        );
      case "EDITOR":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            Senior Editor
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Student
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin & Staff Permissions"
        description="Manage editorial team accounts, role-based access control, and database administration credentials."
        count={users.length}
        countLabel="users"
        addLabel="Invite Member"
        onAdd={() => setIsInviteModalOpen(true)}
      />

      {/* Role Definitions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 text-[#1769E0] font-bold text-xs sm:text-sm mb-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span>Super Admin</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Full platform governance, security parameters, staff credentials, database connectors, and system settings.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs sm:text-sm mb-1.5">
            <Shield className="h-4 w-4" />
            <span>Admin</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Full operational management across universities, scholarships, visa policies, intake deadlines, and news feeds.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs sm:text-sm mb-1.5">
            <UserCheck className="h-4 w-4" />
            <span>Senior Editor</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Publishing, editing, and drafting news articles, destination dossiers, and student editorial guides.
          </p>
        </div>
      </div>

      <AdminTableContainer
        count={filteredUsers.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search team member name, email, role..."
        footerNote="All user credentials and roles are synced live with PostgreSQL database."
      >
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Staff Member</th>
              <th className="py-3 px-3">Assigned Role</th>
              <th className="py-3 px-3">Account Status</th>
              <th className="py-3 px-3">Last Active</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-[#1769E0] mx-auto mb-2" />
                  Loading team accounts from database...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-slate-500">
                  No staff members matched your search filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const initials =
                  `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase() ||
                  "US";
                const formattedDate = u.lastLogin
                  ? new Date(u.lastLogin).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Never";

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-50 text-[#1769E0] border border-blue-100 font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-xs sm:text-sm text-slate-900 group-hover:text-[#1769E0] transition-colors">
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge status={u.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {formattedDate}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          title="Edit User & Reset Password"
                          className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          title="Delete User Account"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Edit User & Password Reset Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Edit User & Permissions
                </h3>
                <p className="text-xs text-slate-500">{editUser.email}</p>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editStatus && (
              <div
                className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-xs ${
                  editStatus.success
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                    : "bg-rose-50 text-rose-800 border border-rose-200/80"
                }`}
              >
                {editStatus.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span>{editStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, firstName: e.target.value })
                    }
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lastName: e.target.value })
                    }
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={editUser.email}
                  className="w-full h-8.5 px-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 cursor-not-allowed font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                  >
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="EDITOR">Senior Editor</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Account Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80">
                <label className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Key className="h-3.5 w-3.5 text-[#1769E0]" />
                  <span>Reset Password</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Leave blank to preserve current password.
                </p>
                <input
                  type="password"
                  placeholder="Enter new password (e.g. editor@123)"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm({ ...editForm, password: e.target.value })
                  }
                  className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                >
                  {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Team Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Invite Staff Member
                </h3>
                <p className="text-xs text-slate-500">
                  Assign administrative credentials and editorial roles
                </p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {inviteStatus && (
              <div
                className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-xs ${
                  inviteStatus.success
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                    : "bg-rose-50 text-rose-800 border border-rose-200/80"
                }`}
              >
                {inviteStatus.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span>{inviteStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah"
                    value={inviteForm.firstName}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, firstName: e.target.value })
                    }
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jenkins"
                    value={inviteForm.lastName}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, lastName: e.target.value })
                    }
                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="editor@abroadbulletin.com"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Assigned Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, role: e.target.value })
                  }
                  className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                >
                  <option value="EDITOR">Senior Editor (News & Guides)</option>
                  <option value="ADMIN">Admin (Content & Operations)</option>
                  <option value="SUPER_ADMIN">Super Admin (Full Platform Access)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-0.5">
                  Password (Optional)
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Leave blank to auto-generate a secure 12-character temporary password.
                </p>
                <input
                  type="password"
                  placeholder="Min. 8 characters or leave blank"
                  value={inviteForm.password}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, password: e.target.value })
                  }
                  className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                />
              </div>

              {createdTempPassword && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      Temporary Password Generated
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdTempPassword);
                        setCopiedPassword(true);
                        setTimeout(() => setCopiedPassword(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition-colors"
                    >
                      {copiedPassword ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedPassword ? "Copied!" : "Copy Password"}</span>
                    </button>
                  </div>
                  <code className="block text-xs font-mono font-bold text-emerald-900 bg-white/80 px-2.5 py-1.5 rounded border border-emerald-200/60 select-all">
                    {createdTempPassword}
                  </code>
                  <p className="text-[10.5px] text-emerald-700">
                    Copy and share this temporary password with the staff member.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsInviteModalOpen(false);
                    setCreatedTempPassword(null);
                    setInviteStatus(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  {createdTempPassword ? "Done" : "Cancel"}
                </button>
                {!createdTempPassword && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                  >
                    {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                    {isSubmitting ? "Inviting..." : "Create Account"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete User Account</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to delete this staff member?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 mb-5">
              <span className="font-semibold">
                {deleteTarget.firstName} {deleteTarget.lastName}
              </span>{" "}
              ({deleteTarget.email})
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
              >
                {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
