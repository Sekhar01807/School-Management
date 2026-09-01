import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Users, School, Layers, Search as SearchIcon, Filter, GraduationCap } from "lucide-react";

import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { pagination, user, UserRole, Class } from "@/types";
import CustomAlert from "@/components/global/CustomAlert";
import { api } from "@/lib/api";
import UserTable from "@/components/users/UserTable";
import UserDialog from "@/components/users/UserDialog";

interface Props {
  role: UserRole;
  title: string;
  description: string;
}

export default function UserManagementPage({
  role,
  title,
  description,
}: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<user[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Class filtering for Student Directory
  const [classesList, setClassesList] = useState<Class[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<user | null>(null);

  // Delete States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // 1. Fetch Classes for dynamic class-wise tabs/filter
  useEffect(() => {
    if (role === "student") {
      api.get("/classes?limit=100")
        .then((res) => {
          const list = res.data.classes || (Array.isArray(res.data) ? res.data : []);
          setClassesList(list);
        })
        .catch(() => {});
    }
  }, [role]);

  // 2. Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      params.append("role", role);

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      if (role === "student" && selectedClassFilter !== "all") {
        params.append("classId", selectedClassFilter);
      }

      const { data } = (await api.get(`/users?${params.toString()}`)) as {
        data: { users: user[]; pagination: pagination };
      };

      if (data.users) {
        setUsers(data.users);
        setTotalPages(data.pagination.pages);
        setTotalCount(data.pagination.total);
      } else {
        setUsers([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch, role, selectedClassFilter]);

  const handleCreate = () => {
    if (!isAdmin) return;
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId || !isAdmin) return;
    try {
      await api.delete(`/users/delete/${deleteId}`);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F8FAFC] dark:bg-[#0B1120] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#E2E8F0] dark:border-gray-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white capitalize">
            {title}
          </h1>
          <p className="text-sm text-[#64748B] dark:text-gray-400 mt-1">{description}</p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCreate}
              className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-xs text-xs font-semibold"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add New {role.charAt(0).toUpperCase() + role.slice(1)}
            </Button>
          </div>
        )}
      </div>

      {/* Class-wise Filter & Search Bar */}
      <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
        <CardContent className="p-4 space-y-4">
          {/* Class-wise Section Pills (Student Directory Only) */}
          {role === "student" && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                <Layers className="h-3.5 w-3.5 text-[#1E40AF]" />
                <span>Filter by Class Section</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={selectedClassFilter === "all" ? "default" : "outline"}
                  onClick={() => {
                    setSelectedClassFilter("all");
                    setPage(1);
                  }}
                  className={`text-xs h-8 font-semibold rounded-lg ${
                    selectedClassFilter === "all"
                      ? "bg-[#1E40AF] text-white"
                      : "border-[#CBD5E1] dark:border-gray-700 text-[#0F172A] dark:text-gray-300"
                  }`}
                >
                  All Sections ({totalCount})
                </Button>
                {classesList.map((c) => (
                  <Button
                    key={c._id}
                    size="sm"
                    variant={selectedClassFilter === c._id ? "default" : "outline"}
                    onClick={() => {
                      setSelectedClassFilter(c._id);
                      setPage(1);
                    }}
                    className={`text-xs h-8 font-semibold rounded-lg ${
                      selectedClassFilter === c._id
                        ? "bg-[#1E40AF] text-white"
                        : "border-[#CBD5E1] dark:border-gray-700 text-[#0F172A] dark:text-gray-300"
                    }`}
                  >
                    <School className="mr-1.5 h-3.5 w-3.5 text-[#0F766E]" />
                    {c.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
            <Input
              placeholder={`Search ${role}s by name or email...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#F8FAFC] dark:bg-gray-900 border-[#CBD5E1] dark:border-gray-700 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card className="bg-white dark:bg-[#111827] border-[#E2E8F0] dark:border-gray-800 shadow-xs">
        <CardContent className="p-0">
          <UserTable
            role={role}
            loading={loading}
            setDeleteId={setDeleteId}
            setIsDeleteOpen={setIsDeleteOpen}
            setEditingUser={setEditingUser}
            setIsFormOpen={setIsFormOpen}
            users={users}
            setPageNum={setPage}
            pageNum={page}
            totalPages={totalPages}
            isAdmin={isAdmin}
          />
        </CardContent>
      </Card>

      {/* Create / Edit User Dialog (Admin only) */}
      {isAdmin && (
        <UserDialog
          editingUser={editingUser}
          role={role}
          open={isFormOpen}
          setOpen={setIsFormOpen}
          onSuccess={() => {
            fetchUsers();
            if (role === "student") {
              api.get("/classes?limit=100").then((res) => {
                setClassesList(res.data.classes || (Array.isArray(res.data) ? res.data : []));
              });
            }
          }}
        />
      )}

      {/* Delete Confirmation Alert (Admin only) */}
      {isAdmin && (
        <CustomAlert
          isOpen={isDeleteOpen}
          setIsOpen={setIsDeleteOpen}
          handleDelete={handleDelete}
          title="Delete User Record?"
          description="This will permanently delete this user and all associated academic records from the system."
        />
      )}
    </div>
  );
}
