import { Order, StockEntry, CuttingReport, Color, Producer, DefectReason } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ================================================================= //
// =================== MOCK DATA INITIALIZATION ==================== //
// ================================================================= //
// This data simulates what would be fetched from a server API.

export const MOCK_PRODUCERS: Producer[] = [
    { id: 1, name: 'ATÖLYE A', contactPerson: 'Ahmet Yılmaz', phone: '555-111-2233', address: 'İstanbul' },
    { id: 2, name: 'ATÖLYE B', contactPerson: 'Ayşe Kaya', phone: '555-444-5566', address: 'Bursa' },
    { id: 3, name: 'ATÖLYE C', contactPerson: 'Mehmet Öztürk', phone: '555-777-8899', address: 'İzmir' },
];

export const MOCK_COLORS: Color[] = [
    { id: 1, name: 'SİYAH' },
    { id: 2, name: 'BEYAZ' },
    { id: 3, name: 'LACİVERT' },
    { id: 4, name: 'ANTRASİT' },
    { id: 5, name: 'KIRMIZI' },
];

export const MOCK_DEFECT_REASONS: DefectReason[] = [
    { id: 1, name: 'DİKİŞ HATASI' },
    { id: 2, name: 'KUMAŞ DEFOSU' },
    { id: 3, name: 'BASKI/NAKIŞ HATASI' },
    { id: 4, name: 'LEKE' },
    { id: 5, name: 'ÖLÇÜ HATASI' },
];

const today = new Date();
const d = (days: number) => new Date(today.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

// --- Order Group 1: FT-SİYAH (In Progress) ---
const groupId1 = `2807ftsiyah`;
export const MOCK_ORDERS: Order[] = [
    {
        id: `${groupId1}-ATÖLYEA-${uuidv4()}`,
        groupId: groupId1,
        createdDate: d(15),
        productName: 'FRENCH TERRY',
        color: 'SİYAH',
        producer: 'ATÖLYE A',
        sizes: { xs: 10, s: 20, m: 30, l: 0, xl: 0, xxl: 0 },
        totalQuantity: 60,
        status: 'Devam Ediyor',
    },
    {
        id: `${groupId1}-ATÖLYEB-${uuidv4()}`,
        groupId: groupId1,
        createdDate: d(15),
        productName: 'FRENCH TERRY',
        color: 'SİYAH',
        producer: 'ATÖLYE B',
        sizes: { xs: 0, s: 0, m: 0, l: 25, xl: 15, xxl: 5 },
        totalQuantity: 45,
        status: 'Devam Ediyor',
    },
    // --- Order Group 2: FT-BEYAZ (Completed) ---
    {
        id: `2507ftbeyaz-ATÖLYEA-${uuidv4()}`,
        groupId: '2507ftbeyaz',
        createdDate: d(20),
        completionDate: d(5),
        productName: 'FRENCH TERRY',
        color: 'BEYAZ',
        producer: 'ATÖLYE A',
        sizes: { xs: 15, s: 25, m: 35, l: 25, xl: 15, xxl: 5 },
        totalQuantity: 120,
        status: 'Tamamlandı',
    },
    // --- Order Group 3: SÜPREM-LACİVERT (Cutting Pending) ---
     {
        id: `0108supremlacivert-UNASSIGNED-${uuidv4()}`,
        groupId: '0108supremlacivert',
        createdDate: d(2),
        productName: 'SÜPREM',
        color: 'LACİVERT',
        producer: undefined,
        sizes: { xs: 50, s: 50, m: 50, l: 50, xl: 50, xxl: 50 },
        totalQuantity: 300,
        status: 'Kesim Bekleniyor',
    },
];

export const MOCK_CUTTING_REPORTS: CuttingReport[] = [
    {
        id: uuidv4(),
        date: d(14),
        groupId: groupId1, // For FT-SİYAH
        productName: 'FRENCH TERRY',
        color: 'SİYAH',
        sizes: { xs: 10, s: 20, m: 30, l: 25, xl: 15, xxl: 5 },
        isConfirmed: true,
    },
    {
        id: uuidv4(),
        date: d(19),
        groupId: '2507ftbeyaz', // For FT-BEYAZ
        productName: 'FRENCH TERRY',
        color: 'BEYAZ',
        sizes: { xs: 15, s: 25, m: 35, l: 25, xl: 15, xxl: 5 },
        isConfirmed: true,
    },
    {
        id: uuidv4(),
        date: d(1),
        groupId: '0108supremlacivert', // For SÜPREM-LACİVERT
        productName: 'SÜPREM',
        color: 'LACİVERT',
        sizes: { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 },
        isConfirmed: false,
    },
];

export const MOCK_STOCK_ENTRIES: StockEntry[] = [
    // Stock for FT-SİYAH order
    {
        id: uuidv4(),
        date: d(10),
        productName: 'FRENCH TERRY',
        color: 'SİYAH',
        normalSizes: { xs: 10, s: 20, m: 28, l: 25, xl: 15, xxl: 5 },
        defectiveSizes: { xs: 0, s: 0, m: 2, l: 0, xl: 0, xxl: 0 },
        defectReason: 'KUMAŞ DEFOSU',
        isArchived: false,
    },
    // Stock for FT-BEYAZ order
    {
        id: uuidv4(),
        date: d(8),
        productName: 'FRENCH TERRY',
        color: 'BEYAZ',
        normalSizes: { xs: 15, s: 25, m: 35, l: 25, xl: 15, xxl: 5 },
        defectiveSizes: { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 },
        isArchived: false,
    },
    // Extra stock
    {
        id: uuidv4(),
        date: d(5),
        productName: 'SÜPREM',
        color: 'ANTRASİT',
        normalSizes: { xs: 100, s: 150, m: 200, l: 150, xl: 100, xxl: 50 },
        defectiveSizes: { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 },
        isArchived: false,
    },
     // Archived stock
    {
        id: uuidv4(),
        date: d(30),
        productName: 'PİKE',
        color: 'KIRMIZI',
        normalSizes: { xs: 10, s: 10, m: 10, l: 10, xl: 10, xxl: 10 },
        defectiveSizes: { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 },
        isArchived: true,
    },
];