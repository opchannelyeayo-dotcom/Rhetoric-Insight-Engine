import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Info } from "lucide-react";

const items = [
  {
    title: "名詞說明",
    lead: "先分清楚「建議量」與「安全上限」，數字才不會看錯。",
    points: [
      "EAR 是滿足約 50% 人群的平均需要量；RDA 通常可滿足 97–98% 的健康人群。",
      "資料不足以訂出 RDA 時，會用 AI（足夠攝取量）作為參考。",
      "UL 是長期攝取的安全上限，不是吃得越接近越好；CDRR 則以降低慢性病風險為目標。",
    ],
  },
  {
    title: "成人與孕哺期精華表",
    lead: "成人的基準相近，但懷孕與哺乳期應特別留意鐵、葉酸、碘與蛋白質。",
    points: [
      "19–30 歲成人：維生素 C 100 mg、維生素 D 10 μg、鈣 1,000 mg、葉酸 400 μg／日。",
      "同齡男性／女性：蛋白質約 70／60 g、鎂 380／320 mg、鐵 10／15 mg／日。",
      "孕哺期的需求會隨營養素與階段改變，使用補充品前宜先由醫師或營養師評估。",
    ],
  },
  {
    title: "蛋白質建議攝取量",
    lead: "用體重換算比只背固定克數更實用。",
    points: [
      "一般未滿 70 歲成人：每日每公斤體重 1.1 g；參考量約男性 70 g、女性 60 g。",
      "70 歲以上：每日每公斤體重 1.2 g，以協助預防衰弱與肌少症。",
      "懷孕期在同齡女性基準上增加 10 g／日；哺乳期增加 15 g／日。",
    ],
  },
  {
    title: "鈉建議攝取量",
    lead: "成人重點可記成：鈉 2,300 mg，約等於食鹽 6 g。",
    points: [
      "19 歲以上成人的 CDRR 參考值為 2,300 mg／日，目標是降低血壓與心血管疾病風險。",
      "孕期與哺乳期沿用同齡女性標準，資料未顯示需要額外增加。",
      "高血壓、腎臟病或其他慢性病患者，應依醫療人員給予的個別標準調整。",
    ],
    needsReview: true,
  },
  {
    title: "鉀建議攝取量",
    lead: "成人參考量約為男性 2.8 g、女性 2.5 g／日。",
    points: [
      "懷孕期約 2.5 g／日；哺乳期因母乳中的鉀流失，參考量提高至約 2.9 g／日。",
      "鉀通常優先由蔬果、豆類與原型食物取得；腎功能異常者不可自行大量補充。",
      "原始表格部分備註的 mg／g 單位不一致，這裡採主欄位的 g／日呈現。",
    ],
    needsReview: true,
  },
  {
    title: "鎂建議攝取量",
    lead: "19–30 歲成人約男性 380 mg、女性 320 mg／日。",
    points: [
      "一般換算基準約為每日每公斤體重 5 mg，實際數值會隨年齡、性別與參考體重改變。",
      "懷孕期在同齡女性 RDA 上增加 35 mg／日；哺乳期不需額外增加。",
      "單看補充品標示容易忽略飲食來源，計算時應把每日飲食一併納入。",
    ],
    needsReview: true,
  },
  {
    title: "鐵建議攝取量",
    lead: "鐵需求受性別、生理期與孕期影響，不能只套用單一成人數字。",
    points: [
      "19–30 歲男性約 10 mg／日；同齡女性精華表為 15 mg／日，停經後通常降至 10 mg／日。",
      "孕期與哺乳期的表格數字及補充劑說明存在口徑差異，應交由醫師依抽血與個人狀況判斷。",
      "鐵補充過量也可能有風險，不建議僅因疲倦就自行長期服用高劑量產品。",
    ],
    needsReview: true,
  },
  {
    title: "功效分類統計",
    lead: "登錄產品最常見的方向集中在血脂、腸胃與護肝。",
    points: [
      "單一標籤中，調節血脂 62 件、胃腸功能改善 55 件、護肝 37 件、抗疲勞 27 件。",
      "同一產品可能同時列入多項功效；紅麴、魚油等規格標準也可能另列，因此不可直接相加當作產品總數。",
      "「健康食品」功效宣稱代表通過特定查驗，不等於藥品療效，也不能取代治療。",
    ],
  },
  {
    title: "廠商統計",
    lead: "產品件數前段以大型食品與生技業者為主。",
    points: [
      "前三名為佳格食品 34 件、統一企業 25 件、愛之味 19 件。",
      "台糖、葡萄王與上浤醫藥生技各 10 件；光泉 9 件、維他露 8 件。",
      "件數只反映資料庫中的產品登錄量，不代表療效、品質或推薦排名。",
    ],
  },
];

export function HealthInfoAccordion() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-6 py-4">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3 className="font-serif text-lg font-bold text-primary">藥品與保健營養參考</h3>
      </div>
      <div className="p-6">
        <div className="mb-6 flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <span>重點整理自提供的衛福部國健署參考資料；內容僅供一般理解，不能取代診斷、處方或個人化營養建議。</span>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {items.map((item, index) => (
            <AccordionItem key={item.title} value={`item-${index}`} className="mb-2 overflow-hidden rounded-lg border border-b">
              <AccordionTrigger className="px-4 py-3 text-left font-medium transition-colors hover:bg-muted/30 hover:no-underline">
                {item.title}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-1 text-muted-foreground">
                <p className="mb-3 font-medium leading-relaxed text-foreground">{item.lead}</p>
                <ul className="list-disc space-y-2 pl-5 leading-relaxed">
                  {item.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
                {item.needsReview && (
                  <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    資料註記：原始 CSV 標示「未逐項核實」，重要決策請回查國健署原始 PDF。
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
