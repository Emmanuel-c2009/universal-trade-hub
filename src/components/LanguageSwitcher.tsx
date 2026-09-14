import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language?.split('-')[0] ?? 'en'}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="bg-transparent border border-gray-300 rounded px-2 py-1 text-sm"
      aria-label="Select language"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
