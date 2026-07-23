"use client"

import { useState, useEffect } from "react"

import { PageHeader } from "@/components/ui-kit"
import {
  fetchNotes,
  createNote,
  deleteNote,
  type FarmNoteApi,
  type NoteCreateBody,
} from "@/lib/api"

type NoteTag = "Observation" | "Action" | "Reminder" | "Meeting"

const TAG_COLOR: Record<NoteTag, string> = {
  Observation: "text-dusk border-dusk/40 bg-dusk/[0.06]",
  Action: "text-paddy border-paddy/40 bg-paddy/[0.06]",
  Reminder: "text-clay border-clay/40 bg-clay/[0.06]",
  Meeting: "text-turmeric border-turmeric/40 bg-turmeric/[0.06]",
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function NotesPage() {
  const [notes, setNotes] = useState<FarmNoteApi[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchNotes()
        if (cancelled) return
        setNotes(data)
        setSelectedId((prev) => {
          if (prev && data.find((n) => n.id === prev)) return prev
          return data[0]?.id ?? null
        })
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load notes")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [retryKey])

  const selected = notes.find((n) => n.id === selectedId) ?? null

  async function addQuick() {
    if (!draft.trim() || submitting) return
    setSubmitting(true)
    try {
      const body: NoteCreateBody = {
        plot: "Unassigned",
        crop: "—",
        tag: "Observation",
        title: draft.trim().slice(0, 60),
        body: draft.trim(),
      }
      const created = await createNote(body)
      setNotes((prev) => [created, ...prev])
      setSelectedId(created.id)
      setDraft("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create note")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm("Delete this note?")) return
    try {
      await deleteNote(id)
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id)
        if (selectedId === id) {
          setSelectedId(next[0]?.id ?? null)
        }
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete note")
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Farm Tools"
        title="Farm Notes"
        subtitle="Personal logbook of field observations, actions, and reminders."
      />

      {error && (
        <div className="mx-4 mb-4 flex items-center gap-3 rounded border border-clay/40 bg-clay/[0.06] px-4 py-3 text-sm text-clay">
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="text-[10px] font-semibold tracking-wider uppercase underline underline-offset-2 hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid min-h-[calc(100dvh-8rem)] grid-cols-[380px_1fr]">
        <div className="flex flex-col border-r border-hairline">
          <div className="space-y-2 border-b border-hairline p-4">
            <label className="block text-[10px] font-semibold tracking-[0.2em] text-ink-2 uppercase">
              Quick note
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="What did you observe today?"
              className="w-full resize-none border border-hairline bg-paper p-3 text-sm focus:border-paddy focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                onClick={addQuick}
                className="bg-paddy px-3 py-1.5 text-[10px] font-semibold tracking-wider text-paper uppercase hover:brightness-110 disabled:opacity-40"
                disabled={!draft.trim() || submitting}
              >
                {submitting ? "Saving…" : "Add note"}
              </button>
            </div>
          </div>

          <ul className="flex-1 divide-y divide-hairline overflow-y-auto">
            {loading && (
              <li className="p-8 text-center">
                <p className="animate-pulse text-sm text-ink-2">
                  Loading notes…
                </p>
              </li>
            )}

            {!loading && notes.length === 0 && (
              <li className="p-8 text-center">
                <p className="text-sm text-ink-2">
                  No notes yet. Use the quick-note form to add your first
                  observation.
                </p>
              </li>
            )}

            {notes.map((n) => {
              const active = n.id === selectedId
              const tag = n.tag as NoteTag
              return (
                <li key={n.id} className="group relative">
                  <button
                    onClick={() => setSelectedId(n.id)}
                    className={
                      "w-full p-4 text-left " +
                      (active
                        ? "border-l-2 border-l-paddy bg-paper-2"
                        : "border-l-2 border-l-transparent hover:bg-paper-2")
                    }
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={
                          "inline-block border px-1.5 py-0.5 text-[9px] font-semibold tracking-widest uppercase " +
                          (TAG_COLOR[tag] ?? "")
                        }
                      >
                        {n.tag}
                      </span>
                      <span className="tabular ml-auto text-[10px] tracking-wider text-ink-2 uppercase">
                        {formatDate(n.created_at)}
                      </span>
                    </div>
                    <p className="truncate pr-6 text-sm leading-snug font-semibold">
                      {n.title}
                    </p>
                    <p className="mt-1 text-[11px] tracking-wider text-ink-2 uppercase">
                      {n.plot} · {n.crop}
                    </p>
                  </button>

                  <button
                    onClick={(e) => handleDelete(n.id, e)}
                    className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded text-[10px] text-ink-2 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-clay/[0.08] hover:text-clay focus:opacity-100"
                    title="Delete note"
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {selected ? (
          <article className="max-w-3xl p-8">
            <div className="mb-4 flex items-center gap-3">
              <span
                className={
                  "inline-block border px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase " +
                  (TAG_COLOR[selected.tag as NoteTag] ?? "")
                }
              >
                {selected.tag}
              </span>
              <span className="tabular text-[10px] tracking-widest text-ink-2 uppercase">
                {formatDate(selected.created_at)} · {selected.plot} ·{" "}
                {selected.crop}
              </span>
            </div>

            <h2 className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance">
              {selected.title}
            </h2>

            <p className="mt-6 text-base leading-relaxed whitespace-pre-line">
              {selected.body}
            </p>
          </article>
        ) : (
          <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-sm text-ink-2">
              {loading
                ? "Loading…"
                : notes.length === 0
                  ? "Create your first note to get started."
                  : "Select a note from the sidebar."}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
