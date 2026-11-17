import { CaseForm } from '@/components/cases/CaseForm';
import { listClientsForLawyer } from '@/server/cases';
import { requirePageUser } from '@/server/session';

export default async function CreateCasePage() {
  const user = await requirePageUser(['lawyer']);
  const clients = await listClientsForLawyer(user.id);

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Create New Case</h1>
      <CaseForm knownClients={clients.map((c) => ({ name: c.name, email: c.email }))} />
    </div>
  );
}
