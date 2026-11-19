import type { Country, RawCountry, RawCurrency } from '../types/country.ts';

const EMPTY_PLACEHOLDER = '—';

function normalizeText(value: string | undefined, fallback = EMPTY_PLACEHOLDER): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function formatCurrency(currency: RawCurrency): string | null {
  const name = currency.name?.trim();
  const code = currency.code?.trim();
  const symbol = currency.symbol?.trim();

  if (!name && !code) {
    return null;
  }

  const label = name || code || '';
  if (code && name && symbol) {
    return `${label} (${code}, ${symbol})`;
  }
  if (code && name) {
    return `${label} (${code})`;
  }
  return symbol ? `${label} (${symbol})` : label;
}

function buildDescription(raw: RawCountry, name: string, nativeName: string): string {
  const title = nativeName && nativeName !== name ? `${name} (${nativeName})` : name;
  const locationParts = [raw.subregion?.trim(), raw.region?.trim()].filter((part): part is string =>
    Boolean(part)
  );
  const location = locationParts.length > 0 ? ` — ${locationParts.join(', ')}` : '';
  const demonym = raw.demonym?.trim() ? ` Demonym: ${raw.demonym.trim()}.` : '';

  return `${title}${location}.${demonym}`;
}

export function mapCountry(raw: RawCountry): Country {
  const name = normalizeText(raw.name, 'Unknown');
  const nativeName = normalizeText(raw.nativeName, name);
  const id = normalizeText(raw.alpha3Code ?? raw.alpha2Code, name);
  const flag = raw.flags?.svg?.trim() || raw.flags?.png?.trim() || '';
  const flagEmoji = raw.flag?.trim() || '';
  const capital = normalizeText(raw.capital);
  const region = normalizeText(raw.region);
  const subregion = normalizeText(raw.subregion);
  const population =
    typeof raw.population === 'number' && Number.isFinite(raw.population) ? raw.population : 0;
  const area = typeof raw.area === 'number' && Number.isFinite(raw.area) ? raw.area : null;

  const languages = Array.isArray(raw.languages)
    ? raw.languages
        .map((lang) => lang.name?.trim())
        .filter((langName): langName is string => Boolean(langName))
    : [];

  const currencies = Array.isArray(raw.currencies)
    ? raw.currencies.map(formatCurrency).filter((currency): currency is string => Boolean(currency))
    : [];

  const borders = Array.isArray(raw.borders)
    ? raw.borders.map((code) => code.trim()).filter(Boolean)
    : [];

  const description = buildDescription(raw, name, nativeName);

  return {
    id,
    name,
    nativeName,
    flag,
    flagEmoji,
    capital,
    region,
    subregion,
    population,
    languages,
    currencies,
    area,
    borders,
    description,
  };
}

export function mapCountryResponse(raw: RawCountry[]): Country[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(mapCountry);
}
