import { useTranslations } from 'next-intl';

const ALL_FIELDS = [
  'candidate_name',
  'candidate_email',
  'candidate_phone',
  'candidate_age',
  'experience',
  'desired_salary',
  'gender',
  'date_of_birth',
  'nationality',
  'marital_status',
  'photo',
  'country',
  'city',
  'education_level',
  'university_name',
  'major',
  'degree_file',
  'languages',
  'available_start_date',
];

interface BasicInfoFieldsProps {
  selectedFields: string[];
  onChange: (selected: string[]) => void;
}

export default function BasicInfoFields({ selectedFields = [], onChange }: BasicInfoFieldsProps) {
  const t = useTranslations('Jobs.create');

  const handleCheckboxChange = (field: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedFields, field]);
    } else {
      onChange(selectedFields.filter((f) => f !== field));
    }
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-2">{t('basicInfo')}</h3>
      <p className="text-sm text-muted-foreground mb-4">{t('basicInfoDesc')}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ALL_FIELDS.map((field) => (
          <div key={field} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`field-${field}`}
              checked={selectedFields?.includes(field) || false}
              onChange={(e) => handleCheckboxChange(field, e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
            />
            <label htmlFor={`field-${field}`} className="text-sm font-medium text-gray-700">
              {t(`fields.${field}`)}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
