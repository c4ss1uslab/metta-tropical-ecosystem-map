import { EcosystemEntity } from '../types';
import { getAllColumnComments } from '../utils/columnComments';
import { loadChangelogConfig } from '../utils/githubSync';
import { syncPtBrTranslations, TranslationSyncStatus } from './translationMemory';

/**
 * Part of the data sync pipeline: after a dataset is uploaded/committed, bring
 * the pt-BR translation memory up to date. Only text that is new or changed
 * since the last sync is sent to Gemini; everything already translated is reused.
 */
export function syncDataTranslations(
  entities: EcosystemEntity[],
  archipelagoMetadata?: Record<string, { description?: string } | undefined> | null
): Promise<TranslationSyncStatus> {
  const extraStrings: string[] = [];

  if (archipelagoMetadata) {
    for (const [name, meta] of Object.entries(archipelagoMetadata)) {
      extraStrings.push(name);
      if (meta?.description) extraStrings.push(meta.description);
    }
  }

  extraStrings.push(...Object.values(getAllColumnComments()));

  try {
    const changelog = loadChangelogConfig();
    for (const entry of changelog.entries || []) {
      if (entry.title) extraStrings.push(entry.title);
      if (entry.description) extraStrings.push(entry.description);
      (entry.changes || []).forEach(c => extraStrings.push(c));
    }
  } catch {
    // changelog unavailable: non-fatal
  }

  return syncPtBrTranslations({ entities, extraStrings });
}
