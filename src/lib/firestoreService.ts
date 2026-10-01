import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Website, Category, Submission, DirectorySettings, ActivityLog } from '../types';

const WEBSITES_COL = 'websites';
const CATEGORIES_COL = 'categories';
const SUBMISSIONS_COL = 'submissions';
const SETTINGS_COL = 'settings';
const ACTIVITY_LOGS_COL = 'activityLogs';

// Helper to log admin actions
export async function logActivity(action: string, entityType: ActivityLog['entityType'], description: string, entityId?: string) {
  try {
    let adminEmail = 'admin@example.com';
    try {
      const stored = localStorage.getItem('ih_admin_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email) adminEmail = parsed.email;
      }
    } catch {}

    const logData = {
      action,
      entityType,
      entityId: entityId || '',
      description,
      adminId: adminEmail,
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, ACTIVITY_LOGS_COL), logData);
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}

// -------------------------------------------------------------
// WEBSITES SERVICE
// -------------------------------------------------------------

export async function fetchWebsites(statusFilter?: string): Promise<Website[]> {
  try {
    let q = collection(db, WEBSITES_COL);
    const snapshot = await getDocs(q);
    const websites: Website[] = snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Website, 'id'>)
    }));

    if (statusFilter && statusFilter !== 'all') {
      return websites.filter(w => w.status === statusFilter);
    }
    return websites;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, WEBSITES_COL);
    return [];
  }
}

export async function fetchPublicWebsites(): Promise<Website[]> {
  try {
    // Only active websites are public
    const q = query(collection(db, WEBSITES_COL), where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Website, 'id'>)
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, WEBSITES_COL);
    return [];
  }
}

export async function getWebsiteById(id: string): Promise<Website | null> {
  const path = `${WEBSITES_COL}/${id}`;
  try {
    const d = await getDoc(doc(db, WEBSITES_COL, id));
    if (!d.exists()) return null;
    return { id: d.id, ...(d.data() as Omit<Website, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function createWebsite(data: Omit<Website, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const now = new Date().toISOString();
    const docData = {
      ...data,
      clickCount: data.clickCount || 0,
      createdAt: now,
      updatedAt: now
    };
    const docRef = await addDoc(collection(db, WEBSITES_COL), docData);
    await logActivity('Website Added', 'website', `Created website "${data.name}"`, docRef.id);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, WEBSITES_COL);
    throw error;
  }
}

export async function updateWebsite(id: string, updates: Partial<Omit<Website, 'id' | 'createdAt'>>): Promise<void> {
  const path = `${WEBSITES_COL}/${id}`;
  try {
    const docRef = doc(db, WEBSITES_COL, id);
    const dataToUpdate = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await updateDoc(docRef, dataToUpdate);
    await logActivity('Website Updated', 'website', `Updated website "${updates.name || id}"`, id);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteWebsite(id: string, name: string): Promise<void> {
  const path = `${WEBSITES_COL}/${id}`;
  try {
    await deleteDoc(doc(db, WEBSITES_COL, id));
    await logActivity('Website Deleted', 'website', `Deleted website "${name}"`, id);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function duplicateWebsite(website: Website): Promise<string> {
  try {
    const now = new Date().toISOString();
    const newWebsiteData: Omit<Website, 'id'> = {
      name: `${website.name} (Copy)`,
      slug: `${website.slug || 'site'}-copy-${Date.now().toString(36)}`,
      url: website.url,
      description: website.description,
      longDescription: website.longDescription || '',
      categoryId: website.categoryId,
      tags: [...(website.tags || [])],
      logoUrl: website.logoUrl || '',
      featured: false,
      featuredOrder: website.featuredOrder || 0,
      status: 'draft',
      displayOrder: (website.displayOrder || 0) + 1,
      clickCount: 0,
      createdAt: now,
      updatedAt: now,
      lastCheckedAt: now
    };

    const docRef = await addDoc(collection(db, WEBSITES_COL), newWebsiteData);
    await logActivity('Website Duplicated', 'website', `Duplicated "${website.name}" into "${newWebsiteData.name}"`, docRef.id);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, WEBSITES_COL);
    throw error;
  }
}

export async function incrementWebsiteClick(id: string): Promise<void> {
  const path = `${WEBSITES_COL}/${id}`;
  try {
    const docRef = doc(db, WEBSITES_COL, id);
    await updateDoc(docRef, {
      clickCount: increment(1)
    });
  } catch (error) {
    console.error('Failed to increment click count:', error);
  }
}

// -------------------------------------------------------------
// CATEGORIES SERVICE
// -------------------------------------------------------------

export async function fetchCategories(): Promise<Category[]> {
  try {
    const snapshot = await getDocs(collection(db, CATEGORIES_COL));
    const categories: Category[] = snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Category, 'id'>)
    }));
    return categories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CATEGORIES_COL);
    return [];
  }
}

export async function fetchPublicCategories(): Promise<Category[]> {
  try {
    const snapshot = await getDocs(collection(db, CATEGORIES_COL));
    const categories: Category[] = snapshot.docs
      .map(d => ({
        id: d.id,
        ...(d.data() as Omit<Category, 'id'>)
      }))
      .filter(c => c.active);
    return categories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CATEGORIES_COL);
    return [];
  }
}

export async function createCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const now = new Date().toISOString();
    const docData = {
      ...data,
      createdAt: now,
      updatedAt: now
    };
    const docRef = await addDoc(collection(db, CATEGORIES_COL), docData);
    await logActivity('Category Created', 'category', `Created category "${data.name}"`, docRef.id);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, CATEGORIES_COL);
    throw error;
  }
}

export async function updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<void> {
  const path = `${CATEGORIES_COL}/${id}`;
  try {
    const docRef = doc(db, CATEGORIES_COL, id);
    const dataToUpdate = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await updateDoc(docRef, dataToUpdate);
    await logActivity('Category Updated', 'category', `Updated category "${updates.name || id}"`, id);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteCategory(id: string, name: string): Promise<void> {
  const path = `${CATEGORIES_COL}/${id}`;
  try {
    await deleteDoc(doc(db, CATEGORIES_COL, id));
    await logActivity('Category Deleted', 'category', `Deleted category "${name}"`, id);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function reassignCategoryWebsites(fromCatId: string, toCatId: string): Promise<number> {
  try {
    const q = query(collection(db, WEBSITES_COL), where('categoryId', '==', fromCatId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => {
      batch.update(docSnap.ref, {
        categoryId: toCatId,
        updatedAt: new Date().toISOString()
      });
    });
    await batch.commit();
    await logActivity('Websites Reassigned', 'category', `Reassigned ${snapshot.docs.length} websites from ${fromCatId} to ${toCatId}`);
    return snapshot.docs.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, WEBSITES_COL);
    throw error;
  }
}

// -------------------------------------------------------------
// SUBMISSIONS SERVICE
// -------------------------------------------------------------

export async function fetchSubmissions(): Promise<Submission[]> {
  try {
    const snapshot = await getDocs(collection(db, SUBMISSIONS_COL));
    return snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Submission, 'id'>)
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SUBMISSIONS_COL);
    return [];
  }
}

export async function createSubmission(data: Omit<Submission, 'id' | 'status' | 'submittedAt'>): Promise<string> {
  try {
    const docData: Omit<Submission, 'id'> = {
      ...data,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, SUBMISSIONS_COL), docData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, SUBMISSIONS_COL);
    throw error;
  }
}

export async function updateSubmissionStatus(id: string, status: Submission['status']): Promise<void> {
  const path = `${SUBMISSIONS_COL}/${id}`;
  try {
    await updateDoc(doc(db, SUBMISSIONS_COL, id), {
      status,
      reviewedAt: new Date().toISOString()
    });
    await logActivity('Submission Updated', 'submission', `Marked submission ${id} as ${status}`, id);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteSubmission(id: string): Promise<void> {
  const path = `${SUBMISSIONS_COL}/${id}`;
  try {
    await deleteDoc(doc(db, SUBMISSIONS_COL, id));
    await logActivity('Submission Deleted', 'submission', `Deleted submission ${id}`, id);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// -------------------------------------------------------------
// SETTINGS SERVICE
// -------------------------------------------------------------

const DEFAULT_SETTINGS: DirectorySettings = {
  directoryName: 'IndexHub',
  directoryDescription: 'Discover the premier curated directory of websites, AI tools, developer software, and creative resources.',
  logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
  contactEmail: 'contact@indexhub.directory',
  seoTitle: 'IndexHub - The Modern Directory Platform',
  seoDescription: 'Find and curate top verified apps, tools, and digital resources.',
  socialImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  updatedAt: new Date().toISOString()
};

export async function fetchSettings(): Promise<DirectorySettings> {
  try {
    const docSnap = await getDoc(doc(db, SETTINGS_COL, 'general'));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...(docSnap.data() as DirectorySettings) };
    }
    // initialize if not exists
    await setDoc(doc(db, SETTINGS_COL, 'general'), DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Settings fetch error:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<DirectorySettings>): Promise<void> {
  const path = `${SETTINGS_COL}/general`;
  try {
    const payload = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, SETTINGS_COL, 'general'), payload, { merge: true });
    await logActivity('Settings Updated', 'settings', 'Updated directory global settings');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// -------------------------------------------------------------
// ACTIVITY LOG SERVICE
// -------------------------------------------------------------

export async function fetchActivityLogs(limitCount = 50): Promise<ActivityLog[]> {
  try {
    const q = query(
      collection(db, ACTIVITY_LOGS_COL),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<ActivityLog, 'id'>)
    }));
  } catch (error) {
    // If index is building or not available, fallback to basic list
    try {
      const snap = await getDocs(collection(db, ACTIVITY_LOGS_COL));
      const logs = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<ActivityLog, 'id'>)
      }));
      return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limitCount);
    } catch (e) {
      console.error('Failed to fetch activity logs:', e);
      return [];
    }
  }
}

// -------------------------------------------------------------
// SEEDING SERVICE (Only if database is empty!)
// -------------------------------------------------------------

export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const catSnap = await getDocs(collection(db, CATEGORIES_COL));
    if (!catSnap.empty) {
      // Existing data present! Do not touch or duplicate
      return;
    }

    const initialCategories = [
      { name: 'AI Tools', slug: 'ai-tools', description: 'Artificial intelligence software, models, and generative tools.', icon: 'Bot', displayOrder: 1, active: true },
      { name: 'Developer Tools', slug: 'developer-tools', description: 'IDEs, APIs, hosting, and developer utilities.', icon: 'Code', displayOrder: 2, active: true },
      { name: 'Design & Creative', slug: 'design-creative', description: 'UI/UX resources, graphic design tools, typography and icons.', icon: 'Palette', displayOrder: 3, active: true },
      { name: 'Productivity', slug: 'productivity', description: 'Task managers, time trackers, note-taking, and workflow tools.', icon: 'Zap', displayOrder: 4, active: true },
      { name: 'Business & Payments', slug: 'business-payments', description: 'Invoicing, finance, CRM, and analytics software.', icon: 'Briefcase', displayOrder: 5, active: true },
      { name: 'Utilities & Helpers', slug: 'utilities-helpers', description: 'Converters, checkers, calculators, and helpful browser aids.', icon: 'Wrench', displayOrder: 6, active: true },
      { name: 'Learning & Reference', slug: 'learning-reference', description: 'Documentation, cheat sheets, books, and courses.', icon: 'GraduationCap', displayOrder: 7, active: true }
    ];

    const categoryMap: Record<string, string> = {};
    const now = new Date().toISOString();

    for (const cat of initialCategories) {
      const catRef = await addDoc(collection(db, CATEGORIES_COL), {
        ...cat,
        createdAt: now,
        updatedAt: now
      });
      categoryMap[cat.name] = catRef.id;
    }

    const sampleWebsites = [
      {
        name: 'GitHub',
        slug: 'github',
        url: 'https://github.com',
        description: 'Complete developer platform to build, scale, and deliver secure software.',
        longDescription: 'GitHub is the world’s leading AI-powered developer platform to build, scale, and deliver secure software. Millions of developers and companies build, ship, and maintain their software on GitHub.',
        categoryId: categoryMap['Developer Tools'],
        tags: ['#Developer', '#Git', '#OpenSource', '#Hosting'],
        logoUrl: 'https://github.githubassets.com/favicons/favicon.png',
        featured: true,
        featuredOrder: 1,
        status: 'active' as const,
        displayOrder: 1,
        clickCount: 142,
        createdAt: now,
        updatedAt: now,
        lastCheckedAt: now
      },
      {
        name: 'OpenAI ChatGPT',
        slug: 'chatgpt',
        url: 'https://chatgpt.com',
        description: 'Engage in natural conversations, brainstorm ideas, write code, and learn anything.',
        longDescription: 'ChatGPT is a state-of-the-art conversational AI platform by OpenAI, empowering millions of users with advanced reasoning, coding, writing, and creative generation.',
        categoryId: categoryMap['AI Tools'],
        tags: ['#AI', '#LLM', '#Chatbot', '#Productivity'],
        logoUrl: 'https://oaistatic-cdn.azureedge.net/chatgpt/favicon.ico',
        featured: true,
        featuredOrder: 2,
        status: 'active' as const,
        displayOrder: 2,
        clickCount: 285,
        createdAt: now,
        updatedAt: now,
        lastCheckedAt: now
      },
      {
        name: 'Figma',
        slug: 'figma',
        url: 'https://figma.com',
        description: 'The collaborative interface design tool connecting teams from concept to code.',
        longDescription: 'Figma is the leading collaborative interface design tool. Teams use Figma to brainstorm, design, and build digital products collaboratively in real-time.',
        categoryId: categoryMap['Design & Creative'],
        tags: ['#Design', '#UIUX', '#Collaboration', '#Prototyping'],
        logoUrl: 'https://static.figma.com/app/icon/1/favicon.png',
        featured: true,
        featuredOrder: 3,
        status: 'active' as const,
        displayOrder: 3,
        clickCount: 97,
        createdAt: now,
        updatedAt: now,
        lastCheckedAt: now
      },
      {
        name: 'Notion',
        slug: 'notion',
        url: 'https://notion.so',
        description: 'The connected workspace where better, faster work happens with notes, docs, and wikis.',
        longDescription: 'Notion is a single space where you can think, write, and plan. Capture thoughts, manage projects, or even run an entire company with customizable databases and documents.',
        categoryId: categoryMap['Productivity'],
        tags: ['#Productivity', '#Notes', '#KnowledgeBase', '#Workspace'],
        logoUrl: 'https://www.notion.so/front-static/favicon.ico',
        featured: true,
        featuredOrder: 4,
        status: 'active' as const,
        displayOrder: 4,
        clickCount: 164,
        createdAt: now,
        updatedAt: now,
        lastCheckedAt: now
      },
      {
        name: 'Stripe',
        slug: 'stripe',
        url: 'https://stripe.com',
        description: 'Financial infrastructure for the internet, powering payments and subscriptions globally.',
        longDescription: 'Stripe powers online and in-person transactions, billing, and global financial operations for modern businesses from startups to Fortune 500 enterprises.',
        categoryId: categoryMap['Business & Payments'],
        tags: ['#Business', '#Payments', '#Finance', '#API'],
        logoUrl: 'https://images.stripeassets.com/fzn2n1nzq965/favicon.ico',
        featured: false,
        featuredOrder: 0,
        status: 'active' as const,
        displayOrder: 5,
        clickCount: 78,
        createdAt: now,
        updatedAt: now,
        lastCheckedAt: now
      },
      {
        name: 'MDN Web Docs',
        slug: 'mdn-web-docs',
        url: 'https://developer.mozilla.org',
        description: 'Documenting web technologies including CSS, HTML, and JavaScript since 2005.',
        longDescription: 'MDN Web Docs is an open-source, collaborative project documenting web technologies, including CSS, HTML, JavaScript, and Web APIs.',
        categoryId: categoryMap['Learning & Reference'],
        tags: ['#Reference', '#Documentation', '#HTML', '#JavaScript', '#CSS'],
        logoUrl: 'https://developer.mozilla.org/favicon-48x48.png',
        featured: false,
        featuredOrder: 0,
        status: 'active' as const,
        displayOrder: 6,
        clickCount: 112,
        createdAt: now,
        updatedAt: now,
        lastCheckedAt: now
      },
      {
        name: 'TinyPNG',
        slug: 'tinypng',
        url: 'https://tinypng.com',
        description: 'Smart WebP, PNG and JPEG compression that reduces file size without losing quality.',
        longDescription: 'TinyPNG uses smart lossy compression techniques to reduce the file size of your WEBP, JPEG and PNG files, saving bandwidth and speeding up website loading times.',
        categoryId: categoryMap['Utilities & Helpers'],
        tags: ['#Utility', '#ImageCompression', '#Optimization', '#FreeTools'],
        logoUrl: 'https://tinypng.com/images/favicon.ico',
        featured: false,
        featuredOrder: 0,
        status: 'active' as const,
        displayOrder: 7,
        clickCount: 65,
        createdAt: now,
        updatedAt: now,
        lastCheckedAt: now
      },
      {
        name: 'Supabase (Draft preview)',
        slug: 'supabase-draft',
        url: 'https://supabase.com',
        description: 'Open source Firebase alternative providing Postgres database, Authentication, and instant APIs.',
        longDescription: 'Draft entry being reviewed for directory inclusion.',
        categoryId: categoryMap['Developer Tools'],
        tags: ['#PostgreSQL', '#Backend', '#OpenSource'],
        logoUrl: 'https://supabase.com/favicon/favicon.ico',
        featured: false,
        featuredOrder: 0,
        status: 'draft' as const,
        displayOrder: 8,
        clickCount: 0,
        createdAt: now,
        updatedAt: now,
        lastCheckedAt: now
      },
      {
        name: 'Legacy Bookmark Archive',
        slug: 'legacy-bookmark',
        url: 'https://example.com/legacy',
        description: 'Archived resource preserved in directory storage.',
        longDescription: 'Disabled item kept in Firestore for administrative records.',
        categoryId: categoryMap['Utilities & Helpers'],
        tags: ['#Archive'],
        featured: false,
        featuredOrder: 0,
        status: 'disabled' as const,
        displayOrder: 9,
        clickCount: 12,
        createdAt: now,
        updatedAt: now,
        lastCheckedAt: now
      }
    ];

    for (const site of sampleWebsites) {
      await addDoc(collection(db, WEBSITES_COL), site);
    }

    await saveSettings(DEFAULT_SETTINGS);
    await logActivity('System Initialized', 'settings', 'Bootstrapped initial directory data and categories');
    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Seed check failed:', err);
  }
}
