export type WebsiteStatus = 'active' | 'draft' | 'disabled';

export interface Website {
  id: string;
  name: string;
  slug: string;
  url: string;
  description: string;
  longDescription?: string;
  categoryId: string;
  tags: string[];
  logoUrl?: string;
  featured: boolean;
  featuredOrder: number;
  status: WebsiteStatus;
  displayOrder: number;
  clickCount: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  lastCheckedAt?: string; // ISO string
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Submission {
  id: string;
  name: string;
  url: string;
  description: string;
  categoryId: string;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
}

export interface DirectorySettings {
  id?: string;
  directoryName: string;
  directoryDescription: string;
  logo: string;
  contactEmail: string;
  seoTitle: string;
  seoDescription: string;
  socialImage: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: 'website' | 'category' | 'submission' | 'settings' | 'auth';
  entityId?: string;
  description: string;
  adminId: string;
  createdAt: string;
}

export interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
}
