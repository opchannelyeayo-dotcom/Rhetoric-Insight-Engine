import { type ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetAdminMe, useAdminLogout } from "@workspace/api-client-react";
import { Shield, LayoutDashboard, FileText, Pill, Tags, SearchCheck, Link2, Users, LogOut, Menu, Loader2, Home } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useGetAdminMe();
  const logoutMutation = useAdminLogout();

  useEffect(() => {
    // If auth fails or user is not logged in, redirect to login
    if (error || (user && !user.loggedIn)) {
      setLocation("/admin/login");
    }
  }, [user, error, setLocation]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/admin/login");
        toast.success("已登出");
      },
      onError: () => {
        toast.error("登出失敗，請稍後再試");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-sidebar">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user?.loggedIn) {
    return null; // Will redirect in useEffect
  }

  const navItems = [
    { name: "回到首頁", path: "/", icon: Home },
    { name: "儀表板", path: "/admin", icon: LayoutDashboard },
    { name: "分析紀錄", path: "/admin/records", icon: FileText },
    { name: "藥品資料庫", path: "/admin/drugs", icon: Pill },
    { name: "話術標籤", path: "/admin/tags", icon: Tags },
    { name: "話術分析", path: "/admin/rhetoric", icon: SearchCheck },
    { name: "網址查詢", path: "/admin/url-queries", icon: Link2 },
  ];

  if (user.role === "super_admin") {
    navItems.push({ name: "使用者管理", path: "/admin/users", icon: Users });
  }

  const NavLinks = () => (
    <nav className="flex flex-col gap-1 py-4">
      {navItems.map((item) => (
        <Link 
          key={item.path} 
          href={item.path}
          className={buttonVariants({ variant: location === item.path ? "secondary" : "ghost" }) + 
            ` justify-start px-4 w-full rounded-none ${
              location === item.path 
                ? "bg-sidebar-accent text-sidebar-accent-foreground border-r-4 border-sidebar-primary" 
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`
          }
        >
          <item.icon className="mr-3 h-5 w-5" />
          {item.name}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border shadow-xl z-10 text-sidebar-foreground">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground p-1.5 rounded-md">
            <Shield className="h-6 w-6" />
          </div>
          <span className="font-serif font-bold text-lg tracking-wider text-sidebar-foreground">後台管理</span>
        </div>
        <div className="flex-1 overflow-auto">
          <NavLinks />
        </div>
        <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-sidebar-foreground">{user.username}</p>
              <p className="text-xs text-sidebar-foreground/70 uppercase">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-center bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleLogout} disabled={logoutMutation.isPending}>
            {logoutMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            登出
          </Button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col w-full overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-sidebar-primary" />
            <span className="font-serif font-bold tracking-wide">話術透視鏡後台</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
              <div className="p-6 flex items-center gap-3 border-b border-sidebar-border">
                <Shield className="h-6 w-6 text-sidebar-primary" />
                <span className="font-serif font-bold text-lg">選單</span>
              </div>
              <div className="flex-1 overflow-auto">
                <NavLinks />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border bg-sidebar">
                <p className="text-sm font-medium mb-1">{user.username}</p>
                <Button variant="outline" className="w-full mt-2 bg-sidebar-accent border-none text-sidebar-accent-foreground" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> 登出
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
