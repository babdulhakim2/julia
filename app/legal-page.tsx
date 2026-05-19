import Link from "next/link";
import type { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  updatedAt: string;
  intro: string;
  children: ReactNode;
}

export function LegalPage({ title, updatedAt, intro, children }: LegalPageProps) {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        background: "#fff",
        color: "var(--ink)",
        fontFamily: "var(--font)",
      }}
    >
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "40px 20px 64px",
        }}
      >
        <nav
          aria-label="Legal pages"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 42,
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          <Link
            href="/"
            style={{ color: "var(--ink)", fontWeight: 800, textDecoration: "none" }}
          >
            Julia
          </Link>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link href="/privacy" style={navLinkStyle}>
              Privacy
            </Link>
            <Link href="/terms" style={navLinkStyle}>
              Terms
            </Link>
          </div>
        </nav>

        <header style={{ marginBottom: 30 }}>
          <p
            style={{
              margin: "0 0 10px",
              color: "var(--muted)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Last updated: {updatedAt}
          </p>
          <h1
            style={{
              margin: 0,
              color: "var(--ink)",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(34px, 7vw, 56px)",
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: "18px 0 0",
              color: "var(--ink2)",
              fontSize: 17,
              lineHeight: 1.55,
              maxWidth: 680,
            }}
          >
            {intro}
          </p>
        </header>

        <div style={{ display: "grid", gap: 24 }}>{children}</div>
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2
        style={{
          margin: "0 0 8px",
          color: "var(--ink)",
          fontSize: 20,
          lineHeight: 1.25,
          letterSpacing: 0,
        }}
      >
        {title}
      </h2>
      <div style={{ color: "var(--ink2)", fontSize: 15, lineHeight: 1.65 }}>
        {children}
      </div>
    </section>
  );
}

const navLinkStyle = {
  color: "var(--muted)",
  fontWeight: 700,
  textDecoration: "none",
} as const;
