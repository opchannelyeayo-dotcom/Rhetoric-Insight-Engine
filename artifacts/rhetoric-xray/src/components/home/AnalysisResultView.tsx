import { useState } from "react";
import { type AnalysisResult } from "@workspace/api-client-react";
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, Info, ChevronDown, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { normalizeAnalysisResult } from "@/lib/normalize-analysis";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const REGIONAL_LAWS = {
  台灣: "《健康食品管理法》第 14、15 條：廣告不得虛偽不實、誇張，且不得宣稱醫療效能；涉及核准功效時應與許可內容一致。違規可能遭停止刊播、沒入及罰鍰。",
  香港: "《不良醫藥廣告條例》（第 231 章）：禁止或限制廣告聲稱可預防、治療指定疾病或病理狀況；即使以食品或保健品名義銷售，也可能受規管。",
  澳門: "第 30/95/M 號法令：藥物廣告原則上須事先獲准，不得保證療效、淡化副作用、暗示毋須求醫或使用未經科學證實的功效。",
  韓國: "《食品等標示・廣告法》及《健康機能食品法》：不得刊登虛假、誇大或使健康機能食品被誤認為可預防或治療疾病的廣告。",
} as const;

export function AnalysisResultView({ result: rawResult }: { result: AnalysisResult }) {
  const [region, setRegion] = useState<keyof typeof REGIONAL_LAWS>("台灣");
  const result = normalizeAnalysisResult(rawResult);
  if (!result) {
    return <Card className="p-6 text-destructive">分析結果格式錯誤，請重新執行分析。</Card>;
  }
  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900";
      case "high": return "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900";
      case "critical": return "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "low": return "風險較低";
      case "medium": return "中度風險";
      case "high": return "高度風險";
      case "critical": return "極高風險";
      default: return "未知風險";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "low": return <CheckCircle2 className="w-8 h-8 text-green-600" />;
      case "medium": return <AlertCircle className="w-8 h-8 text-yellow-600" />;
      case "high": return <AlertTriangle className="w-8 h-8 text-orange-600" />;
      case "critical": return <ShieldAlert className="w-8 h-8 text-red-600" />;
      default: return <Info className="w-8 h-8 text-gray-600" />;
    }
  };

  const getHighlightClass = (severity?: string) => {
    switch (severity) {
      case "low": return "tactic-highlight tactic-highlight-low";
      case "medium": return "tactic-highlight tactic-highlight-medium";
      case "high": return "tactic-highlight tactic-highlight-high";
      case "critical": return "tactic-highlight tactic-highlight-critical";
      default: return "tactic-highlight tactic-highlight-medium";
    }
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
      <div className="bg-primary/5 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90 absolute inset-0">
              <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted" />
              <circle 
                cx="40" cy="40" r="36" 
                stroke="currentColor" 
                strokeWidth="8" 
                fill="transparent" 
                strokeDasharray="226.2" 
                strokeDashoffset={226.2 - (226.2 * result.trustScore) / 100}
                className={
                  result.trustScore >= 80 ? "text-green-500" : 
                  result.trustScore >= 60 ? "text-yellow-500" : 
                  result.trustScore >= 40 ? "text-orange-500" : "text-red-500"
                } 
              />
            </svg>
            <div className="text-xl font-bold">{result.trustScore}</div>
          </div>
          <div>
            <h3 className="text-sm text-muted-foreground font-medium mb-1">信任度評分</h3>
            <div className="flex items-center gap-2">
              {getRiskIcon(result.riskLevel)}
              <Badge variant="outline" className={`px-3 py-1 text-sm font-semibold border-2 ${getRiskColor(result.riskLevel)}`}>
                {getRiskLabel(result.riskLevel)}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="md:w-1/2 text-sm bg-white p-3 rounded-md border shadow-sm">
          <span className="font-semibold text-primary block mb-1">判定原因：</span>
          {result.riskReason}
        </div>
      </div>

      <CardContent className="p-0">
        <div className="p-5 border-b bg-red-50/70">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
            <label className="font-bold text-red-900 whitespace-nowrap">地區</label>
            <Select value={region} onValueChange={(value) => setRegion(value as keyof typeof REGIONAL_LAWS)}>
              <SelectTrigger className="w-full sm:w-52 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(REGIONAL_LAWS).map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="text-sm leading-relaxed text-red-900"><strong>相關違反法規提醒：</strong>{REGIONAL_LAWS[region]}</p>
          <p className="text-xs text-red-700 mt-2">此為警示性摘要，實際適用條文與處分仍應依主管機關最新公告及個案事實判定。</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Left Column: Annotated Text */}
          <div className="p-6">
            <h4 className="font-serif font-bold text-lg mb-4 flex items-center gap-2">
              <SearchCheck className="w-5 h-5 text-primary" /> 原文透視
            </h4>
            <div className="bg-muted/30 p-4 rounded-lg leading-loose text-foreground/90 whitespace-pre-wrap font-sans text-[15px] border">
              {result.segments.map((segment, idx) => {
                if (!segment.isSuspicious) {
                  return <span key={idx}>{segment.text}</span>;
                }
                
                // Find matching tactic for severity
                const tactic = result.tactics.find(t => t.type === segment.tacticType);
                
                return (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <span className={getHighlightClass(tactic?.severity)}>
                        {segment.text}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-popover border shadow-lg text-foreground p-3">
                      <p className="font-bold text-sm text-primary mb-1">{segment.tacticLabel}</p>
                      <p className="text-xs text-muted-foreground">{tactic?.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            
            {result.tactics.length > 0 && (
              <div className="mt-6">
                <h5 className="text-sm font-semibold mb-3 text-muted-foreground">偵測到的行銷話術：</h5>
                <div className="space-y-2">
                  {result.tactics.map((tactic, idx) => (
                    <Collapsible key={idx} className="bg-white border rounded-md overflow-hidden">
                      <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getRiskColor(tactic.severity)}>{tactic.label}</Badge>
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-3 pt-0 text-sm border-t bg-muted/10">
                        <p className="mb-2 text-foreground/80">{tactic.description}</p>
                        {tactic.examples && tactic.examples.length > 0 && (
                          <div className="bg-white p-2 rounded border border-dashed text-xs text-muted-foreground">
                            <span className="font-semibold block mb-1">常見範例：</span>
                            <ul className="list-disc pl-4 space-y-1">
                              {tactic.examples.map((ex, i) => <li key={i}>{ex}</li>)}
                            </ul>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Fact Check & Tips */}
          <div className="p-6 bg-primary/5">
            <h4 className="font-serif font-bold text-lg mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" /> 事實還原與建議
            </h4>
            
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-lg border shadow-sm relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <Info className="w-4 h-4 text-blue-700" />
                </div>
                <h5 className="font-bold text-blue-900 mb-2">事實查核</h5>
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{result.factCheck}</p>
              </div>

              <div className="bg-white p-5 rounded-lg border shadow-sm relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-700" />
                </div>
                <h5 className="font-bold text-green-900 mb-2">健康消費提醒</h5>
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{result.healthTips}</p>
              </div>
            </div>
            
            <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                分析模式：<Badge variant="secondary" className="text-[10px]">{result.analysisMode === 'ai' ? 'AI 智能分析' : '規則特徵比對'}</Badge>
              </span>
              <Button variant="ghost" size="sm" className="h-8">
                <Save className="w-3.5 h-3.5 mr-1" /> 已自動儲存
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Add the missing icon that was used but not imported in previous file
function SearchCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 11 2 2 4-4" />
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
