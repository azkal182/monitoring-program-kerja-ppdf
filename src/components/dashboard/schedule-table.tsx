"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { ScheduleSummary } from "@/hooks/use-schedules";

interface ScheduleTableProps {
  schedules: ScheduleSummary[];
}

type SortField = "program" | "division" | "time" | "status" | null;
type SortDirection = "asc" | "desc";

// Sort icon component - moved outside to prevent recreation on each render
function SortIcon({
  field,
  sortField,
  sortDirection
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) {
  if (sortField !== field) {
    return <ArrowUpDown className="ml-2 h-4 w-4" />;
  }
  return sortDirection === "asc" ? (
    <ArrowUp className="ml-2 h-4 w-4" />
  ) : (
    <ArrowDown className="ml-2 h-4 w-4" />
  );
}

export function ScheduleTable({ schedules }: ScheduleTableProps) {
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedSchedules = useMemo(() => {
    if (!sortField) return schedules;

    return [...schedules].sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case "program":
          compareValue = a.program.name.localeCompare(b.program.name);
          break;
        case "division":
          compareValue = a.program.division.name.localeCompare(
            b.program.division.name
          );
          break;
        case "time":
          const timeA = a.program.scheduleTime || "99:99";
          const timeB = b.program.scheduleTime || "99:99";
          compareValue = timeA.localeCompare(timeB);
          break;
        case "status":
          const statusA = a.sessions[0]?.status || "PENDING";
          const statusB = b.sessions[0]?.status || "PENDING";
          compareValue = statusA.localeCompare(statusB);
          break;
      }

      return sortDirection === "asc" ? compareValue : -compareValue;
    });
  }, [schedules, sortField, sortDirection]);

  function getStatusIcon(sessions: ScheduleSummary["sessions"]) {
    if (sessions.length === 0) {
      return <Clock className="h-4 w-4 text-slate-600" />;
    }
    const session = sessions[0];
    switch (session.status) {
      case "DRAFT":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "COMPLETED_WITH_ISSUE":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "NOT_EXECUTED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-600" />;
    }
  }

  function getStatusBadge(sessions: ScheduleSummary["sessions"]) {
    if (sessions.length === 0) {
      return <Badge variant="outline">Belum dimulai</Badge>;
    }
    const session = sessions[0];
    switch (session.status) {
      case "DRAFT":
        return <Badge variant="secondary">Sedang berjalan</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-600">Selesai</Badge>;
      case "COMPLETED_WITH_ISSUE":
        return <Badge className="bg-orange-500">Kendala</Badge>;
      case "NOT_EXECUTED":
        return <Badge variant="destructive">Tidak terlaksana</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }



  return (
    <div className="space-y-4">
      {/* MOBILE VIEW (Cards) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {sortedSchedules.map((schedule) => (
          <Card key={schedule.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(schedule.sessions)}
                <span className="font-semibold text-sm leading-tight text-foreground">
                  {schedule.program.name}
                </span>
              </div>
              <div className="shrink-0">{getStatusBadge(schedule.sessions)}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-2 text-xs text-muted-foreground mt-1">
              <div>
                <span className="block font-medium text-foreground">Divisi</span>
                <span>{schedule.program.division.name}</span>
              </div>
              <div>
                <span className="block font-medium text-foreground">Waktu</span>
                <span>{schedule.program.scheduleTime || "--:--"}</span>
              </div>
              <div className="col-span-2 mt-1">
                <span className="block font-medium text-foreground">PIC</span>
                <span>{schedule.sessions[0]?.user?.name || "-"}</span>
              </div>
            </div>
            
            <div className="flex justify-end pt-2 border-t mt-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8">
                    <span className="text-xs mr-2">Opsi</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {schedule.sessions[0] &&
                    ["COMPLETED", "COMPLETED_WITH_ISSUE"].includes(
                      schedule.sessions[0].status
                    ) && (
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/sessions/${schedule.sessions[0].id}`}>
                          Lihat Bukti
                        </Link>
                      </DropdownMenuItem>
                    )}
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/programs`}>Lihat Detail Program</Link>
                  </DropdownMenuItem>
                  {schedule.sessions[0]?.status === "DRAFT" && (
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/sessions/${schedule.sessions[0].id}`}>
                        Monitor Progress
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
      </div>

      {/* DESKTOP VIEW (Table) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table className="min-w-[980px]">
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center"></TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("program")}
                  className="flex items-center hover:bg-transparent px-0 font-semibold"
                >
                  Program
                  <SortIcon field="program" sortField={sortField} sortDirection={sortDirection} />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("division")}
                  className="flex items-center hover:bg-transparent px-0 font-semibold"
                >
                  Divisi
                  <SortIcon field="division" sortField={sortField} sortDirection={sortDirection} />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("time")}
                  className="flex items-center hover:bg-transparent px-0 font-semibold"
                >
                  Waktu
                  <SortIcon field="time" sortField={sortField} sortDirection={sortDirection} />
                </Button>
              </TableHead>
              <TableHead className="font-semibold">PIC</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("status")}
                  className="flex items-center hover:bg-transparent px-0 font-semibold"
                >
                  Status
                  <SortIcon field="status" sortField={sortField} sortDirection={sortDirection} />
                </Button>
              </TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSchedules.map((schedule) => (
              <TableRow key={schedule.id} className="group">
                <TableCell className="text-center">{getStatusIcon(schedule.sessions)}</TableCell>
                <TableCell className="font-medium">
                  {schedule.program.name}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal bg-secondary/60 hover:bg-secondary">
                    {schedule.program.division.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground font-medium">
                  {schedule.program.scheduleTime || "--:--"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {schedule.sessions[0]?.user?.name || "-"}
                </TableCell>
                <TableCell>{getStatusBadge(schedule.sessions)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Buka menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {schedule.sessions[0] &&
                        ["COMPLETED", "COMPLETED_WITH_ISSUE"].includes(
                          schedule.sessions[0].status
                        ) && (
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/sessions/${schedule.sessions[0].id}`}
                            >
                              Lihat Bukti
                            </Link>
                          </DropdownMenuItem>
                        )}
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/programs`}>
                          Lihat Detail Program
                        </Link>
                      </DropdownMenuItem>
                      {schedule.sessions[0]?.status === "DRAFT" && (
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/sessions/${schedule.sessions[0].id}`}>
                            Monitor Progress
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
