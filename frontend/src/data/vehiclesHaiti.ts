/**
 * Marques et modèles de véhicules courants en Haïti (machin ak moto).
 * Utilisé pour l'autosélection à l'ajout d'un véhicule chauffeur.
 */

export type VehicleKind = 'car' | 'moto';

export const VEHICLES_HAITI: Record<VehicleKind, Record<string, string[]>> = {
  car: {
    Toyota: ['Corolla', 'Camry', 'Hilux', 'RAV4', 'Yaris', 'Land Cruiser', 'Prado', 'Avalon', 'Highlander', 'Fortuner', 'Innova'],
    Nissan: ['Sentra', 'Versa', 'Altima', 'Tiida', 'X-Trail', 'Navara', 'Patrol', 'Kicks', 'March', 'Frontier'],
    Honda: ['Civic', 'Accord', 'CR-V', 'Fit', 'City', 'HR-V', 'Pilot', 'BR-V'],
    Hyundai: ['Accent', 'Elantra', 'Tucson', 'Santa Fe', 'Sonata', 'Creta', 'i10', 'i20', 'Kona'],
    Kia: ['Rio', 'Optima', 'Sportage', 'Sorento', 'Picanto', 'Cerato', 'Seltos', 'Stonic'],
    Chevrolet: ['Spark', 'Onix', 'Prisma', 'Tracker', 'Captiva', 'S10', 'Colorado', 'Silverado', 'Aveo', 'Cruze'],
    Mitsubishi: ['L200', 'Lancer', 'Outlander', 'Pajero', 'Montero', 'ASX', 'Eclipse Cross', 'Triton'],
    Suzuki: ['Swift', 'Baleno', 'Vitara', 'Jimny', 'Ertiga', 'Alto', 'Celerio', 'Grand Vitara', 'APV'],
    Ford: ['Ranger', 'Explorer', 'F-150', 'EcoSport', 'Focus', 'Fiesta', 'Edge', 'Everest'],
    Isuzu: ['D-Max', 'MU-X', 'Trooper', 'Rodeo', 'NQR'],
    Mazda: ['2', '3', '6', 'CX-3', 'CX-5', 'CX-30', 'BT-50'],
    Daihatsu: ['Terios', 'Sirion', 'Xenia', 'Gran Max'],
    Peugeot: ['208', '301', '308', '2008', '3008', 'Partner'],
    Renault: ['Sandero', 'Logan', 'Duster', 'Kwid', 'Oroch', 'Stepway'],
    Volkswagen: ['Gol', 'Voyage', 'Saveiro', 'Amarok', 'T-Cross', 'Polo'],
    Fiat: ['Uno', 'Palio', 'Strada', 'Toro', 'Mobi', 'Argo'],
    Jeep: ['Compass', 'Renegade', 'Wrangler', 'Cherokee', 'Grand Cherokee'],
    'Land Rover': ['Defender', 'Discovery', 'Range Rover Evoque', 'Freelander'],
    BMW: ['Serie 3', 'Serie 5', 'X1', 'X3', 'X5'],
    Mercedes: ['Classe A', 'Classe C', 'Classe E', 'GLA', 'GLC', 'Sprinter'],
    Audi: ['A3', 'A4', 'Q3', 'Q5'],
    Autre: ['Lòt'],
  },
  moto: {
    Honda: ['CBR', 'CB', 'XR', 'CG', 'Biz', 'PCX', 'ADV', 'Africa Twin', 'Wave', 'Click', 'Lead', 'Shine', 'CB150R'],
    Yamaha: ['YZF', 'FZ', 'R15', 'MT', 'Crypton', 'Jupiter', 'Nmax', 'Aerox', 'Fascino', 'Ray', 'Alpha'],
    Suzuki: ['GSX', 'V-Strom', 'Burgman', 'Address', 'Access', 'Hayate', 'Gixxer'],
    Bajaj: ['Pulsar', 'Discover', 'Boxer', 'Dominar', 'Avenger', 'CT', 'Platina'],
    TVS: ['Apache', 'Star', 'Sport', 'Jupiter', 'Wego', 'NTorq', 'Ronin'],
    Kymco: ['Agility', 'Super', 'People', 'Grand', 'Like', 'AK'],
    Haojue: ['HJ', 'Suzuki (Haojue)'],
    Keeway: ['Superlight', 'Blackster', 'RKF', 'RKS'],
    Lifan: ['KPR', 'KP', 'LF'],
    Zontes: ['310', '350'],
    'Royal Enfield': ['Classic', 'Hunter', 'Himalayan', 'Meteor'],
    Kawasaki: ['Ninja', 'Z', 'Versys', 'KLX'],
    Sym: ['Jet', 'Orbit', 'Symphony', 'Fiddle'],
    Dayang: ['DY', 'Moto'],
    Boxer: ['BM', 'BS'],
    Autre: ['Lòt'],
  },
};

export function getBrands(kind: VehicleKind): string[] {
  return Object.keys(VEHICLES_HAITI[kind]);
}

export function getModels(kind: VehicleKind, brand: string): string[] {
  return VEHICLES_HAITI[kind][brand] || [];
}
