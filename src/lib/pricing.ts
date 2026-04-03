// ══════════════════════════════════════════
// CapeLoad Pricing Engine
// Western Cape market rates 2025-2026
// Commission: platform takes 15-22% per trip
// ══════════════════════════════════════════

export type VehicleType = 'motorbike' | 'bakkie' | 'panel-van' | '4-ton' | '8-ton' | 'flatbed';
export type JobType = 'move' | 'courier' | 'haul';

export interface VehiclePricing {
  base: number;
  perKm: number;
  minFare: number;
  commission: number;
  label: string;
  capacity: string;
}

export interface Quote {
  total: number;
  base: number;
  distanceCost: number;
  commission: number;
  commissionRate: number;
  driverPayout: number;
  distanceKm: number;
}

export const PRICING_TABLE: Record<VehicleType, VehiclePricing> = {
  motorbike:   { base: 85,   perKm: 9,   minFare: 85,   commission: 0.15, label: 'Motorbike',       capacity: 'Up to 30 kg' },
  bakkie:      { base: 350,  perKm: 15,  minFare: 350,  commission: 0.18, label: 'Bakkie / LDV',    capacity: 'Up to 1 ton' },
  'panel-van': { base: 550,  perKm: 19,  minFare: 550,  commission: 0.18, label: 'Panel Van',       capacity: 'Up to 2 tons' },
  '4-ton':     { base: 1500, perKm: 27,  minFare: 1500, commission: 0.20, label: '4-Ton Truck',     capacity: 'Up to 4 tons' },
  '8-ton':     { base: 3000, perKm: 38,  minFare: 3000, commission: 0.20, label: '8-Ton Truck',     capacity: 'Up to 8 tons' },
  flatbed:     { base: 5500, perKm: 50,  minFare: 5500, commission: 0.22, label: 'Flatbed / Super', capacity: '8+ tons' },
};

export const JOB_NAMES: Record<JobType, string> = {
  move: 'Move',
  courier: 'Courier',
  haul: 'Haul',
};

export const JOB_SUGGESTIONS: Record<JobType, string> = {
  move: 'For moves, we recommend a <strong>Panel Van</strong> or larger',
  courier: 'For courier jobs, a <strong>Motorbike</strong> or <strong>Bakkie</strong> works best',
  haul: 'For haul jobs, we recommend a <strong>4-Ton Truck</strong> or larger',
};

export const VEHICLE_TYPES: VehicleType[] = ['motorbike', 'bakkie', 'panel-van', '4-ton', '8-ton', 'flatbed'];

export function calculateQuote(vehicleType: VehicleType, distanceKm: number): Quote {
  const p = PRICING_TABLE[vehicleType];

  const distanceCost = distanceKm * p.perKm;
  const subtotal = Math.max(p.base + distanceCost, p.minFare);
  const total = Math.ceil(subtotal / 10) * 10;
  const commission = Math.round(total * p.commission);
  const driverPayout = total - commission;

  return {
    total,
    base: p.base,
    distanceCost: Math.round(distanceCost),
    commission,
    commissionRate: p.commission,
    driverPayout,
    distanceKm,
  };
}

export function generateBookingRef(): string {
  return 'CL-' + String(Math.floor(Math.random() * 900000) + 100000);
}
