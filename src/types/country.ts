export interface RawLanguage {
  name?: string;
  iso639_1?: string;
  iso639_2?: string;
  nativeName?: string;
}

export interface RawCurrency {
  code?: string;
  name?: string;
  symbol?: string;
}

export interface RawFlags {
  svg?: string;
  png?: string;
}

export interface RawCountry {
  name?: string;
  nativeName?: string;
  alpha2Code?: string;
  alpha3Code?: string;
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  flag?: string;
  flags?: RawFlags;
  languages?: RawLanguage[];
  currencies?: RawCurrency[];
  borders?: string[];
  demonym?: string;
}

export interface Country {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  flagEmoji: string;
  capital: string;
  region: string;
  subregion: string;
  population: number;
  languages: string[];
  currencies: string[];
  area: number | null;
  borders: string[];
  description: string;
}
