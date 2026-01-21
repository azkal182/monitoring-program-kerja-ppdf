import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, XCircle, Clock, Bot } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Program {
  scheduleId: string;
  programId: string;
  programName: string;
  scheduleTime: string | null;
  status: "completed" | "issue" | "failed" | "pending";
  userId: string | null;
  userName: string | null;
  submittedAt: Date | null;
  sessionId: string | null;
  isAutoCreated: boolean;
}

interface Division {
  divisionId: string;
  divisionName: string;
  total: number;
  completed: number;
  completedWithIssue: number;
  notExecuted: number;
  pending: number;
  completionRate: number;
  programs: Program[];
}

interface DivisionAccordionProps {
  divisions: Division[];
}

function getStatusBadge(status: Program["status"], isAutoCreated: boolean) {
  const configs = {
    completed: {
      label: isAutoCreated ? "Auto-completed" : "Selesai",
      icon: isAutoCreated ? Bot : CheckCircle,
      className: isAutoCreated
        ? "bg-blue-100 text-blue-700 border-blue-200"
        : "bg-green-100 text-green-700 border-green-200",
    },
    issue: {
      label: "Selesai (kendala)",
      icon: AlertTriangle,
      className: "bg-orange-100 text-orange-700 border-orange-200",
    },
    failed: {
      label: "Tidak Terlaksana",
      icon: XCircle,
      className: "bg-red-100 text-red-700 border-red-200",
    },
    pending: {
      label: "Pending",
      icon: Clock,
      className: "bg-slate-100 text-slate-600 border-slate-200",
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function formatTime(date: Date | null) {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DivisionAccordion({ divisions }: DivisionAccordionProps) {
  if (divisions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Tidak ada data untuk ditampilkan
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-4">
      {divisions.map((division) => (
        <AccordionItem
          key={division.divisionId}
          value={division.divisionId}
          className="border rounded-lg"
        >
          <AccordionTrigger className="hover:no-underline px-6 py-4">
            <div className="flex flex-1 items-center justify-between pr-4 gap-6">
              {/* Left: Division Info */}
              <div className="flex-1 text-left space-y-2">
                <h3 className="font-semibold text-lg">{division.divisionName}</h3>

                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <span className="font-medium text-foreground">
                    {division.completed + division.completedWithIssue}/{division.total} terlaksana
                  </span>

                  <div className="flex items-center gap-4">
                    {division.completed > 0 && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {division.completed}
                      </span>
                    )}
                    {division.completedWithIssue > 0 && (
                      <span className="text-orange-600 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {division.completedWithIssue}
                      </span>
                    )}
                    {division.notExecuted > 0 && (
                      <span className="text-red-600 flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" />
                        {division.notExecuted}
                      </span>
                    )}
                    {division.pending > 0 && (
                      <span className="text-slate-600 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {division.pending}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Completion Rate */}
              <div className="flex flex-col items-end gap-2 min-w-[120px]">
                <p className="text-3xl font-bold">{division.completionRate}%</p>
                <Progress value={division.completionRate} className="w-full h-2" />
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-6 pb-4 pt-2">
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead className="w-24">Waktu</TableHead>
                      <TableHead className="w-40">Status</TableHead>
                      <TableHead className="w-32">User</TableHead>
                      <TableHead className="w-24">Submit</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {division.programs.map((program) => (
                      <TableRow key={program.scheduleId}>
                        <TableCell className="font-medium">{program.programName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {program.scheduleTime || "-"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(program.status, program.isAutoCreated)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {program.userName || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(program.submittedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {program.sessionId && (
                            <Button size="sm" variant="ghost" asChild>
                              <Link href={`/dashboard/sessions/${program.sessionId}`}>
                                Lihat Detail
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {division.programs.map((program) => (
                  <Card key={program.scheduleId}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Program Name & Time */}
                        <div>
                          <h4 className="font-medium text-sm">{program.programName}</h4>
                          {program.scheduleTime && (
                            <p className="text-xs text-muted-foreground mt-1">
                              🕐 {program.scheduleTime}
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div>
                          {getStatusBadge(program.status, program.isAutoCreated)}
                        </div>

                        {/* User & Submit Time */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{program.userName || "Belum ada user"}</span>
                          <span>{formatTime(program.submittedAt)}</span>
                        </div>

                        {/* Action Button */}
                        {program.sessionId && (
                          <Button size="sm" variant="outline" className="w-full" asChild>
                            <Link href={`/dashboard/sessions/${program.sessionId}`}>
                              Lihat Detail
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
