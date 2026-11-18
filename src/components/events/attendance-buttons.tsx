"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setAttendance } from "@/features/events/actions";
import type { AttendeeStatus } from "@/types";

export function AttendanceButtons({
  eventId,
  initial,
  isLoggedIn,
  slug,
}: {
  eventId: string;
  initial: AttendeeStatus | null;
  isLoggedIn: boolean;
  slug: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<AttendeeStatus | null>(initial);
  const [pending, startTransition] = useTransition();

  const choose = (value: AttendeeStatus) => {
    if (!isLoggedIn) {
      router.push(`/entrar?next=/agenda/${slug}`);
      return;
    }
    const next = status === value ? null : value;
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      const res = await setAttendance({ event_id: eventId, status: next });
      if (!res.ok) {
        setStatus(prev);
        toast.error(res.error);
      } else router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant={status === "going" ? "turquoise" : "outline"} onClick={() => choose("going")} disabled={pending} aria-pressed={status === "going"}>
        <Check /> Vou
      </Button>
      <Button variant={status === "interested" ? "sand" : "outline"} onClick={() => choose("interested")} disabled={pending} aria-pressed={status === "interested"}>
        <Star /> Interessado
      </Button>
    </div>
  );
}
