'use client';
import { useEffect } from 'react';

export function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'sheet' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sh-head"><h2>{title}</h2><button className="x" onClick={onClose} aria-label="Fermer">×</button></div>
        {children}
      </div>
    </div>
  );
}

export function copy(text: string, toast: (m: string) => void, label = 'Copié') {
  try { navigator.clipboard.writeText(text).then(() => toast(label), () => toast('Copie impossible.')); } catch { toast('Copie impossible.'); }
}

export const when = (t: string) => {
  const d = new Date(t), hm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const sod = (x: Date) => { const c = new Date(x); c.setHours(0, 0, 0, 0); return c.getTime(); };
  const diff = Math.round((sod(new Date()) - sod(d)) / 86400000);
  return diff <= 0 ? 'Auj. ' + hm : diff === 1 ? 'Hier ' + hm : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

// Envoi d'un fichier dans le dossier de la boutique (photos, GIF, vidéos courtes).
export async function uploadFile(sb: any, shopId: string, file: File, folder = 'media') {
  const path = shopId + '/' + folder + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '_').slice(-40);
  const { error } = await sb.storage.from('produits').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return sb.storage.from('produits').getPublicUrl(path).data.publicUrl as string;
}
