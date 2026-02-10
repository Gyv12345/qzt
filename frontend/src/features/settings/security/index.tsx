import { ContentSection } from "../components/content-section";
import { TwoFactorSettings } from "@/features/two-factor/components/two-factor-settings";
import { PasswordChangeForm } from "@/features/settings/password";
import { PasswordChangeReminder } from "./components/password-change-reminder";

export function SettingsSecurity() {
  return (
    <ContentSection title="安全设置" desc="管理您的账户安全设置">
      <div className="space-y-6">
        <PasswordChangeReminder />
        <div id="password-change-section">
          <PasswordChangeForm />
        </div>
        <TwoFactorSettings />
      </div>
    </ContentSection>
  );
}
