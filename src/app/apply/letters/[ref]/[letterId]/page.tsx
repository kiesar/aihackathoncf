"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import LetterTemplate from "@/components/LetterTemplate";
import type { OutboundLetter, Case } from "@/types";

export default function LetterViewPage() {
  const params = useParams();
  const ref = params.ref as string;
  const letterId = params.letterId as string;

  const [letter, setLetter] = useState<OutboundLetter | null>(null);
  const [caseRecord, setCaseRecord] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchLetter() {
      try {
        const res = await fetch(`/api/cases/${encodeURIComponent(ref)}/letters/${encodeURIComponent(letterId)}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Letter not found.");
          return;
        }
        const data = await res.json();
        setLetter(data.letter);
        setCaseRecord(data.caseRecord);
      } catch {
        setError("Sorry, there is a problem loading this letter.");
      } finally {
        setLoading(false);
      }
    }
    fetchLetter();
  }, [ref, letterId]);

  function handlePrint() {
    window.print();
  }

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
            <div className="govuk-error-summary__body">
              <p>{error || "Letter not found."}</p>
            </div>
          </div>
          <a href="/apply/status" className="govuk-back-link">Back to status</a>
        </main>
      </div>
    );
  }

  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content" role="main">
        <a href="/apply/status" className="govuk-back-link">Back to application status</a>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 className="govuk-heading-l" style={{ marginBottom: 0 }}>Your letter</h1>
          <button
            type="button"
            className="govuk-button govuk-button--secondary"
            style={{ marginBottom: 0 }}
            onClick={handlePrint}
          >
            Print letter
          </button>
        </div>

        <div ref={printRef} id="letter-content">
          <LetterTemplate letter={letter} caseRecord={caseRecord} />
        </div>

        <div style={{ marginTop: "24px" }}>
          <p className="govuk-body">
            If you need to take action, please{" "}
            <a href={`/apply/status`} className="govuk-link">
              check your application status
            </a>{" "}
            and follow the instructions.
          </p>
        </div>
      </main>
    </div>
  );
}
