import React, { useState } from "react";
import { KeyRound, Lock } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";

interface Props {
  serverError?: string | null;
}

const MIN_PASSWORD_LENGTH = 8;

export default function UpdatePasswordForm({ serverError }: Props) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmation?: string }>({});

  function validate() {
    const next: typeof errors = {};

    if (!password) {
      next.password = "New password is required";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (!confirmation) {
      next.confirmation = "Please confirm the new password";
    } else if (confirmation !== password) {
      next.confirmation = "Passwords do not match";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function clearError(field: keyof typeof errors) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    if (!validate()) {
      event.preventDefault();
    }
  }

  return (
    <form method="POST" action="/api/auth/update-password" className="space-y-4" onSubmit={handleSubmit} noValidate>
      <FormField
        id="password"
        label="New password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(value) => {
          setPassword(value);
          clearError("password");
          clearError("confirmation");
        }}
        placeholder="Choose a new password"
        error={errors.password}
        hint={<p className="mt-1 text-xs text-blue-100/50">Use at least 8 characters.</p>}
        icon={<Lock className="size-4" />}
        endContent={
          <PasswordToggle
            visible={showPassword}
            onToggle={() => {
              setShowPassword(!showPassword);
            }}
          />
        }
      />

      <FormField
        id="confirmation"
        label="Confirm password"
        type={showConfirmation ? "text" : "password"}
        value={confirmation}
        onChange={(value) => {
          setConfirmation(value);
          clearError("confirmation");
        }}
        placeholder="Repeat the new password"
        error={errors.confirmation}
        icon={<KeyRound className="size-4" />}
        endContent={
          <PasswordToggle
            visible={showConfirmation}
            onToggle={() => {
              setShowConfirmation(!showConfirmation);
            }}
          />
        }
      />

      <ServerError message={serverError} />

      <SubmitButton pendingText="Updating password..." icon={<KeyRound className="size-4" />}>
        Save new password
      </SubmitButton>
    </form>
  );
}
