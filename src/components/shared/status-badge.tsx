import { Badge } from "@/components/ui/badge";
import {
  contentStatusLabels,
  helpRequestTypeLabels,
  productStatusLabels,
  reportStatusLabels,
} from "@/config/site";
import { cn } from "@/lib/utils";
import type { ContentStatus, HelpRequestStatus, ProductStatus, ReportStatus } from "@/types";

const contentStyles: Record<ContentStatus, string> = {
  pending: "bg-sand-light text-amber-900 border-sand",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-red-50 text-red-800 border-red-200",
  suspended: "bg-neutral-100 text-neutral-700 border-neutral-300",
};

export function ContentStatusBadge({ status, className }: { status: ContentStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", contentStyles[status], className)}>
      {contentStatusLabels[status]}
    </Badge>
  );
}

const productStyles: Record<ProductStatus, string> = {
  active: "bg-emerald-50 text-emerald-800 border-emerald-200",
  sold_out: "bg-sand-light text-amber-900 border-sand",
  suspended: "bg-red-50 text-red-800 border-red-200",
  archived: "bg-neutral-100 text-neutral-700 border-neutral-300",
};

export function ProductStatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", productStyles[status], className)}>
      {productStatusLabels[status]}
    </Badge>
  );
}

const reportStyles: Record<ReportStatus, string> = {
  open: "bg-red-50 text-red-800 border-red-200",
  reviewing: "bg-sand-light text-amber-900 border-sand",
  resolved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  dismissed: "bg-neutral-100 text-neutral-700 border-neutral-300",
};

export function ReportStatusBadge({ status, className }: { status: ReportStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", reportStyles[status], className)}>
      {reportStatusLabels[status]}
    </Badge>
  );
}

const helpStyles: Record<HelpRequestStatus, string> = {
  open: "bg-turquoise-light text-ocean border-turquoise/40",
  resolved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  closed: "bg-neutral-100 text-neutral-700 border-neutral-300",
};
const helpLabels: Record<HelpRequestStatus, string> = {
  open: "Aberto",
  resolved: "Resolvido",
  closed: "Fechado",
};

export function HelpStatusBadge({ status, className }: { status: HelpRequestStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", helpStyles[status], className)}>
      {helpLabels[status]}
    </Badge>
  );
}

export function HelpTypeBadge({ type }: { type: keyof typeof helpRequestTypeLabels }) {
  return (
    <Badge variant="secondary" className="font-medium">
      {helpRequestTypeLabels[type]}
    </Badge>
  );
}
