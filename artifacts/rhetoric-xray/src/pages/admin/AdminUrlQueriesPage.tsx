import { useState } from "react";
import { 
  useGetAdminUrlQueries, useClearTestUrlQueries,
  type UrlQueryRecord
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { 
  Loader2, Search, Link2, Shield, ShieldAlert, AlertTriangle, HelpCircle,
  ChevronLeft, ChevronRight, Filter, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AdminUrlQueriesPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const queryParams = {
    page,
    limit: 20,
    ...(q ? { q } : {}),
    ...(status !== "all" ? { status } : {}),
  };

  const { data, isLoading } = useGetAdminUrlQueries(queryParams, {
    query: { queryKey: ["adminUrlQueries", queryParams] }
  });

  const queryClient = useQueryClient();
  const clearMutation = useClearTestUrlQueries();

  const handleClearTest = () => {
    if (!window.confirm("確定要清除所有標記為測試資料的查詢紀錄嗎？")) return;
    
    clearMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("已清除測試資料");
        queryClient.invalidateQueries({ queryKey: ["adminUrlQueries"] });
      }
    });
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "safe": 
        return { icon: Shield, color: "text-green-700 bg-green-50 border-green-200", label: "安全" };
      case "suspicious": 
        return { icon: AlertTriangle, color: "text-yellow-700 bg-yellow-50 border-yellow-200", label: "可疑" };
      case "high_risk": 
        return { icon: ShieldAlert, color: "text-red-700 bg-red-50 border-red-200", label: "高風險" };
      default: 
        return { icon: HelpCircle, color: "text-gray-700 bg-gray-50 border-gray-200", label: "無法判定" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-serif font-bold text-sidebar-foreground">網址查詢紀錄</h1>
          <p className="text-muted-foreground mt-1">檢視使用者查詢的廣告網址安全分析結果</p>
        </div>
        <Button onClick={handleClearTest} variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="w-4 h-4 mr-2" /> 清除測試資料
        </Button>
      </div>

      <Alert className="bg-primary/5 text-primary border-primary/20">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription className="ml-2">
          判定結果由系統自動產生，不可手動編輯。若發現判定錯誤，請調整系統分析規則或更新資料庫。
        </AlertDescription>
      </Alert>

      <Card className="shadow-sm border-border">
        <CardContent className="p-4 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-sm font-medium w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              篩選
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:flex-1">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="搜尋網址關鍵字..." 
                  className="pl-9 bg-white"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                />
              </div>
              
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="判定結果" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有判定結果</SelectItem>
                  <SelectItem value="safe">安全</SelectItem>
                  <SelectItem value="suspicious">可疑</SelectItem>
                  <SelectItem value="high_risk">高風險</SelectItem>
                  <SelectItem value="unknown">無法判定</SelectItem>
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
              <Link2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>找不到符合條件的查詢紀錄</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                    <tr>
                      <th className="px-6 py-3 font-medium">查詢時間</th>
                      <th className="px-6 py-3 font-medium">網址</th>
                      <th className="px-6 py-3 font-medium">判定結果</th>
                      <th className="px-6 py-3 font-medium">系統說明</th>
                      <th className="px-6 py-3 font-medium">類型</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.items.map((record: UrlQueryRecord) => {
                      const statusDisplay = getStatusDisplay(record.status);
                      const StatusIcon = statusDisplay.icon;
                      
                      return (
                        <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                            {format(new Date(record.createdAt), 'yyyy/MM/dd HH:mm')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 max-w-sm">
                              <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <a href={record.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                                {record.url}
                              </a>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline" className={`flex w-fit items-center gap-1.5 ${statusDisplay.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusDisplay.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <p className="line-clamp-2 text-sm text-foreground/80">{record.reason}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {record.isTest ? (
                              <Badge variant="secondary" className="bg-gray-200">測試資料</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">一般查詢</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
    </div>
  );
}
