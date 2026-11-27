// Blocs de contenu de la page produit (rendus côté serveur).
function yt(url: string) {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
}
export default function Blocks({ blocks }: { blocks: any[] }) {
  if (!Array.isArray(blocks) || !blocks.length) return null;
  return (
    <div className="blocks">
      {blocks.map((b, i) => {
        if (b.type === 'title') return <h2 key={i} className="b-title">{b.text}</h2>;
        if (b.type === 'text') return <div key={i} className="b-text">{String(b.text || '').split(/\n\s*\n/).map((p: string, k: number) => <p key={k}>{p}</p>)}</div>;
        if (b.type === 'image') return <figure key={i} className="b-media"><img src={b.url} alt={b.caption || ''} loading="lazy" />{b.caption && <figcaption>{b.caption}</figcaption>}</figure>;
        if (b.type === 'video') {
          const id = yt(b.url);
          return <figure key={i} className="b-media">{id
            ? <div className="b-yt"><iframe src={'https://www.youtube-nocookie.com/embed/' + id} title={b.caption || 'Vidéo'} loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen /></div>
            : <video src={b.url} autoPlay muted loop playsInline preload="metadata" />}{b.caption && <figcaption>{b.caption}</figcaption>}</figure>;
        }
        if (b.type === 'benefits') return <ul key={i} className="b-benefits">{(b.items || []).map((x: string, k: number) => <li key={k}>{x}</li>)}</ul>;
        if (b.type === 'faq') return <div key={i} className="b-faq"><h2 className="b-title">Questions fréquentes</h2>{(b.items || []).map((x: any, k: number) => <details key={k}><summary>{x.q}</summary><p>{x.a}</p></details>)}</div>;
        return null;
      })}
    </div>
  );
}
