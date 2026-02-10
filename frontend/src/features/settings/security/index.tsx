import { ContentSection } from "../components/content-section";
import { TwoFactorSettings } from "@/features/two-factor/components/two-factor-settings";

export function SettingsSecurity() {
  return (
    <ContentSection title="安全设置" desc="管理您的账户安全设置">
      <TwoFactorSettings />
    </ContentSection>
  );
}
