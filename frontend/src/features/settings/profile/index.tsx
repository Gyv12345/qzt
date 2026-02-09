import { ContentSection } from "../components/content-section";
import { ProfileForm } from "./profile-form";
import { TwoFactorSettings } from "@/features/two-factor/components/two-factor-settings";
import { Separator } from "@/components/ui/separator";

export function SettingsProfile() {
  return (
    <div className="space-y-6">
      <ContentSection title="个人资料" desc="管理您的个人信息">
        <ProfileForm />
      </ContentSection>

      <Separator />

      <ContentSection title="安全设置" desc="管理您的账户安全">
        <TwoFactorSettings />
      </ContentSection>
    </div>
  );
}
