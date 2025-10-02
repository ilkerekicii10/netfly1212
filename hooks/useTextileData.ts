import { useMemo, useCallback, useEffect, useState } from 'react';
import { Order, StockEntry, CuttingReport, Sizes, Color, Producer, StockUsage, ProducerPerformanceStat, DefectReason } from '../types';
import { v4 as uuidv4 } from 'uuid';

const SIZES_ORDER: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
const emptySizes: Sizes = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 };

type ToastType = 'success' | 'error' | 'info' | 'undo';
type AddToastFn = (message: string, options?: { type?: ToastType; onUndo?: () => void; }) => void;


// Helper to create a consistent slug from a string
const createIdSlug = (str: string): string => {
    if (!str) return '';
    return str
        .toLocaleLowerCase('tr-TR')
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9çğıöşü]/g, '');
};

const calculateStockUsage = (orders: Order[], stockEntries: StockEntry[], cuttingReports: CuttingReport[]): StockUsage[] => {
    if (!orders || !stockEntries || !cuttingReports) return [];

    const usage: StockUsage[] = [];
    const availableStock = new Map<string, { entry: StockEntry, remainingNormal: Sizes, remainingDefective: Sizes }[]>();

    [...stockEntries]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach(entry => {
            const key = `${entry.productName}-${entry.color}`;
            if (!availableStock.has(key)) {
                availableStock.set(key, []);
            }
            availableStock.get(key)!.push({
                entry,
                remainingNormal: { ...entry.normalSizes },
                remainingDefective: { ...entry.defectiveSizes }
            });
        });

    const cutQuantitiesByGroup = new Map<string, { sizes: Sizes, productName: string, color: string }>();
    for (const report of cuttingReports) {
        if (report.isConfirmed) {
            if (!cutQuantitiesByGroup.has(report.groupId)) {
                cutQuantitiesByGroup.set(report.groupId, { sizes: { ...emptySizes }, productName: report.productName, color: report.color });
            }
            const groupData = cutQuantitiesByGroup.get(report.groupId)!;
            for (const size of SIZES_ORDER) {
                groupData.sizes[size] += report.sizes[size] || 0;
            }
        }
    }
    
    const ordersByGroup = new Map<string, Order[]>();
    for (const order of orders) {
        if (!ordersByGroup.has(order.groupId)) {
            ordersByGroup.set(order.groupId, []);
        }
        ordersByGroup.get(order.groupId)!.push(order);
    }

    const sortedGroupIds = Array.from(cutQuantitiesByGroup.keys()).sort((a, b) => {
        const dateA = new Date(ordersByGroup.get(a)?.[0]?.createdDate || 0).getTime();
        const dateB = new Date(ordersByGroup.get(b)?.[0]?.createdDate || 0).getTime();
        return dateA - dateB;
    });

    for (const groupId of sortedGroupIds) {
        const cutData = cutQuantitiesByGroup.get(groupId)!;
        const groupOrders = ordersByGroup.get(groupId) || [];
        if (groupOrders.length === 0) continue;

        const key = `${cutData.productName}-${cutData.color}`;
        const stockForKey = availableStock.get(key) || [];

        const remainingOrdered = new Map<string, Sizes>();
        groupOrders.forEach(o => remainingOrdered.set(o.id, { ...o.sizes }));

        const findOrCreateUsageEntry = (orderId: string, stockEntryId: string) => {
            let usageEntry = usage.find(u => u.orderId === orderId && u.stockEntryId === stockEntryId);
            if (!usageEntry) {
                usageEntry = {
                    id: uuidv4(),
                    orderId: orderId,
                    stockEntryId: stockEntryId,
                    usedSizes: { ...emptySizes },
                    usedNormalSizes: { ...emptySizes },
                    usedDefectiveSizes: { ...emptySizes },
                };
                usage.push(usageEntry);
            }
            return usageEntry;
        };
        
        const distributeUsage = (qty: number, isDefective: boolean, stockEntryId: string, size: keyof Sizes) => {
            let remainingToDistribute = qty;
            for (const order of groupOrders) {
                if (remainingToDistribute === 0) break;
                const orderRemaining = remainingOrdered.get(order.id)!;
                if (orderRemaining[size] > 0) {
                    const canTake = Math.min(remainingToDistribute, orderRemaining[size]);
                    const usageEntry = findOrCreateUsageEntry(order.id, stockEntryId);
                    if (isDefective) usageEntry.usedDefectiveSizes[size] += canTake;
                    else usageEntry.usedNormalSizes[size] += canTake;
                    orderRemaining[size] -= canTake;
                    remainingToDistribute -= canTake;
                }
            }
            if (remainingToDistribute > 0 && groupOrders.length > 0) {
                const usageEntry = findOrCreateUsageEntry(groupOrders[0].id, stockEntryId);
                 if (isDefective) usageEntry.usedDefectiveSizes[size] += remainingToDistribute;
                 else usageEntry.usedNormalSizes[size] += remainingToDistribute;
            }
        };

        for (const size of SIZES_ORDER) {
            let needed = cutData.sizes[size] || 0;
            if (needed === 0) continue;

            for (const stock of stockForKey) {
                if (needed === 0) break;
                const takeNormal = Math.min(needed, stock.remainingNormal[size]);
                if (takeNormal > 0) {
                    stock.remainingNormal[size] -= takeNormal;
                    needed -= takeNormal;
                    distributeUsage(takeNormal, false, stock.entry.id, size);
                }
            }
            
            if (needed > 0) {
                for (const stock of stockForKey) {
                    if (needed === 0) break;
                    const takeDefective = Math.min(needed, stock.remainingDefective[size]);
                    if (takeDefective > 0) {
                        stock.remainingDefective[size] -= takeDefective;
                        needed -= takeDefective;
                        distributeUsage(takeDefective, true, stock.entry.id, size);
                    }
                }
            }
        }
    }
    
    for (const u of usage) {
        for (const size of SIZES_ORDER) {
            u.usedSizes[size] = (u.usedNormalSizes[size] || 0) + (u.usedDefectiveSizes[size] || 0);
        }
    }

    return usage;
};

// Data container for all application state
export interface AppData {
    orders: Order[];
    allStockEntries: StockEntry[];
    cuttingReports: CuttingReport[];
    colors: Color[];
    producers: Producer[];
    defectReasons: DefectReason[];
}

export const useTextileData = (addToast: AddToastFn) => {
    const [data, setData] = useState<AppData>({
        orders: [],
        allStockEntries: [],
        cuttingReports: [],
        colors: [],
        producers: [],
        defectReasons: [],
    });
    const [isLoaded, setIsLoaded] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch('/api/all-data');
            if (response.ok) {
                const serverData = await response.json();
                setData(serverData);
            } else {
                throw new Error('Server response not OK');
            }
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
            addToast("Veri alınamadı. Sunucu bağlantısını kontrol edin.", { type: 'error' });
        } finally {
            setIsLoaded(true);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const { orders, allStockEntries, cuttingReports, colors, producers, defectReasons } = data;
    
    const stockEntries = useMemo(() => allStockEntries.filter(e => !e.isArchived), [allStockEntries]);
    
    const stockUsage = useMemo(() => calculateStockUsage(orders, stockEntries, cuttingReports), [orders, stockEntries, cuttingReports]);
    
    const derivedOrders = useMemo(() => {
        if (!isLoaded || orders.length === 0) {
            return orders;
        }

        const usageMapByGroupId = new Map<string, number>();
        const groupStockDates = new Map<string, number[]>();
        const stockEntryMap = new Map(stockEntries.map(se => [se.id, se]));

        stockUsage.forEach(su => {
            const order = orders.find(o => o.id === su.orderId);
            if (order) {
                const { groupId } = order;
                const currentTotal = usageMapByGroupId.get(groupId) || 0;
                const usageTotal = Object.values(su.usedSizes).reduce((s, q) => s + (Number(q) || 0), 0);
                usageMapByGroupId.set(groupId, currentTotal + usageTotal);

                const stockEntry = stockEntryMap.get(su.stockEntryId);
                if (stockEntry) {
                    if (!groupStockDates.has(groupId)) groupStockDates.set(groupId, []);
                    groupStockDates.get(groupId)!.push(new Date((stockEntry as StockEntry).date).getTime());
                }
            }
        });

        const cuttingConfirmedMap = new Map<string, boolean>();
        const totalCutByGroupId = new Map<string, number>();
        cuttingReports.forEach(r => {
            if (r.isConfirmed) {
                cuttingConfirmedMap.set(r.groupId, true);
                const currentCut = totalCutByGroupId.get(r.groupId) || 0;
                const reportTotal = Object.values(r.sizes).reduce((sum, qty) => sum + Number(qty), 0);
                totalCutByGroupId.set(r.groupId, currentCut + reportTotal);
            }
        });

        return orders.map(order => {
            const totalProducedForGroup = usageMapByGroupId.get(order.groupId) || 0;
            const totalCutForGroup = totalCutByGroupId.get(order.groupId) || 0;
            const isCutConfirmed = cuttingConfirmedMap.has(order.groupId);

            let newStatus = order.status;
            let newCompletionDate = order.completionDate;

            if (order.status !== 'İptal Edildi') {
                if (isCutConfirmed && totalCutForGroup > 0 && totalProducedForGroup >= totalCutForGroup) {
                    if (order.status !== 'Tamamlandı') {
                        newStatus = 'Tamamlandı';
                        const stockDates = groupStockDates.get(order.groupId);
                        if (stockDates && stockDates.length > 0) {
                            newCompletionDate = new Date(Math.max(...stockDates)).toISOString();
                        } else {
                            newCompletionDate = new Date().toISOString();
                        }
                    }
                } else {
                    if (order.status === 'Tamamlandı') {
                        newStatus = 'Devam Ediyor';
                        newCompletionDate = undefined;
                    } else if (isCutConfirmed && order.status === 'Kesim Bekleniyor') {
                        newStatus = 'Devam Ediyor';
                    }
                }
            }

            if (newStatus !== order.status || newCompletionDate !== order.completionDate) {
                return { ...order, status: newStatus, completionDate: newCompletionDate };
            }
            return order;
        });
    }, [orders, stockUsage, cuttingReports, stockEntries, isLoaded]);

    const stats = useMemo(() => {
        const uniqueGroupIds = new Set(derivedOrders.map(o => o.groupId));
        const totalOrders = uniqueGroupIds.size;
        
        const groupStatus = Array.from(uniqueGroupIds).map(groupId => {
            const ordersInGroup = derivedOrders.filter(o => o.groupId === groupId);
            if (ordersInGroup.some(o => o.status === 'İptal Edildi')) return 'İptal Edildi';
            if (ordersInGroup.some(o => o.status === 'Devam Ediyor')) return 'Devam Ediyor';
            if (ordersInGroup.some(o => o.status === 'Kesim Bekleniyor')) return 'Kesim Bekleniyor';
            return 'Tamamlandı';
        });

        const completedOrders = groupStatus.filter(s => s === 'Tamamlandı').length;
        const inProgressOrders = groupStatus.filter(s => s === 'Devam Ediyor' || s === 'Kesim Bekleniyor').length;
        const issues = groupStatus.filter(s => s === 'İptal Edildi').length;
        
        return { totalOrders, completedOrders, inProgressOrders, issues };
    }, [derivedOrders]);

    const producerPerformanceStats = useMemo((): ProducerPerformanceStat[] => {
        return producers.map((producer) => {
            const producerOrders = derivedOrders.filter(o => o.producer === producer.name);
            const completed = producerOrders.filter(o => o.status === 'Tamamlandı' && o.completionDate);
            const totalQuantity = producerOrders.reduce((sum, o) => sum + o.totalQuantity, 0);

            const completionDays = completed.map(o => 
                (new Date(o.completionDate!).getTime() - new Date(o.createdDate).getTime()) / (1000 * 3600 * 24)
            );
            const avgCompletionDays = completionDays.length > 0 
                ? Math.round(completionDays.reduce((a, b) => a + b, 0) / completionDays.length)
                : null;
            
            return {
                name: producer.name,
                completedOrders: completed.length,
                inProgressOrders: producerOrders.filter(o => o.status === 'Devam Ediyor' || o.status === 'Kesim Bekleniyor').length,
                totalOrders: producerOrders.length,
                totalQuantity,
                avgCompletionDays,
            };
        });
    }, [producers, derivedOrders]);

    const addOrders = useCallback(async (newOrdersData: Omit<Order, 'id' | 'status' | 'groupId'>[]) => {
        const date = new Date(newOrdersData[0].createdDate);
        const datePrefix = `${date.getDate().toString().padStart(2, '0')}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        const createdOrders: Order[] = [];
        const createdCuttingReports: CuttingReport[] = [];

        newOrdersData.forEach(orderData => {
            const modelSlug = createIdSlug(orderData.productName);
            const colorSlug = createIdSlug(orderData.color);
            const groupId = `${datePrefix}${modelSlug}${colorSlug}`;
            
            createdOrders.push({
                ...orderData,
                id: `${groupId}-UNASSIGNED-${uuidv4()}`,
                groupId: groupId,
                status: 'Kesim Bekleniyor',
                producer: undefined,
            });

            if (!createdCuttingReports.some(r => r.groupId === groupId) && !cuttingReports.some(r => r.groupId === groupId)) {
                 createdCuttingReports.push({
                    id: uuidv4(),
                    date: orderData.createdDate,
                    groupId: groupId,
                    productName: orderData.productName,
                    color: orderData.color,
                    sizes: { ...emptySizes },
                    isConfirmed: false,
                });
            }
        });
        
        try {
            const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newOrders: createdOrders, newCuttingReports: createdCuttingReports }) });
            if (!response.ok) throw new Error('Server error');
            setData(d => ({ ...d, orders: [...d.orders, ...createdOrders], cuttingReports: [...d.cuttingReports, ...createdCuttingReports] }));
        } catch (error) {
            console.error(error);
            addToast('Siparişler eklenemedi.', { type: 'error' });
        }
    }, [setData, addToast, cuttingReports]);

    const syncProductColorOrders = useCallback(async (originalOrders: Order[], newOrdersData: Omit<Order, 'id' | 'status' | 'groupId'>[]) => {
        if (originalOrders.length === 0 || newOrdersData.length === 0) return;

        const { groupId, productName, color, status } = originalOrders[0];
        const originalProducerMap = new Map<string, Order[]>();
        originalOrders.forEach(o => {
            const producerKey = o.producer || 'UNASSIGNED';
            if (!originalProducerMap.has(producerKey)) originalProducerMap.set(producerKey, []);
            originalProducerMap.get(producerKey)!.push(o);
        });

        const newTotalSizes = newOrdersData.reduce((acc, order) => {
            SIZES_ORDER.forEach(size => acc[size] += order.sizes[size] || 0);
            return acc;
        }, { ...emptySizes });
        
        const originalTotalAllProducers = originalOrders.reduce((sum, o) => sum + o.totalQuantity, 0);

        const updatedOrders: Order[] = [];
        originalProducerMap.forEach((orders, producer) => {
             const originalProducerTotal = orders.reduce((sum, o) => sum + o.totalQuantity, 0);
             const proportion = originalProducerTotal / originalTotalAllProducers;
             const newProducerSizes = { ...emptySizes };

             SIZES_ORDER.forEach(size => {
                 newProducerSizes[size] = Math.round((newTotalSizes[size] || 0) * proportion);
             });
             
             const totalQuantity = Object.values(newProducerSizes).reduce((sum, q) => sum + q, 0);
             if (totalQuantity > 0) {
                  updatedOrders.push({
                    id: `${groupId}-${producer}-${uuidv4()}`,
                    groupId, productName, color, createdDate: newOrdersData[0].createdDate,
                    producer: producer === 'UNASSIGNED' ? undefined : producer,
                    sizes: newProducerSizes, totalQuantity, status,
                    completionDate: originalOrders[0].completionDate
                  });
             }
        });

        try {
            const response = await fetch('/api/orders/sync', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ originalOrders, updatedOrders }) });
            if (!response.ok) throw new Error('Server error');
            const refreshedOrders = await response.json();
            setData(d => ({...d, orders: [...d.orders.filter(o => o.groupId !== groupId), ...refreshedOrders] }));
        } catch (error) {
             console.error(error);
             addToast('Sipariş güncellenemedi.', { type: 'error' });
        }
    }, [setData, addToast]);

    const deleteOrderGroup = useCallback(async (groupId: string) => {
        try {
            const response = await fetch(`/api/orders/${groupId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Server error');
            setData(d => ({
                ...d,
                orders: d.orders.filter(o => o.groupId !== groupId),
                cuttingReports: d.cuttingReports.filter(cr => cr.groupId !== groupId),
            }));
        } catch (error) {
            console.error(error);
            addToast('Sipariş grubu silinemedi.', { type: 'error' });
        }
    }, [setData, addToast]);

    const addStockEntries = useCallback(async (newEntriesData: Omit<StockEntry, 'id'>[]) => {
        const newEntries: StockEntry[] = newEntriesData.map(entry => ({...entry, id: uuidv4() }));
        try {
            const response = await fetch('/api/stock-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newEntries) });
            if (!response.ok) throw new Error('Server error');
            const savedEntries = await response.json();
            setData(d => ({ ...d, allStockEntries: [...d.allStockEntries, ...savedEntries] }));
        } catch (error) {
            console.error(error);
            addToast('Stoklar eklenemedi.', { type: 'error' });
        }
    }, [setData, addToast]);
    
    const updateStockEntry = useCallback(async (id: string, updatedData: Omit<StockEntry, 'id'>) => {
        try {
            const response = await fetch(`/api/stock-entries/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedData) });
            if (!response.ok) throw new Error('Server error');
            const savedEntry = await response.json();
            setData(d => ({ ...d, allStockEntries: d.allStockEntries.map(e => e.id === id ? savedEntry : e) }));
        } catch (error) {
            console.error(error);
            addToast('Stok kaydı güncellenemedi.', { type: 'error' });
        }
    }, [setData, addToast]);

    const archiveStockEntry = useCallback(async (id: string) => {
        try {
            await fetch(`/api/stock-entries/archive/${id}`, { method: 'PUT' });
            setData(d => ({ ...d, allStockEntries: d.allStockEntries.map(e => e.id === id ? { ...e, isArchived: true } : e) }));
        } catch (error) {
            addToast('Stok kaydı arşivlenemedi.', { type: 'error' });
        }
    }, [setData, addToast]);

    const restoreStockEntry = useCallback(async (id: string) => {
         try {
            await fetch(`/api/stock-entries/restore/${id}`, { method: 'PUT' });
            setData(d => ({ ...d, allStockEntries: d.allStockEntries.map(e => e.id === id ? { ...e, isArchived: false } : e) }));
        } catch (error) {
            addToast('Stok kaydı geri yüklenemedi.', { type: 'error' });
        }
    }, [setData, addToast]);

    const updateCuttingReports = useCallback(async (reportsToUpdate: CuttingReport[], totalCutSizes: Sizes, date: string) => {
        if (!reportsToUpdate || reportsToUpdate.length === 0) return;
        const { groupId, productName, color } = reportsToUpdate[0];
        const newReport: CuttingReport = {
            id: uuidv4(), date, groupId, productName, color, sizes: totalCutSizes, isConfirmed: true,
        };
        try {
            await fetch('/api/cutting-reports/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportsToDelete: reportsToUpdate, newReport }) });
            const reportIdsToDelete = new Set(reportsToUpdate.map(r => r.id));
            setData(d => ({ ...d, cuttingReports: [...d.cuttingReports.filter(r => !reportIdsToDelete.has(r.id)), newReport] }));
        } catch (error) {
            addToast('Kesim raporu güncellenemedi.', { type: 'error' });
        }
    }, [setData, addToast]);

    const addColor = useCallback(async (name: string) => {
        const upperName = name.trim().toUpperCase();
        try {
            const response = await fetch('/api/colors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: upperName }) });
            if (response.status === 409) return false;
            if (!response.ok) throw new Error('Server error');
            const newColor = await response.json();
            setData(d => ({ ...d, colors: [...d.colors, newColor] }));
            return true;
        } catch (error) {
            addToast('Renk eklenemedi.', { type: 'error' });
            return false;
        }
    }, [setData, addToast]);

    const addProducer = useCallback(async (producerData: Omit<Producer, 'id'>) => {
        try {
            const response = await fetch('/api/producers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(producerData) });
            if (response.status === 409) return false;
            if (!response.ok) throw new Error('Server error');
            const newProducer = await response.json();
            setData(d => ({ ...d, producers: [...d.producers, newProducer] }));
            return true;
        } catch (error) {
            addToast('Atölye eklenemedi.', { type: 'error' });
            return false;
        }
    }, [setData, addToast]);

    const updateProducer = useCallback(async (id: number, producerData: Partial<Omit<Producer, 'id'>>) => {
        try {
            await fetch(`/api/producers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(producerData) });
            setData(d => ({ ...d, producers: d.producers.map(p => p.id === id ? { ...p, ...producerData } : p) }));
        } catch (error) {
            addToast('Atölye güncellenemedi.', { type: 'error' });
        }
    }, [setData, addToast]);

    const deleteProducer = useCallback(async (id: number) => {
        try {
            const producerToDelete = producers.find(p => p.id === id);
            if (!producerToDelete) return;
            await fetch(`/api/producers/${id}`, { method: 'DELETE' });
            setData(d => ({
                ...d,
                producers: d.producers.filter(p => p.id !== id),
                orders: d.orders.map(o => o.producer === producerToDelete.name ? {...o, producer: undefined} : o)
            }));
        } catch (error) {
            addToast('Atölye silinemedi.', { type: 'error' });
        }
    }, [producers, setData, addToast]);

    const reassignMultipleParts = useCallback(async (parts: { orderId: string, size: keyof Sizes }[], newProducerName: string) => {
        const targetProducer = newProducerName === 'UNASSIGNED' ? undefined : newProducerName;
        const affectedOrderIds = new Set(parts.map(p => p.orderId));
        const affectedOrders = orders.filter(o => affectedOrderIds.has(o.id));
        if (affectedOrders.length === 0) return;

        const groupIds = new Set(affectedOrders.map(o => o.groupId));
        const allOrdersInGroups = orders.filter(o => groupIds.has(o.groupId));
        
        const nextOrders = JSON.parse(JSON.stringify(allOrdersInGroups));
        
        for (const part of parts) {
            const sourceOrder = nextOrders.find(o => o.id === part.orderId);
            if (!sourceOrder || sourceOrder.producer === targetProducer) continue;

            const quantityToMove = sourceOrder.sizes[part.size] || 0;
            if (quantityToMove === 0) continue;

            let targetOrder = nextOrders.find(o => o.groupId === sourceOrder.groupId && o.producer === targetProducer);

            if (!targetOrder) {
                targetOrder = { ...sourceOrder, id: `${sourceOrder.groupId}-${targetProducer || 'UNASSIGNED'}-${uuidv4()}`, producer: targetProducer, sizes: { ...emptySizes }, totalQuantity: 0 };
                nextOrders.push(targetOrder);
            }
            
            targetOrder.sizes[part.size] = (targetOrder.sizes[part.size] || 0) + quantityToMove;
            sourceOrder.sizes[part.size] = 0;
        }

        const finalOrders = nextOrders
            .map(order => ({ ...order, totalQuantity: SIZES_ORDER.reduce((sum, size) => sum + (order.sizes[size] || 0), 0) }))
            .filter(order => order.totalQuantity > 0);
        
        try {
            await fetch('/api/orders/reassign', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ finalOrders, groupIds: Array.from(groupIds) }) });
            setData(d => ({ ...d, orders: [...d.orders.filter(o => !groupIds.has(o.groupId)), ...finalOrders] }));
        } catch (error) {
             addToast('Atama yapılamadı.', { type: 'error' });
        }
    }, [orders, setData, addToast]);
    
    const addDefectReason = useCallback(async (name: string) => {
        const upperName = name.trim().toUpperCase();
        try {
            const response = await fetch('/api/defect_reasons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: upperName }) });
            if (response.status === 409) return false;
            if (!response.ok) throw new Error('Server error');
            const newReason = await response.json();
            setData(d => ({ ...d, defectReasons: [...d.defectReasons, newReason] }));
            return true;
        } catch (error) {
            addToast('Defo nedeni eklenemedi.', { type: 'error' });
            return false;
        }
    }, [setData, addToast]);

    const updateDefectReason = useCallback(async (id: number, newName: string) => {
        try {
            const upperNewName = newName.trim().toUpperCase();
            await fetch(`/api/defect_reasons/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: upperNewName }) });
            setData(d => ({ ...d, defectReasons: d.defectReasons.map(r => r.id === id ? { ...r, name: upperNewName } : r) }));
        } catch (error) {
            addToast('Defo nedeni güncellenemedi.', { type: 'error' });
        }
    }, [setData, addToast]);
    
    const deleteDefectReason = useCallback(async (id: number) => {
       try {
            const reasonToDelete = defectReasons.find(r => r.id === id);
            if (!reasonToDelete) return;
            await fetch(`/api/defect_reasons/${id}`, { method: 'DELETE' });
            setData(d => ({
                ...d,
                defectReasons: d.defectReasons.filter(r => r.id !== id),
                allStockEntries: d.allStockEntries.map(e => e.defectReason === reasonToDelete.name ? {...e, defectReason: undefined} : e)
            }));
       } catch (error) {
           addToast('Defo nedeni silinemedi.', { type: 'error' });
       }
    }, [defectReasons, setData, addToast]);
    
    const importData = useCallback(async (importedData: AppData) => {
        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(importedData)
            });
            return response.ok;
        } catch(e) {
            console.error("Import failed", e);
            return false;
        }
    }, []);

    return {
        orders: derivedOrders,
        stats,
        producerPerformanceStats,
        stockEntries,
        allStockEntries,
        cuttingReports,
        stockUsage,
        colors,
        producers,
        defectReasons,
        addOrders,
        syncProductColorOrders,
        deleteOrderGroup,
        addStockEntries,
        updateStockEntry,
        archiveStockEntry,
        restoreStockEntry,
        updateCuttingReports,
        addColor,
        addProducer,
        updateProducer,
        deleteProducer,
        reassignMultipleParts,
        addDefectReason,
        updateDefectReason,
        deleteDefectReason,
        importData,
    };
};