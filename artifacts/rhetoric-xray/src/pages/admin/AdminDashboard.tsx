import { useGetAdminStats, type HistoryRecord } from "@workspace/api-client-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { 
  FileText, Activity, ShieldAlert, BadgeInfo,
  Pill, Link2, SearchCheck, Loader2, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line 
} from "recharts";
import { buttonVariants } from "@/components/ui/button";

export function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-sidebar-primary" />
      </div>
    );
  }

  const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#3b82f6', '#8b5cf6'];
  
  // Format risk level data for charts
  const riskData = [
    { name: '較低風險', value: stats.byRiskLevel.low || 0, fill: '#22c55e' },
    { name: '中度風險', value: stats.byRiskLevel.medium || 0, fill: '#eab308' },
    { name: '高度風險', value: stats.byRiskLevel.high || 0, fill: '#f97316' },
    { name: '極高風險', value: stats.byRiskLevel.critical || 0, fill: '#ef4444' },
  ];

  // Format tactic type data
  const tacticData = Object.entries(stats.byTacticType || {}).map(([key, value]) => ({
    name: key,
    value: Number(value)
  })).sort((a, b) => b.value - a.value).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-sidebar-foreground">儀表板</h1>
          <p className="text-muted-foreground mt-1">話術透視鏡系統運作概況</p>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-sidebar-primary/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">話術分析總數</CardTitle>
            <SearchCheck className="h-4 w-4 text-sidebar-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">今日新增 {stats.todayRecords} 筆</p>
          </CardContent>
        </Card>
        <Card className="border-sidebar-primary/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">偵測標註總數</CardTitle>
            <BadgeInfo className="h-4 w-4 text-sidebar-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDetectedTactics.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">識別出潛在的操縱話術</p>
          </CardContent>
        </Card>
        <Card className="border-sidebar-primary/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均信任度</CardTitle>
            <Activity className="h-4 w-4 text-sidebar-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTrustScore.toFixed(1)} / 100</div>
            <p className="text-xs text-muted-foreground mt-1">所有分析的平均信任分數</p>
          </CardContent>
        </Card>
        <Card className="border-sidebar-primary/20 shadow-sm bg-sidebar-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">待審核標籤</CardTitle>
            <ShieldAlert className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTags}</div>
            <Link 
              href="/admin/tags"
              className={buttonVariants({ variant: "link" }) + " text-xs text-primary-foreground p-0 h-auto mt-1 flex items-center hover:text-white"}
            >
              前往審核 <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">話術標籤總數</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTags.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">藥品資料庫</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDrugs.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">網址查詢總數</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUrlQueries.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-serif">風險等級分佈</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-serif">六大話術分佈</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {tacticData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tacticData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {tacticData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">無足夠數據</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-serif">每日平均信任度趨勢 (30天)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats.dailyTrustTrend && stats.dailyTrustTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyTrustTrend} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5' }} />
                  <Line type="monotone" dataKey="avgTrust" stroke="#1B3A6B" strokeWidth={3} dot={{ r: 4, fill: '#1B3A6B' }} activeDot={{ r: 6 }} name="信任分數" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground text-sm">無足夠數據</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <div>
            <CardTitle className="text-sm font-serif">最近分析紀錄</CardTitle>
            <CardDescription>最新 5 筆使用者分析結果</CardDescription>
          </div>
          <Link href="/admin/records" className={buttonVariants({ variant: "outline", size: "sm" })}>
            查看全部
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">時間</th>
                  <th className="px-6 py-3 font-medium">來源</th>
                  <th className="px-6 py-3 font-medium">摘要</th>
                  <th className="px-6 py-3 font-medium">風險評級</th>
                  <th className="px-6 py-3 font-medium text-right">信任度</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((record: HistoryRecord) => (
                    <tr key={record.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 whitespace-nowrap">{format(new Date(record.createdAt), 'MM/dd HH:mm')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary" className="font-normal">{record.inputType === 'image' ? '圖片' : '文字'}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="line-clamp-1 max-w-xs">{record.inputSummary}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className={
                          record.riskLevel === 'critical' ? 'text-red-700 bg-red-50 border-red-200' :
                          record.riskLevel === 'high' ? 'text-orange-700 bg-orange-50 border-orange-200' :
                          record.riskLevel === 'medium' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                          'text-green-700 bg-green-50 border-green-200'
                        }>
                          {record.riskLevel === 'critical' ? '極高風險' :
                           record.riskLevel === 'high' ? '高度風險' :
                           record.riskLevel === 'medium' ? '中度風險' : '風險較低'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                        <span className={record.trustScore >= 60 ? 'text-green-600' : record.trustScore >= 40 ? 'text-orange-600' : 'text-red-600'}>
                          {record.trustScore}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">尚無紀錄</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
