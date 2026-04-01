export interface EmergencyInfo {
  police: string;
  ambulance: string;
  fire: string;
  generalEmergency: string;
  brazilianEmbassy?: { address: string; phone: string; city: string };
  usefulPhrases?: { phrase: string; translation: string }[];
}

export const EMERGENCY_DATA: Record<string, EmergencyInfo> = {
  'Brasil': {
    police: '190',
    ambulance: '192',
    fire: '193',
    generalEmergency: '190',
  },
  'Argentina': {
    police: '101',
    ambulance: '107',
    fire: '100',
    generalEmergency: '911',
    brazilianEmbassy: { address: 'Cerrito 1350, Buenos Aires', phone: '+54 11 4515-2400', city: 'Buenos Aires' },
    usefulPhrases: [
      { phrase: 'Necesito ayuda', translation: 'Preciso de ajuda' },
      { phrase: 'Llame una ambulancia', translation: 'Chame uma ambulância' },
      { phrase: 'Llame a la policía', translation: 'Chame a polícia' },
    ],
  },
  'Chile': {
    police: '133',
    ambulance: '131',
    fire: '132',
    generalEmergency: '133',
    brazilianEmbassy: { address: 'Alonso Ovalle 1665, Santiago', phone: '+56 2 2879-4400', city: 'Santiago' },
    usefulPhrases: [
      { phrase: 'Necesito ayuda', translation: 'Preciso de ajuda' },
      { phrase: 'Llame una ambulancia', translation: 'Chame uma ambulância' },
    ],
  },
  'Uruguai': {
    police: '109',
    ambulance: '105',
    fire: '104',
    generalEmergency: '911',
    brazilianEmbassy: { address: 'Bulevar Artigas 1394, Montevidéu', phone: '+598 2 707-2119', city: 'Montevidéu' },
  },
  'Colômbia': {
    police: '112',
    ambulance: '125',
    fire: '119',
    generalEmergency: '123',
    brazilianEmbassy: { address: 'Calle 93 No. 14-20, Bogotá', phone: '+57 1 218-0800', city: 'Bogotá' },
  },
  'Peru': {
    police: '105',
    ambulance: '116',
    fire: '116',
    generalEmergency: '105',
    brazilianEmbassy: { address: 'Av. José Pardo 850, Lima', phone: '+51 1 512-0830', city: 'Lima' },
  },
  'Estados Unidos': {
    police: '911',
    ambulance: '911',
    fire: '911',
    generalEmergency: '911',
    brazilianEmbassy: { address: '3006 Massachusetts Ave NW, Washington DC', phone: '+1 202 238-2700', city: 'Washington DC' },
    usefulPhrases: [
      { phrase: 'I need help', translation: 'Preciso de ajuda' },
      { phrase: 'Call an ambulance', translation: 'Chame uma ambulância' },
      { phrase: 'Call the police', translation: 'Chame a polícia' },
      { phrase: 'I need a doctor', translation: 'Preciso de um médico' },
    ],
  },
  'Canadá': {
    police: '911',
    ambulance: '911',
    fire: '911',
    generalEmergency: '911',
    brazilianEmbassy: { address: '450 Wilbrod St, Ottawa', phone: '+1 613 237-1090', city: 'Ottawa' },
  },
  'México': {
    police: '911',
    ambulance: '911',
    fire: '911',
    generalEmergency: '911',
    brazilianEmbassy: { address: 'Lope de Armendáriz 130, Cidade do México', phone: '+52 55 5201-4530', city: 'Cidade do México' },
  },
  'Portugal': {
    police: '112',
    ambulance: '112',
    fire: '112',
    generalEmergency: '112',
    brazilianEmbassy: { address: 'Estrada das Laranjeiras 144, Lisboa', phone: '+351 21 724-8510', city: 'Lisboa' },
    usefulPhrases: [
      { phrase: 'Preciso de ajuda', translation: 'Preciso de ajuda' },
      { phrase: 'Chame uma ambulância', translation: 'Chame uma ambulância' },
    ],
  },
  'Espanha': {
    police: '091',
    ambulance: '112',
    fire: '080',
    generalEmergency: '112',
    brazilianEmbassy: { address: 'Calle Fernando el Santo 6, Madri', phone: '+34 91 700-4650', city: 'Madri' },
    usefulPhrases: [
      { phrase: 'Necesito ayuda', translation: 'Preciso de ajuda' },
      { phrase: 'Llame una ambulancia', translation: 'Chame uma ambulância' },
      { phrase: 'Llame a la policía', translation: 'Chame a polícia' },
    ],
  },
  'França': {
    police: '17',
    ambulance: '15',
    fire: '18',
    generalEmergency: '112',
    brazilianEmbassy: { address: '34 Cours Albert 1er, Paris', phone: '+33 1 4561-6300', city: 'Paris' },
    usefulPhrases: [
      { phrase: "J'ai besoin d'aide", translation: 'Preciso de ajuda' },
      { phrase: 'Appelez une ambulance', translation: 'Chame uma ambulância' },
      { phrase: 'Appelez la police', translation: 'Chame a polícia' },
      { phrase: "Je ne parle pas français", translation: 'Não falo francês' },
    ],
  },
  'Itália': {
    police: '113',
    ambulance: '118',
    fire: '115',
    generalEmergency: '112',
    brazilianEmbassy: { address: 'Piazza Navona 14, Roma', phone: '+39 06 6838-8800', city: 'Roma' },
    usefulPhrases: [
      { phrase: 'Ho bisogno di aiuto', translation: 'Preciso de ajuda' },
      { phrase: "Chiamate un'ambulanza", translation: 'Chame uma ambulância' },
      { phrase: 'Chiamate la polizia', translation: 'Chame a polícia' },
    ],
  },
  'Inglaterra': {
    police: '999',
    ambulance: '999',
    fire: '999',
    generalEmergency: '999',
    brazilianEmbassy: { address: '14-16 Cockspur St, Londres', phone: '+44 20 7747-4500', city: 'Londres' },
    usefulPhrases: [
      { phrase: 'I need help', translation: 'Preciso de ajuda' },
      { phrase: 'Call an ambulance', translation: 'Chame uma ambulância' },
    ],
  },
  'Alemanha': {
    police: '110',
    ambulance: '112',
    fire: '112',
    generalEmergency: '112',
    brazilianEmbassy: { address: 'Wallstraße 57, Berlim', phone: '+49 30 7262-8320', city: 'Berlim' },
    usefulPhrases: [
      { phrase: 'Ich brauche Hilfe', translation: 'Preciso de ajuda' },
      { phrase: 'Rufen Sie einen Krankenwagen', translation: 'Chame uma ambulância' },
      { phrase: 'Rufen Sie die Polizei', translation: 'Chame a polícia' },
      { phrase: 'Ich spreche kein Deutsch', translation: 'Não falo alemão' },
    ],
  },
  'Japão': {
    police: '110',
    ambulance: '119',
    fire: '119',
    generalEmergency: '110',
    brazilianEmbassy: { address: '2-11-2 Kita Aoyama, Tóquio', phone: '+81 3 3404-5211', city: 'Tóquio' },
    usefulPhrases: [
      { phrase: '助けてください (Tasukete kudasai)', translation: 'Ajude-me, por favor' },
      { phrase: '救急車を呼んでください (Kyuukyuusha wo yonde kudasai)', translation: 'Chame uma ambulância' },
      { phrase: '日本語が話せません (Nihongo ga hanasemasen)', translation: 'Não falo japonês' },
    ],
  },
  'Emirados Árabes': {
    police: '999',
    ambulance: '998',
    fire: '997',
    generalEmergency: '999',
    brazilianEmbassy: { address: 'Al Salam Tower, Abu Dhabi', phone: '+971 2 632-7073', city: 'Abu Dhabi' },
    usefulPhrases: [
      { phrase: 'I need help', translation: 'Preciso de ajuda (inglês funciona)' },
    ],
  },
  'África do Sul': {
    police: '10111',
    ambulance: '10177',
    fire: '10111',
    generalEmergency: '112',
    brazilianEmbassy: { address: 'Hillcrest Office Park, Pretória', phone: '+27 12 366-5200', city: 'Pretória' },
  },
  'Austrália': {
    police: '000',
    ambulance: '000',
    fire: '000',
    generalEmergency: '000',
    brazilianEmbassy: { address: '19 Forster Crescent, Canberra', phone: '+61 2 6273-2372', city: 'Canberra' },
    usefulPhrases: [
      { phrase: 'I need help', translation: 'Preciso de ajuda' },
      { phrase: 'Call an ambulance', translation: 'Chame uma ambulância' },
    ],
  },
};
