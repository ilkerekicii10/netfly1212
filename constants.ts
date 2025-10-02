
import { ProductionStatus } from './types';

export const STATUS_COLORS: Record<ProductionStatus, string> = {
  'Kesim Bekleniyor': 'bg-blue-500 text-blue-100',
  'Devam Ediyor': 'bg-yellow-500 text-yellow-900',
  'Tamamlandı': 'bg-secondary text-green-900',
  'İptal Edildi': 'bg-red-600 text-red-100',
};