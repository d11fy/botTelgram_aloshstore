import { cn } from "@/lib/utils";
import { STATUS_MAP, STATUS_EMOJI } from "@/lib/utils";
import { OrderStatus } from "@/lib/types";

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const info = STATUS_MAP[status];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
      info.bg, info.color
    )}>
      <span>{STATUS_EMOJI[status]}</span>
      {info.label}
    </span>
  );
}
