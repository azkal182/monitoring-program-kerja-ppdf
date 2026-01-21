/**
 * Reset Script - Clear Test Data
 *
 * Menghapus data testing (1 minggu) sambil mempertahankan:
 * - Users
 * - Divisions
 * - Programs
 *
 * Data yang DIHAPUS:
 * - ScheduleInstance (jadwal yang di-generate)
 * - Session (laporan/sesi)
 * - Photo (foto laporan)
 * - Document (dokumen laporan)
 */

import prisma from "@/lib/prisma";

async function resetTestData() {
  console.log("🔄 Starting data reset...\n");

  try {
    // 1. Delete Photos (cascade akan handle relasi)
    console.log("📸 Deleting photos...");
    const photosDeleted = await prisma.photo.deleteMany({});
    console.log(`   ✅ Deleted ${photosDeleted.count} photos\n`);

    // 2. Delete Documents
    console.log("📄 Deleting documents...");
    const documentsDeleted = await prisma.document.deleteMany({});
    console.log(`   ✅ Deleted ${documentsDeleted.count} documents\n`);

    // 3. Delete Sessions (ini akan auto-delete photos & documents jika cascade)
    console.log("📋 Deleting sessions...");
    const sessionsDeleted = await prisma.session.deleteMany({});
    console.log(`   ✅ Deleted ${sessionsDeleted.count} sessions\n`);

    // 4. Delete Schedule Instances
    console.log("📅 Deleting schedule instances...");
    const schedulesDeleted = await prisma.scheduleInstance.deleteMany({});
    console.log(`   ✅ Deleted ${schedulesDeleted.count} schedule instances\n`);

    // Summary
    console.log("=".repeat(50));
    console.log("✅ Data reset completed successfully!\n");
    console.log("📊 Summary:");
    console.log(`   - Photos deleted:        ${photosDeleted.count}`);
    console.log(`   - Documents deleted:     ${documentsDeleted.count}`);
    console.log(`   - Sessions deleted:      ${sessionsDeleted.count}`);
    console.log(`   - Schedules deleted:     ${schedulesDeleted.count}`);
    console.log("\n✅ Preserved:");

    // Count preserved data
    const [userCount, divisionCount, programCount] = await Promise.all([
      prisma.user.count(),
      prisma.division.count(),
      prisma.program.count(),
    ]);

    console.log(`   - Users:     ${userCount}`);
    console.log(`   - Divisions: ${divisionCount}`);
    console.log(`   - Programs:  ${programCount}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Error during reset:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetTestData()
  .then(() => {
    console.log("\n✅ Reset script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Reset script failed:", error);
    process.exit(1);
  });
