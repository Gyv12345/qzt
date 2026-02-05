import { ContentSection } from '../components/content-section'
import { ProfileForm } from './profile-form'

export function SettingsProfile() {
  return (
    <ContentSection
      title='settings.profile.title'
      desc='settings.profile.description'
    >
      <ProfileForm />
    </ContentSection>
  )
}
