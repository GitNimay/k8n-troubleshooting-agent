import type { ProgressStep } from "@/types/investigation";

export function ProgressList({ steps }: Readonly<{ steps: ProgressStep[] }>) {
  return (
    <section className="mt-16">
      <h2 className="text-base font-bold leading-6">Investigation Status</h2>
      <div className="mt-4 border-t border-[rgba(15,0,0,0.12)]">
        {steps.map((item) => (
          <div
            key={item.step}
            className="flex items-center justify-between border-b border-[rgba(15,0,0,0.12)] py-2 text-base leading-6"
          >
            <span>
              {markerForStatus(item.status)} {item.label}
            </span>
            <span className="text-sm leading-7 text-[#646262]">{item.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function markerForStatus(status: ProgressStep["status"]) {
  if (status === "completed") {
    return "[x]";
  }
  if (status === "running") {
    return "[+]";
  }
  if (status === "failed") {
    return "[-]";
  }
  return "[ ]";
}

