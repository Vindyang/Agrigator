import { PageHeader, Panel } from "@/components/ui-kit"

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]
type Stage = "prep" | "plant" | "care" | "harvest"
const STAGE_COLOR: Record<Stage, string> = {
  prep: "bg-paper-2 border border-hairline",
  plant: "bg-paddy",
  care: "bg-dusk",
  harvest: "bg-turmeric",
}

type CropRow = {
  crop: string
  variety: string
  stages: [Stage, number, number][]
}

const CROPS: CropRow[] = [
  {
    crop: "Ciherang Paddy",
    variety: "Wet season",
    stages: [
      ["prep", 9, 1],
      ["plant", 10, 1],
      ["care", 11, 3],
      ["harvest", 2, 1],
    ],
  },
  {
    crop: "Shallot",
    variety: "Bima Brebes",
    stages: [
      ["prep", 3, 1],
      ["plant", 4, 1],
      ["care", 5, 2],
      ["harvest", 7, 1],
    ],
  },
  {
    crop: "Bird's-Eye Chili",
    variety: "Cakra Putih",
    stages: [
      ["prep", 1, 1],
      ["plant", 2, 1],
      ["care", 3, 4],
      ["harvest", 7, 3],
    ],
  },
  {
    crop: "Sweet Corn",
    variety: "Bonanza F1",
    stages: [
      ["prep", 5, 1],
      ["plant", 6, 1],
      ["care", 7, 2],
      ["harvest", 9, 1],
    ],
  },
  {
    crop: "Arabica Coffee",
    variety: "Andungsari",
    stages: [
      ["care", 0, 4],
      ["harvest", 4, 3],
      ["care", 7, 5],
    ],
  },
  {
    crop: "Cassava",
    variety: "Adira 4",
    stages: [
      ["plant", 8, 1],
      ["care", 9, 6],
      ["harvest", 3, 2],
    ],
  },
]

const UPCOMING = [
  {
    when: "This week",
    task: "Apply fungicide — Shallot, Turirejo plot",
    stage: "care",
  },
  {
    when: "In 5 days",
    task: "Begin paddy nursery — Sub-basin 04",
    stage: "prep",
  },
  {
    when: "In 2 weeks",
    task: "First chili harvest window opens",
    stage: "harvest",
  },
  { when: "In 3 weeks", task: "Corn planting window closes", stage: "plant" },
]

export default function CalendarPage() {
  const currentMonth = 6

  return (
    <>
      <PageHeader
        eyebrow="Farm Tools"
        title="Crop Calendar"
        subtitle="Demo calendar — connect your farm data to enable live crop tracking. Current month highlighted."
        right={
          <div className="flex gap-4">
            <Legend color="bg-paper-2 border border-hairline" label="Prep" />
            <Legend color="bg-paddy" label="Plant" />
            <Legend color="bg-dusk" label="Care" />
            <Legend color="bg-turmeric" label="Harvest" />
          </div>
        }
      />

      <div className="space-y-8 p-8">
        <Panel title="Growing Year — 2026">
          <div className="grid grid-cols-[220px_1fr] border-b border-hairline">
            <div className="border-r border-hairline p-3">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-2 uppercase">
                Crop
              </p>
            </div>
            <div className="grid grid-cols-12">
              {MONTHS.map((m, i) => (
                <div
                  key={m}
                  className={
                    "p-3 text-center text-[10px] font-semibold tracking-[0.15em] uppercase " +
                    (i < 11 ? "border-r border-hairline " : "") +
                    (i === currentMonth
                      ? "bg-paddy/[0.08] text-paddy"
                      : "text-ink-2")
                  }
                >
                  {m}
                </div>
              ))}
            </div>
          </div>

          {CROPS.map((row, idx) => (
            <div
              key={row.crop}
              className={
                "grid grid-cols-[220px_1fr] " +
                (idx < CROPS.length - 1 ? "border-b border-hairline" : "")
              }
            >
              <div className="border-r border-hairline p-4">
                <p className="font-display text-base leading-tight font-semibold">
                  {row.crop}
                </p>
                <p className="mt-0.5 text-[10px] tracking-wider text-ink-2 uppercase">
                  {row.variety}
                </p>
              </div>
              <div className="relative grid min-h-16 grid-cols-12 py-3">
                {MONTHS.map((_, i) => (
                  <div
                    key={i}
                    className={
                      "border-r border-hairline last:border-r-0 " +
                      (i === currentMonth ? "bg-paddy/[0.04]" : "")
                    }
                  />
                ))}
                {row.stages.map(([stage, start, len], i) => (
                  <div
                    key={i}
                    className={
                      "absolute top-1/2 h-5 -translate-y-1/2 " +
                      STAGE_COLOR[stage]
                    }
                    style={{
                      left: `${(start / 12) * 100}%`,
                      width: `${(len / 12) * 100}%`,
                    }}
                    title={stage}
                  />
                ))}
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Upcoming windows" meta="Next 30 days">
          <ul className="divide-y divide-hairline">
            {UPCOMING.map((u) => (
              <li key={u.task} className="flex items-center gap-6 px-4 py-4">
                <div className="w-32 shrink-0">
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-2 uppercase">
                    {u.when}
                  </p>
                </div>
                <div className={"h-8 w-2 " + STAGE_COLOR[u.stage as Stage]} />
                <p className="flex-1 text-sm">{u.task}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={"h-3 w-4 " + color} />
      <span className="text-[10px] font-semibold tracking-widest text-ink-2 uppercase">
        {label}
      </span>
    </div>
  )
}
