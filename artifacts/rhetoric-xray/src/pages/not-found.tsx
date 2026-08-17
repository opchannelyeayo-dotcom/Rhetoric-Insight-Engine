import { Link } from "wouter";
import { buttonVariants } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-muted/50 p-6 rounded-full mb-6">
        <ShieldAlert className="w-16 h-16 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-serif font-bold text-primary mb-2">404 - 找不到頁面</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        您嘗試存取的頁面不存在，或是已經被移動。若您認為這是系統錯誤，請聯繫系統管理員。
      </p>
      <Link href="/" className={buttonVariants({ size: "lg" }) + " font-medium"}>
        返回首頁
      </Link>
    </div>
  );
}
