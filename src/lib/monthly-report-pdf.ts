import PDFDocument from "pdfkit/js/pdfkit.standalone";

import type { MonitoringStats } from "@/lib/monitoring-stats";
import { APP_TIME_ZONE } from "@/lib/timezone";

type MonthlyReportPdfInput = {
  stats: MonitoringStats;
  monthStart: Date;
  reportEnd: Date;
  hasCompletedDays: boolean;
  isPartialPeriod: boolean;
  scopeLabel: string;
  generatedBy: string;
  generatedAt: Date;
};

type TableColumn<T> = {
  label: string;
  width: number;
  align?: "left" | "center" | "right";
  value: (row: T, index: number) => string | number;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export async function renderMonthlyReportPdf({
  stats,
  monthStart,
  reportEnd,
  hasCompletedDays,
  isPartialPeriod,
  scopeLabel,
  generatedBy,
  generatedAt,
}: MonthlyReportPdfInput) {
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    bufferPages: true,
    info: {
      Title: `Laporan Monitoring Program Kerja ${formatMonthId(monthStart)}`,
      Author: generatedBy,
      Subject: "Laporan Monitoring Program Kerja Bulanan",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  drawHeader(
    doc,
    monthStart,
    reportEnd,
    scopeLabel,
    generatedAt,
    hasCompletedDays,
    isPartialPeriod
  );
  drawExecutiveNote(doc, hasCompletedDays, isPartialPeriod);
  drawOverview(doc, stats);
  drawSectionTitle(doc, "I. Rekapitulasi Global per Divisi");
  drawTable(doc, stats.byDivision, [
    { label: "No", width: 26, align: "center", value: (_row, index) => index + 1 },
    { label: "Divisi", width: 130, value: (row) => row.divisionName },
    { label: "Total", width: 50, align: "center", value: (row) => row.total },
    { label: "Selesai", width: 58, align: "center", value: (row) => row.completed },
    {
      label: "Kendala",
      width: 58,
      align: "center",
      value: (row) => row.completedWithIssue,
    },
    {
      label: "Tidak",
      width: 58,
      align: "center",
      value: (row) => row.notExecuted,
    },
    { label: "Pending", width: 58, align: "center", value: (row) => row.pending },
    {
      label: "%",
      width: 37,
      align: "center",
      value: (row) => `${row.completionRate}%`,
    },
  ]);

  drawDivisionSections(doc, stats);

  drawNotesAndSignature(doc, generatedBy, hasCompletedDays, isPartialPeriod);
  addPageNumbers(doc);
  doc.end();

  return done;
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  monthStart: Date,
  reportEnd: Date,
  scopeLabel: string,
  generatedAt: Date,
  hasCompletedDays: boolean,
  isPartialPeriod: boolean
) {
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .text("LAPORAN MONITORING PROGRAM KERJA", MARGIN, 36, {
      align: "center",
      width: CONTENT_WIDTH,
    })
    .fontSize(12)
    .text("PONDOK PESANTREN DARUL FALAH", {
      align: "center",
      width: CONTENT_WIDTH,
    });

  doc.moveTo(MARGIN, 82).lineTo(PAGE_WIDTH - MARGIN, 82).lineWidth(1).stroke();
  doc.moveTo(MARGIN, 86).lineTo(PAGE_WIDTH - MARGIN, 86).lineWidth(0.5).stroke();

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Bulan laporan: ${formatMonthId(monthStart)}`, MARGIN, 104)
    .text(
      `Periode data: ${formatReportPeriod(monthStart, reportEnd, hasCompletedDays)}`,
      MARGIN,
      120
    )
    .text(`Lingkup laporan: ${scopeLabel}`, MARGIN, 136)
    .text(
      `Tanggal cetak: ${formatDateTimeId(generatedAt)} WIB`,
      MARGIN,
      152
    );

  if (isPartialPeriod) {
    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .fillColor("#4b5563")
      .text(
        "Catatan periode: bulan berjalan dihitung sampai hari terakhir yang sudah selesai.",
        MARGIN,
        168,
        { width: CONTENT_WIDTH }
      )
      .fillColor("#111827");
  }

  doc.y = isPartialPeriod ? 194 : 182;
}

function drawExecutiveNote(
  doc: PDFKit.PDFDocument,
  hasCompletedDays: boolean,
  isPartialPeriod: boolean
) {
  ensureSpace(doc, 74);
  drawSectionTitle(doc, "Pendahuluan");
  const note = hasCompletedDays
    ? `Laporan ini menyajikan rekapitulasi pelaksanaan program kerja berdasarkan jadwal yang telah memasuki periode evaluasi. ${
        isPartialPeriod
          ? "Untuk menjaga akurasi, data bulan berjalan hanya dihitung sampai hari kemarin karena pelaksanaan hari ini belum selesai sepenuhnya."
          : "Seluruh tanggal dalam bulan laporan telah masuk periode evaluasi."
      }`
    : "Belum ada tanggal dalam bulan laporan yang selesai dievaluasi. Data akan tersedia setelah minimal satu hari pelaksanaan selesai.";

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#374151")
    .text(note, MARGIN, doc.y, {
      width: CONTENT_WIDTH,
      align: "justify",
      lineGap: 2,
    })
    .fillColor("#111827");
  doc.moveDown(0.8);
}

function drawOverview(doc: PDFKit.PDFDocument, stats: MonitoringStats) {
  drawSectionTitle(doc, "Ringkasan Global");
  const items = [
    ["Total Jadwal", stats.overview.totalSchedules],
    ["Selesai", stats.overview.completed],
    ["Selesai dengan Kendala", stats.overview.completedWithIssue],
    ["Tidak Terlaksana", stats.overview.notExecuted],
    ["Pending", stats.overview.pending],
    ["Tingkat Eksekusi", `${stats.overview.completionRate}%`],
  ];

  const cardWidth = CONTENT_WIDTH / 3;
  const cardHeight = 48;
  const startY = doc.y;

  items.forEach(([label, value], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = MARGIN + col * cardWidth;
    const y = startY + row * cardHeight;

    doc.rect(x, y, cardWidth - 8, cardHeight - 8).strokeColor("#d1d5db").stroke();
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#4b5563")
      .text(String(label).toUpperCase(), x + 10, y + 9, {
        width: cardWidth - 28,
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#111827")
      .text(String(value), x + 10, y + 23, {
        width: cardWidth - 28,
      });
  });

  doc.fillColor("#111827").strokeColor("#111827");
  doc.y = startY + cardHeight * 2 + 8;
}

function drawDivisionSections(doc: PDFKit.PDFDocument, stats: MonitoringStats) {
  if (stats.byDivision.length === 0) {
    drawSectionTitle(doc, "II. Detail per Divisi");
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#374151")
      .text("Tidak ada data program pada periode laporan.", MARGIN, doc.y, {
        width: CONTENT_WIDTH,
      })
      .fillColor("#111827");
    doc.moveDown(0.8);
    return;
  }

  stats.byDivision.forEach((division, index) => {
    ensureSpace(doc, 130);
    drawSectionTitle(doc, `II.${index + 1}. Detail Divisi ${division.divisionName}`);
    drawDivisionSummary(doc, division);
    const programs = stats.byProgram.filter(
      (program) => program.divisionName === division.divisionName
    );
    drawTable(doc, programs, [
      { label: "No", width: 26, align: "center", value: (_row, idx) => idx + 1 },
      { label: "Program", width: 175, value: (row) => row.programName },
      { label: "Total", width: 48, align: "center", value: (row) => row.total },
      { label: "Selesai", width: 55, align: "center", value: (row) => row.completed },
      {
        label: "Kendala",
        width: 55,
        align: "center",
        value: (row) => row.completedWithIssue,
      },
      {
        label: "Tidak",
        width: 55,
        align: "center",
        value: (row) => row.notExecuted,
      },
      { label: "Pending", width: 55, align: "center", value: (row) => row.pending },
      { label: "%", width: 41, align: "center", value: (row) => `${row.completionRate}%` },
    ]);
  });
}

function drawDivisionSummary(
  doc: PDFKit.PDFDocument,
  division: MonitoringStats["byDivision"][number]
) {
  ensureSpace(doc, 58);
  const y = doc.y;
  const labels = [
    ["Total", division.total],
    ["Selesai", division.completed],
    ["Kendala", division.completedWithIssue],
    ["Tidak", division.notExecuted],
    ["Pending", division.pending],
    ["Eksekusi", `${division.completionRate}%`],
  ];
  const itemWidth = CONTENT_WIDTH / labels.length;

  doc
    .rect(MARGIN, y, CONTENT_WIDTH, 38)
    .fillAndStroke("#f9fafb", "#d1d5db");
  labels.forEach(([label, value], index) => {
    const x = MARGIN + index * itemWidth;
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#4b5563")
      .text(String(label).toUpperCase(), x + 6, y + 8, {
        width: itemWidth - 12,
        align: "center",
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#111827")
      .text(String(value), x + 6, y + 22, {
        width: itemWidth - 12,
        align: "center",
      });
  });
  doc.y = y + 50;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 36);
  doc
    .moveDown(0.5)
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text(title, MARGIN, doc.y);
  doc.moveDown(0.5);
}

function drawTable<T>(
  doc: PDFKit.PDFDocument,
  rows: T[],
  inputColumns: TableColumn<T>[]
) {
  const columns = fitColumnsToPage(inputColumns);
  const rowHeight = 22;
  drawTableHeader(doc, columns, rowHeight);

  if (rows.length === 0) {
    ensureSpace(doc, rowHeight);
    const y = doc.y;
    doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).strokeColor("#9ca3af").stroke();
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#374151")
      .text("Tidak ada data.", MARGIN, y + 6, {
        width: CONTENT_WIDTH,
        align: "center",
        lineBreak: false,
      });
    doc.y = y + rowHeight;
    return;
  }

  rows.forEach((row, rowIndex) => {
    const movedToNewPage = ensureSpace(doc, rowHeight);
    if (movedToNewPage) {
      drawTableHeader(doc, columns, rowHeight);
    }

    let x = MARGIN;
    const y = doc.y;
    doc.lineWidth(0.5).strokeColor("#9ca3af").fillColor("#111827");

    columns.forEach((column) => {
      doc.rect(x, y, column.width, rowHeight).stroke();
      doc
        .font("Helvetica")
        .fontSize(7.8)
        .fillColor("#111827")
        .text(String(column.value(row, rowIndex)), x + 4, y + 6, {
          width: column.width - 8,
          height: rowHeight - 8,
          align: column.align ?? "left",
          ellipsis: true,
          lineBreak: false,
        });
      doc.y = y;
      x += column.width;
    });

    doc.y = y + rowHeight;
  });

  doc.y += 6;
}

function drawTableHeader<T>(
  doc: PDFKit.PDFDocument,
  columns: TableColumn<T>[],
  rowHeight: number
) {
  ensureSpace(doc, rowHeight + 10);
  let x = MARGIN;
  const y = doc.y;

  doc.lineWidth(0.5).strokeColor("#6b7280").fillColor("#111827");
  columns.forEach((column) => {
    doc.rect(x, y, column.width, rowHeight).fillAndStroke("#e5e7eb", "#6b7280");
    doc
      .font("Helvetica-Bold")
      .fontSize(7.8)
      .fillColor("#111827")
      .text(column.label, x + 4, y + 6, {
        width: column.width - 8,
        height: rowHeight - 8,
        align: column.align ?? "left",
        lineBreak: false,
      });
    doc.y = y;
    x += column.width;
  });
  doc.y = y + rowHeight;
}

function drawNotesAndSignature(
  doc: PDFKit.PDFDocument,
  generatedBy: string,
  hasCompletedDays: boolean,
  isPartialPeriod: boolean
) {
  ensureSpace(doc, 150);
  const note = hasCompletedDays
    ? `Catatan: Status pending menunjukkan jadwal dalam periode data yang belum memiliki status akhir. ${
        isPartialPeriod
          ? "Periode bulan berjalan dibatasi sampai kemarin sehingga jadwal hari ini dan hari setelahnya tidak ikut dihitung."
          : ""
      }`
    : "Catatan: Belum ada hari selesai dalam periode laporan ini sehingga data rekapitulasi masih kosong.";

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#374151")
    .text(note, MARGIN, doc.y, { width: CONTENT_WIDTH, align: "justify" });

  const y = doc.y + 30;
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#111827")
    .text("Mengetahui,", MARGIN + 330, y)
    .text("Koordinator / Penanggung Jawab", MARGIN + 330, y + 16)
    .text(generatedBy, MARGIN + 330, y + 92, {
      width: 170,
      align: "center",
    });
  doc.moveTo(MARGIN + 330, y + 88).lineTo(MARGIN + 500, y + 88).stroke();
}

function formatReportPeriod(
  monthStart: Date,
  reportEnd: Date,
  hasCompletedDays: boolean
) {
  if (!hasCompletedDays) {
    return "Belum ada tanggal yang selesai dievaluasi";
  }

  return `${formatDateId(monthStart)} s.d. ${formatDateId(reportEnd)}`;
}

function fitColumnsToPage<T>(columns: TableColumn<T>[]): TableColumn<T>[] {
  const sourceWidth = columns.reduce((total, column) => total + column.width, 0);
  if (sourceWidth === 0) return columns;

  let usedWidth = 0;
  return columns.map((column, index) => {
    if (index === columns.length - 1) {
      return {
        ...column,
        width: Number((CONTENT_WIDTH - usedWidth).toFixed(2)),
      };
    }

    const width = Number(((column.width / sourceWidth) * CONTENT_WIDTH).toFixed(2));
    usedWidth += width;
    return { ...column, width };
  });
}

function formatMonthId(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

function formatDateId(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

function formatDateTimeId(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  })
    .format(date)
    .replace(".", ":");
}

function addPageNumbers(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  const footerY = PAGE_HEIGHT - 28;

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#6b7280")
      .text(`Halaman ${i - range.start + 1} dari ${range.count}`, MARGIN, footerY, {
        width: CONTENT_WIDTH,
        height: 10,
        align: "right",
        lineBreak: false,
      });
    doc.page.margins.bottom = originalBottomMargin;
  }
}

function ensureSpace(doc: PDFKit.PDFDocument, neededHeight: number) {
  if (doc.y + neededHeight > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    doc.y = MARGIN;
    return true;
  }
  return false;
}
