import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { processCorrespondence } from "@/lib/correspondence-engine";

/**
 * POST /api/dashboard/correspondence/process
 *
 * Runs the correspondence engine across all cases.
 * Generates any overdue letters based on the configured rules.
 * Requires caseworker or team_leader authentication.
 *
 * In production this would be triggered by a scheduled job (cron).
 * For the prototype it can be triggered manually from the dashboard.
 */
export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.username) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const result = processCorrespondence(new Date());

    return NextResponse.json({
      message: `Processed ${result.processed} cases, generated ${result.lettersGenerated} letters`,
      ...result,
    });
  } catch (error) {
    console.error("Correspondence processing error:", error);
    return NextResponse.json(
      { error: "Sorry, there is a problem processing correspondence." },
      { status: 500 }
    );
  }
}
