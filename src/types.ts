// TypeScript type definitions for ZoomPhone webapp

export type LicenseType = '無制限(0ABJ)' | '無制限(050)' | '従量制' | '内線のみ';
export type DealStatus = '見込み' | '成約';
export type DealSource = 'manual' | 'excel' | 'csv_import';

export interface User {
  id: number;
  email: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: number;
  customer_name: string;
  sales_rep: string;
  deal_date: string;
  status: DealStatus;
  source: DealSource;
  created_at: string;
  updated_at: string;
}

export interface License {
  id: number;
  deal_id: number;
  license_type: LicenseType;
  license_count: number;
  created_at: string;
}

export interface DealWithLicenses extends Deal {
  licenses: License[];
}

export interface DealCreateInput {
  customer_name: string;
  sales_rep: string;
  deal_date: string;
  status: DealStatus;
  source?: DealSource;
  licenses: {
    license_type: LicenseType;
    license_count: number;
  }[];
}

export interface DealUpdateInput extends DealCreateInput {
  id: number;
}

export interface DashboardStats {
  total_licenses: number;
  confirmed_licenses: number;
  prospect_licenses: number;
  achievement_rate: number;
  remaining_target: number;
  deal_count: number;
  first_half: {
    confirmed: number;
    prospect: number;
    total: number;
  };
  second_half: {
    confirmed: number;
    prospect: number;
    total: number;
  };
  license_breakdown: {
    [key in LicenseType]: number;
  };
}

// Cloudflare Workers bindings
export interface Env {
  DB: D1Database;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_PRIVATE_KEY?: string;
  FIREBASE_CLIENT_EMAIL?: string;
}
