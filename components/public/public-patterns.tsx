import Link from "next/link";
import styles from "./public-patterns.module.css";

export function SectionIntro({ eyebrow, title, description, id }: { eyebrow: string; title: string; description: string; id?: string }) {
  return <div className={styles.intro}><p>{eyebrow}</p><h2 id={id}>{title}</h2><span>{description}</span></div>;
}

export type StatusTone = "success" | "warning" | "muted" | "private";

export function StatusBadge({ children, tone = "muted" }: { children: React.ReactNode; tone?: StatusTone }) {
  return <span className={styles.badge} data-tone={tone}>{children}</span>;
}

export function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className={styles.action} href={href}>{children}<span aria-hidden="true">→</span></Link>;
}

export function InstitutionalNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return <aside className={styles.notice}><strong>{title}</strong><span>{children}</span></aside>;
}
