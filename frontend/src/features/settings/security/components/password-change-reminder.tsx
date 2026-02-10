import { useState, useEffect } from "react";
import { AlertCircle, X, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PasswordChangeReminder() {
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    // 检查是否有密码修改提醒标记
    const reminder = localStorage.getItem("auth_requiresPasswordChange");
    if (reminder === "true") {
      setShowReminder(true);
    }
  }, []);

  const handleSkip = () => {
    localStorage.removeItem("auth_requiresPasswordChange");
    setShowReminder(false);
  };

  if (!showReminder) {
    return null;
  }

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            双因素认证已设置完成
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300 mt-2">
            建议您现在修改密码以确保账户安全。您也可以稍后在安全设置中修改密码。
          </AlertDescription>
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                // 滚动到密码修改表单
                document
                  .getElementById("password-change-section")
                  ?.scrollIntoView({ behavior: "smooth" });
                // 清除提醒
                handleSkip();
              }}
            >
              <Key className="mr-2 h-4 w-4" />
              立即修改密码
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30"
              onClick={handleSkip}
            >
              稍后再说
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -m-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30"
          onClick={handleSkip}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
