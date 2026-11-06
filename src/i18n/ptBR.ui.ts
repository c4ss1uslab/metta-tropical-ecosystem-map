/**
 * Brazilian Portuguese (pt-BR) dictionary for the map's UI chrome.
 *
 * Keys are the English strings exactly as rendered (whitespace collapsed).
 * Keys containing {0}, {1}... are patterns for interpolated text; the captured
 * values are translated too when known (e.g. "{0} Quadrant" + "Inner" ->
 * "Quadrante Interior").
 *
 * Keep it complete with:  npx tsx scripts/i18n-extract.ts
 * (lists every UI string in src/ that has no entry here or in PT_BR_UI_IGNORE).
 *
 * Ecosystem DATA (descriptions, tags...) is not translated here: it is
 * translated by Gemini during data sync (see translationMemory.ts).
 */
import { PART1 } from './ptBR/part1';
import { PART2 } from './ptBR/part2';
import { PART3 } from './ptBR/part3';
import { PART4 } from './ptBR/part4';
import { PART5 } from './ptBR/part5';

/** Extra entries: common short labels and plural/case variants used by data-driven UI. */
const EXTRA: Record<string, string> = {
  // Biomes (data is normalized to English names; see normalizeBiomeValue)
  'Amazon': 'Amazônia',
  'Amazon, Cerrado': 'Amazônia, Cerrado',
  'Amazon ({0})': 'Amazônia ({0})',
  'Amazon, Cerrado ({0})': 'Amazônia, Cerrado ({0})',
  'Organizations & Initiatives': 'Organizações e iniciativas',
  'Persons': 'Pessoas',
  'Medias': 'Mídias',
  'Unknown': 'Desconhecido',
  'Unassigned': 'Não atribuído',
  'Global': 'Global',
  'Emerging': 'Emergente',
  'Established': 'Consolidada',
  'Movement': 'Movimento',
  'Classic': 'Clássico',
  'Yes / No': 'Sim / Não',
  'of': 'de',
  'and': 'e',
  'or': 'ou',
  'entities': 'entidades',
  'entity': 'entidade',
  'nodes': 'nós',
  'selected': 'selecionadas',
  'results': 'resultados',
  'Loading...': 'Carregando...',
  // Merged interpolations (RightSidebar)
  'View Archipelago Overview →': 'Ver visão geral do arquipélago →',
  'View Field Overview →': 'Ver visão geral do campo →',
  'View {0} Overview →': 'Ver visão geral de {0} →',
  '{0} Node': '{0} nó',
  '{0} Nodes': '{0} nós',
  // Translation sync status (src/i18n/translationMemory.ts)
  'GEMINI_API_KEY is not configured: pt-BR translations were not updated.': 'GEMINI_API_KEY não está configurada: as traduções pt-BR não foram atualizadas.',
  // Document title (index.html)
  'Metta Tropical Ecosystem Map — A Cartography of Spiritual, Social, Cultural & Systems Change': 'Mapa do Ecossistema Metta Tropical — Uma Cartografia da Mudança Espiritual, Social, Cultural e Sistêmica',
  // Plural labels interpolated by MultiSelectFilterDropdown ("All {plural} ({n})")
  'archipelagos': 'arquipélagos',
  'assessments': 'avaliações',
  'biomes': 'biomas',
  'cities/states': 'cidades/estados',
  'countries': 'países',
  'databases': 'bases de dados',
  'focuses': 'focos',
  'horizons': 'horizontes',
  'languages': 'idiomas',
  'locations': 'localizações',
  'orientations': 'orientações',
  'regions': 'regiões',
  'relationships': 'relações',
  'sizes': 'tamanhos',
  'stages': 'estágios',
  'streams': 'vertentes',
  'tags': 'tags',
};

export const PT_BR_UI: Record<string, string> = {
  ...PART1,
  ...PART2,
  ...PART3,
  ...PART4,
  ...PART5,
  ...EXTRA,
};

/**
 * Strings the extractor finds that are not user-facing text (CSS values, ids,
 * file names, SVG paths) or are identical in Portuguese (brand names).
 */
export const PT_BR_UI_IGNORE: string[] = [
  '"Cormorant Garamond", Georgia, serif',
  '0 1px 2px rgba(0,0,0,0.18)',
  '0 1px 2px rgba(0,0,0,0.25)',
  '3px solid {0}',
  'Bearer {0}',
  'Col_{0}',
  'M {0},{1} A {2},{3} 0 1,0 {4},{5} A {6},{7} 0 1,0 {8},{9} Z',
  'M {0},{1} C {2},{3} {4},{5} {6},{7} C {8},{9} {10},{11} {12},{13}',
  'M {0},{1} Q {2},{3} {4},{5} Q {6},{7} {8},{9} Z',
  'SHA-256',
  'calc(100vw - 24px)',
  'clamp(16px, 2.5vw, 24px)',
  'continent-label-path-{0}-{1}',
  'continent-sublabel-path-{0}-{1}',
  'ent_{0}_{1}',
  'entity-{0}',
  'map-cityState',
  'map-matchingDatabase',
  'map-maturityLevel',
  'map-operatingRegion',
  'map-operationFocus',
  'map-orientation3H',
  'map-orientationCri',
  'map-orientationGtdf',
  'map-ourRelationship',
  'map-ourRelationship-layer2',
  'map-ourRelationship-layer3',
  'map-situationalAssessment',
  'map-valueMeme',
  'metta-positions-snapshot-{0}.json',
  'metta_directory_{0}',
  'metta_directory_{0}_{1}',
  'metta_ecosystem_directory_{0}',
  'metta_ecosystem_map_{0}',
  'preview-{0}-{1}',
  'recip-{0}',
  'stroke fill',
  'translate({0}, {1})',
  'translate3d({0}px, {1}px, 0px) scale({2})',
  'contact@example.org',
  'email@org.org',
  'name@example.org',
  'warmdata@example.org',
  // Brands / proper nouns / identical in pt-BR
  'Bluesky', 'Facebook', 'GitHub', 'Instagram', 'LinkedIn', 'Mastodon', 'Substack', 'YouTube', 'Twitter / X',
  'Favicon', 'Logo', 'PT-BR', 'Branch:',
  // Language toggle labels are bilingual on purpose
  'Mudar idioma para inglês (English)',
  'Switch language to Brazilian Portuguese (Português)',
];
