import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface TotpVerifyInputProps {
  onComplete: (code: string) => void;
  isLoading?: boolean;
  error?: string;
}

export function TotpVerifyInput({
  onComplete,
  isLoading,
  error,
}: TotpVerifyInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleComplete = (code: string) => {
    if (code.length === 6 && !isLoading) {
      onComplete(code);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <InputOTP
          maxLength={6}
          value={value}
          onChange={(newValue) => {
            setValue(newValue);
            if (newValue.length === 6) {
              handleComplete(newValue);
            }
          }}
          disabled={isLoading}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground text-center">
        请输入身份验证器应用中的 6 位验证码
      </p>
    </div>
  );
}
