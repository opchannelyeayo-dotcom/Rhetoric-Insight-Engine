import { useState, useRef } from "react";
import { UploadCloud, FileImage, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ImageAnalysisTab({ onResult, onSwitchToText }: { onResult: (r: any) => void, onSwitchToText: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      toast.error("請上傳圖片檔案 (JPG, PNG, WEBP)");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("圖片大小不能超過 5MB");
      return;
    }
    setFile(selectedFile);
    setExtractedText("");
    
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const extractText = async () => {
    if (!file) return;
    setIsExtracting(true);
    
    try {
      const formData = new FormData();
      formData.append("image", file);
      
      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "擷取失敗");
      }
      
      setExtractedText(data.extractedText);
      if (data.message) {
        toast.info(data.message);
      }
    } catch (err: any) {
      toast.error(err.message || "圖片文字擷取失敗，請手動輸入");
      // Fallback: switch to text tab
      setTimeout(onSwitchToText, 2000);
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToTextTab = () => {
    // In a real app we might pass this text to a global state or parent
    // For now we just show a toast and switch
    toast.success("文字已擷取，請貼上至文字分析區");
    navigator.clipboard.writeText(extractedText);
    onSwitchToText();
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <div 
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/jpeg,image/png,image/webp" 
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <UploadCloud className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">點擊或拖放圖片至此</h3>
          <p className="text-sm text-muted-foreground mb-4">支援 JPG, PNG, WEBP 格式 (最大 5MB)</p>
          <Button variant="outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            選擇檔案
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-1/2">
              <div className="relative rounded-lg overflow-hidden border border-border bg-muted aspect-video flex items-center justify-center">
                {preview && <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain" />}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setFile(null)}>
                  重新選擇
                </Button>
                <Button className="flex-1" onClick={extractText} disabled={isExtracting || !!extractedText}>
                  {isExtracting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 擷取中...</> : "擷取文字"}
                </Button>
              </div>
            </div>
            
            <div className="w-full sm:w-1/2 flex flex-col">
              <h4 className="font-medium mb-2 flex items-center"><FileImage className="w-4 h-4 mr-2"/> 擷取結果</h4>
              <div className="flex-1 border border-border rounded-lg bg-muted/30 p-4 min-h-[200px] overflow-auto whitespace-pre-wrap text-sm">
                {extractedText ? (
                  extractedText
                ) : isExtracting ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <RefreshCw className="w-8 h-8 mb-2 animate-spin text-primary/40" />
                    <p>AI 正在辨識圖片文字...</p>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-center">
                    請點擊「擷取文字」開始辨識
                  </div>
                )}
              </div>
              {extractedText && (
                <Button className="w-full mt-4" onClick={copyToTextTab}>
                  使用此文字進行分析
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
