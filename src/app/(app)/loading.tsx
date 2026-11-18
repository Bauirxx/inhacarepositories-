export default function Loading() {
  return (
    <div className="flex h-[calc(100dvh-8rem)] items-center justify-center text-sm text-muted-foreground md:h-[calc(100dvh-4rem)]" aria-busy="true">
      A carregar…
    </div>
  );
}
