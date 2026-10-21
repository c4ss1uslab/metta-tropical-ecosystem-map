import { EcosystemEntity } from '../types';
import { areEntitiesDirectlyLinked } from './excelParser';

export interface SocialLink {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'youtube' | 'facebook' | 'github' | 'substack' | 'bluesky' | 'mastodon' | 'other';
  url: string;
  label: string;
  handle?: string;
}

/**
 * Detects whether a string or value is a transformation focus / quadrant value
 * e.g. "III. Inner Change", "II. Cultural Change", "I. Social Change", "IV. Systems Change",
 * "Inner Change", "Cultural Change", "Social Change", "Systems Change", etc.
 */
export function isTransformationFocusValue(val?: any): boolean {
  if (!val) return false;
  const str = String(val).trim();
  if (!str) return false;
  const lower = str.toLowerCase();

  // Explicit check for Roman numerals or numbers with change/transformation:
  // e.g., "III. Inner Change", "II. Cultural Change", "I. Social Change", "IV. Systems Change"
  if (/^(i{1,3}|iv|[1-4])\.?\s*(inner|cultural|social|systems?|systemic)?\s*(change|transformation|focus)?$/i.test(lower)) {
    return true;
  }

  // Check for transformation quadrant labels
  if (
    lower.includes('inner change') ||
    lower.includes('cultural change') ||
    lower.includes('systems change') ||
    lower.includes('systemic change') ||
    lower.includes('social change') ||
    lower.includes('transformation focus') ||
    lower.includes('change orientation') ||
    lower === 'inner' ||
    lower === 'cultural' ||
    lower === 'systems' ||
    lower === 'transformation'
  ) {
    return true;
  }

  // Matches if URL was generated like "https://III. Inner Change" or "https://II. Cultural Change"
  if (/^https?:\/\/(www\.)?(i{1,3}|iv|[1-4])?\.?\s*(inner|cultural|social|systems?|systemic)/i.test(str)) {
    return true;
  }

  return false;
}

/**
 * Checks whether a column header / key is a Transformation Focus or Category field
 */
export function isTransformationFocusField(key?: string): boolean {
  if (!key) return false;
  const lower = key.trim().toLowerCase();
  return (
    lower.includes('transformation focus') ||
    lower === 'transformation' ||
    lower === 'transformation_focus' ||
    lower === 'focus of transformation' ||
    lower === 'change focus' ||
    lower === 'quadrant' ||
    lower === 'category' ||
    lower === 'domain' ||
    lower === 'societal sector' ||
    lower === 'societal category'
  );
}

/**
 * Sanitizes and extracts a clean, direct website URL from cell values.
 * Removes stray "[object Object]" artifacts, unwraps markdown links [label](url),
 * and unwraps Excel formula hyperlinks =HYPERLINK("url", ...).
 */
export function cleanWebsiteUrl(val?: any): string | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'object') {
    if (val.hyperlink) {
      val = typeof val.hyperlink === 'string' ? val.hyperlink : val.hyperlink.target || '';
    } else if (val.url) {
      val = val.url;
    } else if (val.text && typeof val.text === 'string' && /^https?:\/\//i.test(val.text)) {
      val = val.text;
    } else if (val.text && typeof val.text === 'object') {
      if (val.text.hyperlink) val = val.text.hyperlink;
      else if (typeof val.text.text === 'string') val = val.text.text;
    } else if (val.target) {
      val = val.target;
    }
  }
  let str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'none') {
    return undefined;
  }

  // 1. Unwrap Excel =HYPERLINK("url", ...)
  const formulaMatch = str.match(/=HYPERLINK\(\s*["']([^"']+)["']/i);
  if (formulaMatch && formulaMatch[1]) {
    str = formulaMatch[1].trim();
  }

  // 2. Unwrap Markdown links [Text](https://...) or [[object Object]](https://...)
  const mdMatch = str.match(/\[+([^\]]+)\]+\(\s*([^\s)]+)\s*\)/);
  if (mdMatch && mdMatch[2]) {
    str = mdMatch[2].trim();
  }

  // 3. Remove any remaining "[object Object]" or "[[object Object]]"
  str = str.replace(/\[*\[*object\s+Object\]*\]*/gi, '').trim();

  // 4. Strip surrounding quotes, parens, brackets
  str = str.replace(/^["'(\[]+|["')\]]+$/g, '').trim();

  // 5. If string has multiple URLs or lines, extract the first valid URL
  const urlMatch = str.match(/https?:\/\/[^\s"')]+/i);
  if (urlMatch) {
    str = urlMatch[0];
  } else if (/^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\/[^\s"')]+/i.test(str)) {
    str = `https://${str}`;
  } else if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/i.test(str)) {
    str = `https://${str}`;
  }

  if (!str || str.toLowerCase().includes('object object')) return undefined;
  return str;
}

/**
 * Strips http://, https://, and www. from URL for clean display.
 * Also cleans any accidental markdown or "[object Object]" wrapper.
 * E.g. "https://www.ecosia.org/" -> "ecosia.org"
 */
export function formatDisplayUrl(url?: string): string {
  if (!url) return '';
  const cleaned = cleanWebsiteUrl(url) || String(url).trim();
  let clean = cleaned.replace(/\[*\[*object\s+Object\]*\]*/gi, '').trim();
  clean = clean.replace(/^https?:\/\//i, '');
  clean = clean.replace(/^www\./i, '');
  clean = clean.replace(/\/$/, '');
  return clean;
}

/**
 * Identifies the social platform based on column name or URL string
 */
export function detectSocialPlatform(str: string): SocialLink['platform'] {
  if (!str) return 'other';
  if (isTransformationFocusValue(str) || isTransformationFocusField(str)) {
    return 'other';
  }
  const lower = str.toLowerCase().trim();
  if (
    (lower.includes('twitter') || lower.includes('x.com') || lower === 'x' || lower === '@x' || lower.includes('tweet')) &&
    !lower.includes('change') &&
    !lower.includes('transformation')
  ) {
    return 'twitter';
  }
  if (lower.includes('linkedin')) {
    return 'linkedin';
  }
  if (lower.includes('instagram') || lower.includes('instagr.am') || lower === 'ig' || lower === '@ig') {
    return 'instagram';
  }
  if (lower.includes('youtube') || lower.includes('youtu.be') || lower === 'yt' || lower === '@yt') {
    return 'youtube';
  }
  if (lower.includes('facebook') || lower.includes('fb.com') || lower === 'fb' || lower === '@fb') {
    return 'facebook';
  }
  if (lower.includes('github')) {
    return 'github';
  }
  if (lower.includes('substack')) {
    return 'substack';
  }
  if (lower.includes('bluesky') || lower.includes('bsky')) {
    return 'bluesky';
  }
  if (lower.includes('mastodon') || lower.includes('mstdn')) {
    return 'mastodon';
  }
  return 'other';
}

/**
 * Normalizes user input (handles or URLs) into full clickable URLs
 */
export function normalizeSocialUrl(platform: SocialLink['platform'], rawVal: string): string {
  let val = String(rawVal).trim();
  if (!val || isTransformationFocusValue(val)) return '';

  // If already a full URL
  if (/^https?:\/\//i.test(val)) {
    return val;
  }

  // If starting with www.
  if (/^www\./i.test(val)) {
    return `https://${val}`;
  }

  // Remove leading @
  const cleanHandle = val.replace(/^@/, '');

  switch (platform) {
    case 'twitter':
      return `https://x.com/${cleanHandle}`;
    case 'linkedin':
      if (cleanHandle.includes('/')) {
        return `https://www.linkedin.com/${cleanHandle}`;
      }
      return `https://www.linkedin.com/company/${cleanHandle}`;
    case 'instagram':
      return `https://www.instagram.com/${cleanHandle}`;
    case 'youtube':
      if (cleanHandle.startsWith('@') || cleanHandle.startsWith('channel/') || cleanHandle.startsWith('c/')) {
        return `https://www.youtube.com/${cleanHandle}`;
      }
      return `https://www.youtube.com/@${cleanHandle}`;
    case 'facebook':
      return `https://www.facebook.com/${cleanHandle}`;
    case 'github':
      return `https://github.com/${cleanHandle}`;
    case 'substack':
      if (cleanHandle.includes('.substack.com')) {
        return `https://${cleanHandle}`;
      }
      return `https://${cleanHandle}.substack.com`;
    case 'bluesky':
      return `https://bsky.app/profile/${cleanHandle}`;
    default:
      // For 'other' platform: only return if it looks like an actual URL (has a dot and no spaces)
      if (!val.includes(' ') && val.includes('.') && /^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(val)) {
        return `https://${val}`;
      }
      return '';
  }
}

/**
 * Human-readable label for a social platform
 */
export function getSocialPlatformLabel(platform: SocialLink['platform']): string {
  switch (platform) {
    case 'twitter':
      return 'Twitter / X';
    case 'linkedin':
      return 'LinkedIn';
    case 'instagram':
      return 'Instagram';
    case 'youtube':
      return 'YouTube';
    case 'facebook':
      return 'Facebook';
    case 'github':
      return 'GitHub';
    case 'substack':
      return 'Substack';
    case 'bluesky':
      return 'Bluesky';
    case 'mastodon':
      return 'Mastodon';
    default:
      return 'Social Profile';
  }
}

/**
 * Parses mixed social profiles from a text cell (e.g. from column X2 "Social Profiles")
 * Handles comma, semicolon, newline, pipe, and whitespace-separated URLs or labeled entries:
 * e.g. "Twitter: @foo | LinkedIn: https://linkedin.com/in/bar | https://instagram.com/baz"
 */
export function parseSocialProfilesField(raw?: any): Record<string, string> {
  if (!raw) return {};
  const str = String(raw).trim();
  if (!str || isTransformationFocusValue(str)) return {};

  const result: Record<string, string> = {};

  // Split by newline, semicolon, pipe, or comma (if not inside URL query)
  // Also split on patterns like " https://" or " http://"
  let normalized = str
    .replace(/\s+(https?:\/\/)/gi, '\n$1')
    .replace(/\s+(www\.)/gi, '\n$1');

  const chunks = normalized.split(/[\n;,|]+/).map(c => c.trim()).filter(Boolean);

  chunks.forEach(chunk => {
    let text = chunk.trim();
    if (!text || isTransformationFocusValue(text)) return;

    // Check for "Platform: value" pattern, e.g. "Twitter: @regen" or "X - https://x.com/..."
    let platformCandidate: SocialLink['platform'] | null = null;
    const labelMatch = text.match(/^([a-zA-Z0-9_\s/]+)[:=\-—]\s*(.*)$/);
    if (labelMatch) {
      const prefix = labelMatch[1].trim();
      if (!isTransformationFocusValue(prefix) && !isTransformationFocusField(prefix)) {
        const detected = detectSocialPlatform(prefix);
        if (detected !== 'other') {
          platformCandidate = detected;
          text = labelMatch[2].trim();
        }
      }
    }

    if (!platformCandidate) {
      platformCandidate = detectSocialPlatform(text);
    }

    if (platformCandidate !== 'other' && text && !isTransformationFocusValue(text)) {
      const normalizedUrl = normalizeSocialUrl(platformCandidate, text);
      if (normalizedUrl && !isTransformationFocusValue(normalizedUrl)) {
        result[platformCandidate] = normalizedUrl;
      }
    } else if (/^https?:\/\//i.test(text) || /^www\./i.test(text)) {
      // General link
      if (!isTransformationFocusValue(text)) {
        const detected = detectSocialPlatform(text);
        const normalizedUrl = normalizeSocialUrl(detected, text);
        if (normalizedUrl && !isTransformationFocusValue(normalizedUrl)) {
          result[detected !== 'other' ? detected : `link_${Object.keys(result).length + 1}`] = normalizedUrl;
        }
      }
    }
  });

  return result;
}

/**
 * Extracts and consolidates all social links for an entity
 * from entity.socialMedia, entity.extraFields, etc.
 * Guarantees no transformation focus fields are treated as social profiles.
 */
export function extractSocialLinks(entity: EcosystemEntity): SocialLink[] {
  const links: SocialLink[] = [];
  const seenPlatforms = new Set<string>();

  const addLink = (platform: SocialLink['platform'], val: string) => {
    if (!val || typeof val !== 'string' || !val.trim()) return;
    const cleanVal = val.trim();

    // Guard: ignore any transformation focus or non-social values
    if (isTransformationFocusValue(cleanVal) || isTransformationFocusValue(platform) || isTransformationFocusField(platform)) {
      return;
    }

    const cleanPlatform = detectSocialPlatform(platform) !== 'other' ? detectSocialPlatform(platform) : detectSocialPlatform(cleanVal);
    
    // For 'other' platform: must be an actual HTTP/HTTPS/www URL
    if (cleanPlatform === 'other' && !/^https?:\/\//i.test(cleanVal) && !/^www\./i.test(cleanVal)) {
      return;
    }

    const url = normalizeSocialUrl(cleanPlatform, cleanVal);
    if (!url || isTransformationFocusValue(url)) return;

    if (!seenPlatforms.has(cleanPlatform)) {
      seenPlatforms.add(cleanPlatform);
      const handle = cleanVal.replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com|instagram\.com|youtube\.com|linkedin\.com)\/?/i, '').replace(/^@/, '');
      if (isTransformationFocusValue(handle)) return;

      links.push({
        platform: cleanPlatform,
        url,
        label: getSocialPlatformLabel(cleanPlatform),
        handle
      });
    }
  };

  // 1. Check dedicated entity.socialMedia map
  if (entity.socialMedia && typeof entity.socialMedia === 'object') {
    Object.entries(entity.socialMedia).forEach(([key, val]) => {
      if (!isTransformationFocusValue(key) && !isTransformationFocusValue(val) && !isTransformationFocusField(key)) {
        addLink(detectSocialPlatform(key), val);
      }
    });
  }

  // 2. Check categorizedFields under 'Logistic Info' -> 'Social Profiles'
  const logisticSocial = entity.categorizedFields?.['Logistic Info']?.['Social Profiles'] ||
    entity.categorizedFields?.['Logistic Info']?.['social profiles'] ||
    entity.categorizedFields?.['Logistic Info']?.['Social Media'];

  if (logisticSocial && typeof logisticSocial === 'string' && !isTransformationFocusValue(logisticSocial)) {
    const parsed = parseSocialProfilesField(logisticSocial);
    Object.entries(parsed).forEach(([plat, url]) => {
      if (!isTransformationFocusValue(plat) && !isTransformationFocusValue(url)) {
        addLink(plat as any, url);
      }
    });
  }

  // 3. Check dynamic extraFields from spreadsheet
  if (entity.extraFields && typeof entity.extraFields === 'object') {
    const socialKeywords = [
      'twitter', 'x.com', 'linkedin', 'instagram', 'youtube', 'facebook',
      'github', 'substack', 'bluesky', 'mastodon', 'social profiles', 'social media', 'social links', 'socials'
    ];

    Object.entries(entity.extraFields).forEach(([fieldKey, val]) => {
      if (!val || (typeof val !== 'string' && typeof val !== 'number')) return;
      const strVal = String(val).trim();
      if (!strVal) return;

      // Ignore transformation focus keys and values
      if (isTransformationFocusField(fieldKey) || isTransformationFocusValue(strVal) || isTransformationFocusValue(fieldKey)) {
        return;
      }

      const lowerKey = fieldKey.toLowerCase();
      const isSocialKey = socialKeywords.some(k => lowerKey.includes(k));

      if (isSocialKey || lowerKey.includes('social profiles')) {
        const parsedMap = parseSocialProfilesField(strVal);
        if (Object.keys(parsedMap).length > 0) {
          Object.entries(parsedMap).forEach(([plat, url]) => {
            if (!isTransformationFocusValue(plat) && !isTransformationFocusValue(url)) {
              addLink(plat as any, url);
            }
          });
        } else {
          const platform = detectSocialPlatform(fieldKey) !== 'other' ? detectSocialPlatform(fieldKey) : detectSocialPlatform(strVal);
          // Only add if platform is recognized or strVal is a real URL
          if (platform !== 'other' || /^https?:\/\//i.test(strVal) || /^www\./i.test(strVal)) {
            addLink(platform, strVal);
          }
        }
      } else {
        const detectedFromVal = detectSocialPlatform(strVal);
        if (detectedFromVal !== 'other') {
          addLink(detectedFromVal, strVal);
        }
      }
    });
  }

  return links;
}

/**
 * Scans an entity and cleans out any transformation focus values
 * that were mistakenly placed into social profiles or social media.
 */
export function sanitizeEntitySocialProfiles(entity: EcosystemEntity): EcosystemEntity {
  if (!entity) return entity;
  let changed = false;

  // 1. Sanitize entity.socialMedia
  let newSocialMedia = entity.socialMedia;
  if (entity.socialMedia && typeof entity.socialMedia === 'object') {
    const cleanedSocial: Record<string, string> = {};
    let hadForbiddenSocial = false;
    Object.entries(entity.socialMedia).forEach(([plat, val]) => {
      if (isTransformationFocusValue(plat) || isTransformationFocusValue(val) || isTransformationFocusField(plat)) {
        hadForbiddenSocial = true;
      } else {
        cleanedSocial[plat] = val;
      }
    });
    if (hadForbiddenSocial) {
      newSocialMedia = Object.keys(cleanedSocial).length > 0 ? cleanedSocial : undefined;
      changed = true;
    }
  }

  // 2. Sanitize categorizedFields['Logistic Info']['Social Profiles']
  let newCategorized = entity.categorizedFields;
  if (entity.categorizedFields && entity.categorizedFields['Logistic Info']) {
    const rawLogisticSocial = entity.categorizedFields['Logistic Info']['Social Profiles'] ||
      entity.categorizedFields['Logistic Info']['social profiles'] ||
      entity.categorizedFields['Logistic Info']['Social media'];
    if (rawLogisticSocial && isTransformationFocusValue(rawLogisticSocial)) {
      newCategorized = {
        ...entity.categorizedFields,
        'Logistic Info': {
          ...entity.categorizedFields['Logistic Info']
        }
      };
      delete newCategorized['Logistic Info']['Social Profiles'];
      delete newCategorized['Logistic Info']['social profiles'];
      delete newCategorized['Logistic Info']['Social media'];
      changed = true;
    }
  }

  if (!changed) return entity;

  return {
    ...entity,
    socialMedia: newSocialMedia,
    categorizedFields: newCategorized
  };
}

/**
 * Finds all entities directly linked to the specified entity based on explicit spreadsheet relationships
 * (Partners, Funders, Founders, Teachers, Collaborators) matching what shows in the sidebar.
 */
export function getConnectedEntities(
  sourceEntity: EcosystemEntity,
  allEntities: EcosystemEntity[]
): EcosystemEntity[] {
  if (!sourceEntity || !allEntities) return [];

  return allEntities.filter(target => {
    if (target.id === sourceEntity.id) return false;
    return areEntitiesDirectlyLinked(sourceEntity, target);
  });
}

/**
 * Returns a Set of entity IDs that should remain visible in focus mode
 * (the source entity itself + all entities connected to it).
 */
export function getConnectedEntityIds(
  sourceEntity: EcosystemEntity,
  allEntities: EcosystemEntity[]
): Set<string> {
  const ids = new Set<string>();
  ids.add(sourceEntity.id);

  const connected = getConnectedEntities(sourceEntity, allEntities);
  connected.forEach(e => ids.add(e.id));

  return ids;
}

