import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Info } from "lucide-react";

export function HealthInfoAccordion() {
  const items = [
    {
      title: "保健品名詞說明（健康食品 vs 一般保健品 vs 藥品）",
      content: "「健康食品」為法律名詞，需向衛福部申請查驗登記，並標示「小綠人」標章，才能宣稱特定保健功效。「一般保健品」為一般食品，不可宣稱醫療效能，也不得標示保健功效。「藥品」具有預防、診斷、治療疾病之效能，需由醫師處方或藥師指示使用。"
    },
    {
      title: "成人每日建議攝取量精華表",
      content: "維生素C：100mg（上限2000mg）\n維生素D：10μg（上限50μg）\n鈣：1000mg（上限2500mg）\n維生素E：10mg（上限1000mg）\n葉酸：400μg（上限1000μg）\n*資料來源：國健署國人膳食營養素參考攝取量"
    },
    {
      title: "孕哺期建議攝取量調整",
      content: "孕婦與哺乳期婦女需增加特定營養素攝取：\n鐵：孕婦27mg，哺乳45mg（一般15mg）\n葉酸：孕婦600μg，哺乳500μg（一般400μg）\n碘：孕婦200μg，哺乳250μg（一般140μg）\n使用補充品前務必諮詢醫師。"
    },
    {
      title: "蛋白質建議",
      content: "一般健康成人每日建議攝取量為每公斤體重 1.1 公克。例如 60 公斤成人每日需 66 公克。過量攝取可能增加腎臟負擔，如有腎臟疾病需依醫師指示限制攝取。"
    },
    {
      title: "核准健康食品功效分類統計",
      content: "目前衛福部公告之保健功效共 13 項：\n1. 調節血脂功能\n2. 胃腸功能改善\n3. 護肝功能(針對化學性肝損傷)\n4. 免疫調節功能\n5. 骨質保健功能\n6. 不易形成體脂肪功能\n7. 抗疲勞功能\n8. 牙齒保健功能\n9. 調節血糖功能\n10. 延緩衰老功能\n11. 輔助調節血壓功能\n12. 促進鐵吸收功能\n13. 輔助調整過敏體質功能"
    }
  ];

  return (
    <div className="w-full bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="bg-primary/5 px-6 py-4 border-b border-border flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <h3 className="font-serif font-bold text-lg text-primary">保健營養參考資訊</h3>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 bg-muted/50 p-3 rounded-lg border">
          <Info className="w-4 h-4 text-blue-500" />
          <span>以下資料參考自衛生福利部國民健康署，僅供一般參考，個人健康狀況請諮詢專業醫師。</span>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          {items.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-b-0 mb-2 border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 text-left font-medium transition-colors">
                {item.title}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-1 text-muted-foreground whitespace-pre-line leading-relaxed">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
