import { cn } from "@/lib/utils";

type PageContentProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
};

export function PageContent({
  title,
  description,
  actions,
  children,
  className,
  headerClassName,
  bodyClassName,
}: PageContentProps) {
  return (
    <section className={cn("space-y-6", className)}>
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        className={headerClassName}
      />
      <div className={cn("space-y-6", bodyClassName)}>{children}</div>
    </section>
  );
}

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="w-full sm:w-auto">{actions}</div> : null}
    </header>
  );
}
