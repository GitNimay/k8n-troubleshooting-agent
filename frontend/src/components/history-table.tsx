import type { InvestigationHistory } from "@/types/investigation";

export function HistoryTable({
  history,
  error,
}: Readonly<{
  history: InvestigationHistory[];
  error?: string;
}>) {
  return (
    <section className="mt-16">
      <h2 className="text-base font-bold leading-6">Recent Investigations</h2>
      {error ? <p className="mt-4 text-sm leading-6 text-[#ff3b30]">[-] {error}</p> : null}
      <div className="mt-4 overflow-x-auto border-t border-[rgba(15,0,0,0.12)]">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm leading-7">
          <thead>
            <tr className="border-b border-[rgba(15,0,0,0.12)] text-[#646262]">
              <th className="py-2 pr-4 font-normal">Time</th>
              <th className="py-2 pr-4 font-normal">Root Cause</th>
              <th className="py-2 pr-4 font-normal">Namespace</th>
              <th className="py-2 pr-4 font-normal">Confidence</th>
              <th className="py-2 pr-4 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length ? (
              history.map((item) => (
                <tr key={item.id ?? `${item.root_cause}-${item.created_at}`} className="border-b border-[rgba(15,0,0,0.12)]">
                  <td className="py-2 pr-4 text-[#646262]">{formatDate(item.created_at)}</td>
                  <td className="py-2 pr-4">{item.root_cause}</td>
                  <td className="py-2 pr-4">{item.namespace}</td>
                  <td className="py-2 pr-4">{item.confidence}%</td>
                  <td className="py-2 pr-4">{item.status}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-[rgba(15,0,0,0.12)]">
                <td className="py-3 text-[#646262]" colSpan={5}>
                  [ ] No previous investigations.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

