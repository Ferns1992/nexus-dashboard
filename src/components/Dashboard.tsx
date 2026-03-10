import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Plus, Settings, LogOut, LayoutGrid, Globe, Trash2, Edit2, X, User, Upload, Sun, Moon } from "lucide-react";

interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}

interface Link {
  id: number;
  title: string;
  url: string;
  icon: string;
  category_id: number | null;
}

interface UserData {
  id: number;
  username: string;
  role: 'admin' | 'editor' | 'viewer';
}

export default function Dashboard() {
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Form states
  const [newLink, setNewLink] = useState({ title: "", url: "", icon: "", category_id: "" });
  const [newCategory, setNewCategory] = useState({ name: "", color: "#4f46e5", icon: "" });
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "viewer" as 'admin' | 'editor' | 'viewer' });
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<'admin' | 'editor' | 'viewer'>("viewer");

  const linkFileInputRef = useRef<HTMLInputElement>(null);
  const categoryFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (showSettings && user?.role === 'admin') {
      fetchUsers();
    }
  }, [showSettings, user]);

  const fetchData = async () => {
    const [catsRes, linksRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/links"),
    ]);
    const cats = await catsRes.json();
    const lnks = await linksRes.json();
    setCategories(cats);
    setLinks(lnks);
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: any, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setter((prev: any) => ({ ...prev, [field]: data.url }));
      } else {
        console.error(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload failed");
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...newLink,
        category_id: newLink.category_id ? parseInt(newLink.category_id) : null,
      }),
    });
    if (res.ok) {
      setShowAddLink(false);
      setNewLink({ title: "", url: "", icon: "", category_id: "" });
      fetchData();
    }
  };

  const handleDeleteLink = async (id: number) => {
    const res = await fetch(`/api/links/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchData();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newCategory),
    });
    if (res.ok) {
      setNewCategory({ name: "", color: "#4f46e5", icon: "" });
      fetchData();
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchData();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      setNewUser({ username: "", password: "", role: "viewer" });
      fetchUsers();
    } else {
      const data = await res.json();
      console.error(data.error || "Failed to create user");
    }
  };

  const handleUpdateUser = async (id: number) => {
    if (!editPassword && !editRole) return;
    const body: any = {};
    if (editPassword) body.password = editPassword;
    if (editRole) body.role = editRole;

    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditingUser(null);
      setEditPassword("");
      fetchUsers();
      // User updated successfully
    } else {
      const data = await res.json();
      console.error(data.error || "Failed to update user");
    }
  };

  const handleDeleteUser = async (id: number) => {
    const res = await fetch(`/api/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchUsers();
    } else {
      const data = await res.json();
      console.error(data.error || "Failed to delete user");
    }
  };

  const filteredLinks = activeCategory
    ? links.filter((l) => l.category_id === activeCategory)
    : links;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Topbar */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-bold">
                N
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Nexus</h1>
            </div>
            
            {user && (
              <div className="flex items-center gap-4">
                {(user.role === 'admin' || user.role === 'editor') && (
                  <button
                    onClick={() => setShowAddLink(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Link
                  </button>
                )}
                <button
                  onClick={toggleTheme}
                  className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Toggle Theme"
                >
                  {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                {(user.role === 'admin' || user.role === 'editor') && (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={logout}
                  className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === null
                ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> All Services
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {cat.icon ? (
                <img src={cat.icon} alt={cat.name} className="w-4 h-4 rounded-sm object-cover" />
              ) : (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
              )}
              {cat.name}
            </button>
          ))}
        </div>

        {/* Links Grid */}
        {filteredLinks.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-12 h-12 text-zinc-700 dark:text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">No links found</h3>
            <p className="text-zinc-400 dark:text-zinc-500 mt-1">Add a new service to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredLinks.map((link) => {
              const cat = categories.find((c) => c.id === link.category_id);
              return (
                <div key={link.id} className="group relative">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-6 bg-white dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl transition-all aspect-square"
                  >
                    {link.icon ? (
                      <img src={link.icon} alt={link.title} className="w-12 h-12 mb-4 rounded-xl" />
                    ) : (
                      <div className="w-12 h-12 mb-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                        <Globe className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-center truncate w-full">
                      {link.title}
                    </span>
                    {cat && (
                      <div className="absolute top-3 left-3">
                        {cat.icon ? (
                          <img src={cat.icon} alt={cat.name} className="w-4 h-4 rounded-sm object-cover" />
                        ) : (
                          <span
                            className="block w-2 h-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                      </div>
                    )}
                  </a>
                  {user && (user.role === 'admin' || user.role === 'editor') && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteLink(link.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-zinc-950/80 text-zinc-500 dark:text-zinc-400 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Link Modal */}
      {showAddLink && (user?.role === 'admin' || user?.role === 'editor') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-medium">Add New Link</h3>
              <button onClick={() => setShowAddLink(false)} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddLink} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newLink.title}
                  onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. Plex"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">URL</label>
                <input
                  type="url"
                  required
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Icon URL or Upload</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newLink.icon}
                    onChange={(e) => setNewLink({ ...newLink, icon: e.target.value })}
                    className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="https://..."
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={linkFileInputRef}
                    onChange={(e) => handleFileUpload(e, setNewLink, "icon")}
                  />
                  <button
                    type="button"
                    onClick={() => linkFileInputRef.current?.click()}
                    className="px-3 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-xl transition-colors flex items-center justify-center"
                    title="Upload Icon"
                  >
                    <Upload className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Category</label>
                <select
                  value={newLink.category_id}
                  onChange={(e) => setNewLink({ ...newLink, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-xl transition-colors"
                >
                  Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (user?.role === 'admin' || user?.role === 'editor') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <h3 className="text-lg font-medium">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Categories Management */}
              <section>
                <h4 className="text-md font-medium mb-4 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" /> Categories
                </h4>
                <form onSubmit={handleAddCategory} className="flex gap-2 mb-4 items-center">
                  <input
                    type="text"
                    required
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="New category name"
                  />
                  <input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="w-10 h-10 p-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={categoryFileInputRef}
                    onChange={(e) => handleFileUpload(e, setNewCategory, "icon")}
                  />
                  <button
                    type="button"
                    onClick={() => categoryFileInputRef.current?.click()}
                    className="px-3 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-xl transition-colors flex items-center justify-center"
                    title="Upload Category Icon"
                  >
                    <Upload className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium rounded-xl transition-colors"
                  >
                    Add
                  </button>
                </form>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        {cat.icon ? (
                          <img src={cat.icon} alt={cat.name} className="w-6 h-6 rounded-md object-cover" />
                        ) : (
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        )}
                        <span>{cat.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {user?.role === 'admin' && (
                <>
                  <hr className="border-zinc-200 dark:border-zinc-800" />

                  {/* User Management */}
                  <section>
                    <h4 className="text-md font-medium mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" /> User Management
                    </h4>
                    <div className="space-y-4 mb-6">
                      {users.map((u) => (
                        <div key={u.id} className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-medium">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span>{u.username}</span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{u.role}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingUser(editingUser === u.id ? null : u.id);
                                  setEditPassword("");
                                  setEditRole(u.role);
                                }}
                                className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition-colors"
                                title="Edit User"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                                disabled={users.length <= 1}
                                title={users.length <= 1 ? "Cannot delete the last user" : "Delete user"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {editingUser === u.id && (
                            <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                              <input
                                type="password"
                                placeholder="New Password (optional)"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                              />
                              <select
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value as any)}
                                className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                              >
                                <option value="admin">Admin</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <button
                                onClick={() => handleUpdateUser(u.id)}
                                className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm font-medium rounded-lg transition-colors"
                              >
                                Save
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <h5 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Create New User</h5>
                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Username</label>
                          <input
                            type="text"
                            required
                            value={newUser.username}
                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Password</label>
                          <input
                            type="password"
                            required
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Role</label>
                          <select
                            value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium rounded-xl transition-colors"
                      >
                        Create User
                      </button>
                    </form>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
