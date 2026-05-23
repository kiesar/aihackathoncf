"use client";

/**
 * SLC-style letter template component.
 *
 * Replicates the Student Loans Company / Student Finance England
 * correspondence layout:
 *  - Dark navy header with SLC wordmark and GOV.UK crown
 *  - Reference block (case ref, date, contact details)
 *  - Clean body with SLC typography
 *  - Footer with SLC contact information
 */

import type { OutboundLetter, Case } from "@/types";

interface LetterTemplateProps {
  letter: OutboundLetter;
  caseRecord: Case;
  printMode?: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function LetterTemplate({ letter, caseRecord, printMode = false }: LetterTemplateProps) {
  const applicant = caseRecord.applicant;
  const addressLines = [
    applicant.name,
    applicant.address.line1,
    applicant.address.line2,
    applicant.address.line3,
    applicant.address.postcode,
  ].filter(Boolean);

  return (
    <div
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "14px",
        lineHeight: "1.6",
        color: "#0b0c0c",
        maxWidth: "700px",
        margin: "0 auto",
        background: "#ffffff",
        border: printMode ? "none" : "1px solid #b1b4b6",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "#003078",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* SLC wordmark */}
        <div style={{ color: "#ffffff" }}>
          <div style={{ fontSize: "20px", fontWeight: "bold", letterSpacing: "1px" }}>
            Student Finance England
          </div>
          <div style={{ fontSize: "11px", color: "#b1c4e8", marginTop: "2px" }}>
            Disabled Students&apos; Allowance Service
          </div>
        </div>

        {/* GOV.UK crown mark */}
        <div style={{ textAlign: "right", color: "#ffffff" }}>
          <div style={{ fontSize: "13px", fontWeight: "bold" }}>GOV.UK</div>
          <div style={{ fontSize: "10px", color: "#b1c4e8" }}>Student Loans Company Ltd</div>
        </div>
      </div>

      {/* ── Reference bar ── */}
      <div
        style={{
          background: "#f3f2f1",
          borderBottom: "3px solid #003078",
          padding: "10px 24px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "12px",
          color: "#505a5f",
        }}
      >
        <div>
          <strong>Case reference:</strong> {caseRecord.case_id}
        </div>
        <div>
          <strong>Date:</strong> {formatDate(letter.generated_at)}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "28px 24px" }}>

        {/* Recipient address block */}
        <div style={{ marginBottom: "24px" }}>
          {addressLines.map((line, i) => (
            <div key={i} style={{ lineHeight: "1.5" }}>{line}</div>
          ))}
        </div>

        {/* Date */}
        <div style={{ marginBottom: "20px", color: "#505a5f" }}>
          {formatDate(letter.generated_at)}
        </div>

        {/* Subject line */}
        <div
          style={{
            fontWeight: "bold",
            fontSize: "15px",
            marginBottom: "20px",
            borderLeft: "4px solid #003078",
            paddingLeft: "12px",
          }}
        >
          {letter.subject}
        </div>

        {/* Letter body — preserve line breaks */}
        <div style={{ marginBottom: "24px" }}>
          {letter.body.split("\n").map((line, i) => (
            <p key={i} style={{ margin: "0 0 10px 0" }}>
              {line || <>&nbsp;</>}
            </p>
          ))}
        </div>

        {/* Action box — shown for reminder letters */}
        {(letter.type === "reminder_evidence" || letter.type === "reminder_assessment") && (
          <div
            style={{
              background: "#fff7e6",
              border: "2px solid #f47738",
              borderRadius: "4px",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#f47738" }}>
              ⚠ Action required
            </div>
            <div style={{ fontSize: "13px" }}>
              To upload your evidence, visit:{" "}
              <strong>
                {typeof window !== "undefined" ? window.location.origin : "https://dsa.service.gov.uk"}
                /apply/status
              </strong>
              {" "}and enter your case reference <strong>{caseRecord.case_id}</strong>.
            </div>
          </div>
        )}

        {/* Separator */}
        <hr style={{ border: "none", borderTop: "1px solid #b1b4b6", margin: "24px 0" }} />

        {/* Contact details */}
        <div style={{ fontSize: "12px", color: "#505a5f" }}>
          <div style={{ fontWeight: "bold", marginBottom: "6px" }}>Contact us</div>
          <div>Telephone: 0300 100 0607 (Monday to Friday, 8am to 8pm; Saturday, 9am to 4pm)</div>
          <div>Website: <strong>www.gov.uk/student-finance</strong></div>
          <div>Email: <strong>SFE_correspondence@slc.co.uk</strong></div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          background: "#003078",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "11px",
          color: "#b1c4e8",
        }}
      >
        <div>Student Loans Company Ltd · Registered in Scotland No. SC 119752</div>
        <div>100 Bothwell Street, Glasgow G2 7JD</div>
      </div>
    </div>
  );
}
