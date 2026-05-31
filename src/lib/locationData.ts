// src/lib/locationData.ts

export const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Spain', 'Italy',
  'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Ireland', 'Portugal', 'Greece', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'South Africa',
  'Nigeria', 'Ghana', 'Kenya', 'Egypt', 'Morocco', 'India', 'China', 'Japan', 'South Korea',
  'Singapore', 'Malaysia', 'Indonesia', 'Philippines', 'Vietnam', 'Thailand', 'Brazil', 'Argentina',
  'Mexico', 'Colombia', 'Chile', 'Peru', 'UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Israel', 'Turkey'
];

export const NATIONALITIES = [
  'American', 'British', 'Canadian', 'Australian', 'German', 'French', 'Spanish', 'Italian',
  'Dutch', 'Belgian', 'Swiss', 'Austrian', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
  'Irish', 'Portuguese', 'Greek', 'Polish', 'Czech', 'Hungarian', 'Romanian', 'South African',
  'Nigerian', 'Ghanaian', 'Kenyan', 'Egyptian', 'Moroccan', 'Indian', 'Chinese', 'Japanese',
  'South Korean', 'Singaporean', 'Malaysian', 'Indonesian', 'Filipino', 'Vietnamese', 'Thai',
  'Brazilian', 'Argentinian', 'Mexican', 'Colombian', 'Chilean', 'Peruvian', 'Emirian', 'Saudi',
  'Qatari', 'Kuwaiti', 'Israeli', 'Turkish'
];

export const TWO_SIDED_IDS = ['drivers_license', 'national_id', 'voter_id'];

export const ID_TYPES = [
  { value: 'passport', label: 'Passport', hasFrontBack: false },
  { value: 'drivers_license', label: 'Driver\'s License', hasFrontBack: true },
  { value: 'national_id', label: 'National ID Card', hasFrontBack: true },
  { value: 'residence_permit', label: 'Residence Permit', hasFrontBack: false },
  { value: 'voter_id', label: 'Voter ID', hasFrontBack: true },
  { value: 'other', label: 'Other Government ID', hasFrontBack: false }
];