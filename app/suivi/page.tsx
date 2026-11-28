import { getStore } from '@/lib/supabase';
import { Header, Footer, NotReady } from '@/components/Shell';
import TrackBox from '@/components/Track';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Suivre ma commande' };

export default async function Suivi() {
  const store = await getStore(); if (!store) return <NotReady />;
  return <main className="wrap"><Header shop={store.shop} categories={store.categories} active="suivi" /><TrackBox /><Footer shop={store.shop} /></main>;
}
