import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useRhetoricalAnalyze, type RhetoricalAnalyzeResult, type RhetoricalAnalyzeInputScene
} from "@workspace/api-client-react";
import { 
  Loader2, SearchCheck, ShieldAlert, BadgeInfo, Scale, Lightbulb, Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

const analyzeSchema = z.object({
  text: z.string().min(10, "請輸入至少10個字"),
  scene: z.string().optional(),
});

export function AdminRhetoricPage() {
  const [result, setResult] = useState<RhetoricalAnalyzeResult | null>(null);
  
  const form = useForm<z.infer<typeof analyzeSchema>>({
    resolver: zodResolver(analyzeSchema),
    defaultValues: { text: "", scene: "sales" },
  });

  const analyzeMutation = useRhetoricalAnalyze();

  const onSubmit = (data: z.infer<typeof analyzeSchema>) => {
    analyzeMutation.mutate(
      { data: { text: data.text, scene: data.scene as RhetoricalAnalyzeInputScene } },
      {
        onSuccess: (res) => {
          setResult(res);
          toast.success("分析完成");
        },
        onError: () => {
          toast.error("分析失敗");
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-sidebar-foreground">話術風險分析 (沙盒)</h1>
        <p className="text-muted-foreground mt-1">使用進階 AI 模型深度分析廣告文案的風險與合規性</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="shadow-sm border-border h-fit">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="text-lg font-serif">輸入文案</CardTitle>
            <CardDescription>輸入欲測試的行銷文案，系統將自動套用對應的審查標準</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="scene"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>應用場景</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="選擇場景" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sales">一般銷售文案</SelectItem>
                          <SelectItem value="customer_service">客服對話/Q&A</SelectItem>
                          <SelectItem value="medical">醫療/健康諮詢</SelectItem>
                          <SelectItem value="livestream">直播帶貨腳本</SelectItem>
                          <SelectItem value="social_post">社群貼文/KOL業配</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>測試內容</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="請輸入廣告或行銷文案..." 
                          className="min-h-[300px] resize-y" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full bg-sidebar hover:bg-sidebar/90" disabled={analyzeMutation.isPending}>
                  {analyzeMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 分析中...</>
                  ) : (
                    <><SearchCheck className="w-4 h-4 mr-2" /> 開始深度分析</>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Result Section */}
        <div className="space-y-6">
          {!result && !analyzeMutation.isPending ? (
            <Card className="shadow-sm border-dashed border-2 bg-muted/10 h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground p-6">
                <SearchCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>在左側輸入文案後點擊分析，<br/>結果將顯示於此</p>
              </CardContent>
            </Card>
          ) : analyzeMutation.isPending ? (
            <Card className="shadow-sm border-border h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground p-6">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-sidebar-primary" />
                <p>AI 正在進行深度比對與法規核實...</p>
              </CardContent>
            </Card>
          ) : result && (
            <div className="space-y-4">
              <Card className="shadow-sm border-border border-l-4 border-l-orange-500 overflow-hidden">
                <CardHeader className="bg-orange-50/50 pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                    <ShieldAlert className="w-5 h-5" /> 識別到的風險標籤
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-3">
                  {result.riskTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.riskTags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-green-600 flex items-center">
                      未檢測出明顯的高風險話術標籤
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border">
                <CardHeader className="pb-3 border-b bg-muted/10">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BadgeInfo className="w-5 h-5 text-sidebar-primary" /> 判定依據
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.judgment}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border">
                <CardHeader className="pb-3 border-b bg-muted/10">
                  <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                    <Lightbulb className="w-5 h-5" /> 建議改寫方向
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap bg-green-50/30">
                  {result.rewriteSuggestion}
                </CardContent>
              </Card>

              {(result.laws.length > 0 || result.cases.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.laws.length > 0 && (
                    <Card className="shadow-sm border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Scale className="w-4 h-4 text-muted-foreground" /> 相關法條
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                          {result.laws.map((law, i) => <li key={i}>{law}</li>)}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {result.cases.length > 0 && (
                    <Card className="shadow-sm border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-muted-foreground" /> 歷史案例參考
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                          {result.cases.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
