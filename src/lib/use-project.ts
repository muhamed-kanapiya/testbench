"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadDraft, saveDraft } from "./draft";
import { newProject, type Project } from "./studio-model";

export function useProject() {
  const [project, setProject] = useState<Project>(newProject);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"loading" | "saving" | "saved" | "error">("loading");
  const [storageError, setStorageError] = useState("");
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const current = useRef(project), history = useRef<Project[]>([]);
  const lastGroup = useRef({ key: "", at: 0 });
  const pending = useRef(false);
  const restored = useRef(false), writable = useRef(true);
  useEffect(() => {
    let active = true;
    loadDraft().then(draft => { if (active && draft) { current.current = draft; setProject(draft); } })
      .catch(() => { if (active) { writable.current = false; setAutosaveEnabled(false); setSaveStatus("error"); setStorageError("Could not restore this browser’s draft. Export your work to keep a copy; the old draft has not been overwritten."); } })
      .finally(() => { if (active) { restored.current = true; setReady(true); } });
    return () => { active = false; if (restored.current && writable.current && pending.current) void saveDraft(current.current).catch(() => {}); };
  }, []);
  const update = useCallback((change: (p: Project) => Project, group = "") => {
    const previous = current.current, next = change(previous);
    if (next === previous) return;
    const now = Date.now();
    if (!group || group !== lastGroup.current.key || now - lastGroup.current.at > 1200) history.current = [...history.current.slice(-24), previous];
    lastGroup.current = { key: group, at: now };
    current.current = next; pending.current = true; setSaveStatus("saving"); setProject(next); setCanUndo(history.current.length > 0);
  }, []);
  const undo = useCallback(() => {
    const previous = history.current.pop(); if (!previous) return;
    current.current = previous; pending.current = true; setSaveStatus("saving"); setProject(previous); setCanUndo(history.current.length > 0); lastGroup.current = { key: "", at: 0 };
  }, []);
  useEffect(() => {
    if (!ready || !autosaveEnabled) return;
    pending.current = true; setSaveStatus("saving");
    const timer = setTimeout(() => {
      saveDraft(project).then(() => { if (current.current === project) { pending.current = false; setSaveStatus("saved"); setStorageError(""); } })
        .catch(() => { if (current.current === project) { setSaveStatus("error"); setStorageError("Autosave is unavailable or storage is full. Export your experiment before leaving."); } });
    }, 350);
    return () => clearTimeout(timer);
  }, [project, ready, autosaveEnabled]);
  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => { if (pending.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", onLeave); return () => window.removeEventListener("beforeunload", onLeave);
  }, []);
  return { project, ready, update, undo, canUndo, saveStatus, storageError };
}
