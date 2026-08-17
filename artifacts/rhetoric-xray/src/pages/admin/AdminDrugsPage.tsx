import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetAdminDrugs, useCreateDrug, useUpdateDrug, useDeleteDrug,
  type DrugItem
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { 
  Loader2, Plus, Upload, Search, Pencil, Trash2,
  ChevronLeft, ChevronRight, FileDown, Pill
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";

const drugSchema = z.object({
  name: z.string().min(1, "請輸入名稱"),
  approvalNumber: z.string().min(1, "請輸入核准字號"),
  manufacturer: z.string().min(1, "請輸入廠商"),
  category: z.string().min(1, "請選擇類別"),
  approvedDate: z.string().optional(),
  ingredients: z.string().optional(),
  claims: z.string().optional(),
  status: z.string().default("active"),
});

export function AdminDrugsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [editingDrug, setEditingDrug] = useState<DrugItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const queryParams = {
    page,
    limit: 20,
    ...(q ? { q } : {}),
    ...(category !== "all" ? { category } : {}),
  };

  const { data, isLoading } = useGetAdminDrugs(queryParams, {
    query: { queryKey: ["adminDrugs", queryParams] }
  });

  const queryClient = useQueryClient();
  const deleteMutation = useDeleteDrug();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = (id: number) => {
    if (!window.confirm("確定要刪除這筆藥品資料嗎？")) return;
    
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("資料已刪除");
        queryClient.invalidateQueries({ queryKey: ["adminDrugs"] });
      }
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await importFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const importBundledHealthFoods = async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}health-foods.csv`);
      if (!response.ok) throw new Error("dataset unavailable");
      const file = new File([await response.blob()], "健康食品(簡化版).csv", { type: "text/csv" });
      await importFile(file);
    } catch {
      toast.error("內建健康食品資料載入失敗");
    }
  };

  const importFile = async (file: File) => {

    if (!file.name.endsWith('.csv')) {
      toast.error("請上傳 CSV 格式的檔案");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/drugs/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const result = await res.json();
      
      if (res.ok && result.success) {
        const detail = result.errors?.length ? `；${result.errors.slice(0, 3).join("、")}` : "";
        toast.success(`匯入完成：新增 ${result.imported} 筆，跳過 ${result.skipped} 筆${detail}`);
        queryClient.invalidateQueries({ queryKey: ["adminDrugs"] });
        setIsImportModalOpen(false);
      } else {
        toast.error(result.error || result.message || "匯入失敗");
      }
    } catch (err: any) {
      toast.error("上傳失敗，請稍後再試");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "\uFEFFname,approvalNumber,manufacturer,category,approvedDate,ingredients,claims,status\n範例藥品,衛部藥製字第000000號,範例藥廠,藥品,2026-01-01,範例成分,範例適應症,active\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "drug-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-serif font-bold text-sidebar-foreground">藥品資料庫管理</h1>
          <p className="text-muted-foreground mt-1">管理衛福部核准之藥品與健康食品清單</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" /> 批次匯入
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-sidebar hover:bg-sidebar/90 text-white">
            <Plus className="w-4 h-4 mr-2" /> 新增資料
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-4 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="搜尋名稱、廠商或字號..." 
                className="pl-9 bg-white"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="分類篩選" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有分類</SelectItem>
                  <SelectItem value="藥品">藥品</SelectItem>
                  <SelectItem value="健康食品">健康食品</SelectItem>
                  <SelectItem value="一般保健品">一般保健品</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-sidebar-primary" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Pill className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>找不到符合條件的藥品資料</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                    <tr>
                      <th className="px-6 py-3 font-medium">名稱</th>
                      <th className="px-6 py-3 font-medium">分類</th>
                      <th className="px-6 py-3 font-medium">核准字號</th>
                      <th className="px-6 py-3 font-medium">廠商</th>
                      <th className="px-6 py-3 font-medium">狀態</th>
                      <th className="px-6 py-3 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.items.map((item: DrugItem) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline" className={
                            item.category === '藥品' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            item.category === '健康食品' ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }>
                            {item.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">{item.approvalNumber}</td>
                        <td className="px-6 py-4">{item.manufacturer}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className={item.status === 'active' ? 'bg-green-600' : ''}>
                            {item.status === 'active' ? '有效' : '已註銷'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setEditingDrug(item)}>
                              <Pencil className="w-4 h-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} disabled={deleteMutation.isPending}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
                <div className="text-sm text-muted-foreground">
                  顯示 {(page - 1) * 20 + 1} 至 {Math.min(page * 20, data.total)} 筆，共 {data.total} 筆
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(data.total / 20)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DrugFormModal 
        isOpen={isCreateModalOpen || !!editingDrug}
        onClose={() => { setIsCreateModalOpen(false); setEditingDrug(null); }}
        drug={editingDrug}
      />

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批次匯入藥品資料</DialogTitle>
            <DialogDescription>
              支援 UTF-8 或 Big5 CSV。必要欄位為名稱、核准字號與廠商，可使用中英文欄位名稱。
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 border-2 border-dashed rounded-lg text-center bg-muted/20">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImport}
            />
            <FileDown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="mb-4 text-sm text-muted-foreground">點擊下方按鈕選擇檔案上傳</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={importBundledHealthFoods} disabled={isUploading}>匯入內建 464 筆健康食品</Button>
              <Button variant="outline" onClick={downloadTemplate} disabled={isUploading}>下載範例 CSV</Button>
              <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 上傳處理中...</> : "選擇 CSV 檔案"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DrugFormModal({ isOpen, onClose, drug }: { isOpen: boolean, onClose: () => void, drug: DrugItem | null }) {
  const isEditing = !!drug;
  const form = useForm<z.infer<typeof drugSchema>>({
    resolver: zodResolver(drugSchema),
    defaultValues: drug ? {
      name: drug.name,
      approvalNumber: drug.approvalNumber,
      manufacturer: drug.manufacturer,
      category: drug.category,
      approvedDate: drug.approvedDate || "",
      ingredients: drug.ingredients || "",
      claims: drug.claims || "",
      status: drug.status,
    } : {
      name: "",
      approvalNumber: "",
      manufacturer: "",
      category: "藥品",
      status: "active"
    }
  });

  // Update form when drug changes (since it's a shared modal)
  if (drug && form.getValues("name") !== drug.name) {
    form.reset({
      name: drug.name,
      approvalNumber: drug.approvalNumber,
      manufacturer: drug.manufacturer,
      category: drug.category,
      approvedDate: drug.approvedDate || "",
      ingredients: drug.ingredients || "",
      claims: drug.claims || "",
      status: drug.status,
    });
  } else if (!drug && form.getValues("name") && isOpen) {
    form.reset({
      name: "", approvalNumber: "", manufacturer: "", category: "藥品", status: "active",
      approvedDate: "", ingredients: "", claims: ""
    });
  }

  const queryClient = useQueryClient();
  const createMutation = useCreateDrug();
  const updateMutation = useUpdateDrug();

  const onSubmit = (data: z.infer<typeof drugSchema>) => {
    if (isEditing && drug) {
      updateMutation.mutate({ id: drug.id, data }, {
        onSuccess: () => {
          toast.success("資料已更新");
          queryClient.invalidateQueries({ queryKey: ["adminDrugs"] });
          onClose();
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          toast.success("已新增資料");
          queryClient.invalidateQueries({ queryKey: ["adminDrugs"] });
          onClose();
        }
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "編輯資料" : "新增資料"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>產品名稱 *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="approvalNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>核准字號 *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="manufacturer" render={({ field }) => (
                <FormItem>
                  <FormLabel>廠商名稱 *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>分類 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="藥品">藥品</SelectItem>
                      <SelectItem value="健康食品">健康食品</SelectItem>
                      <SelectItem value="一般保健品">一般保健品</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            
            <FormField control={form.control} name="claims" render={({ field }) => (
              <FormItem>
                <FormLabel>核准適應症 / 保健功效</FormLabel>
                <FormControl><Textarea {...field} className="h-20" /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            
            <FormField control={form.control} name="ingredients" render={({ field }) => (
              <FormItem>
                <FormLabel>主成分 (選填)</FormLabel>
                <FormControl><Textarea {...field} className="h-20" /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="approvedDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>核准日期 (選填)</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>狀態</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">有效</SelectItem>
                      <SelectItem value="revoked">已註銷</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>取消</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "儲存更新" : "確認新增"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
