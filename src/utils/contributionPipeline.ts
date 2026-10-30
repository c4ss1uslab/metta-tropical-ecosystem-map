import { EcosystemEntity } from '../types';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp, 
  getDocs 
} from 'firebase/firestore';

export interface FieldDiff {
  field: string;
  label: string;
  category?: string;
  oldValue: any;
  newValue: any;
}

export interface ContributionSubmission {
  id: string;
  entityId: string;
  entityName: string;
  isNewEntity?: boolean;
  submitterEmail: string;
  submitterRelationship?: string;
  submittedAt: string; // ISO 8601
  status: 'pending' | 'approved' | 'rejected';
  originalEntity: EcosystemEntity;
  proposedEntity: EcosystemEntity;
  diffs: FieldDiff[];
  reviewedAt?: string;
  reviewerNotes?: string;
}

const STORAGE_KEY = 'metta_ecosystem_contributions_pipeline_v1';
const PIPELINE_UPDATE_EVENT = 'metta_contribution_pipeline_updated';

// In-memory cache synced with Firestore + local storage fallback
let cachedContributions: ContributionSubmission[] = [];

/**
 * Dispatch an in-window event so all mounted components react immediately
 */
function notifyPipelineUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PIPELINE_UPDATE_EVENT));
  }
}

/**
 * Clean entity objects to remove any `undefined` values before sending to Firestore
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (Array.isArray(item)) {
        if (item.length === 2 && typeof item[0] === 'number' && typeof item[1] === 'number') {
          return { x: item[0], y: item[1] };
        }
        return { values: sanitizeForFirestore(item) };
      }
      return sanitizeForFirestore(item);
    });
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const res: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res;
  }
  return obj;
}

/**
 * Retrieve all contribution submissions from cache or local storage
 */
export function getStoredContributions(): ContributionSubmission[] {
  if (cachedContributions.length > 0) {
    return cachedContributions;
  }
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedContributions = parsed;
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to load contributions from storage:', err);
    return [];
  }
}

/**
 * Get count of pending contributions
 */
export function getPendingContributionsCount(): number {
  return getStoredContributions().filter(item => item.status === 'pending').length;
}

/**
 * Save the entire contributions list to local storage
 */
export function setStoredContributions(items: ContributionSubmission[]): void {
  cachedContributions = items;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    notifyPipelineUpdated();
  } catch (err) {
    console.error('Failed to save contributions to storage:', err);
  }
}

/**
 * Compute differences between original and proposed entity
 */
export function computeEntityDiff(
  original: EcosystemEntity,
  proposed: EcosystemEntity
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  const compareScalar = (key: keyof EcosystemEntity, label: string) => {
    const oldVal = (original[key] ?? '') as string;
    const newVal = (proposed[key] ?? '') as string;
    if (String(oldVal).trim() !== String(newVal).trim()) {
      diffs.push({
        field: key,
        label,
        oldValue: original[key] ?? '',
        newValue: proposed[key] ?? ''
      });
    }
  };

  const compareArrays = (key: keyof EcosystemEntity, label: string) => {
    const oldArr = Array.isArray(original[key]) ? (original[key] as string[]) : [];
    const newArr = Array.isArray(proposed[key]) ? (proposed[key] as string[]) : [];
    const oldSorted = [...oldArr].sort().join('|');
    const newSorted = [...newArr].sort().join('|');
    if (oldSorted !== newSorted) {
      diffs.push({
        field: key,
        label,
        oldValue: oldArr,
        newValue: newArr
      });
    }
  };

  compareScalar('name', 'Name');
  compareScalar('type', 'Entity Type');
  compareScalar('category', 'Quadrant');
  compareScalar('continent', 'Archipelago / Island');
  compareScalar('description', 'Description');
  compareScalar('location', 'Location');
  compareScalar('website', 'Website URL');
  compareScalar('language', 'Language');
  compareScalar('stage', 'Maturity Level');
  compareScalar('ourRelationship', 'Our Relationship');

  compareArrays('fields', 'Tags & Themes');
  if (original.approach || proposed.approach) compareArrays('approach', 'Approaches');
  if (original.issues || proposed.issues) compareArrays('issues', 'Issues');
  if (original.activities || proposed.activities) compareArrays('activities', 'Activities');
  if (original.secondaryCategories || proposed.secondaryCategories) {
    compareArrays('secondaryCategories', 'Secondary Quadrants');
  }

  if (Boolean(original.isTransitionZone) !== Boolean(proposed.isTransitionZone)) {
    diffs.push({
      field: 'isTransitionZone',
      label: 'Ecotones (Intersections)',
      oldValue: Boolean(original.isTransitionZone),
      newValue: Boolean(proposed.isTransitionZone)
    });
  }

  // Compare Categorized fields
  const origCat = original.categorizedFields || {};
  const propCat = proposed.categorizedFields || {};
  const allCategories = new Set([...Object.keys(origCat), ...Object.keys(propCat)]);

  allCategories.forEach(cat => {
    const origFields = origCat[cat] || {};
    const propFields = propCat[cat] || {};
    const allKeys = new Set([...Object.keys(origFields), ...Object.keys(propFields)]);

    allKeys.forEach(k => {
      const oVal = origFields[k] ?? '';
      const pVal = propFields[k] ?? '';
      if (String(oVal).trim() !== String(pVal).trim()) {
        diffs.push({
          field: `categorized.${cat}.${k}`,
          label: `${cat}: ${k}`,
          category: cat,
          oldValue: oVal,
          newValue: pVal
        });
      }
    });
  });

  // Compare extraFields
  const origExtra = original.extraFields || {};
  const propExtra = proposed.extraFields || {};
  const allExtraKeys = new Set([...Object.keys(origExtra), ...Object.keys(propExtra)]);

  allExtraKeys.forEach(k => {
    const oVal = origExtra[k] ?? '';
    const pVal = propExtra[k] ?? '';
    if (String(oVal).trim() !== String(pVal).trim()) {
      const alreadyCaptured = diffs.some(d => d.field.endsWith(`.${k}`));
      if (!alreadyCaptured) {
        diffs.push({
          field: `extraFields.${k}`,
          label: k,
          oldValue: oVal,
          newValue: pVal
        });
      }
    }
  });

  return diffs;
}

/**
 * Record a new contribution submission to Firestore and cache
 */
export async function saveContributionSubmission(
  originalEntity: EcosystemEntity,
  proposedEntity: EcosystemEntity,
  submitterEmail: string,
  submitterRelationship?: string,
  reviewerNotes?: string,
  isNewEntity?: boolean
): Promise<ContributionSubmission> {
  const diffs = computeEntityDiff(originalEntity, proposedEntity);

  const submissionId = `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const submission: ContributionSubmission = {
    id: submissionId,
    entityId: originalEntity.id,
    entityName: proposedEntity.name || originalEntity.name,
    isNewEntity: Boolean(isNewEntity),
    submitterEmail: submitterEmail.trim(),
    submitterRelationship: submitterRelationship ? submitterRelationship.trim() : undefined,
    submittedAt: new Date().toISOString(),
    status: 'pending',
    originalEntity,
    proposedEntity,
    diffs,
    reviewerNotes
  };

  // Immediate optimistic update to local cache
  const current = getStoredContributions();
  const updated = [submission, ...current.filter(c => c.id !== submission.id)];
  setStoredContributions(updated);

  // Persist to Firestore contributions collection
  try {
    const docRef = doc(db, 'contributions', submission.id);
    const cleanPayload = sanitizeForFirestore({
      ...submission,
      _updatedAt: serverTimestamp()
    });
    await setDoc(docRef, cleanPayload);
    console.info(`Contribution ${submission.id} saved to Firestore successfully.`);
  } catch (err) {
    console.error('Failed to save contribution to Firestore:', err);
  }

  return submission;
}

/**
 * Update the status of a contribution (approved, rejected, pending) in Firestore and cache
 */
export async function updateContributionStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  notes?: string
): Promise<ContributionSubmission[]> {
  const current = getStoredContributions();
  const reviewedAt = new Date().toISOString();
  let updatedSub: ContributionSubmission | null = null;

  const updated = current.map(item => {
    if (item.id === id) {
      updatedSub = {
        ...item,
        status,
        reviewedAt,
        reviewerNotes: notes !== undefined ? notes : item.reviewerNotes
      };
      return updatedSub;
    }
    return item;
  });

  setStoredContributions(updated);

  if (updatedSub) {
    try {
      const docRef = doc(db, 'contributions', id);
      const cleanPayload = sanitizeForFirestore({
        ...updatedSub,
        _updatedAt: serverTimestamp()
      });
      await setDoc(docRef, cleanPayload, { merge: true });
    } catch (err) {
      console.error('Failed to update contribution status in Firestore:', err);
    }
  }

  return updated;
}

/**
 * Delete a submission from the pipeline in Firestore and cache
 */
export async function deleteContributionSubmission(id: string): Promise<ContributionSubmission[]> {
  const current = getStoredContributions();
  const updated = current.filter(item => item.id !== id);
  setStoredContributions(updated);

  try {
    const docRef = doc(db, 'contributions', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete contribution from Firestore:', err);
  }

  return updated;
}

/**
 * Hook or subscription helper to listen for updates in real time from Firestore
 */
export function subscribeToPipelineUpdates(callback: () => void): () => void {
  let isUnsubscribed = false;

  // Local window event listener
  const localHandler = () => callback();
  if (typeof window !== 'undefined') {
    window.addEventListener(PIPELINE_UPDATE_EVENT, localHandler);
    window.addEventListener('storage', localHandler);
  }

  // Firestore real-time listener
  let unsubFirestore: (() => void) | null = null;
  try {
    const contributionsCol = collection(db, 'contributions');
    unsubFirestore = onSnapshot(
      contributionsCol,
      (snapshot) => {
        if (isUnsubscribed) return;
        const items: ContributionSubmission[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as any;
          if (data && data.entityId) {
            items.push({
              id: docSnap.id,
              entityId: data.entityId,
              entityName: data.entityName || '',
              isNewEntity: Boolean(data.isNewEntity),
              submitterEmail: data.submitterEmail || '',
              submitterRelationship: data.submitterRelationship,
              submittedAt: data.submittedAt || new Date().toISOString(),
              status: data.status || 'pending',
              originalEntity: data.originalEntity,
              proposedEntity: data.proposedEntity,
              diffs: data.diffs || [],
              reviewedAt: data.reviewedAt,
              reviewerNotes: data.reviewerNotes
            });
          }
        });

        // Sort latest submissions first
        items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        // Update local storage and cache without triggering redundant network writes
        cachedContributions = items;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        }
        callback();
      },
      (error) => {
        console.warn('Firestore contribution snapshot error (falling back to localStorage):', error);
      }
    );
  } catch (err) {
    console.warn('Could not initialize Firestore onSnapshot listener:', err);
  }

  return () => {
    isUnsubscribed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener(PIPELINE_UPDATE_EVENT, localHandler);
      window.removeEventListener('storage', localHandler);
    }
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}
