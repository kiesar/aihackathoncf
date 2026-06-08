import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="govuk-width-container"><main className="govuk-main-wrapper" id="main-content" role="main"><p>Loading...</p></main></div>}>
      <LoginForm />
    </Suspense>
  );
}
