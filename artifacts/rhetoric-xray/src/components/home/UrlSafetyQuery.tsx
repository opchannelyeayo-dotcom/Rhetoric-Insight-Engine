import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUrlQuery } from "@workspace/api-client-react";
import { Globe, Shield, ShieldAlert, AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";

const urlSchema = z.object({
  url: z.string().url("請輸入有效的網址 (例如 https://example.com)"),
});

export function UrlSafetyQuery() {
  const [result, setResult] = useState<{status: string, reason: string} | null>(null);
  const form = useForm<z.infer<typeof urlSchema>>({
    resolver: zodResolver(urlSchema),
    defaultValues: { url: "" },
  });

  const urlMutation = useUrlQuery();

  const onSubmit = (data: z.infer<typeof urlSchema>) => {
    urlMutation.mutate({ data: { url: data.url } }, {
      onSuccess: (res) => {
        setResult({ status: res.status, reason: res.reason });
      }
    });
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "safe": 
        return { icon: <Shield className="w-8 h-8 text-green-500 mb-2" />, color: "text-green-700 bg-green-50 border-green-200", label: "安全" };
      case "suspicious": 
        return { icon: <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />, color: "text-yellow-700 bg-yellow-50 border-yellow-200", label: "可疑" };
      case "high_risk": 
        return { icon: <ShieldAlert className="w-8 h-8 text-red-500 mb-2" />, color: "text-red-700 bg-red-50 border-red-200", label: "高風險" };
      default: 
        return { icon: <HelpCircle className="w-8 h-8 text-gray-400 mb-2" />, color: "text-gray-700 bg-gray-50 border-gray-200", label: "無法判定" };
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="bg-primary/5 px-6 py-4 border-b border-border flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" />
        <h3 className="font-serif font-bold text-lg text-primary">廣告網址安全查詢</h3>
      </div>
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-3">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="貼上廣告連結 (例如一頁式網頁)..." {...field} className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" size="lg" className="h-11" disabled={urlMutation.isPending}>
              {urlMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "查詢網址"}
            </Button>
          </form>
        </Form>

        {result && (
          <Card className={`mt-6 border ${getStatusDisplay(result.status).color}`}>
            <CardContent className="p-4 flex items-start gap-4">
              <div className="flex flex-col items-center justify-center flex-shrink-0 w-16">
                {getStatusDisplay(result.status).icon}
                <span className="font-bold text-sm">{getStatusDisplay(result.status).label}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed mt-1 opacity-90">{result.reason}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
