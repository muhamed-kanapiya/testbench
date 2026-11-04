import { migrateProject, type Project } from "./studio-model";

let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("testbench-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); database = undefined; }; resolve(db); };
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => { database = undefined; reject(new Error("Draft storage is blocked by another tab.")); };
  });
  return database;
}
export async function loadDraft(): Promise<Project | null> {
  const db = await openDatabase();
  const value = await new Promise<unknown>((resolve, reject) => {
    const req = db.transaction("drafts", "readonly").objectStore("drafts").get("current");
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
  if (value === undefined) return null;
  const project = migrateProject(value);
  if (!project) throw new Error("The saved draft is incompatible. Export your current work before leaving.");
  return project;
}
let queue = Promise.resolve();
export function saveDraft(project: Project) {
  const operation = queue.catch(() => {}).then(async () => {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite");
      tx.objectStore("drafts").put(project, "current");
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  });
  queue = operation;
  return operation;
}
