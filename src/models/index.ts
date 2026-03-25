// ─── Pet Model ────────────────────────────────────────────────────────────────
export type PetType = 'All' | 'Dogs' | 'Cats' | 'Birds' | 'Small Animals' | 'Reptiles' | 'Others';
export type PetStatus = 'Available' | 'Pending' | 'Adopted';
export type PetGender = 'Male' | 'Female';

export interface Pet {
  id: string;
  name: string;
  type: Exclude<PetType, 'All'>;
  breed: string;
  gender: PetGender;
  age: string;
  weight: string;
  colorAppearance: string;
  description: string;
  distinctiveFeatures?: string;
  imageUrl: string;
  status: PetStatus;
  shelterName: string;
  shelterEmail: string;
  shelterPhone: string;
  location: string;
  createdAt: string;
}

// ─── User Model ───────────────────────────────────────────────────────────────
export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  avatarUrl?: string;
  joinedAt: string;
}

// ─── Application Model ────────────────────────────────────────────────────────
export type ApplicationStatus = 'Pending' | 'Approved' | 'Rejected';

export interface AdoptionApplication {
  id: string;
  petId: string;
  petName: string;
  petImageUrl: string;
  petType: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  homeAddress: string;
  previousPetExperience: string;
  whyAdopt: string;
  whyChooseYou: string;
  adminRemark?: string;
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
}

// ─── Lost Pet Model ───────────────────────────────────────────────────────────
export type LostPetStatus = 'Missing' | 'Found';

export interface LostPet {
  id: string;
  petName: string;
  type: string;
  breed: string;
  gender: string;
  age: string;
  weight: string;
  colorAppearance: string;
  description: string;
  distinctiveFeatures: string;
  imageUrl?: string;
  lastSeenLocation: string;
  lastSeenDate: string;
  rewardOffered?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPhone2?: string;
  status: LostPetStatus;
  reportedAt: string;
}

export interface Sighting {
  id: string;
  lostPetId: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  locationSeen: string;
  dateSeen: string;
  description: string;
  imageUrl?: string;
  reportedAt: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
export const MOCK_PETS: Pet[] = [
  {
    id: '1', name: 'Daisy', type: 'Birds', breed: 'Sun Conure', gender: 'Female',
    age: 'Young (2 months old)', weight: '120 grams', colorAppearance: 'Bright orange, yellow, and green feathers',
    description: "Daisy is a playful young Sun Conure who loves attention and exploring. She's looking for a caring home to grow into a cheerful companion.",
    imageUrl: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&q=80',
    status: 'Available', shelterName: 'AnimalBase Shelter House',
    shelterEmail: 'pets.absh@animalbase.com', shelterPhone: '+63 9956789101',
    location: 'Birmingham, UK', createdAt: '2024-01-15',
  },
  {
    id: '2', name: 'Bailey', type: 'Small Animals', breed: 'African Pygmy Hedgehog', gender: 'Male',
    age: 'Young (3 months old)', weight: '300 grams', colorAppearance: 'Brown and white quills',
    description: 'Bailey is a curious and gentle hedgehog who loves to explore. He is litter trained and enjoys being handled.',
    imageUrl: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400&q=80',
    status: 'Available', shelterName: 'AnimalBase Shelter House',
    shelterEmail: 'pets.absh@animalbase.com', shelterPhone: '+63 9956789101',
    location: 'Birmingham, UK', createdAt: '2024-01-10',
  },
  {
    id: '3', name: 'Bluey', type: 'Dogs', breed: 'Border Collie', gender: 'Male',
    age: 'Adult (2 years old)', weight: '18 kg', colorAppearance: 'Black and white',
    description: 'Bluey is an energetic and intelligent Border Collie who loves to run and play. He needs an active family.',
    imageUrl: 'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?w=400&q=80',
    status: 'Available', shelterName: 'AnimalBase Shelter House',
    shelterEmail: 'pets.absh@animalbase.com', shelterPhone: '+63 9956789101',
    location: 'Manchester, UK', createdAt: '2024-01-08',
  },
  {
    id: '4', name: 'Zoe', type: 'Cats', breed: 'Domestic Shorthair', gender: 'Female',
    age: 'Young (8 months old)', weight: '3 kg', colorAppearance: 'Brown tabby striped',
    description: 'Zoe is a gentle and affectionate cat who loves to curl up on laps. She gets along well with other cats.',
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80',
    status: 'Available', shelterName: 'AnimalBase Shelter House',
    shelterEmail: 'pets.absh@animalbase.com', shelterPhone: '+63 9956789101',
    location: 'London, UK', createdAt: '2024-01-05',
  },
  {
    id: '5', name: 'Bambi', type: 'Small Animals', breed: 'Teacup Pig', gender: 'Female',
    age: 'Young (4 months old)', weight: '1.2 kg', colorAppearance: 'Pink with brown spots',
    description: 'Bambi is a tiny sociable pig who loves treats and belly rubs. She is intelligent and can learn tricks.',
    imageUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80',
    status: 'Available', shelterName: 'AnimalBase Shelter House',
    shelterEmail: 'pets.absh@animalbase.com', shelterPhone: '+63 9956789101',
    location: 'Leeds, UK', createdAt: '2024-01-03',
  },
  {
    id: '6', name: 'Spike', type: 'Reptiles', breed: 'Bearded Dragon', gender: 'Male',
    age: 'Adult (1.5 years old)', weight: '450 grams', colorAppearance: 'Sandy brown with orange highlights',
    description: 'Spike is a calm and friendly bearded dragon. He enjoys being handled and basking under his heat lamp.',
    imageUrl: 'https://images.unsplash.com/photo-1589558249810-a07f5c6a5600?w=400&q=80',
    status: 'Available', shelterName: 'AnimalBase Shelter House',
    shelterEmail: 'pets.absh@animalbase.com', shelterPhone: '+63 9956789101',
    location: 'Bristol, UK', createdAt: '2024-01-01',
  },
  {
    id: '7', name: 'Bernkastel', type: 'Cats', breed: 'Domestic Shorthair', gender: 'Female',
    age: 'Adult (3 years old)', weight: '4 kg', colorAppearance: 'Grey and white',
    description: 'Bernkastel is a calm and independent cat who enjoys sunny windowsills and quiet evenings.',
    imageUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&q=80',
    status: 'Available', shelterName: 'AnimalBase Shelter House',
    shelterEmail: 'pets.absh@animalbase.com', shelterPhone: '+63 9956789101',
    location: 'Birmingham, UK', createdAt: '2024-01-12',
  },
  {
    id: '8', name: 'Luna', type: 'Dogs', breed: 'Pug', gender: 'Female',
    age: 'Adult (4 years old)', weight: '8 kg', colorAppearance: 'Fawn with black mask',
    description: 'Luna is a lovable and lazy pug who enjoys cuddles on the couch and short walks in the park.',
    imageUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&q=80',
    status: 'Available', shelterName: 'AnimalBase Shelter House',
    shelterEmail: 'pets.absh@animalbase.com', shelterPhone: '+63 9956789101',
    location: 'London, UK', createdAt: '2024-01-06',
  },
];

export const MOCK_LOST_PETS: LostPet[] = [
  {
    id: 'lp1', petName: 'Bernkastel', type: 'Cat', breed: 'Domestic Shorthair', gender: 'Female',
    age: 'Adult (3 years old)', weight: '4 kg', colorAppearance: 'Brown tabby (striped)',
    description: "Bernkastel is a young, curious brown tabby cat last seen near her home. She's very shy with strangers and may hide when approached.",
    distinctiveFeatures: 'Brown paws, pink collar with bell, small scar on left ear. Very shy with strangers but responds to soft calls.',
    imageUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&q=80',
    lastSeenLocation: 'Saints Park, Birmingham on January 11, 2026',
    lastSeenDate: '2026-01-11',
    rewardOffered: '₱15,000',
    ownerName: 'Sarah Mitchell', ownerEmail: 'sarah.m@email.com', ownerPhone: '+63 981 236 3767',
    status: 'Missing', reportedAt: '2026-01-11',
  },
  {
    id: 'lp2', petName: 'Whiskey', type: 'Dog', breed: 'Golden Retriever', gender: 'Male',
    age: 'Adult (3 years old)', weight: '31 kg', colorAppearance: 'Golden',
    description: 'Whiskey is a friendly and energetic Golden Retriever. He loves people and will approach anyone wagging his tail.',
    distinctiveFeatures: 'Blue collar with tag, friendly disposition, responds to his name.',
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&q=80',
    lastSeenLocation: 'Saints Park, Birmingham on January 11, 2026',
    lastSeenDate: '2026-01-11',
    ownerName: 'James Carter', ownerEmail: 'james.c@email.com', ownerPhone: '+63 991 325 2816',
    status: 'Missing', reportedAt: '2026-01-10',
  },
];

export const MOCK_APPLICATIONS: AdoptionApplication[] = [
  {
    id: 'app1', petId: '1', petName: 'Daisy', petImageUrl: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&q=80',
    petType: 'Bird', userId: 'u1', fullName: 'Alex Rivera', email: 'alex@email.com',
    phone: '+63 912 345 6789', homeAddress: '123 Main St, Birmingham, UK',
    previousPetExperience: 'I have had parakeets for 5 years and understand bird care well.',
    whyAdopt: 'I want to give Daisy a loving home where she can thrive.',
    whyChooseYou: 'I have experience with birds, a spacious home, and plenty of time to dedicate.',
    status: 'Pending', submittedAt: '2024-01-20', updatedAt: '2024-01-20',
  },
  {
    id: 'app2', petId: '3', petName: 'Bluey', petImageUrl: 'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?w=400&q=80',
    petType: 'Dog', userId: 'u1', fullName: 'Alex Rivera', email: 'alex@email.com',
    phone: '+63 912 345 6789', homeAddress: '123 Main St, Birmingham, UK',
    previousPetExperience: 'I grew up with dogs and have been a responsible dog owner for 10 years.',
    whyAdopt: 'I jog every morning and have a large garden — perfect for an active dog like Bluey.',
    whyChooseYou: 'Active lifestyle, large home with yard, family of 3 adults.',
    status: 'Approved', submittedAt: '2024-01-18', updatedAt: '2024-01-22',
  },
  {
    id: 'app3', petId: '4', petName: 'Zoe', petImageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80',
    petType: 'Cat', userId: 'u1', fullName: 'Alex Rivera', email: 'alex@email.com',
    phone: '+63 912 345 6789', homeAddress: '123 Main St, Birmingham, UK',
    previousPetExperience: 'First-time cat owner but have done extensive research.',
    whyAdopt: 'I want a calm companion for my apartment life.',
    whyChooseYou: 'Quiet apartment, work from home, lots of attention to give.',
    status: 'Rejected', submittedAt: '2024-01-15', updatedAt: '2024-01-19',
  },
];

export const MOCK_USER: User = {
  id: 'u1',
  fullName: 'Alex Rivera',
  email: 'alex.rivera@email.com',
  phone: '+63 912 345 6789',
  address: '123 Main St, Birmingham, UK',
  joinedAt: '2024-01-01',
};
