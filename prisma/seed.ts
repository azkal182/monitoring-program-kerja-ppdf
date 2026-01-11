import { Role, SessionStatus } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { subDays, startOfDay } from "date-fns";

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.photo.deleteMany();
  await prisma.session.deleteMany();
  await prisma.scheduleInstance.deleteMany();
  await prisma.program.deleteMany();
  await prisma.user.deleteMany();
  await prisma.division.deleteMany();

  console.log("🗑️ Cleared existing data");

  // Create divisions
  const divisions = await Promise.all([
    prisma.division.create({
      data: {
        name: "Keamanan",
        description: "Divisi keamanan dan ketertiban pondok",
      },
    }),
    prisma.division.create({
      data: {
        name: "Kebersihan",
        description: "Divisi kebersihan lingkungan pondok",
      },
    }),
    prisma.division.create({
      data: {
        name: "Pendidikan",
        description: "Divisi pendidikan dan pembelajaran",
      },
    }),
    prisma.division.create({
      data: {
        name: "Kesehatan",
        description: "Divisi kesehatan santri",
      },
    }),
  ]);

  console.log(`✅ Created ${divisions.length} divisions`);

  // Create admin user
  const hashedPassword = await hash("admin123", 12);

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      name: "Administrator",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log(`✅ Created admin user: ${admin.username}`);

  // Create koordinator and anggota users
  const koordinatorPassword = await hash("koordinator123", 12);
  const anggotaPassword = await hash("anggota123", 12);

  const usersByDivision: Record<string, string[]> = {};

  for (const division of divisions) {
    usersByDivision[division.id] = [];

    // Koordinator
    await prisma.user.create({
      data: {
        username: `koordinator_${division.name.toLowerCase()}`,
        name: `Koordinator ${division.name}`,
        password: koordinatorPassword,
        role: Role.KOORDINATOR,
        divisionId: division.id,
      },
    });

    // Anggota
    for (let i = 1; i <= 3; i++) {
      const anggota = await prisma.user.create({
        data: {
          username: `anggota${i}_${division.name.toLowerCase()}`,
          name: `Anggota ${i} ${division.name}`,
          password: anggotaPassword,
          role: Role.ANGGOTA,
          divisionId: division.id,
        },
      });
      usersByDivision[division.id].push(anggota.id);
    }
  }

  console.log(`✅ Created koordinator and anggota users`);

  // Create programs for each division
  const keamanan = divisions.find((d) => d.name === "Keamanan")!;
  const kebersihan = divisions.find((d) => d.name === "Kebersihan")!;
  const pendidikan = divisions.find((d) => d.name === "Pendidikan")!;
  const kesehatan = divisions.find((d) => d.name === "Kesehatan")!;

  const programs = await Promise.all([
    // Keamanan
    prisma.program.create({
      data: {
        name: "Patroli Pagi",
        description: "Patroli keliling asrama setiap pagi",
        scheduleType: "DAILY",
        scheduleDays: [1, 2, 3, 4, 5, 6, 0],
        scheduleTime: "06:00",
        requirementType: "PHOTO",
        minUploads: 2,
        divisionId: keamanan.id,
      },
    }),
    prisma.program.create({
      data: {
        name: "Patroli Malam",
        description: "Patroli keliling asrama setiap malam",
        scheduleType: "DAILY",
        scheduleDays: [1, 2, 3, 4, 5, 6, 0],
        scheduleTime: "21:00",
        requirementType: "PHOTO",
        minUploads: 2,
        divisionId: keamanan.id,
      },
    }),
    prisma.program.create({
      data: {
        name: "Cek Pintu Gerbang",
        description: "Pengecekan kunci pintu gerbang",
        scheduleType: "DAILY",
        scheduleDays: [1, 2, 3, 4, 5, 6, 0],
        scheduleTime: "22:00",
        requirementType: "PHOTO",
        minUploads: 1,
        divisionId: keamanan.id,
      },
    }),
    // Kebersihan
    prisma.program.create({
      data: {
        name: "Piket Harian",
        description: "Pembersihan area umum harian",
        scheduleType: "DAILY",
        scheduleDays: [1, 2, 3, 4, 5, 6],
        scheduleTime: "07:00",
        requirementType: "PHOTO",
        minUploads: 3,
        divisionId: kebersihan.id,
      },
    }),
    prisma.program.create({
      data: {
        name: "Kerja Bakti Mingguan",
        description: "Kerja bakti bersama setiap hari Jumat",
        scheduleType: "WEEKLY",
        scheduleDays: [5],
        scheduleTime: "08:00",
        requirementType: "PHOTO",
        minUploads: 5,
        divisionId: kebersihan.id,
      },
    }),
    prisma.program.create({
      data: {
        name: "Cek Tempat Sampah",
        description: "Pengecekan dan pengangkutan sampah",
        scheduleType: "DAILY",
        scheduleDays: [1, 2, 3, 4, 5, 6],
        scheduleTime: "16:00",
        requirementType: "PHOTO",
        minUploads: 2,
        divisionId: kebersihan.id,
      },
    }),
    // Pendidikan
    prisma.program.create({
      data: {
        name: "Absensi Mengaji",
        description: "Pencatatan kehadiran mengaji",
        scheduleType: "DAILY",
        scheduleDays: [1, 2, 3, 4, 5, 6, 0],
        scheduleTime: "05:30",
        requirementType: "PHOTO",
        minUploads: 1,
        divisionId: pendidikan.id,
      },
    }),
    prisma.program.create({
      data: {
        name: "Monitoring Belajar Malam",
        description: "Pengawasan belajar malam santri",
        scheduleType: "DAILY",
        scheduleDays: [1, 2, 3, 4],
        scheduleTime: "20:00",
        requirementType: "PHOTO",
        minUploads: 2,
        divisionId: pendidikan.id,
      },
    }),
    // Kesehatan
    prisma.program.create({
      data: {
        name: "Cek Santri Sakit",
        description: "Pengecekan kondisi santri yang sakit",
        scheduleType: "DAILY",
        scheduleDays: [1, 2, 3, 4, 5, 6, 0],
        scheduleTime: "08:00",
        requirementType: "PHOTO",
        minUploads: 1,
        divisionId: kesehatan.id,
      },
    }),
    prisma.program.create({
      data: {
        name: "Pembersihan UKS",
        description: "Pembersihan ruang UKS",
        scheduleType: "WEEKLY",
        scheduleDays: [6],
        scheduleTime: "09:00",
        requirementType: "PHOTO",
        minUploads: 3,
        divisionId: kesehatan.id,
      },
    }),
    // MONTHLY examples
    prisma.program.create({
      data: {
        name: "Rapat Bulanan Keamanan",
        description: "Rapat evaluasi bulanan tim keamanan di tanggal 1",
        scheduleType: "MONTHLY",
        scheduleMonthDays: [1],
        scheduleTime: "10:00",
        requirementType: "PHOTO",
        minUploads: 2,
        divisionId: keamanan.id,
      },
    }),
    prisma.program.create({
      data: {
        name: "Inventaris Bulanan",
        description: "Pengecekan inventaris di tanggal 15 setiap bulan",
        scheduleType: "MONTHLY",
        scheduleMonthDays: [15],
        scheduleTime: "09:00",
        requirementType: "PHOTO",
        minUploads: 5,
        divisionId: kebersihan.id,
      },
    }),
    // CUSTOM example - for special dates
    prisma.program.create({
      data: {
        name: "Cek Kesiapan Acara Akhir Tahun",
        description: "Persiapan acara akhir tahun ajaran",
        scheduleType: "CUSTOM",
        customDates: [
          new Date("2026-01-05"),
          new Date("2026-01-10"),
          new Date("2026-01-15"),
        ],
        scheduleTime: "08:00",
        requirementType: "PHOTO",
        minUploads: 3,
        divisionId: pendidikan.id,
      },
    }),
  ]);

  console.log(`✅ Created ${programs.length} programs`);

  // Create schedule instances and sessions for the past 30 days
  const today = startOfDay(new Date());
  const statuses: SessionStatus[] = [
    SessionStatus.COMPLETED,
    SessionStatus.COMPLETED,
    SessionStatus.COMPLETED,
    SessionStatus.COMPLETED_WITH_ISSUE,
    SessionStatus.NOT_EXECUTED,
  ];

  let scheduleCount = 0;
  let sessionCount = 0;

  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = subDays(today, daysAgo);
    const dayOfWeek = date.getDay();

    for (const program of programs) {
      // Check if program runs on this day
      if (!program.scheduleDays.includes(dayOfWeek)) continue;

      // Create schedule instance
      const schedule = await prisma.scheduleInstance.create({
        data: {
          date: date,
          programId: program.id,
        },
      });
      scheduleCount++;

      // For past days (not today), create sessions with random statuses
      if (daysAgo > 0) {
        // 85% chance of having a session
        if (Math.random() < 0.85) {
          const randomStatus =
            statuses[Math.floor(Math.random() * statuses.length)];
          const divisionUsers = usersByDivision[program.divisionId];
          const randomUser =
            divisionUsers[Math.floor(Math.random() * divisionUsers.length)];

          await prisma.session.create({
            data: {
              status: randomStatus,
              startedAt: date,
              submittedAt:
                randomStatus !== SessionStatus.NOT_EXECUTED ? date : null,
              issueNote:
                randomStatus === SessionStatus.COMPLETED_WITH_ISSUE
                  ? "Ada kendala teknis saat pelaksanaan"
                  : null,
              userId: randomUser,
              scheduleId: schedule.id,
              isAutoCreated: randomStatus === SessionStatus.NOT_EXECUTED,
            },
          });
          sessionCount++;
        } else {
          // Auto-fail for missed schedules
          const divisionUsers = usersByDivision[program.divisionId];
          await prisma.session.create({
            data: {
              status: SessionStatus.NOT_EXECUTED,
              startedAt: date,
              userId: divisionUsers[0],
              scheduleId: schedule.id,
              isAutoCreated: true,
            },
          });
          sessionCount++;
        }
      }
    }
  }

  console.log(`✅ Created ${scheduleCount} schedule instances`);
  console.log(`✅ Created ${sessionCount} sessions`);

  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Test accounts:");
  console.log("   Admin: admin / admin123");
  console.log("   Koordinator: koordinator_keamanan / koordinator123");
  console.log("   Anggota: anggota1_keamanan / anggota123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
