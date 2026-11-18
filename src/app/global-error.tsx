"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F5F7F4", color: "#153E42", margin: 0 }}>
        <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>Ocorreu um erro inesperado</h1>
          <p>Tente recarregar a página.</p>
          <button
            onClick={reset}
            style={{ marginTop: 16, background: "#153E42", color: "#fff", border: 0, borderRadius: 12, padding: "12px 20px", fontSize: 16 }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
