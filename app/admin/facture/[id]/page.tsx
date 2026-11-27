import InvoiceDoc from '@/components/admin/InvoiceDoc';
export const metadata = { title: 'Facture' };
export default function Page({ params }: { params: { id: string } }) {
  return <InvoiceDoc id={params.id} />;
}
