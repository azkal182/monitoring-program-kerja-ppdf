import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

async function getMonitoringData() {
  const today = new Date();
  const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const divisions = await prisma.division.findMany({
    include: {
      programs: {
        where: { isActive: true },
        include: {
          schedules: {
            where: { date: dateOnly },
            include: {
              sessions: {
                where: {
                  status: { in: ["COMPLETED", "COMPLETED_WITH_ISSUE", "NOT_EXECUTED"] },
                },
              },
            },
          },
        },
      },
    },
  });

  return divisions.map((division) => {
    let totalScheduled = 0;
    let completed = 0;
    let withIssue = 0;
    let notExecuted = 0;

    division.programs.forEach((program) => {
      program.schedules.forEach((schedule) => {
        totalScheduled++;
        const session = schedule.sessions[0];
        if (session) {
          if (session.status === "COMPLETED") completed++;
          else if (session.status === "COMPLETED_WITH_ISSUE") withIssue++;
          else if (session.status === "NOT_EXECUTED") notExecuted++;
        }
      });
    });

    const pending = totalScheduled - completed - withIssue - notExecuted;
    const completionRate = totalScheduled > 0 ? ((completed + withIssue) / totalScheduled) * 100 : 0;

    return {
      id: division.id,
      name: division.name,
      totalScheduled,
      completed,
      withIssue,
      notExecuted,
      pending,
      completionRate,
    };
  });
}

export default async function MonitoringPage() {
  const divisionStats = await getMonitoringData();

  const totalScheduled = divisionStats.reduce((sum, d) => sum + d.totalScheduled, 0);
  const totalCompleted = divisionStats.reduce((sum, d) => sum + d.completed + d.withIssue, 0);
  const overallRate = totalScheduled > 0 ? (totalCompleted / totalScheduled) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Monitoring</h1>
        <p className="text-muted-foreground">
          Status keterlaksanaan program hari ini
        </p>
      </div>

      {/* Overall Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Hari Ini</CardTitle>
          <CardDescription>
            Persentase keterlaksanaan keseluruhan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Keterlaksanaan</span>
              <span className="font-medium">{overallRate.toFixed(1)}%</span>
            </div>
            <Progress value={overallRate} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{totalCompleted} terlaksana</span>
              <span>{totalScheduled} terjadwal</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per Division */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Status Per Divisi</h2>
        {divisionStats.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Tidak ada jadwal hari ini
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {divisionStats.map((division) => (
              <Card key={division.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{division.name}</CardTitle>
                    <Badge
                      variant={
                        division.completionRate >= 100
                          ? "default"
                          : division.completionRate >= 50
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {division.completionRate.toFixed(0)}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={division.completionRate} className="h-2 mb-3" />
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <div className="text-lg font-semibold text-green-600">
                        {division.completed}
                      </div>
                      <div className="text-muted-foreground">Selesai</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-orange-600">
                        {division.withIssue}
                      </div>
                      <div className="text-muted-foreground">Kendala</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-600">
                        {division.pending}
                      </div>
                      <div className="text-muted-foreground">Pending</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-red-600">
                        {division.notExecuted}
                      </div>
                      <div className="text-muted-foreground">Gagal</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
