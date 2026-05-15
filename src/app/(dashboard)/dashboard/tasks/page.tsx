import React from "react";
import { ClipboardList } from "lucide-react";
import { PageContent } from "@/components/dashboard/page-content";
import { Card, CardContent } from "@/components/ui/card";

const TasksPage = () => {
  return (
    <PageContent
      title="Tugas"
      description="Ringkasan tugas operasional akan ditampilkan di sini."
    >
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Halaman tugas sedang disiapkan.
          </p>
        </CardContent>
      </Card>
    </PageContent>
  );
};

export default TasksPage;
