import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetAdminUsers, useCreateAdminUser, useUpdateAdminUser, useDeleteAdminUser, useGetAdminMe,
  type AdminUser
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { 
  Loader2, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Shield, ShieldAlert,
  User, CheckCircle2, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const userSchema = z.object({
  username: z.string().min(3, "帳號至少需3個字元"),
  password: z.string().min(6, "密碼至少需6個字元"),
  role: z.enum(["super_admin", "content_reviewer", "readonly"]),
});

const editUserSchema = z.object({
  role: z.enum(["super_admin", "content_reviewer", "readonly"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().optional().refine(val => !val || val.length >= 6, "若要更改密碼，至少需6個字元"),
});

export function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const { data: me } = useGetAdminMe();
  const queryParams = { page, limit: 20 };
  
  const { data, isLoading } = useGetAdminUsers(queryParams, {
    query: { 
      queryKey: ["adminUsers", queryParams],
      enabled: me?.role === "super_admin"
    }
  });

  const queryClient = useQueryClient();
  const deleteMutation = useDeleteAdminUser();
  const updateMutation = useUpdateAdminUser();

  if (me && me.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-serif font-bold mb-2">權限不足</h2>
        <p className="text-muted-foreground">只有超級管理員 (super_admin) 可以存取使用者管理頁面。</p>
      </div>
    );
  }

  const handleDelete = (user: AdminUser) => {
    if (user.username === me?.username) {
      toast.error("無法刪除自己的帳號");
      return;
    }
    if (!window.confirm(`確定要刪除使用者 ${user.username} 嗎？此操作無法復原。`)) return;
    
    deleteMutation.mutate({ id: user.id }, {
      onSuccess: () => {
        toast.success("使用者已刪除");
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      }
    });
  };

  const handleToggleStatus = (user: AdminUser, isActive: boolean) => {
    if (user.username === me?.username) {
      toast.error("無法停用自己的帳號");
      return;
    }
    
    updateMutation.mutate({ id: user.id, data: { isActive } }, {
      onSuccess: () => {
        toast.success(`使用者 ${user.username} 已${isActive ? '啟用' : '停用'}`);
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      }
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin": return <Badge className="bg-purple-600 hover:bg-purple-700">超級管理員</Badge>;
      case "content_reviewer": return <Badge className="bg-blue-600 hover:bg-blue-700">內容審核員</Badge>;
      case "readonly": return <Badge variant="outline" className="text-gray-600">只讀使用者</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-serif font-bold text-sidebar-foreground">使用者管理</h1>
          <p className="text-muted-foreground mt-1">管理後台登入帳號與權限角色</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-sidebar hover:bg-sidebar/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> 新增帳號
        </Button>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-sidebar-primary" />
            </div>
          ) : !data || data.users.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>無使用者資料</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                    <tr>
                      <th className="px-6 py-3 font-medium">帳號</th>
                      <th className="px-6 py-3 font-medium">角色權限</th>
                      <th className="px-6 py-3 font-medium">狀態</th>
                      <th className="px-6 py-3 font-medium">最後登入時間</th>
                      <th className="px-6 py-3 font-medium">建立時間</th>
                      <th className="px-6 py-3 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.users.map((user: AdminUser) => (
                      <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {user.username}
                          {user.username === me?.username && <Badge variant="secondary" className="ml-2 text-xs">您</Badge>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={user.isActive} 
                              onCheckedChange={(c) => handleToggleStatus(user, c)}
                              disabled={user.username === me?.username || updateMutation.isPending}
                            />
                            {user.isActive ? (
                              <span className="text-green-600 flex items-center text-xs"><CheckCircle2 className="w-3 h-3 mr-1"/> 啟用中</span>
                            ) : (
                              <span className="text-red-500 flex items-center text-xs"><XCircle className="w-3 h-3 mr-1"/> 已停用</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {user.lastLogin ? format(new Date(user.lastLogin), 'yyyy/MM/dd HH:mm') : '從未登入'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {format(new Date(user.createdAt), 'yyyy/MM/dd')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingUser(user)}
                              disabled={user.username === me?.username}
                            >
                              <Pencil className="w-4 h-4 text-primary" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(user)}
                              disabled={user.username === me?.username || deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {data.total > 20 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
                  <div className="text-sm text-muted-foreground">
                    顯示 {(page - 1) * 20 + 1} 至 {Math.min(page * 20, data.total)} 筆，共 {data.total} 筆
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(data.total / 20)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CreateUserModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />}
    </div>
  );
}

function CreateUserModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { username: "", password: "", role: "content_reviewer" }
  });

  const queryClient = useQueryClient();
  const createMutation = useCreateAdminUser();

  const onSubmit = (data: z.infer<typeof userSchema>) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        toast.success("已新增帳號");
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
        form.reset();
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增後台帳號</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel>登入帳號 *</FormLabel>
                <FormControl><Input placeholder="例如：admin123" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>初始密碼 *</FormLabel>
                <FormControl><Input type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>角色權限 *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="super_admin">超級管理員 (可管理所有功能與帳號)</SelectItem>
                    <SelectItem value="content_reviewer">內容審核員 (可管理資料，不可管理帳號)</SelectItem>
                    <SelectItem value="readonly">只讀使用者 (僅能查看資料)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}/>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>取消</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} 確認新增
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserModal({ user, onClose }: { user: AdminUser, onClose: () => void }) {
  const form = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { role: user.role as any, password: "" }
  });

  const queryClient = useQueryClient();
  const updateMutation = useUpdateAdminUser();

  const onSubmit = (data: z.infer<typeof editUserSchema>) => {
    // Only send fields that have changed/have values
    const payload: any = {};
    if (data.role !== user.role) payload.role = data.role;
    if (data.password) payload.password = data.password;
    
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    updateMutation.mutate({ id: user.id, data: payload }, {
      onSuccess: () => {
        toast.success("使用者資料已更新");
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
        onClose();
      }
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>編輯使用者: {user.username}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>變更角色權限</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="super_admin">超級管理員</SelectItem>
                    <SelectItem value="content_reviewer">內容審核員</SelectItem>
                    <SelectItem value="readonly">只讀使用者</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>重設密碼 (若不修改請留空)</FormLabel>
                <FormControl><Input type="password" placeholder="輸入新密碼..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>取消</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} 儲存更新
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
