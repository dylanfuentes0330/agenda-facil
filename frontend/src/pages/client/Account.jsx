import { PageHeader } from '../../components/ui';
import { PasswordForm, PersonalInfoForm } from '../../components/AccountForms';

export default function Account() {
  return (
    <div className="container narrow section-sm stack">
      <PageHeader title="Mi cuenta" subtitle="Administra tu información personal y tu contraseña." />
      <PersonalInfoForm />
      <PasswordForm />
    </div>
  );
}
