import { NextRequest, NextResponse } from "next/server";
import { readCases } from "@/lib/data-store";

/**
 * GET /api/cases/:ref/letters/:letterId
 *
 * Public endpoint — allows a student to retrieve a specific outbound letter
 * using their case reference and the letter ID (from the email link).
 * No authentication required (the letter ID acts as a token).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string; letterId: string }> }
) {
  try {
    const { ref, letterId } = await params;
    const cases = readCases();
    const caseRecord = cases.find((c) => c.case_id === ref);

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const letter = (caseRecord.outbound_letters ?? []).find(
      (l) => l.letter_id === letterId
    );

    if (!letter) {
      return NextResponse.json({ error: "Letter not found" }, { status: 404 });
    }

    // Mark as read if not already
    if (!letter.read_at) {
      letter.read_at = new Date().toISOString();
      const updatedCases = cases.map((c) =>
        c.case_id === ref
          ? {
              ...c,
              outbound_letters: (c.outbound_letters ?? []).map((l) =>
                l.letter_id === letterId ? { ...l, read_at: letter.read_at } : l
              ),
            }
          : c
      );
      const { writeCases } = await import("@/lib/data-store");
      writeCases(updatedCases);
    }

    return NextResponse.json({ letter, caseRecord });
  } catch (error) {
    console.error("Letter fetch error:", error);
    return NextResponse.json({ error: "Failed to retrieve letter" }, { status: 500 });
  }
}
