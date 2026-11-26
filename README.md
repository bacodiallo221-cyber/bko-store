# BKO-STORE — boutique en ligne, paiement à la livraison

Site Next.js relié à Supabase. Pages :

- `/` boutique, `/produit/[id]` fiche produit + commande, `/suivi` suivi client
- `/mentions`, `/conditions`, `/confidentialite`
- `/admin` espace vendeur (commandes en temps réel avec son, produits, zones et gares, équipe, boutique)
- `/livreur` application livreur (prochaine étape)

## Mise en ligne (Vercel)

1. Mettez ce dossier sur GitHub (dépôt `bko-store`).
2. Sur vercel.com : **Add New → Project →** importez `bko-store`.
3. Dans **Environment Variables**, ajoutez :
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://felosvhunbxazyqlgcex.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = la clé `sb_publishable_…`
   - `NEXT_PUBLIC_SHOP_SLUG` = `bko-store`
4. **Deploy**. Notez l'adresse obtenue (ex. `https://bko-store.vercel.app`).

## Réglages Supabase après la mise en ligne

- **Authentication → URL Configuration** : *Site URL* = l'adresse Vercel ; *Redirect URLs* : ajoutez `https://VOTRE-ADRESSE/auth/callback`.
- **Authentication → Providers → Google** : activez-le avec l'identifiant et le secret créés dans Google Cloud (voir le guide dans la conversation).

## Développement local

```
cp .env.example .env.local
npm install
npm run dev
```
