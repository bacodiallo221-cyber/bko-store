'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { catIcon } from '@/lib/categories';

// « Catalogue ▾ » du menu : ouvre un aperçu des catégories qui ont des produits.
export default function CatMenu({ categories, active }: { categories: any[]; active: boolean }) {
  const [open, setOpen] = useState(false); const [top, setTop] = useState(0); const r = useRef<HTMLDivElement>(null); const d = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { const t = e.target as Node; if (!r.current?.contains(t) && !d.current?.contains(t)) setOpen(false); };
    const off = () => setOpen(false); window.addEventListener('scroll', off, { passive: true });
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', esc);
    return () => { window.removeEventListener('scroll', off); document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  if (!categories.length) return <Link href="/catalogue" className={active ? 'on' : ''}>Catalogue</Link>;
  return (
    <div className="z-cm" ref={r}>
      <button type="button" className={active || open ? 'on' : ''} aria-expanded={open} onClick={(e) => { setTop((e.currentTarget as HTMLElement).getBoundingClientRect().bottom); setOpen(!open); }}>Catalogue<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
      {open && createPortal(<div className="z-dd" role="menu" ref={d} style={{ top }}>
        {categories.slice(0, 8).map((c) => <Link key={c.id} href={'/collection/' + c.slug} role="menuitem" onClick={() => setOpen(false)}><i>{catIcon(c.name)}</i>{c.name}</Link>)}
        <Link href="/catalogue" className="all" role="menuitem" onClick={() => setOpen(false)}>Tout le catalogue →</Link>
      </div>, document.body)}
    </div>
  );
}
