import FormField from '../FormField/FormField.jsx';

// Company admin ke fields. Company create form aur "Add admin" modal dono mein use hota hai.
// errorPrefix: API errors ka field prefix (company create mein "admin.").
export default function AdminForm({ values, errors, onChange, errorPrefix = '' }) {
  const errorFor = (field) => errors[`${errorPrefix}${field}`];

  return (
    <>
      <FormField
        label="Admin name"
        name="adminName"
        value={values.adminName}
        onChange={onChange}
        error={errorFor('name')}
        required
      />
      <FormField
        label="Admin email"
        name="adminEmail"
        type="email"
        autoComplete="off"
        value={values.adminEmail}
        onChange={onChange}
        error={errorFor('email')}
        hint="Admin isi email se login karega"
        required
      />
      <FormField
        label="Phone"
        name="adminPhone"
        type="tel"
        value={values.adminPhone}
        onChange={onChange}
        error={errorFor('phone')}
      />
      <FormField
        label="Password"
        name="adminPassword"
        type="password"
        autoComplete="new-password"
        value={values.adminPassword}
        onChange={onChange}
        error={errorFor('password')}
        hint="Kam se kam 8 characters"
        required
      />
    </>
  );
}

export const EMPTY_ADMIN = { adminName: '', adminEmail: '', adminPhone: '', adminPassword: '' };

export const toAdminPayload = (values) => ({
  name: values.adminName,
  email: values.adminEmail,
  phone: values.adminPhone,
  password: values.adminPassword,
});
