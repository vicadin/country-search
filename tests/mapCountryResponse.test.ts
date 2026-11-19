import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from '../src/utils/mapCountryResponse.ts';

const createSpainFixture = () => ({
  area: 505992,
  flag: '🇪🇸',
  name: 'Spain',
  flags: {
    png: 'https://flagcdn.com/w320/es.png',
    svg: 'https://flagcdn.com/es.svg',
  },
  region: 'Europe',
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  capital: 'Madrid',
  demonym: 'Spanish',
  languages: [
    {
      name: 'Spanish',
      iso639_1: 'es',
      iso639_2: 'spa',
      nativeName: 'Español',
    },
  ],
  subregion: 'Southern Europe',
  timezones: ['UTC', 'UTC+01:00'],
  alpha2Code: 'ES',
  alpha3Code: 'ESP',
  currencies: [
    {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
    },
  ],
  nativeName: 'España',
  population: 47351567,
});

const createAntarcticaFixture = () => ({
  area: 14000000,
  flag: '🇦🇶',
  name: 'Antarctica',
  flags: {
    png: 'https://flagcdn.com/w320/aq.png',
  },
  region: 'Polar',
  demonym: 'Antarctic',
  languages: [
    { name: 'English', iso639_1: 'en' },
    { name: 'Russian', iso639_1: 'ru' },
  ],
  subregion: 'Antarctica',
  alpha2Code: 'AQ',
  alpha3Code: 'ATA',
  nativeName: 'Antarctica',
  population: 1000,
});

describe('mapCountryResponse', () => {
  it('maps a full countries.dev response item into card and detail fields', () => {
    const raw = [createSpainFixture()];

    const result = mapCountryResponse(raw);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'ESP',
      name: 'Spain',
      nativeName: 'España',
      flag: 'https://flagcdn.com/es.svg',
      flagEmoji: '🇪🇸',
      capital: 'Madrid',
      region: 'Europe',
      subregion: 'Southern Europe',
      population: 47351567,
      languages: ['Spanish'],
      currencies: ['Euro (EUR, €)'],
      area: 505992,
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      description: 'Spain (España) — Southern Europe, Europe. Demonym: Spanish.',
    });
  });

  it('handles missing optional fields and falls back to png flag', () => {
    const raw = [createAntarcticaFixture()];

    const result = mapCountryResponse(raw);

    expect(result[0]).toEqual({
      id: 'ATA',
      name: 'Antarctica',
      nativeName: 'Antarctica',
      flag: 'https://flagcdn.com/w320/aq.png',
      flagEmoji: '🇦🇶',
      capital: '—',
      region: 'Polar',
      subregion: 'Antarctica',
      population: 1000,
      languages: ['English', 'Russian'],
      currencies: [],
      area: 14000000,
      borders: [],
      description: 'Antarctica — Antarctica, Polar. Demonym: Antarctic.',
    });
  });

  it('returns an empty array when given an empty response array', () => {
    expect(mapCountryResponse([])).toEqual([]);
  });

  it('does not mutate the input array or nested border arrays', () => {
    const spain = createSpainFixture();
    const raw = [spain];

    const result = mapCountryResponse(raw);
    result[0].borders.push('TEST');
    result[0].languages.push('TEST');

    expect(spain.borders).toEqual(['AND', 'FRA', 'GIB', 'PRT', 'MAR']);
    expect(spain.languages).toHaveLength(1);
  });
});
