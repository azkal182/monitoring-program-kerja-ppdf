import { Role } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";

async function main() {
  console.log("🌱 Seeding database...");

  // Create divisions
  const divisions = await Promise.all([
    prisma.division.upsert({
      where: { name: "Keamanan" },
      update: {},
      create: {
        name: "Keamanan",
        description: "Divisi keamanan dan ketertiban pondok",
      },
    }),
    prisma.division.upsert({
      where: { name: "Kebersihan" },
      update: {},
      create: {
        name: "Kebersihan",
        description: "Divisi kebersihan lingkungan pondok",
      },
    }),
    prisma.division.upsert({
      where: { name: "Pendidikan" },
      update: {},
      create: {
        name: "Pendidikan",
        description: "Divisi pendidikan dan pembelajaran",
      },
    }),
    prisma.division.upsert({
      where: { name: "Kesehatan" },
      update: {},
      create: {
        name: "Kesehatan",
        description: "Divisi kesehatan santri",
      },
    }),
  ]);

  console.log(`✅ Created ${divisions.length} divisions`);

  // Create admin user
  const hashedPassword = await hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      name: "Administrator",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log(`✅ Created admin user: ${admin.username}`);

  // Create koordinator users
  const koordinatorPassword = await hash("koordinator123", 12);

  for (const division of divisions) {
    await prisma.user.upsert({
      where: {
        username: `koordinator_${division.name.toLowerCase()}`,
      },
      update: {},
      create: {
        username: `koordinator_${division.name.toLowerCase()}`,
        name: `Koordinator ${division.name}`,
        password: koordinatorPassword,
        role: Role.KOORDINATOR,
        divisionId: division.id,
      },
    });
  }

  console.log(`✅ Created koordinator users`);

  // Create anggota users
  const anggotaPassword = await hash("anggota123", 12);

  for (const division of divisions) {
    for (let i = 1; i <= 2; i++) {
      await prisma.user.upsert({
        where: {
          username: `anggota${i}_${division.name.toLowerCase()}`,
        },
        update: {},
        create: {
          username: `anggota${i}_${division.name.toLowerCase()}`,
          name: `Anggota ${i} ${division.name}`,
          password: anggotaPassword,
          role: Role.ANGGOTA,
          divisionId: division.id,
        },
      });
    }
  }

  console.log(`✅ Created anggota users`);

  // Create sample programs
  const keamanan = divisions.find((d) => d.name === "Keamanan")!;
  const kebersihan = divisions.find((d) => d.name === "Kebersihan")!;

  await prisma.program.upsert({
    where: { id: "patroli-pagi" },
    update: {},
    create: {
      id: "patroli-pagi",
      name: "Patroli Pagi",
      description: "Patroli keliling asrama setiap pagi",
      scheduleType: "DAILY",
      scheduleDays: [1, 2, 3, 4, 5, 6, 0], // Setiap hari
      scheduleTime: "06:00",
      minPhotos: 2,
      divisionId: keamanan.id,
    },
  });

  await prisma.program.upsert({
    where: { id: "patroli-malam" },
    update: {},
    create: {
      id: "patroli-malam",
      name: "Patroli Malam",
      description: "Patroli keliling asrama setiap malam",
      scheduleType: "DAILY",
      scheduleDays: [1, 2, 3, 4, 5, 6, 0],
      scheduleTime: "21:00",
      minPhotos: 2,
      divisionId: keamanan.id,
    },
  });

  await prisma.program.upsert({
    where: { id: "piket-harian" },
    update: {},
    create: {
      id: "piket-harian",
      name: "Piket Harian",
      description: "Pembersihan area umum harian",
      scheduleType: "DAILY",
      scheduleDays: [1, 2, 3, 4, 5, 6],
      scheduleTime: "07:00",
      minPhotos: 3,
      divisionId: kebersihan.id,
    },
  });

  await prisma.program.upsert({
    where: { id: "kerja-bakti-mingguan" },
    update: {},
    create: {
      id: "kerja-bakti-mingguan",
      name: "Kerja Bakti Mingguan",
      description: "Kerja bakti bersama setiap hari Jumat",
      scheduleType: "WEEKLY",
      scheduleDays: [5], // Jumat
      scheduleTime: "08:00",
      minPhotos: 5,
      divisionId: kebersihan.id,
    },
  });

  console.log(`✅ Created sample programs`);

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
