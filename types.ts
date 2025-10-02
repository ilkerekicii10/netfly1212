export type ProductionStatus = 'Kesim Bekleniyor' | 'Devam Ediyor' | 'Tamamlandı' | 'İptal Edildi';

export type Sizes = {
  xs: number;
  s: number;
  m: number;
  l: number;
  xl: number;
  xxl: number;
};

export interface Order {
  id: string; // Unique primary key for the DB record (e.g., GROUPID-PRODUCER)
  groupId: string; // User-facing "Emir No", groups parts of the same order
  createdDate: string;
  completionDate?: string; // Siparişin tamamlandığı tarih
  productName: string;
  color: string;
  producer?: string; // Hangi atölyenin ürettiği bilgisi
  sizes: Sizes;
  totalQuantity: number;
  status: ProductionStatus;
}

export interface DefectReason {
    id: number;
    name: string;
}

export interface StockEntry {
  id:string;
  date: string;
  productName: string;
  color: string;
  producer?: string;
  normalSizes: Sizes;
  defectiveSizes: Sizes;
  defectReason?: string;
  isArchived?: boolean;
}

export interface CuttingReport {
  id: string;
  date: string;
  groupId: string;
  productName: string;
  color: string;
  sizes: Sizes;
  isConfirmed: boolean;
}

export interface StockUsage {
  id: string;
  orderId: string;
  stockEntryId: string;
  usedSizes: Sizes; // Total used (normal + defective)
  usedNormalSizes: Sizes;
  usedDefectiveSizes: Sizes;
}

export type Theme = 'light' | 'dark';

export interface ProducerPerformanceStat {
    name: string;
    completedOrders: number;
    inProgressOrders: number;
    totalOrders: number;
    totalQuantity: number;
    avgCompletionDays: number | null;
}


export interface Color {
    id?: number;
    name: string;
}

export interface Producer {
    id?: number;
    name: string;
    contactPerson?: string;
    phone?: string;
    address?: string;
}

export type View = 'dashboard' | 'orders' | 'orderDetail' | 'cuttingReport' | 'stockRecords' | 'orderEntry' | 'stockEntry' | 'editOrder' | 'editStockEntry' | 'editCuttingReport' | 'workshopManagement' | 'defectManagement' | 'dataManagement' | 'cuttingReportDetail';