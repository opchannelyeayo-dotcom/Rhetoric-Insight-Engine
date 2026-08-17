export function Footer() {
  return (
    <footer className="border-t border-border bg-white mt-12 py-8">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <div>
          <p className="font-serif font-bold text-primary flex items-center justify-center md:justify-start gap-2">
            話術透視鏡 Ad Rhetoric X-Ray
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            守護長輩與家人的健康消費防線
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} 話術透視鏡. 僅供參考，不代表醫療建議。</p>
        </div>
      </div>
    </footer>
  );
}
