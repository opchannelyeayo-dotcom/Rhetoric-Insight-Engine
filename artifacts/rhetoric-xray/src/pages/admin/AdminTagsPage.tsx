import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetAdminTags, useCreateTag, useUpdateTag, useDeleteTag,
  type RhetoricTag
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { 
  Loader2, Plus, Download, Search, Pencil, Trash2,
  ChevronLeft, ChevronRight, Tags, Tag, MoreHorizontal, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const tagSchema = z.object({
  label: z.string().min(1, "請輸入標籤名稱"),
  tacticType: z.string().min(1, "請選擇話術類型"),
  group: z.string().min(1, "請輸入分組"),
  status: z.enum(["draft", "pending", "approved", "needs_revision"]),
  region: z.string().optional(),
  legalBasis: z.string().optional(),
  historicalCases: z.string().optional(),
  suggestedRewrite: z.string().optional(),
  riskOverride: z.string().optional(),
  verificationStatus: z.string().optional(),
});

export function AdminTagsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [tacticType, setTacticType] = useState("all");
  const [status, setStatus] = useState("all");
  
  const [editingTag, setEditingTag] = useState<RhetoricTag | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const queryParams = {
    page,
    limit: 20,
    ...(q ? { q } : {}),
    ...(tacticType !== "all" ? { tacticType } : {}),
    ...(status !== "all" ? { status } : {}),
  };

  const { data, isLoading } = useGetAdminTags(queryParams, {
    query: { queryKey: ["adminTags", queryParams] }
  });

  const queryClient = useQueryClient();
  const deleteMutation = useDeleteTag();

  const handleExport = () => {
    window.location.href = "/api/admin/tags/export";
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("確定要刪除這個標籤嗎？")) return;
    
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("標籤已刪除");
        queryClient.invalidateQueries({ queryKey: ["adminTags"] });
      }
    });
  };

  const getTacticColor = (type: string) => {
    const colors: Record<string, string> = {
      fear_mongering: "bg-red-100 text-red-800 border-red-200",
      false_authority: "bg-purple-100 text-purple-800 border-purple-200",
      pseudo_science: "bg-blue-100 text-blue-800 border-blue-200",
      miracle_cure: "bg-orange-100 text-orange-800 border-orange-200",
      emotional_blackmail: "bg-pink-100 text-pink-800 border-pink-200",
      scarcity_urgency: "bg-yellow-100 text-yellow-800 border-yellow-200"
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getTacticLabel = (type: string) => {
    const labels: Record<string, string> = {
      fear_mongering: "恐懼行銷",
      false_authority: "假借權威",
      pseudo_science: "偽科學話術",
      miracle_cure: "神效保證",
      emotional_blackmail: "情感勒索",
      scarcity_urgency: "稀缺焦慮"
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      needs_revision: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "草稿",
      pending: "待審核",
      approved: "已核准",
      needs_revision: "需修改",
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-serif font-bold text-sidebar-foreground">話術風險標籤管理</h1>
          <p className="text-muted-foreground mt-1">管理 AI 分析時所使用的特徵標籤庫</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" /> 匯出
          </Button>
          <Button onClick={() => { setEditingTag(null); setIsModalOpen(true); }} className="bg-sidebar hover:bg-sidebar/90 text-white">
            <Plus className="w-4 h-4 mr-2" /> 新增標籤
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-4 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-sm font-medium w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              篩選
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:flex-1">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="搜尋標籤關鍵字..." 
                  className="pl-9 bg-white"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                />
              </div>
              
              <Select value={tacticType} onValueChange={(v) => { setTacticType(v); setPage(1); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="話術類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有話術類型</SelectItem>
                  <SelectItem value="fear_mongering">恐懼行銷</SelectItem>
                  <SelectItem value="false_authority">假借權威</SelectItem>
                  <SelectItem value="pseudo_science">偽科學話術</SelectItem>
                  <SelectItem value="miracle_cure">神效保證</SelectItem>
                  <SelectItem value="emotional_blackmail">情感勒索</SelectItem>
                  <SelectItem value="scarcity_urgency">稀缺焦慮</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="審核狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有狀態</SelectItem>
                  <SelectItem value="approved">已核准</SelectItem>
                  <SelectItem value="pending">待審核</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="needs_revision">需修改</SelectItem>
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
              <Tags className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>找不到符合條件的標籤</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {data.items.map((tag: RhetoricTag) => (
                  <Card key={tag.id} className="border-border hover:border-primary/40 transition-colors shadow-sm flex flex-col h-full">
                    <CardHeader className="p-4 pb-2 border-b flex-row items-start justify-between space-y-0">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={getTacticColor(tag.tacticType)}>
                            {getTacticLabel(tag.tacticType)}
                          </Badge>
                          <Badge variant="secondary" className={getStatusColor(tag.status)}>
                            {getStatusLabel(tag.status)}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg font-bold line-clamp-1" title={tag.label}>{tag.label}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingTag(tag); setIsModalOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" /> 編輯標籤
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(tag.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> 刪除標籤
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 flex flex-col justify-between text-sm">
                      <div className="space-y-3 mb-4">
                        <div className="text-muted-foreground">
                          <span className="font-medium text-foreground mr-2">分組：</span>
                          {tag.group}
                        </div>
                        {tag.legalBasis && (
                          <div className="text-muted-foreground line-clamp-2" title={tag.legalBasis}>
                            <span className="font-medium text-foreground mr-2">法源：</span>
                            {tag.legalBasis}
                          </div>
                        )}
                        {tag.suggestedRewrite && (
                          <div className="text-muted-foreground line-clamp-2" title={tag.suggestedRewrite}>
                            <span className="font-medium text-foreground mr-2">建議改寫：</span>
                            {tag.suggestedRewrite}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3 mt-auto">
                        <span>地區: {tag.region || '預設'}</span>
                        <span>{format(new Date(tag.createdAt), 'yyyy/MM/dd')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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

      <TagFormModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTag(null); }}
        tag={editingTag}
      />
    </div>
  );
}

function TagFormModal({ isOpen, onClose, tag }: { isOpen: boolean, onClose: () => void, tag: RhetoricTag | null }) {
  const isEditing = !!tag;
  const form = useForm<z.infer<typeof tagSchema>>({
    resolver: zodResolver(tagSchema),
    defaultValues: tag ? {
      label: tag.label,
      tacticType: tag.tacticType,
      group: tag.group,
      status: tag.status,
      region: tag.region || "台灣",
      legalBasis: tag.legalBasis || "",
      historicalCases: tag.historicalCases || "",
      suggestedRewrite: tag.suggestedRewrite || "",
      riskOverride: tag.riskOverride || "",
      verificationStatus: tag.verificationStatus || "",
    } : {
      label: "",
      tacticType: "fear_mongering",
      group: "general",
      status: "draft",
      region: "台灣",
    }
  });

  // Update form when tag changes
  if (tag && form.getValues("label") !== tag.label) {
    form.reset({
      label: tag.label,
      tacticType: tag.tacticType,
      group: tag.group,
      status: tag.status,
      region: tag.region || "台灣",
      legalBasis: tag.legalBasis || "",
      historicalCases: tag.historicalCases || "",
      suggestedRewrite: tag.suggestedRewrite || "",
      riskOverride: tag.riskOverride || "",
      verificationStatus: tag.verificationStatus || "",
    });
  } else if (!tag && form.getValues("label") && isOpen) {
    form.reset({
      label: "", tacticType: "fear_mongering", group: "general", status: "draft", region: "台灣"
    });
  }

  const queryClient = useQueryClient();
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();

  const onSubmit = (data: z.infer<typeof tagSchema>) => {
    if (isEditing && tag) {
      updateMutation.mutate({ id: tag.id, data }, {
        onSuccess: () => {
          toast.success("標籤已更新");
          queryClient.invalidateQueries({ queryKey: ["adminTags"] });
          onClose();
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          toast.success("已新增標籤");
          queryClient.invalidateQueries({ queryKey: ["adminTags"] });
          onClose();
        }
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "編輯標籤" : "新增標籤"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="label" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>標籤名稱 / 特徵文字 *</FormLabel>
                  <FormControl><Input placeholder="例如：保證見效" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              
              <FormField control={form.control} name="tacticType" render={({ field }) => (
                <FormItem>
                  <FormLabel>話術類型 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="選擇類型" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="fear_mongering">恐懼行銷</SelectItem>
                      <SelectItem value="false_authority">假借權威</SelectItem>
                      <SelectItem value="pseudo_science">偽科學話術</SelectItem>
                      <SelectItem value="miracle_cure">神效保證</SelectItem>
                      <SelectItem value="emotional_blackmail">情感勒索</SelectItem>
                      <SelectItem value="scarcity_urgency">稀缺焦慮</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="group" render={({ field }) => (
                <FormItem>
                  <FormLabel>分組 *</FormLabel>
                  <FormControl><Input placeholder="例如：general, health, weight_loss" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>審核狀態 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="pending">待審核</SelectItem>
                      <SelectItem value="approved">已核准</SelectItem>
                      <SelectItem value="needs_revision">需修改</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="region" render={({ field }) => (
                <FormItem>
                  <FormLabel>地區 (選填)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="台灣">台灣</SelectItem>
                      <SelectItem value="香港">香港</SelectItem>
                      <SelectItem value="澳門">澳門</SelectItem>
                      <SelectItem value="新加坡">新加坡</SelectItem>
                      <SelectItem value="馬來西亞">馬來西亞</SelectItem>
                      <SelectItem value="日本">日本</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            
            <FormField control={form.control} name="legalBasis" render={({ field }) => (
              <FormItem>
                <FormLabel>法源依據 (選填)</FormLabel>
                <FormControl><Textarea placeholder="違反哪些法規，如公平交易法、食品安全衛生管理法" {...field} className="h-16" /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            
            <FormField control={form.control} name="historicalCases" render={({ field }) => (
              <FormItem>
                <FormLabel>歷史裁罰案例 (選填)</FormLabel>
                <FormControl><Textarea placeholder="相關新聞或裁罰紀錄連結" {...field} className="h-16" /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>

            <FormField control={form.control} name="suggestedRewrite" render={({ field }) => (
              <FormItem>
                <FormLabel>建議改寫方向 (選填)</FormLabel>
                <FormControl><Textarea placeholder="如何更客觀地描述" {...field} className="h-16" /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            
            <DialogFooter className="pt-4 border-t mt-6">
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
