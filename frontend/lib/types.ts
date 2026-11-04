export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "USER";
  memberCode: string;
  locale: string;
  city: string;
};

export type Media = {
  id: string;
  kind: "PHOTO" | "VIDEO";
  url: string;
  label: string | null;
  durationLabel: string | null;
};

export type Card = {
  id: string;
  name: string;
  age: number;
  city: string;
  excerpt: string;
  ethnicity: string | null;
  heightCm: number;
  weightKg: number;
  tier: string;
  availability: string;
  visible: boolean;
  photos: Media[];
};

export type Detail = Card & {
  description: string;
  descriptionPt: string;
  descriptionEn: string;
  email: string;
  sitePhone: string;
  phone: string;
  priceCents: number;
  currency: string;
  weightKg: number;
  hair: string | null;
  eyes: string | null;
  languages: string | null;
  videos: Media[];
};

export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  contactAuthorized: boolean;
  travelLocations: string | null;
  hasDocument: boolean;
  role: "ADMIN" | "USER";
  status: string;
  locale: string;
  memberCode: string;
  createdAt: string;
  link: string | null;
  linkPurpose: string | null;
  linkExpiresAt: string | null;
  emailStatus: string | null;
};

export type Issued = { member: Member; link: string; emailStatus: string };

export type HouseLink = {
  id: string;
  userId: string;
  name: string;
  email: string;
  purpose: string;
  expiresAt: string;
  emailStatus: string | null;
  link: string;
};

export type Audit = {
  id: string;
  eventType: string;
  subject: string;
  status: string;
  createdAt: string;
};

export type Dashboard = {
  activeMembers: number;
  pendingMembers: number;
  invitedMembers: number;
  disabledMembers: number;
  publishedProfiles: number;
  hiddenProfiles: number;
  photos: number;
  videos: number;
  growth: { date: string; members: number }[];
  recent: Audit[];
};

export type House = { sitePhone: string; siteEmail: string };

export type TokenInfo = {
  valid: boolean;
  purpose: string | null;
  emailHint: string | null;
  firstName: string | null;
  reason: string | null;
};
