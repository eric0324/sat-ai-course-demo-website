import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <>
      <h1>Sign in</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
