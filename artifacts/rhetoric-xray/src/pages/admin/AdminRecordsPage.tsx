import { useState } from "react";
import { 
  useGetAdminRecords, useDeleteAdminRecord,
  type GetAdminRecordsSort, type HistoryRecord
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { 
  Loader2, Download, Search, Filter, Trash2, Eye,
  ChevronLeft, ChevronRight, FileText, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AnalysisResultView } from "@/components/home/AnalysisResultView";

export function AdminRecordsPage() {
  const [page, setPage] = useState(1);
  const [inputType, setInputType] = useState<string>("all");
  const [riskLevel, setRiskLevel] = useState<string>("all");
  const [sort, setSort] = useState<GetAdminRecordsSort>("newest");
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

  const queryParams = {
    page,
    limit: 20,
    ...(inputType !== "all" ? { inputType } : {}),
    ...(riskLevel !== "all" ? { riskLevel } : {}),
    sort
  };

  const { data, isLoading } = useGetAdminRecords(queryParams, {
    query: { queryKey: ["adminRecords", queryParams] }
  });

  const deleteMutation = useDeleteAdminRecord();
  const queryClient = useQueryClient();

  const handleExport = () => {
    window.location.href = "/api/admin/records/export";
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("確定要刪除這筆紀錄嗎？這將無法復原。")) return;
    
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("紀錄已刪除");
        queryClient.invalidateQueries({ queryKey: ["adminRecords"] });
      },
      onError: () => {
        toast.error("刪除失敗");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-serif font-bold text-sidebar-foreground">分析紀錄管理</h1>
          <p className="text-muted-foreground mt-1">檢視與管理所有使用者的分析紀錄</p>
        </div>
        <Button onClick={handleExport} className="bg-sidebar hover:bg-sidebar/90 text-white">
          <Download className="w-4 h-4 mr-2" /> 匯出 CSV
        </Button>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-4 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-sm font-medium w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              篩選與排序
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:flex-1">
              <Select value={inputType} onValueChange={(v) => { setInputType(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="來源" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有來源</SelectItem>
                  <SelectItem value="text">文字輸入</SelectItem>
                  <SelectItem value="image">圖片上傳</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={riskLevel} onValueChange={(v) => { setRiskLevel(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="風險等級" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有風險等級</SelectItem>
                  <SelectItem value="critical">極高風險</SelectItem>
                  <SelectItem value="high">高度風險</SelectItem>
                  <SelectItem value="medium">中度風險</SelectItem>
                  <SelectItem value="low">風險較低</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sort} onValueChange={(v: any) => { setSort(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">最新至最舊</SelectItem>
                  <SelectItem value="oldest">最舊至最新</SelectItem>
                  <SelectItem value="trustAsc">信任度由低至高</SelectItem>
                  <SelectItem value="trustDesc">信任度由高至低</SelectItem>
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
          ) : !data || data.records.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>找不到符合條件的紀錄</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                    <tr>
                      <th className="px-6 py-3 font-medium">ID</th>
                      <th className="px-6 py-3 font-medium">時間</th>
                      <th className="px-6 py-3 font-medium">來源</th>
                      <th className="px-6 py-3 font-medium">摘要</th>
                      <th className="px-6 py-3 font-medium">信任度</th>
                      <th className="px-6 py-3 font-medium">風險評級</th>
                      <th className="px-6 py-3 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.records.map((record: HistoryRecord) => (
                      <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-muted-foreground">#{record.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{format(new Date(record.createdAt), 'yyyy/MM/dd HH:mm')}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {record.inputType === 'image' ? (
                            <Badge variant="secondary" className="font-normal flex w-fit items-center gap-1"><ImageIcon className="w-3 h-3"/> 圖片</Badge>
                          ) : (
                            <Badge variant="secondary" className="font-normal flex w-fit items-center gap-1"><FileText className="w-3 h-3"/> 文字</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="line-clamp-2 max-w-sm">{record.inputSummary}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold">
                          <span className={record.trustScore >= 60 ? 'text-green-600' : record.trustScore >= 40 ? 'text-orange-600' : 'text-red-600'}>
                            {record.trustScore}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline" className={
                            record.riskLevel === 'critical' ? 'text-red-700 bg-red-50 border-red-200' :
                            record.riskLevel === 'high' ? 'text-orange-700 bg-orange-50 border-orange-200' :
                            record.riskLevel === 'medium' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                            'text-green-700 bg-green-50 border-green-200'
                          }>
                            {record.riskLevel === 'critical' ? '極高風險' :
                             record.riskLevel === 'high' ? '高度風險' :
                             record.riskLevel === 'medium' ? '中度風險' : '風險較低'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedRecord(record)}>
                              <Eye className="w-4 h-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)} disabled={deleteMutation.isPending}>
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

      {/* Detail Modal */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30 sticky top-0 z-10 backdrop-blur">
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> 
              分析結果詳情 (紀錄 #{selectedRecord?.id})
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 sm:p-6 pb-12">
            {!!selectedRecord?.analysisResult && (
              <AnalysisResultView result={selectedRecord.analysisResult as any} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
