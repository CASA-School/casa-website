/**
 * A line of SchoolMan's history (`WorkFlow`) as `staff_activity.detail` keeps it (0055, 0094): its text and
 * SchoolMan's number, and what the line itself says beside the text — its kind (`history_processes.code`,
 * by `_ID_ProcessReference`), whether a colleague typed it rather than a script, the invoice it is about,
 * and an absence notice's day, lessons, minutes and whether it was excused. Shared by every importer that
 * writes a record's history, so a line reads the same on a booking, an organisation, an offer or a place.
 */

/** SchoolMan's process numbers → the workspace's codes. */
export async function historyProcesses(client) {
  const rows = (await client.query(`SELECT code, filemaker_id::text AS fm FROM history_processes WHERE filemaker_id IS NOT NULL`)).rows;
  return new Map(rows.map((r) => [r.fm, r.code]));
}

export function logDetail(line, processes) {
  const process = line.process != null ? processes.get(String(line.process)) : undefined;
  return {
    text: String(line.text ?? '').slice(0, 4000),
    ref: line.ref,
    ...(process ? { process } : {}),
    ...(line.typed ? { typed: true } : {}),
    ...(line.invoice ? { invoice: line.invoice } : {}),
    ...(line.absence ? { absence: line.absence } : {}),
  };
}
