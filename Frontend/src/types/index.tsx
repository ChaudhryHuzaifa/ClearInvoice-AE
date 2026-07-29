// src/types/index.ts
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: {
    id: number;
    company: Company;
  };
}

export interface Company {
  id: number;
  name: string;
  tax_registration_number: string;
  address: string;
  email: string;
  phone: string;
}

export interface AuthTokens {
  token: string; // Django uses 'token' instead of 'access'
}

export interface LoginRequest {
  email: string; // Changed from username to email
  password: string;
}