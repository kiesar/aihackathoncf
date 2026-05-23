import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { readCorrespondenceConfig, writeCorrespondenceConfig } from "@/lib/data-store";
import type { CorrespondenceRule } from "@/types";

/**
 * GET  /api/dashboard/correspondence/config  — read all rules
 * PUT  /api/dashboard/correspondence/config  — update all rules
 */

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.username) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    const rules = readCorrespondenceConfig();
    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Config read error:", error);
    return NextResponse.json({ error: "Failed to read configuration" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.username || session.role !== "team_leader") {
      return NextResponse.json(
        { error: "Only team leaders can update correspondence configuration" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rules: CorrespondenceRule[] = body.rules;

    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: "rules must be an array" }, { status: 400 });
    }

    writeCorrespondenceConfig(rules);
    return NextResponse.json({ message: "Configuration updated", rules });
  } catch (error) {
    console.error("Config update error:", error);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}
