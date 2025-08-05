import { v4 as uuidv4 } from "uuid";

export const dentistData = {
  clinicId: "13945a21-28c0-49f9-a6c4-189d48351c4d", 
  name: "Bright Smiles Dental Clinic",
  address: {
    line1: "123 Main Street",
    city: "London",
    postcode: "W1A 1AA",
    country: "UK"
  },
  contact: {
    phone: "+44 20 7946 0958",
    email: "info@brightsmiles.co.uk",
    website: "https://brightsmiles.co.uk"
  },
  description: "Bright Smiles Dental Clinic offers comprehensive dental care with a focus on patient comfort and long-term oral health.",
  services: [
    {
      id: uuidv4(),
      originalId: "svc_001",
      title: "Routine Checkup",
      description: "General examination including teeth, gums, and oral hygiene advice.",
      price: 45
    },
    {
      id: uuidv4(),
      originalId: "svc_002",
      title: "Scale and Polish",
      description: "Professional teeth cleaning to remove plaque and tartar.",
      price: 60
    },
    {
      id: uuidv4(),
      originalId: "svc_003",
      title: "Teeth Whitening",
      description: "Cosmetic whitening treatment to brighten your smile.",
      price: 200
    },
    {
      id: uuidv4(),
      originalId: "svc_004",
      title: "Emergency Appointment",
      description: "Same-day assessment for urgent dental issues.",
      price: 85
    }
  ],
  openingHours: {
    monday: "08:30 - 17:00",
    tuesday: "08:30 - 17:00",
    wednesday: "08:30 - 17:00",
    thursday: "08:30 - 17:00",
    friday: "08:30 - 16:00",
    saturday: "09:00 - 13:00",
    sunday: "Closed"
  },
  languagesSpoken: ["English", "Polish", "Spanish"],
  paymentMethods: ["Cash", "Credit Card", "Apple Pay"],
  metadata: {
    registered: true,
    createdAt: "2025-08-01T10:00:00Z",
    lastUpdated: "2025-08-03T15:22:00Z"
  }
};

export const lead = {
    id: uuidv4(),
    firstName: "John",
    treatment: "Invisalign",
    mobile: "+447911123456",
    clinicId: "13945a21-28c0-49f9-a6c4-189d48351c4d",
    submittedAt: "2025-08-01T10:00:00Z"
  };