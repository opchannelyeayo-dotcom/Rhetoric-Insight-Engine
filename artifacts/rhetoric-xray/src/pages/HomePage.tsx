import { useState } from "react";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Image as ImageIcon, Pill } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisResult } from "@workspace/api-client-react";

import { TextAnalysisTab } from "@/components/home/TextAnalysisTab";
import { ImageAnalysisTab } from "@/components/home/ImageAnalysisTab";
import { DrugQueryTab } from "@/components/home/DrugQueryTab";
import { AnalysisResultView } from "@/components/home/AnalysisResultView";
import { UrlSafetyQuery } from "@/components/home/UrlSafetyQuery";
import { HealthInfoAccordion } from "@/components/home/HealthInfoAccordion";

export function HomePage() {
  const [activeTab, setActiveTab] = useState("text");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  return (
    <div className="flex flex-col items-center pb-20">
      {/* Hero Section */}
      <section className="w-full bg-white border-b border-border py-16 md:py-24 text-center px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto bg-primary/10 text-primary w-fit px-4 py-1.5 rounded-full text-sm font-medium mb-6 flex items-center gap-2"
          >
            <Shield className="w-4 h-4" /> 守護健康消費的第一道防線
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-primary tracking-tight leading-tight"
          >
            揭開話術的面紗
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            貼上健康產品廣告文字或上傳廣告圖片，AI 將為您標示行銷陷阱與操縱手法，提供客觀理性的分析參考。
          </motion.p>
        </div>
      </section>

      {/* Main Tool Section */}
      <section className="w-full max-w-4xl mx-auto px-4 -mt-8 relative z-10">
        <Card className="shadow-xl border-border/50 bg-white/95 backdrop-blur">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-2 pt-2 border-b border-border">
              <TabsList className="w-full grid grid-cols-3 bg-transparent h-14">
                <TabsTrigger value="text" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-t-lg rounded-b-none h-full data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all">
                  <FileText className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">貼上文字</span><span className="sm:hidden">文字</span>
                </TabsTrigger>
                <TabsTrigger value="image" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-t-lg rounded-b-none h-full data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all">
                  <ImageIcon className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">上傳圖片</span><span className="sm:hidden">圖片</span>
                </TabsTrigger>
                <TabsTrigger value="drug" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-t-lg rounded-b-none h-full data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all">
                  <Pill className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">藥品查詢</span><span className="sm:hidden">查詢</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-6">
              <TabsContent value="text" className="mt-0 outline-none">
                <TextAnalysisTab onResult={setAnalysisResult} />
              </TabsContent>
              <TabsContent value="image" className="mt-0 outline-none">
                <ImageAnalysisTab onResult={setAnalysisResult} onSwitchToText={() => setActiveTab("text")} />
              </TabsContent>
              <TabsContent value="drug" className="mt-0 outline-none">
                <DrugQueryTab />
              </TabsContent>
            </div>
          </Tabs>
        </Card>

        {/* Analysis Results */}
        <AnimatePresence>
          {analysisResult && (activeTab === "text" || activeTab === "image") && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-8 overflow-hidden"
            >
              <AnalysisResultView result={analysisResult} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* URL Safety & Health Info Section */}
      <section className="w-full max-w-4xl mx-auto px-4 mt-16 space-y-12">
        <UrlSafetyQuery />
        <HealthInfoAccordion />
      </section>

      {/* 3 Steps Section */}
      <section className="w-full max-w-5xl mx-auto px-4 mt-24">
        <h2 className="text-2xl font-serif font-bold text-center text-primary mb-12">三步驟透視話術</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center border-none shadow-none bg-transparent">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 text-xl font-bold font-serif">1</div>
              <CardTitle className="font-serif text-xl">輸入廣告內容</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">直接貼上廣告文字，或上傳社群媒體、網頁的廣告截圖，系統將自動擷取文字。</p>
            </CardContent>
          </Card>
          <Card className="text-center border-none shadow-none bg-transparent">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 text-xl font-bold font-serif">2</div>
              <CardTitle className="font-serif text-xl">AI 智慧分析</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">透過預先訓練的模型與法規資料庫，識別出六大類常見的行銷操縱話術。</p>
            </CardContent>
          </Card>
          <Card className="text-center border-none shadow-none bg-transparent">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 text-xl font-bold font-serif">3</div>
              <CardTitle className="font-serif text-xl">拆解與還原</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">提供客觀的信任度評分、風險原因說明，並還原事實，提供健康的消費建議。</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

