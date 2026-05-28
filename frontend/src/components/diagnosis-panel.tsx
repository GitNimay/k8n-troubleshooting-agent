import type { Diagnosis } from "@/types/investigation";

export function DiagnosisPanel({ diagnosis }: Readonly<{ diagnosis: Diagnosis | null }>) {
  if (!diagnosis) {
    return (
      <section className="mt-16">
        <h2 className="text-base font-bold leading-6">Diagnosis</h2>
        <div className="mt-4 border-t border-[rgba(15,0,0,0.12)] py-4 text-[#646262]">
          [ ] No diagnosis yet.
        </div>
      </section>
    );
  }

  return (
    <section className="mt-16">
      <h2 className="text-base font-bold leading-6">Diagnosis</h2>
      <div className="mt-4 border-t border-[rgba(15,0,0,0.12)]">
        <Row label="Root Cause" value={diagnosis.root_cause} />
        <Row label="Explanation" value={diagnosis.explanation} />
        <Row label="Suggested Fix" value={diagnosis.fix} />
        <div className="border-b border-[rgba(15,0,0,0.12)] py-3">
          <p className="font-bold">kubectl Command</p>
          {diagnosis.kubectl_commands.length ? (
            diagnosis.kubectl_commands.map((command) => (
              <code
                key={command}
                className="mt-2 block rounded bg-[#f1eeee] px-3 py-2 text-sm leading-6 text-[#201d1d]"
              >
                {command}
              </code>
            ))
          ) : (
            <p className="mt-1 text-[#646262]">No command returned.</p>
          )}
        </div>
        <Row label="Prevention" value={diagnosis.prevention} />
        <Row label="Confidence" value={`${diagnosis.confidence}%`} />
      </div>
    </section>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="border-b border-[rgba(15,0,0,0.12)] py-3">
      <p className="font-bold">{label}</p>
      <p className="mt-1 leading-6 text-[#424245]">{value}</p>
    </div>
  );
}

