import type { ProgressStep } from "@/types/investigation";

export function ProgressList({ steps }: Readonly<{ steps: ProgressStep[] }>) {
  return (
    <section className="mt-16">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold leading-6">Investigation Status</h2>
        <span className="text-sm leading-7 text-[#646262]">
          {steps.filter((item) => item.status === "completed").length}/{steps.length}
        </span>
      </div>
      <div className="hairline-panel mt-4">
        {steps.map((item, index) => (
          <div
            key={item.step}
            style={{ animationDelay: `${index * 45}ms` }}
            className="row-enter flex items-center justify-between border-b border-[rgba(15,0,0,0.12)] py-2 text-base leading-6"
          >
            <span>
              <span className={item.status === "running" ? "pulse-marker inline-block" : ""}>
                {markerForStatus(item.status)}
              </span>{" "}
              {item.label}
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
