"use client"

import { useState } from "react"

import { PageHeader } from "@/components/ui-kit"

type Note = {
  id: string
  plot: string
  crop: string
  date: string
  tag: "Observation" | "Action" | "Reminder" | "Meeting"
  title: string
  body: string
}

const INITIAL_NOTES: Note[] = [
  { id: "n1", plot: "Turirejo 04", crop: "Shallot", date: "22 Jul 2026", tag: "Action", title: "Applied Prochloraz 2ml/L on plot edge", body: "Sprayed the south-east edge where wilt confirmed. Drainage cleared. Recheck in 3 days; monitor humidity before repeat." },
  { id: "n2", plot: "Sub-basin 04", crop: "Paddy", date: "21 Jul 2026", tag: "Observation", title: "Planthopper counts up in Sub-basin 04", body: "Sticky trap count rose from 22 to 46 week-over-week. Below economic threshold but flagged to network." },
  { id: "n3", plot: "Sidodadi hillside", crop: "Chili", date: "21 Jul 2026", tag: "Reminder", title: "Order copper fungicide for next week", body: "Coordinate with cooperative buyer — combine order across 4 farmers to hit bulk discount." },
  { id: "n4", plot: "Mulyoasri", crop: "Corn", date: "20 Jul 2026", tag: "Meeting", title: "Extension visit — planted trial rows", body: "Planted 3 rows Bonanza F1 for yield trial vs. existing variety. Marked with blue tape. Review at V6." },
]

const TAG_COLOR: Record<Note["tag"], string> = {
  Observation: "text-dusk border-dusk/40 bg-dusk/[0.06]",
  Action: "text-paddy border-paddy/40 bg-paddy/[0.06]",
  Reminder: "text-clay border-clay/40 bg-clay/[0.06]",
  Meeting: "text-turmeric border-turmeric/40 bg-turmeric/[0.06]",
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES)
  const [selectedId, setSelectedId] = useState(INITIAL_NOTES[0].id)
  const selected = notes.find((n) => n.id === selectedId) ?? notes[0]
  const [draft, setDraft] = useState("")

  function addQuick() {
    if (!draft.trim()) return
    const n: Note = {
      id: crypto.randomUUID(),
      plot: "Unassigned",
      crop: "—",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      tag: "Observation",
      title: draft.trim().slice(0, 60),
      body: draft.trim(),
    }
    setNotes([n, ...notes])
    setSelectedId(n.id)
    setDraft("")
  }

  return (
    <>
      <PageHeader
        eyebrow="Farm Tools"
        title="Farm Notes"
        subtitle="Personal logbook of field observations, actions, and reminders."
      />

      <div className="grid grid-cols-[380px_1fr] min-h-[calc(100dvh-8rem)]">
        <div className="border-r border-hairline flex flex-col">
          <div className="p-4 border-b border-hairline space-y-2">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-2">
              Quick note
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="What did you observe today?"
              className="w-full border border-hairline bg-paper p-3 text-sm resize-none focus:outline-none focus:border-paddy"
            />
            <div className="flex justify-end">
              <button
                onClick={addQuick}
                className="px-3 py-1.5 bg-paddy text-paper text-[10px] font-semibold uppercase tracking-wider hover:brightness-110 disabled:opacity-40"
                disabled={!draft.trim()}
              >
                Add note
              </button>
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto divide-y divide-hairline">
            {notes.map((n) => {
              const active = n.id === selectedId
              return (
                <li key={n.id}>
                  <button
                    onClick={() => setSelectedId(n.id)}
                    className={
                      "w-full text-left p-4 " +
                      (active ? "bg-paper-2 border-l-2 border-l-paddy" : "border-l-2 border-l-transparent hover:bg-paper-2")
                    }
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={"inline-block px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest border " + TAG_COLOR[n.tag]}>
                        {n.tag}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-ink-2 tabular ml-auto">{n.date}</span>
                    </div>
                    <p className="text-sm font-semibold leading-snug truncate">{n.title}</p>
                    <p className="text-[11px] text-ink-2 mt-1 uppercase tracking-wider">
                      {n.plot} · {n.crop}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <article className="p-8 max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <span className={"inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest border " + TAG_COLOR[selected.tag]}>
              {selected.tag}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-ink-2 tabular">
              {selected.date} · {selected.plot} · {selected.crop}
            </span>
          </div>

          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance">
            {selected.title}
          </h2>

          <p className="mt-6 text-base leading-relaxed whitespace-pre-line">{selected.body}</p>
        </article>
      </div>
    </>
  )
}
