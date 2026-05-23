"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import LetterTemplate from "@/components/LetterTemplate";
import type { OutboundLetter, Case } from "@/types";

export default function CaseworkerLetterViewPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const letterId = params.letterId as string;

  const [letter, setLetter] = useState<OutboundLetter | null>(null);
  const [caseRecord, setCaseRecord] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/dashboard/cases/${caseId}`);
        if (res.status === 401) { router.push("/dashboard/login"); return; }
        if (!res.ok) { setError("Case not found."); return; }
        const data = await res.json();
        const found = (data.caseRecord.outbound_letters ?? []).find(
          (l: OutboundLetter) => l.letter_id === letterId
        );
        if (!found) { setError("Letter not found."); return; }
        setLetter(found);
        setCaseRecord(data.caseRecord);
      } catch {
        setError("Sorry, there is a problem loading this letter.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [caseId, letterId, router]);

  if (loading) {
    return (
      <div className="govuk-width-container">
        <main className="govuk-main-wrapper" id="main-content" role="main">
          <p className="govuk-body">Loading letter…</p>
        </main>
      </div>
    );
  }

  if (error || !letter || !caseRecord) {
    return (
      <div className="govuk-width-container">
        <main className="govuk-main-wrapper" id="main-content" role="main">
          <div className="govuk-error-summary" role="alert" aria-labelledby="error-title" tabIndex={-1}>
            <h2 className="govuk-error-summary__title" id="error-title">There is a problem</h2>
            <div className="govuk-error-summary__body"><p>{error || "Letter not found."}</p></div>
          </div>
          <a href={`/dashboard/cases/${caseId}`} className="govuk-back-link">Back to case</a>
        </main>
      </div>
    );
  }

  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content" role="main">
        <a href={`/dashboard/cases/${caseId}`} className="govuk-back-link">Back to case</a>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 className="govuk-heading-l" style={{ marginBottom: 0 }}>Outbound letter</h1>
          <button
            type="button"
            className="govuk-button govuk-button--secondary"
            style={{ marginBottom: 0 }}
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>

        <dl className="govuk-summary-list" style={{ marginBottom: "24px" }}>
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Sent to</dt>
            <dd className="govuk-summary-list__value">{letter.sent_to || "—"} (via {letter.sent_via})</dd>
          </div>
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Triggered by</dt>
            <dd className="govuk-summary-list__value">
              {letter.triggered_by === "automatic" ? "Automated rule" : "Manual"}{" "}
              {letter.trigger_rule && <span className="govuk-hint">({letter.trigger_rule})</span>}
            </dd>
          </div>
          <div className="govuk-summary-list__row">
            <dt className="govuk-summary-list__key">Read by applicant</dt>
            <dd className="govuk-summary-list__value">
              {letter.read_at
                ? new Date(letter.read_at).toLocaleString("en-GB")
                : <strong className="govuk-tag govuk-tag--yellow">Not yet read</strong>}
            </dd>
          </div>
        </dl>

        <LetterTemplate letter={letter} caseRecord={caseRecord} />
      </main>
    </div>
  );
}
