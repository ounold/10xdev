import fs from "node:fs";

export interface LinkedStudentFixtureMeta {
  ownStudentId?: string;
  foreignStudentId?: string;
}

export const defaultLinkedStudentStorageStatePath = ".auth/linked-student-olgierd.json";
export const defaultLinkedStudentMetaPath = ".auth/linked-student-olgierd.meta.json";

export function readLinkedStudentFixtureMeta() {
  const metaPath = process.env.E2E_LINKED_STUDENT_META_PATH ?? defaultLinkedStudentMetaPath;
  if (!fs.existsSync(metaPath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(metaPath, "utf8")) as LinkedStudentFixtureMeta;
}
