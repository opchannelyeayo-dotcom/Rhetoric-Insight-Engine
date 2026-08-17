import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDrugQuery, type DrugItem } from "@workspace/api-client-react";
import { Search, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const querySchema = z.object({
  q: z.string().min(1, "請輸入搜尋關鍵字"),
  category: z.string().optional(),
});

export function DrugQueryTab() {
  const [hasSearched, setHasSearched] = useState(false);
  const [queryParams, setQueryParams] = useState<{q: string, category?: string} | null>(null);
  const [selectedDrug, setSelectedDrug] = useState<DrugItem | null>(null);

  const form = useForm<z.infer<typeof querySchema>>({
    resolver: zodResolver(querySchema),
    defaultValues: { q: "", category: "all" },
  });

  const { data: results, isFetching } = useDrugQuery(
    queryParams || { q: "" },
    { query: { enabled: !!queryParams, queryKey: ["drugQuery", queryParams] } }
  );

  const onSubmit = (data: z.infer<typeof querySchema>) => {
    setQueryParams({
      q: data.q,
      category: data.category === "all" ? undefined : data.category
    });
    setHasSearched(true);
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
      case "藥品": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
      case "健康食品": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-3">
          <FormField
            control={form.control}
            name="q"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="輸入產品名稱、廠商或核准字號..." {...field} className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem className="w-full sm:w-[150px]">
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="分類" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="藥品">藥品</SelectItem>
                    <SelectItem value="健康食品">健康食品</SelectItem>
                    <SelectItem value="一般保健品">一般保健品</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <Button type="submit" size="lg" className="h-11" disabled={isFetching}>
            {isFetching ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
            搜尋
          </Button>
        </form>
      </Form>

      {!hasSearched ? (
        <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
          <Info className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
          <p>輸入產品名稱，查詢是否為衛福部核准之藥品或健康食品。</p>
          <p className="text-sm mt-2 opacity-70">注意：一般保健食品（如維他命）不需核准字號，但不能宣稱療效。</p>
        </div>
      ) : isFetching ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      ) : results?.items && results.items.length > 0 ? (
        <div className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground mb-4">找到 {results.total} 筆相符結果</p>
          {results.items.map((item) => (
            <Card key={item.id} role="button" tabIndex={0} onClick={() => setSelectedDrug(item)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedDrug(item); }} className="overflow-hidden border-border/50 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-lg">{item.name}</h4>
                    <Badge variant="outline" className={getCategoryColor(item.category)}>{item.category}</Badge>
                    {item.status === 'revoked' && <Badge variant="destructive">已註銷</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.manufacturer}</p>
                  <p className="text-xs font-mono bg-muted px-2 py-0.5 rounded w-fit mt-2">{item.approvalNumber}</p>
                </div>
                {item.claims && (
                  <div className="sm:w-1/3 bg-primary/5 p-3 rounded text-sm text-primary/90">
                    <span className="font-semibold block mb-1">核准功效/適應症：</span>
                    {item.claims}
                  </div>
                )}
                <span className="text-xs text-primary font-medium whitespace-nowrap">查看詳細內容</span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground border border-border rounded-xl bg-muted/20">
          <p className="text-lg mb-2">找不到相符的產品</p>
          <p className="text-sm">如果此產品宣稱具有療效或保健功效，卻查無資料，請提高警覺。</p>
        </div>
      )}
      <Dialog open={!!selectedDrug} onOpenChange={(open) => !open && setSelectedDrug(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{selectedDrug?.name}</DialogTitle><DialogDescription>官方核准資料詳細內容</DialogDescription></DialogHeader>
          {selectedDrug && <dl className="grid sm:grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="font-semibold text-muted-foreground">分類</dt><dd>{selectedDrug.category}</dd>
            <dt className="font-semibold text-muted-foreground">核准字號</dt><dd className="font-mono">{selectedDrug.approvalNumber}</dd>
            <dt className="font-semibold text-muted-foreground">申請商／廠商</dt><dd>{selectedDrug.manufacturer}</dd>
            <dt className="font-semibold text-muted-foreground">核准日期</dt><dd>{selectedDrug.approvedDate || "未提供"}</dd>
            <dt className="font-semibold text-muted-foreground">主要成分</dt><dd className="whitespace-pre-wrap">{selectedDrug.ingredients || "未提供"}</dd>
            <dt className="font-semibold text-muted-foreground">核准功效／適應症</dt><dd className="whitespace-pre-wrap">{selectedDrug.claims || "未提供"}</dd>
            <dt className="font-semibold text-muted-foreground">證況</dt><dd>{selectedDrug.status === "active" ? "有效" : "已註銷"}</dd>
          </dl>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
