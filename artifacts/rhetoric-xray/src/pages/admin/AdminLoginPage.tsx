import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Shield, Lock, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useAdminLogin } from "@workspace/api-client-react";

const loginSchema = z.object({
  username: z.string().min(1, "請輸入帳號"),
  password: z.string().min(1, "請輸入密碼"),
});

export function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const loginMutation = useAdminLogin();

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        if (res.success) {
          toast.success("登入成功");
          setLocation("/admin");
        } else {
          toast.error(res.message || "登入失敗");
        }
      },
      onError: () => {
        toast.error("登入失敗，請檢查帳號密碼");
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-sidebar p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-sidebar-primary/20 blur-[120px]"></div>
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[60%] rounded-full bg-sidebar-primary/10 blur-[100px]"></div>
      </div>
      
      <Card className="w-full max-w-md bg-white shadow-2xl border-none relative z-10">
        <CardHeader className="space-y-4 text-center pb-8 pt-10">
          <div className="mx-auto w-16 h-16 bg-sidebar-primary rounded-xl flex items-center justify-center shadow-inner">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-serif font-bold text-sidebar tracking-wider">話術透視鏡</CardTitle>
            <CardDescription className="text-sidebar/60 font-medium mt-1">後台管理系統</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <FormControl>
                        <Input placeholder="管理員帳號" {...field} className="pl-10 h-12 bg-muted/30 focus-visible:bg-white" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <FormControl>
                        <Input type="password" placeholder="密碼" {...field} className="pl-10 h-12 bg-muted/30 focus-visible:bg-white" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 text-md font-medium mt-2 bg-sidebar hover:bg-sidebar/90 text-white">
                {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "登入"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
