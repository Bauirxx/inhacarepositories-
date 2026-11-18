"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RelativeTime } from "@/components/shared/relative-time";
import { StarRating } from "@/components/shared/star-rating";
import { ReportDialog } from "@/components/shared/report-dialog";
import { deleteReview, saveReview } from "@/features/businesses/actions";
import { cn } from "@/lib/utils";
import type { Review } from "@/types";

export function ReviewsSection({
  businessId,
  slug,
  reviews,
  myReview,
  viewer,
  isOwner,
  ratingAvg,
  ratingCount,
}: {
  businessId: string;
  slug: string;
  reviews: Review[];
  myReview: Review | null;
  viewer: { id: string; isStaff: boolean } | null;
  isOwner: boolean;
  ratingAvg: number;
  ratingCount: number;
}) {
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(myReview?.comment ?? "");
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const res = await saveReview({ business_id: businessId, rating, comment });
      if (res.ok) toast.success(myReview ? "Avaliação atualizada." : "Obrigado pela sua avaliação!");
      else toast.error(res.error);
    });

  return (
    <section id="avaliacoes" className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ocean">Avaliações</h2>
        <StarRating value={ratingAvg} count={ratingCount} size="md" />
      </div>

      {viewer && !isOwner ? (
        <div className="mt-5 rounded-xl bg-muted/60 p-4">
          <p className="text-sm font-medium">{myReview ? "A sua avaliação" : "Avaliar este estabelecimento"}</p>
          <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Classificação">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={rating === i}
                aria-label={`${i} estrela(s)`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(i)}
                className="flex size-11 items-center justify-center"
              >
                <Star className={cn("size-7", (hover || rating) >= i ? "fill-sand text-sand" : "text-border")} />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Partilhe a sua experiência (opcional)"
            maxLength={1000}
            rows={3}
            className="mt-2 bg-card"
          />
          <Button className="mt-3" onClick={submit} disabled={pending || rating === 0}>
            {pending ? "A guardar…" : myReview ? "Atualizar avaliação" : "Publicar avaliação"}
          </Button>
        </div>
      ) : !viewer ? (
        <p className="mt-4 rounded-xl bg-muted p-3 text-sm">
          <Link href={`/entrar?next=/servicos/${slug}`} className="font-semibold text-turquoise">
            Inicie sessão
          </Link>{" "}
          para avaliar.
        </p>
      ) : null}

      {reviews.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">Ainda não há avaliações.</p>
      ) : (
        <ul className="mt-5 divide-y">
          {reviews.map((r) => (
            <li key={r.id} className="flex gap-3 py-4">
              <UserAvatar name={r.author?.full_name} src={r.author?.avatar_url} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <Link href={`/perfil/${r.author?.username ?? ""}`} className="font-semibold text-ocean hover:underline">
                    {r.author?.full_name}
                  </Link>
                  <StarRating value={r.rating} />
                  <span className="text-xs text-muted-foreground">
                    <RelativeTime value={r.created_at} />
                  </span>
                </div>
                {r.comment ? <p className="mt-1 text-sm whitespace-pre-line">{r.comment}</p> : null}
                <div className="mt-1 flex gap-2">
                  {viewer && (viewer.id === r.author_id || viewer.isStaff) ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground"
                      onClick={() =>
                        confirm("Eliminar esta avaliação?") &&
                        startTransition(async () => {
                          const res = await deleteReview(r.id);
                          if (res.ok) toast.success("Avaliação eliminada.");
                          else toast.error(res.error);
                        })
                      }
                    >
                      <Trash2 /> Eliminar
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {viewer && !isOwner ? (
        <div className="mt-2 border-t pt-3">
          <ReportDialog targetType="business" targetId={businessId} />
        </div>
      ) : null}
    </section>
  );
}
