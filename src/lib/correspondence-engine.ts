/**
 * Correspondence Engine
 *
 * Scans all cases and generates outbound letters based on the
 * correspondence configuration rules in data/correspondence-config.json.
 *
 * Rules define:
 *  - Which workflow state triggers the letter
 *  - How many days after entering that state
 *  - The letter template (subject + body with {{placeholders}})
 *  - Whether to repeat every N days
 */

import { v4 as uuidv4 } from "uuid";
import { readCases, writeCases, readCorrespondenceConfig } from "@/lib/data-store";
import type { Case, OutboundLetter, CorrespondenceRule } from "@/types";

// ── Template rendering ───────────────────────────────────────

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function buildVars(caseRecord: Case, daysOutstanding: number): Record<string, string> {
  return {
    applicant_name: caseRecord.applicant.name,
    case_id: caseRecord.case_id,
    days_outstanding: String(daysOutstanding),
    university: caseRecord.applicant.university,
    course: caseRecord.applicant.course,
    status: caseRecord.status,
  };
}

// ── Days elapsed since a date ────────────────────────────────

function daysElapsed(fromIso: string, now: Date): number {
  const from = new Date(fromIso);
  return Math.floor((now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Find the date the case entered its current status ────────

function statusEntryDate(caseRecord: Case): string | null {
  // Walk timeline in reverse to find the most recent state_transition or case_created
  const relevant = [...caseRecord.timeline]
    .reverse()
    .find((e) =>
      e.event === "state_transition" ||
      e.event === "case_created" ||
      e.event === "evidence_requested"
    );
  return relevant?.date ?? caseRecord.created_date ?? null;
}

// ── Check if a letter of this rule has already been sent ─────

function lastLetterForRule(
  caseRecord: Case,
  ruleId: string
): OutboundLetter | null {
  const letters = caseRecord.outbound_letters ?? [];
  const matching = letters
    .filter((l) => l.trigger_rule === ruleId)
    .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  return matching[0] ?? null;
}

// ── Generate a single letter ─────────────────────────────────

function generateLetter(
  caseRecord: Case,
  rule: CorrespondenceRule,
  daysOutstanding: number,
  now: Date
): OutboundLetter {
  const vars = buildVars(caseRecord, daysOutstanding);
  const subject = renderTemplate(rule.subject_template, vars);
  const body = renderTemplate(rule.body_template, vars);

  const sentVia = rule.send_via === "both"
    ? (caseRecord.applicant.notification_channel ?? "email")
    : rule.send_via;

  const sentTo = sentVia === "email"
    ? (caseRecord.applicant.email ?? "")
    : (caseRecord.applicant.phone ?? "");

  return {
    letter_id: uuidv4(),
    generated_at: now.toISOString(),
    type: rule.correspondence_type,
    subject,
    body,
    sent_via: sentVia as "email" | "sms",
    sent_to: sentTo,
    triggered_by: "automatic",
    trigger_rule: rule.rule_id,
  };
}

// ── Main: process all cases ──────────────────────────────────

export interface CorrespondenceResult {
  processed: number;
  lettersGenerated: number;
  details: Array<{ case_id: string; rule_id: string; letter_id: string }>;
}

export function processCorrespondence(now: Date = new Date()): CorrespondenceResult {
  const cases = readCases();
  const rules = readCorrespondenceConfig();
  const result: CorrespondenceResult = { processed: 0, lettersGenerated: 0, details: [] };

  const updatedCases = cases.map((caseRecord) => {
    result.processed++;
    const newLetters: OutboundLetter[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (rule.trigger_status !== caseRecord.status) continue;

      // Find when the case entered this status
      const entryDate = statusEntryDate(caseRecord);
      if (!entryDate) continue;

      const days = daysElapsed(entryDate, now);

      // Check if enough days have elapsed
      if (days < rule.trigger_after_days) continue;

      // Check if we've already sent this rule's letter
      const lastLetter = lastLetterForRule(caseRecord, rule.rule_id);

      if (lastLetter) {
        // If no repeat, skip
        if (!rule.repeat_every_days) continue;

        // Check if enough days have passed since last send
        const daysSinceLast = daysElapsed(lastLetter.generated_at, now);
        if (daysSinceLast < rule.repeat_every_days) continue;
      }

      // Generate the letter
      const letter = generateLetter(caseRecord, rule, days, now);
      newLetters.push(letter);
      result.lettersGenerated++;
      result.details.push({
        case_id: caseRecord.case_id,
        rule_id: rule.rule_id,
        letter_id: letter.letter_id,
      });

      console.log(
        `[Correspondence] Generated letter ${letter.letter_id} for case ${caseRecord.case_id} (rule: ${rule.rule_id})`
      );
    }

    if (newLetters.length === 0) return caseRecord;

    // Append new letters and add timeline entries
    const updatedTimeline = [
      ...caseRecord.timeline,
      ...newLetters.map((l) => ({
        date: l.generated_at,
        event: "notification_sent" as const,
        note: `Automated letter sent: ${l.subject}`,
      })),
    ];

    return {
      ...caseRecord,
      outbound_letters: [...(caseRecord.outbound_letters ?? []), ...newLetters],
      timeline: updatedTimeline,
      last_updated: now.toISOString(),
    };
  });

  if (result.lettersGenerated > 0) {
    writeCases(updatedCases);
  }

  return result;
}

// ── Process a single case (used when status changes) ─────────

export function processCorrespondenceForCase(
  caseId: string,
  now: Date = new Date()
): OutboundLetter[] {
  const cases = readCases();
  const rules = readCorrespondenceConfig();
  const caseIndex = cases.findIndex((c) => c.case_id === caseId);
  if (caseIndex === -1) return [];

  const caseRecord = cases[caseIndex];
  const newLetters: OutboundLetter[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.trigger_status !== caseRecord.status) continue;

    const entryDate = statusEntryDate(caseRecord);
    if (!entryDate) continue;

    const days = daysElapsed(entryDate, now);
    if (days < rule.trigger_after_days) continue;

    const lastLetter = lastLetterForRule(caseRecord, rule.rule_id);
    if (lastLetter && !rule.repeat_every_days) continue;
    if (lastLetter && rule.repeat_every_days) {
      const daysSinceLast = daysElapsed(lastLetter.generated_at, now);
      if (daysSinceLast < rule.repeat_every_days) continue;
    }

    const letter = generateLetter(caseRecord, rule, days, now);
    newLetters.push(letter);
  }

  if (newLetters.length > 0) {
    const updatedTimeline = [
      ...caseRecord.timeline,
      ...newLetters.map((l) => ({
        date: l.generated_at,
        event: "notification_sent" as const,
        note: `Automated letter sent: ${l.subject}`,
      })),
    ];

    cases[caseIndex] = {
      ...caseRecord,
      outbound_letters: [...(caseRecord.outbound_letters ?? []), ...newLetters],
      timeline: updatedTimeline,
      last_updated: now.toISOString(),
    };
    writeCases(cases);
  }

  return newLetters;
}
