import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardLayoutHeader } from "@/components/dashboard/layout-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardLayoutHeader />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
