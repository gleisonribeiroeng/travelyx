import { DestinationMetadata, LegalRequirements } from '../models/trip-plan.model';

/**
 * Static destination metadata for popular travel destinations.
 * Key format: "Country" (country-level data).
 * Legal requirements are from the perspective of Brazilian travelers.
 */

const BR_LEGAL_DEFAULT: LegalRequirements = {
  passportRequired: false,
  visaRequired: false,
  visaType: '',
  insuranceRequired: false,
  vaccines: [],
  passportMinValidity: '',
};

const PASSPORT_BASE: LegalRequirements = {
  passportRequired: true,
  visaRequired: false,
  visaType: '',
  insuranceRequired: false,
  vaccines: [],
  passportMinValidity: '6 meses de validade',
};

export const DESTINATION_DB: Record<string, DestinationMetadata> = {
  // South America
  'Brasil': {
    currency: 'BRL',
    language: 'Português',
    timezone: 'UTC-3 (Brasília)',
    highSeasonMonths: [1, 2, 7, 12],
    legal: { ...BR_LEGAL_DEFAULT },
    avgTempByMonth: { 1: 28, 2: 28, 3: 27, 4: 25, 5: 22, 6: 20, 7: 20, 8: 21, 9: 22, 10: 24, 11: 26, 12: 27 },
    climate: 'Tropical',
  },
  'Argentina': {
    currency: 'ARS',
    language: 'Espanhol',
    timezone: 'UTC-3',
    highSeasonMonths: [1, 2, 7, 12],
    legal: { ...BR_LEGAL_DEFAULT, passportRequired: false, visaRequired: false },
    avgTempByMonth: { 1: 25, 2: 24, 3: 22, 4: 17, 5: 13, 6: 10, 7: 10, 8: 12, 9: 14, 10: 18, 11: 21, 12: 24 },
    climate: 'Temperado',
  },
  'Chile': {
    currency: 'CLP',
    language: 'Espanhol',
    timezone: 'UTC-4',
    highSeasonMonths: [1, 2, 7, 12],
    legal: { ...BR_LEGAL_DEFAULT },
    avgTempByMonth: { 1: 21, 2: 20, 3: 18, 4: 14, 5: 11, 6: 8, 7: 8, 8: 9, 9: 11, 10: 14, 11: 17, 12: 20 },
    climate: 'Mediterrâneo',
  },
  'Uruguai': {
    currency: 'UYU',
    language: 'Espanhol',
    timezone: 'UTC-3',
    highSeasonMonths: [1, 2, 12],
    legal: { ...BR_LEGAL_DEFAULT },
    avgTempByMonth: { 1: 23, 2: 22, 3: 20, 4: 17, 5: 13, 6: 10, 7: 10, 8: 11, 9: 13, 10: 16, 11: 19, 12: 22 },
    climate: 'Temperado',
  },
  'Colômbia': {
    currency: 'COP',
    language: 'Espanhol',
    timezone: 'UTC-5',
    highSeasonMonths: [1, 6, 7, 12],
    legal: { ...BR_LEGAL_DEFAULT },
    avgTempByMonth: { 1: 27, 2: 27, 3: 27, 4: 27, 5: 27, 6: 27, 7: 27, 8: 28, 9: 27, 10: 27, 11: 27, 12: 27 },
    climate: 'Tropical',
  },
  'Peru': {
    currency: 'PEN',
    language: 'Espanhol',
    timezone: 'UTC-5',
    highSeasonMonths: [6, 7, 8],
    legal: { ...BR_LEGAL_DEFAULT },
    avgTempByMonth: { 1: 23, 2: 24, 3: 23, 4: 21, 5: 19, 6: 17, 7: 17, 8: 17, 9: 17, 10: 18, 11: 20, 12: 22 },
    climate: 'Desértico costeiro',
  },

  // North America
  'Estados Unidos': {
    currency: 'USD',
    language: 'Inglês',
    timezone: 'UTC-5 a UTC-10',
    highSeasonMonths: [6, 7, 8, 12],
    legal: {
      ...PASSPORT_BASE,
      visaRequired: true,
      visaType: 'B1/B2 (Turismo) ou ESTA não aplicável para BR',
      insuranceRequired: false,
      vaccines: [],
      passportMinValidity: '6 meses de validade',
    },
    avgTempByMonth: { 1: 5, 2: 6, 3: 10, 4: 16, 5: 21, 6: 26, 7: 29, 8: 28, 9: 24, 10: 18, 11: 12, 12: 6 },
    climate: 'Variado',
  },
  'Canadá': {
    currency: 'CAD',
    language: 'Inglês / Francês',
    timezone: 'UTC-3.5 a UTC-8',
    highSeasonMonths: [6, 7, 8],
    legal: {
      ...PASSPORT_BASE,
      visaRequired: true,
      visaType: 'eTA ou visto de turismo',
      insuranceRequired: false,
      vaccines: [],
      passportMinValidity: '6 meses de validade',
    },
    avgTempByMonth: { 1: -8, 2: -6, 3: 0, 4: 8, 5: 15, 6: 20, 7: 23, 8: 22, 9: 17, 10: 10, 11: 3, 12: -5 },
    climate: 'Continental',
  },
  'México': {
    currency: 'MXN',
    language: 'Espanhol',
    timezone: 'UTC-6',
    highSeasonMonths: [12, 1, 2, 7, 8],
    legal: { ...BR_LEGAL_DEFAULT, passportRequired: true, passportMinValidity: '6 meses de validade' },
    avgTempByMonth: { 1: 17, 2: 18, 3: 21, 4: 23, 5: 24, 6: 23, 7: 22, 8: 22, 9: 21, 10: 20, 11: 18, 12: 17 },
    climate: 'Tropical / Árido',
  },

  // Europe
  'Portugal': {
    currency: 'EUR',
    language: 'Português',
    timezone: 'UTC+0 (UTC+1 verão)',
    highSeasonMonths: [6, 7, 8, 9],
    legal: {
      ...PASSPORT_BASE,
      visaRequired: false,
      visaType: 'Schengen - isento até 90 dias',
      insuranceRequired: true,
      vaccines: [],
      passportMinValidity: '3 meses além da estadia',
    },
    avgTempByMonth: { 1: 12, 2: 13, 3: 15, 4: 16, 5: 19, 6: 22, 7: 25, 8: 25, 9: 23, 10: 19, 11: 15, 12: 12 },
    climate: 'Mediterrâneo',
  },
  'Espanha': {
    currency: 'EUR',
    language: 'Espanhol',
    timezone: 'UTC+1 (UTC+2 verão)',
    highSeasonMonths: [6, 7, 8],
    legal: {
      ...PASSPORT_BASE,
      visaRequired: false,
      visaType: 'Schengen - isento até 90 dias',
      insuranceRequired: true,
      vaccines: [],
      passportMinValidity: '3 meses além da estadia',
    },
    avgTempByMonth: { 1: 10, 2: 11, 3: 14, 4: 16, 5: 20, 6: 25, 7: 28, 8: 28, 9: 24, 10: 19, 11: 14, 12: 10 },
    climate: 'Mediterrâneo',
  },
  'França': {
    currency: 'EUR',
    language: 'Francês',
    timezone: 'UTC+1 (UTC+2 verão)',
    highSeasonMonths: [6, 7, 8],
    legal: {
      ...PASSPORT_BASE,
      visaRequired: false,
      visaType: 'Schengen - isento até 90 dias',
      insuranceRequired: true,
      vaccines: [],
      passportMinValidity: '3 meses além da estadia',
    },
    avgTempByMonth: { 1: 5, 2: 6, 3: 10, 4: 13, 5: 17, 6: 20, 7: 23, 8: 22, 9: 19, 10: 14, 11: 9, 12: 5 },
    climate: 'Temperado oceânico',
  },
  'Itália': {
    currency: 'EUR',
    language: 'Italiano',
    timezone: 'UTC+1 (UTC+2 verão)',
    highSeasonMonths: [6, 7, 8],
    legal: {
      ...PASSPORT_BASE,
      visaRequired: false,
      visaType: 'Schengen - isento até 90 dias',
      insuranceRequired: true,
      vaccines: [],
      passportMinValidity: '3 meses além da estadia',
    },
    avgTempByMonth: { 1: 8, 2: 9, 3: 12, 4: 15, 5: 20, 6: 24, 7: 27, 8: 27, 9: 23, 10: 18, 11: 13, 12: 9 },
    climate: 'Mediterrâneo',
  },
  'Inglaterra': {
    currency: 'GBP',
    language: 'Inglês',
    timezone: 'UTC+0 (UTC+1 verão)',
    highSeasonMonths: [6, 7, 8],
    legal: {
      ...PASSPORT_BASE,
      visaRequired: false,
      visaType: 'Isento até 6 meses (turismo)',
      insuranceRequired: false,
      vaccines: [],
      passportMinValidity: '6 meses de validade',
    },
    avgTempByMonth: { 1: 5, 2: 5, 3: 7, 4: 10, 5: 13, 6: 16, 7: 18, 8: 18, 9: 15, 10: 12, 11: 8, 12: 5 },
    climate: 'Oceânico',
  },
  'Alemanha': {
    currency: 'EUR',
    language: 'Alemão',
    timezone: 'UTC+1 (UTC+2 verão)',
    highSeasonMonths: [6, 7, 8, 12],
    legal: {
      ...PASSPORT_BASE,
      visaRequired: false,
      visaType: 'Schengen - isento até 90 dias',
      insuranceRequired: true,
      vaccines: [],
      passportMinValidity: '3 meses além da estadia',
    },
    avgTempByMonth: { 1: 1, 2: 2, 3: 6, 4: 10, 5: 15, 6: 18, 7: 20, 8: 20, 9: 16, 10: 10, 11: 5, 12: 2 },
    climate: 'Continental',
  },

  // Asia & Middle East
  'Japão': {
    currency: 'JPY',
    language: 'Japonês',
    timezone: 'UTC+9',
    highSeasonMonths: [3, 4, 10, 11],
    legal: {
      ...PASSPORT_BASE,
      visaRequired: false,
      visaType: 'Isento até 90 dias',
      insuranceRequired: false,
      vaccines: [],
      passportMinValidity: '6 meses de validade',
    },
    avgTempByMonth: { 1: 5, 2: 6, 3: 10, 4: 15, 5: 20, 6: 23, 7: 27, 8: 28, 9: 24, 10: 18, 11: 13, 12: 7 },
    climate: 'Temperado',
  },
  'Emirados Árabes': {
    currency: 'AED',
    language: 'Árabe / Inglês',
    timezone: 'UTC+4',
    highSeasonMonths: [11, 12, 1, 2, 3],
    legal: {
      ...PASSPORT_BASE,
      visaRequired: false,
      visaType: 'Isento até 90 dias',
      insuranceRequired: false,
      vaccines: [],
      passportMinValidity: '6 meses de validade',
    },
    avgTempByMonth: { 1: 19, 2: 20, 3: 23, 4: 27, 5: 32, 6: 34, 7: 36, 8: 36, 9: 33, 10: 29, 11: 25, 12: 21 },
    climate: 'Desértico',
  },

  // Africa
  'África do Sul': {
    currency: 'ZAR',
    language: 'Inglês / Africâner',
    timezone: 'UTC+2',
    highSeasonMonths: [12, 1, 2],
    legal: {
      ...PASSPORT_BASE,
      visaRequired: false,
      visaType: 'Isento até 90 dias',
      insuranceRequired: false,
      vaccines: ['Febre Amarela (recomendada)'],
      passportMinValidity: '30 dias além da estadia',
    },
    avgTempByMonth: { 1: 23, 2: 23, 3: 22, 4: 19, 5: 16, 6: 13, 7: 13, 8: 14, 9: 16, 10: 18, 11: 20, 12: 22 },
    climate: 'Subtropical',
  },

  // Oceania
  'Austrália': {
    currency: 'AUD',
    language: 'Inglês',
    timezone: 'UTC+8 a UTC+11',
    highSeasonMonths: [12, 1, 2],
    legal: {
      ...PASSPORT_BASE,
      visaRequired: true,
      visaType: 'eVisitor ou ETA',
      insuranceRequired: false,
      vaccines: [],
      passportMinValidity: '6 meses de validade',
    },
    avgTempByMonth: { 1: 25, 2: 25, 3: 23, 4: 20, 5: 17, 6: 14, 7: 13, 8: 14, 9: 17, 10: 19, 11: 22, 12: 24 },
    climate: 'Variado',
  },
};

/** All available country names sorted */
export const AVAILABLE_COUNTRIES = Object.keys(DESTINATION_DB).sort();
