import { useState } from "react";
import { useGetHistory, useDeleteHistory, type HistoryRecord } from "@workspace/api-client-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Shield, FileText, Image as ImageIcon, Trash2, Eye, Calendar, AlertTriangle, ShieldAlert, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AnalysisResultView } from "@/components/home/AnalysisResultView";

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  
  const { data, isLoading } = useGetHistory({ page, limit: 10 });
  const deleteMutation = useDeleteHistory();
  const queryClient = useQueryClient();

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "text-green-700 bg-green-100 border-green-200";
      case "medium": return "text-yellow-700 bg-yellow-100 border-yellow-200";
      case "high": return "text-orange-700 bg-orange-100 border-orange-200";
      case "critical": return "text-red-700 bg-red-100 border-red-200";
      default: return "text-gray-700 bg-gray-100 border-gray-200";
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "low": return "風險較低";
      case "medium": return "中度風險";
      case "high": return "高度風險";
      case "critical": return "極高風險";
      default: return "未知風險";
    }
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("確定要刪除這筆紀錄嗎？")) return;
    
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("已刪除紀錄");
        queryClient.invalidateQueries({ queryKey: ["/api/history"] });
        if (data?.records.length === 1 && page > 1) {
          setPage(p => p - 1);
        }
      },
      onError: () => {
        toast.error("刪除失敗");
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl min-h-[calc(100vh-4rem-120px)]">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Calendar className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-primary">分析歷史紀錄</h1>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary/50" />
          <p>載入紀錄中...</p>
        </div>
      ) : !data || data.records.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground/80 mb-2">尚無分析紀錄</h3>
          <p className="text-muted-foreground text-sm">您的所有分析紀錄將會保存在這裡。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.records.map((record) => (
            <Card 
              key={record.id} 
              className="overflow-hidden hover:border-primary/40 transition-colors cursor-pointer group"
              onClick={() => setSelectedRecord(record)}
            >
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  <div className={`w-full sm:w-24 p-4 flex sm:flex-col items-center justify-center gap-2 border-b sm:border-b-0 sm:border-r border-border bg-muted/10`}>
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90 absolute inset-0">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-muted" />
                        <circle 
                          cx="24" cy="24" r="20" 
                          stroke="currentColor" 
                          strokeWidth="4" 
                          fill="transparent" 
                          strokeDasharray="125.6" 
                          strokeDashoffset={125.6 - (125.6 * record.trustScore) / 100}
                          className={
                            record.trustScore >= 80 ? "text-green-500" : 
                            record.trustScore >= 60 ? "text-yellow-500" : 
                            record.trustScore >= 40 ? "text-orange-500" : "text-red-500"
                          } 
                        />
                      </svg>
                      <div className="text-sm font-bold">{record.trustScore}</div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 border ${getRiskColor(record.riskLevel)}`}>
                      {getRiskLabel(record.riskLevel)}
                    </Badge>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                        {record.inputType === 'text' ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                        <span>{format(new Date(record.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: zhTW })}</span>
                      </div>
                      <p className="text-sm line-clamp-2 text-foreground/90">{record.inputSummary}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 flex items-center justify-end sm:justify-center gap-2 border-t sm:border-t-0 sm:border-l border-border bg-muted/5">
                    <Button variant="ghost" size="icon" className="text-muted-foreground group-hover:text-primary transition-colors">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={(e) => handleDelete(record.id, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {data.total > 10 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> 上一頁
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                第 {page} 頁，共 {Math.ceil(data.total / 10)} 頁
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(data.total / 10)}
              >
                下一頁 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30 sticky top-0 z-10 backdrop-blur">
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> 
              分析結果詳情
              <span className="text-xs font-normal font-sans text-muted-foreground ml-2">
                {selectedRecord && format(new Date(selectedRecord.createdAt), 'yyyy年MM月dd日 HH:mm')}
              </span>
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
