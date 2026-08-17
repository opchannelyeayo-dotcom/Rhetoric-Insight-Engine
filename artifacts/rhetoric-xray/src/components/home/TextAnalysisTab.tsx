import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAnalyzeText, type AnalysisResult } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Loader2, SearchCheck } from "lucide-react";
import { toast } from "sonner";

const textSchema = z.object({
  text: z.string().min(10, "請至少輸入 10 個字").max(6000, "不能超過 6000 字"),
});

export function TextAnalysisTab({ onResult, role }: { onResult: (r: AnalysisResult) => void; role: "seller" | "consumer" }) {
  const form = useForm<z.infer<typeof textSchema>>({
    resolver: zodResolver(textSchema),
    defaultValues: { text: "" },
  });
  
  const textValue = form.watch("text");
  const analyzeMutation = useAnalyzeText();

  const onSubmit = (data: z.infer<typeof textSchema>) => {
    analyzeMutation.mutate(
      { data: { text: data.text, role } },
      {
        onSuccess: (result) => {
          onResult(result);
          // Scroll down smoothly
          window.scrollTo({ top: window.scrollY + 400, behavior: 'smooth' });
        },
        onError: (error) => toast.error(error.message || "分析失敗，請稍後再試"),
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <div className="relative">
                <FormControl>
                  <Textarea 
                    placeholder="在此貼上您看到的健康食品、藥品廣告文案..." 
                    className="min-h-[240px] resize-y text-base p-4 bg-muted/30 focus-visible:bg-white"
                    {...field} 
                  />
                </FormControl>
                <div className={`absolute bottom-3 right-3 text-xs ${textValue.length > 6000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {textValue.length} / 6000
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button 
            type="submit" 
            size="lg" 
            disabled={analyzeMutation.isPending}
            className="w-full sm:w-auto font-medium"
          >
            {analyzeMutation.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 分析中...</>
            ) : (
              <><SearchCheck className="w-5 h-5 mr-2" /> 開始透視分析</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
