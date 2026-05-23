"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CorrespondenceRule, WorkflowStateName } from "@/types";

const STATUS_DISPLAY: Record<WorkflowStateName, string> = {
  awaiting_evidence: "Awaiting evidence",
  evidence_requested: "Evidence requested",
  evidence_received: "Evidence received",
  under_review: "Under review",
  awaiting_assessment: "Awaiting assessment",
  approved: "Approved",
  rejected: "Rejected",
  escalated: "Escalated",
  closed: "Closed",
};

export default function CorrespondenceConfigPage() {
  const router = useRouter();
  const [rules, setRules] = useState<CorrespondenceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [editingRule, setEditingRule] = useState<CorrespondenceRule | null>(null);
  const [processResult, setProcessResult] = useState<string>("");

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/dashboard/correspondence/config");
        if (res.status === 401) { router.push("/dashboard/login"); return; }
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setRules(data.rules);
      } catch {
        setError("Failed to load correspondence configuration.");
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [router]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/dashboard/correspondence/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save configuration.");
        return;
      }
      setSuccessMsg("Configuration saved successfully.");
      setEditingRule(null);
    } catch {
      setError("Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  }

  async function handleProcessNow() {
    setProcessing(true);
    setProcessResult("");
    setError("");
    try {
      const res = await fetch("/api/dashboard/correspondence/process", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Processing failed.");
        return;
      }
      setProcessResult(data.message);
    } catch {
      setError("Failed to run correspondence processing.");
    } finally {
      setProcessing(false);
    }
  }

  function updateRule(ruleId: string, field: keyof CorrespondenceRule, value: unknown) {
    setRules((prev) =>
      prev.map((r) => (r.rule_id === ruleId ? { ...r, [field]: value } : r))
    );
  }

  if (loading) {
    return (
      <div className="govuk-width-container">
        <main className="govuk-main-wrapper" id="main-content" role="main">
          <p className="govuk-body">Loading configuration…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="govuk-width-container">
      <main className="govuk-main-wrapper" id="main-content" role="main">
        <a href="/dashboard" className="govuk-back-link">Back to dashboard</a>

        <h1 className="govuk-heading-l">Correspondence configuration</h1>
        <p className="govuk-body">
          Configure automated letters sent to applicants based on case status and time thresholds.
          Changes take effect immediately for the next processing run.
        </p>

        {error && (
          <div className="govuk-error-summary" role="alert" aria-labelledby="error-title" tabIndex={-1}>
            <h2 className="govuk-error-summary__title" id="error-title">There is a problem</h2>
            <div className="govuk-error-summary__body"><p>{error}</p></div>
          </div>
        )}

        {successMsg && (
          <div className="govuk-notification-banner govuk-notification-banner--success" role="alert" aria-labelledby="success-title">
            <div className="govuk-notification-banner__header">
              <h2 className="govuk-notification-banner__title" id="success-title">Success</h2>
            </div>
            <div className="govuk-notification-banner__content">
              <p className="govuk-body">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Process now panel */}
        <div className="govuk-inset-text" style={{ marginBottom: "30px" }}>
          <h2 className="govuk-heading-s">Run correspondence processing</h2>
          <p className="govuk-body govuk-hint">
            Manually trigger the correspondence engine to check all cases and generate any overdue letters.
            In production this runs automatically on a schedule.
          </p>
          <button
            type="button"
            className="govuk-button govuk-button--secondary"
            disabled={processing}
            onClick={handleProcessNow}
          >
            {processing ? "Processing…" : "Run now"}
          </button>
          {processResult && (
            <p className="govuk-body" style={{ marginTop: "10px", color: "#00703c" }}>
              ✓ {processResult}
            </p>
          )}
        </div>

        {/* Rules table */}
        <h2 className="govuk-heading-m">Correspondence rules</h2>
        <table className="govuk-table">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header">Rule</th>
              <th scope="col" className="govuk-table__header">Trigger status</th>
              <th scope="col" className="govuk-table__header">After (days)</th>
              <th scope="col" className="govuk-table__header">Repeat (days)</th>
              <th scope="col" className="govuk-table__header">Send via</th>
              <th scope="col" className="govuk-table__header">Enabled</th>
              <th scope="col" className="govuk-table__header">Action</th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {rules.map((rule) => (
              <tr key={rule.rule_id} className="govuk-table__row">
                <td className="govuk-table__cell">
                  <strong>{rule.name}</strong>
                  <div className="govuk-hint" style={{ fontSize: "12px", marginTop: "2px" }}>
                    {rule.rule_id}
                  </div>
                </td>
                <td className="govuk-table__cell">
                  {STATUS_DISPLAY[rule.trigger_status] ?? rule.trigger_status}
                </td>
                <td className="govuk-table__cell">
                  {editingRule?.rule_id === rule.rule_id ? (
                    <input
                      className="govuk-input govuk-input--width-4"
                      type="number"
                      min="0"
                      aria-label={`Trigger after days for ${rule.name}`}
                      value={rule.trigger_after_days}
                      onChange={(e) => updateRule(rule.rule_id, "trigger_after_days", parseInt(e.target.value, 10))}
                    />
                  ) : (
                    rule.trigger_after_days
                  )}
                </td>
                <td className="govuk-table__cell">
                  {editingRule?.rule_id === rule.rule_id ? (
                    <input
                      className="govuk-input govuk-input--width-4"
                      type="number"
                      min="0"
                      aria-label={`Repeat every days for ${rule.name}`}
                      placeholder="—"
                      value={rule.repeat_every_days ?? ""}
                      onChange={(e) => updateRule(rule.rule_id, "repeat_every_days", e.target.value ? parseInt(e.target.value, 10) : null)}
                    />
                  ) : (
                    rule.repeat_every_days ?? "—"
                  )}
                </td>
                <td className="govuk-table__cell">
                  {editingRule?.rule_id === rule.rule_id ? (
                    <select
                      className="govuk-select"
                      aria-label={`Send via for ${rule.name}`}
                      value={rule.send_via}
                      onChange={(e) => updateRule(rule.rule_id, "send_via", e.target.value)}
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="both">Both</option>
                    </select>
                  ) : (
                    rule.send_via
                  )}
                </td>
                <td className="govuk-table__cell">
                  <input
                    type="checkbox"
                    className="govuk-checkboxes__input"
                    checked={rule.enabled}
                    onChange={(e) => updateRule(rule.rule_id, "enabled", e.target.checked)}
                    aria-label={`Enable ${rule.name}`}
                  />
                </td>
                <td className="govuk-table__cell">
                  {editingRule?.rule_id === rule.rule_id ? (
                    <button
                      type="button"
                      className="govuk-button govuk-button--secondary"
                      style={{ marginBottom: 0 }}
                      onClick={() => setEditingRule(null)}
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="govuk-button govuk-button--secondary"
                      style={{ marginBottom: 0 }}
                      onClick={() => setEditingRule(rule)}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Template editor — shown when editing */}
        {editingRule && (
          <div style={{ border: "2px solid #1d70b8", padding: "20px", marginBottom: "20px" }}>
            <h3 className="govuk-heading-s">Edit letter template: {editingRule.name}</h3>
            <p className="govuk-hint">
              Available placeholders: <code>{"{{applicant_name}}"}</code>, <code>{"{{case_id}}"}</code>,{" "}
              <code>{"{{days_outstanding}}"}</code>, <code>{"{{university}}"}</code>, <code>{"{{course}}"}</code>
            </p>

            <div className="govuk-form-group">
              <label className="govuk-label" htmlFor={`subject-${editingRule.rule_id}`}>
                Subject line
              </label>
              <input
                className="govuk-input"
                id={`subject-${editingRule.rule_id}`}
                type="text"
                value={editingRule.subject_template}
                onChange={(e) => updateRule(editingRule.rule_id, "subject_template", e.target.value)}
              />
            </div>

            <div className="govuk-form-group">
              <label className="govuk-label" htmlFor={`body-${editingRule.rule_id}`}>
                Letter body
              </label>
              <textarea
                className="govuk-textarea"
                id={`body-${editingRule.rule_id}`}
                rows={12}
                value={editingRule.body_template}
                onChange={(e) => updateRule(editingRule.rule_id, "body_template", e.target.value)}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          className="govuk-button"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save configuration"}
        </button>
      </main>
    </div>
  );
}
