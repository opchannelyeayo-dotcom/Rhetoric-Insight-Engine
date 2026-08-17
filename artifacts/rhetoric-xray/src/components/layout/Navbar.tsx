import { Link, useLocation } from "wouter";
import { Shield } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function Navbar() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center mx-auto px-4 md:px-6 max-w-5xl">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary text-white p-1.5 rounded-md">
            <Shield className="h-5 w-5" />
          </div>
          <span className="font-serif font-bold text-lg tracking-wide text-primary hidden sm:inline-block">話術透視鏡</span>
          <span className="font-serif font-bold text-lg tracking-wide text-primary sm:hidden">話術透視鏡</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2 sm:gap-4">
          <Link 
            href="/history" 
            className={buttonVariants({ variant: location === "/history" ? "secondary" : "ghost", size: "sm" }) + " font-medium"}
          >
            歷史紀錄
          </Link>
          <Link 
            href="/admin" 
            className={buttonVariants({ variant: "outline", size: "sm" }) + " hidden sm:flex font-medium text-muted-foreground border-border"}
          >
            後台管理
          </Link>
        </nav>
      </div>
    </header>
  );
}

