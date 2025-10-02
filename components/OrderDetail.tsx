
import React, { useMemo, useState, useEffect } from 'react';
import { Order, Sizes, StockUsage, CuttingReport, StockEntry, Producer, ProductionStatus } from '../types';
import { ArrowUturnLeftIcon, FactoryIcon, CalendarDaysIcon, UsersIcon, ArrowRightIcon, CuttingIcon, InformationCircleIcon, LoadingSpinnerIcon, CheckCircleIcon } from './icons/Icons';

interface OrderDetailProps {
    orders: Order[];
    stockUsage: StockUsage[];
    cuttingReports: CuttingReport[];
    stockEntries: StockEntry[];
    producers: Producer[];
    onClose: () => void;
    onReassign: (parts: { orderId: string, size: keyof Sizes }[], newProducer: string) => void;
    onViewCuttingReport: (groupId: string) => void;
    addToast: (message: string, options?: { type?: 'success' | 'error' | 'info' }) => void;
}

const SIZES_ORDER: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
const emptySizes: Sizes = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 };

const OrderDetail: React.FC<OrderDetailProps> = ({ orders, stockUsage, cuttingReports, stockEntries, producers, onClose, onReassign, onViewCuttingReport, addToast }) => {
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [selectedProducer, setSelectedProducer] = useState<string>('');
    const [isReassigning, setIsReassigning] = useState(false);

    // This effect handles resetting the loading state. When the `orders` prop changes
    // (which it will after a successful reassignment), it means the operation is
    // complete, and we can re-enable the button.
    useEffect(() => {
        if (isReassigning) {
            setIsReassigning(false);
        }
    }, [orders]);


    const summary = useMemo(() => {
        if (!orders || orders.length === 0) return null;
        const representativeOrder = orders[0];
        const groupId = representativeOrder.groupId;

        const totalOrdered = orders.reduce((sum, o) => sum + o.totalQuantity, 0);
        
        const orderIds = new Set(orders.map(o => o.id));
        const totalProduced = stockUsage
            .filter(su => orderIds.has(su.orderId))
            // FIX: Explicitly cast value to a number in reduce function to prevent type error.
            .reduce((sum, su) => sum + Object.values(su.usedSizes).reduce((s, q) => s + (Number(q) || 0), 0), 0);
            
        const totalCut = cuttingReports
            .filter(cr => cr.groupId === groupId && cr.isConfirmed)
            // FIX: Explicitly cast value to a number in reduce function to prevent type error.
            .reduce((sum, report) => sum + Object.values(report.sizes).reduce((s, q) => s + Number(q), 0), 0);

        const totalRemaining = totalCut - totalProduced;
        const completionPercentage = totalCut > 0 ? Math.round((totalProduced / totalCut) * 100) : 0;
        
        // Determine overall status
        let status: ProductionStatus = 'Tamamlandı';
        if (orders.some(o => o.status === 'İptal Edildi')) {
          status = 'İptal Edildi';
        } else if (orders.some(o => o.status === 'Devam Ediyor')) {
          status = 'Devam Ediyor';
        } else if (orders.some(o => o.status === 'Kesim Bekleniyor')) {
          status = 'Kesim Bekleniyor';
        }
        
        // Find the earliest creation date and latest completion date for accuracy
        const earliestCreatedTimestamp = Math.min(...orders.map(o => new Date(o.createdDate).getTime()));
        const latestCompletionTimestamp = status === 'Tamamlandı'
          ? Math.max(...orders.map(o => o.completionDate ? new Date(o.completionDate).getTime() : 0).filter(t => t > 0))
          : 0;

        let completionDuration: number | null = null;
        if (latestCompletionTimestamp > 0) {
            const start = earliestCreatedTimestamp;
            const end = latestCompletionTimestamp;
            const duration = (end - start) / (1000 * 60 * 60 * 24);
            // Ensure duration is at least 1 day if completed
            completionDuration = Math.max(1, Math.round(duration)); 
        }
        
        return {
            groupId,
            productName: representativeOrder.productName,
            color: representativeOrder.color,
            createdDate: new Date(earliestCreatedTimestamp).toISOString(),
            totalOrdered,
            totalProduced,
            totalCut,
            totalRemaining,
            completionPercentage,
            status,
            completionDuration
        };
    }, [orders, stockUsage, cuttingReports]);
    
    const cuttingSummary = useMemo(() => {
        if (!summary) return null;
        
        const reportsForGroup = cuttingReports.filter(report => report.groupId === summary.groupId);
        if (reportsForGroup.length === 0) return { cutSizes: { ...emptySizes }, totalCut: 0, earliestDate: null, isCut: false };

        const cutSizes = reportsForGroup.reduce((acc, report) => {
             SIZES_ORDER.forEach(size => {
                acc[size] = (acc[size] || 0) + (report.sizes[size] || 0);
            });
            return acc;
        }, { ...emptySizes } as Sizes);

        const totalCut = Object.values(cutSizes).reduce((sum, qty) => sum + qty, 0);

        const earliestDate = reportsForGroup
            .filter(r => r.isConfirmed)
            .reduce((earliest, report) => {
                const reportDate = new Date(report.date);
                return !earliest || reportDate < earliest ? reportDate : earliest;
            }, null as Date | null);

        return {
            cutSizes,
            totalCut,
            earliestDate,
            isCut: totalCut > 0 && reportsForGroup.some(r => r.isConfirmed)
        };
    }, [cuttingReports, summary]);

    const isCuttingConfirmed = cuttingSummary?.isCut ?? false;

    const stockEntryMap = useMemo(() => {
        const map = new Map<string, StockEntry>();
        stockEntries.forEach(se => map.set(se.id, se));
        return map;
    }, [stockEntries]);

    const sortedDetails = useMemo(() => {
        const details: {
            key: string; // Unique key for each size row, e.g., "ORDERID-s"
            orderId: string;
            size: keyof Sizes;
            producer: string;
            ordered: number;
            cut: number;
            produced: number;
            remaining: number;
            percentage: number;
            stockUsageDetails: Array<{ date: string; qty: number; isDefective: boolean }>;
        }[] = [];

        orders.forEach(order => {
            SIZES_ORDER.forEach(size => {
                const ordered = order.sizes[size] || 0;
                if (ordered > 0) {
                    // FIX: Explicitly cast values to numbers in reduce function to prevent type error.
                    const produced = stockUsage
                        .filter(su => su.orderId === order.id)
                        .reduce((sum, su) => sum + (Number(su.usedNormalSizes[size] || 0) + Number(su.usedDefectiveSizes[size] || 0)), 0);

                    const cutForSize = cuttingSummary?.cutSizes[size] || 0;
                    const remaining = cutForSize - produced;
                    const percentage = cutForSize > 0 ? Math.floor((produced / cutForSize) * 100) : 0;
                    
                    const stockUsageDetails = stockUsage
                        .filter(su => su.orderId === order.id)
                        .flatMap(su => {
                            const details: { date: string; qty: number; isDefective: boolean }[] = [];
                            const stockEntry = stockEntryMap.get(su.stockEntryId);
                            if (!stockEntry) return [];

                            const usedNormal = su.usedNormalSizes[size] || 0;
                            // FIX: Explicitly cast value to a number in conditional to prevent type error.
                            if (Number(usedNormal) > 0) {
                                details.push({ date: stockEntry.date, qty: usedNormal, isDefective: false });
                            }
                            
                            const usedDefective = su.usedDefectiveSizes[size] || 0;
                            if (usedDefective > 0) {
                                details.push({ date: stockEntry.date, qty: usedDefective, isDefective: true });
                            }
                            
                            return details;
                        })
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    details.push({
                        key: `${order.id}-${size}`, // Unique key per size
                        orderId: order.id,
                        size,
                        producer: order.producer || 'Atanmamış',
                        ordered,
                        cut: cutForSize,
                        produced,
                        remaining,
                        percentage,
                        stockUsageDetails
                    });
                }
            });
        });

        // Sort primarily by size order, then by producer
        details.sort((a, b) => {
            const sizeIndexA = SIZES_ORDER.indexOf(a.size);
            const sizeIndexB = SIZES_ORDER.indexOf(b.size);

            if (sizeIndexA !== sizeIndexB) {
                return sizeIndexA - sizeIndexB;
            }
            return a.producer.localeCompare(b.producer);
        });

        return details;

    }, [orders, stockUsage, stockEntryMap, cuttingSummary]);

    const allPartKeys = useMemo(() => 
        sortedDetails.map(part => part.key),
        [sortedDetails]
    );

    const handleSelectPart = (key: string) => {
        setSelectedKeys(prev => {
            if (prev.includes(key)) {
                return prev.filter(k => k !== key);
            } else {
                return [...prev, key];
            }
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedKeys(allPartKeys);
        } else {
            setSelectedKeys([]);
        }
    };

    const handleReassignClick = () => {
        if (!isCuttingConfirmed || isReassigning) return;
        if (!selectedProducer) {
            addToast("Lütfen atama yapılacak atölyeyi seçin.", { type: 'error' });
            return;
        }
        if (selectedKeys.length === 0) {
            addToast("Lütfen en az bir beden seçin.", { type: 'error' });
            return;
        }
        
        const partsToReassign = selectedKeys.map(key => {
            const keyParts = key.split('-');
            const size = keyParts.pop() as keyof Sizes;
            const orderId = keyParts.join('-');
            return { orderId, size };
        });
        
        setIsReassigning(true);

        try {
            onReassign(partsToReassign, selectedProducer);
            addToast('Atama başarıyla yapıldı!', { type: 'success' });
            setSelectedKeys([]);
            setSelectedProducer('');
        } catch (error) {
            console.error("Reassignment failed:", error);
            addToast("Atama sırasında bir hata oluştu.", { type: 'error' });
            setIsReassigning(false);
        }
    };


    if (!summary) return null;

    return (
        <section className="bg-surface rounded-xl shadow-lg border border-border-color flex flex-col h-full">
            <header className="flex-shrink-0 flex items-start justify-between p-4 sm:p-6 pb-3 border-b border-border-color">
                <div className="flex items-start">
                    <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-background hover:text-text-primary transition-colors mr-2 flex-shrink-0">
                        <ArrowUturnLeftIcon className="h-6 w-6" />
                    </button>
                    <div className="min-w-0">
                        <p className="text-xs text-text-secondary font-mono lowercase">{summary.groupId}</p>
                        <h1 className="text-xl md:text-2xl font-bold text-text-primary">
                            {summary.productName} - {summary.color}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-text-secondary">
                            <div className="flex items-center gap-2">
                                <CalendarDaysIcon className="w-4 h-4" />
                                <span>Sipariş Tarihi: {new Date(summary.createdDate).toLocaleDateString('tr-TR')}</span>
                            </div>
                            {cuttingSummary && (
                                 cuttingSummary.isCut ? (
                                    <button 
                                        onClick={() => onViewCuttingReport(summary.groupId)}
                                        className="flex items-center gap-2 text-blue-400 font-medium transition-colors hover:text-blue-300"
                                        title="Kesim raporu detayını görüntüle"
                                    >
                                        <CuttingIcon className={`w-4 h-4`} />
                                        <span>Kesim Tarihi: {cuttingSummary.earliestDate?.toLocaleDateString('tr-TR')}</span>
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <CuttingIcon className={`w-4 h-4`} />
                                        <span>Kesim Bekleniyor</span>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>

                 {summary.status === 'Tamamlandı' && summary.completionDuration !== null && (
                    <div className="text-right flex-shrink-0 ml-4">
                        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                            <CheckCircleIcon className="w-7 h-7" />
                            <div className="text-left">
                                <p className="text-xs font-semibold">Tamamlanma Süresi</p>
                                <p className="font-bold text-xl leading-tight">{summary.completionDuration} gün</p>
                            </div>
                        </div>
                    </div>
                )}
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="bg-background p-3 rounded-lg text-center">
                            <p className="text-xs text-text-secondary">Sipariş</p>
                            <p className="text-xl font-bold text-text-primary">{summary.totalOrdered.toLocaleString()}</p>
                        </div>
                        <div className="bg-background p-3 rounded-lg text-center">
                            <p className="text-xs text-text-secondary">Kesilen</p>
                            <p className="text-xl font-bold text-blue-400">{summary.totalCut.toLocaleString()}</p>
                        </div>
                        <div className="bg-background p-3 rounded-lg text-center">
                            <p className="text-xs text-text-secondary">Üretilen</p>
                            <p className="text-xl font-bold text-secondary">{summary.totalProduced.toLocaleString()}</p>
                        </div>
                        <div className="bg-background p-3 rounded-lg text-center">
                            <p className="text-xs text-text-secondary">Kalan</p>
                            <p className="text-xl font-bold text-yellow-500">{summary.totalRemaining.toLocaleString()}</p>
                        </div>
                    </div>
                    <div>
                        <div className="w-full bg-background rounded-full h-2.5">
                            <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${summary.completionPercentage}%` }}></div>
                        </div>
                        <p className="text-right text-sm text-text-secondary mt-1">{summary.completionPercentage}% Tamamlandı (Kesilen Adete Göre)</p>
                    </div>
                </div>

                <div className={`p-3 bg-background rounded-lg border border-border-color space-y-3 mb-4 transition-opacity ${!isCuttingConfirmed ? 'opacity-60' : ''}`}>
                    {!isCuttingConfirmed && (
                        <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded-md">
                           <InformationCircleIcon className="w-5 h-5 flex-shrink-0" />
                           <span>Kesim raporu onaylanmadan atölye ataması yapılamaz.</span>
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <h3 className="text-md font-semibold text-text-primary flex-shrink-0">Atölye Atama:</h3>
                        <div className="flex-grow w-full sm:w-auto">
                            <select 
                                value={selectedProducer} 
                                onChange={e => setSelectedProducer(e.target.value)} 
                                disabled={!isCuttingConfirmed || isReassigning}
                                className="w-full bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-surface/50"
                            >
                                <option value="">Hedef Atölye Seçin...</option>
                                {producers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                <option value="UNASSIGNED">Atanmamış</option>
                            </select>
                        </div>
                        <button 
                            onClick={handleReassignClick} 
                            className="w-full sm:w-auto px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
                            disabled={!isCuttingConfirmed || selectedKeys.length === 0 || !selectedProducer || isReassigning}
                        >
                            {isReassigning ? (
                                <>
                                    <LoadingSpinnerIcon className="w-5 h-5 animate-spin" />
                                    <span>Atanıyor...</span>
                                </>
                            ) : (
                                <>
                                    <UsersIcon className="w-5 h-5"/>
                                    <span>Ata ({selectedKeys.length})</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-color">
                        <thead className="bg-background sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input 
                                      type="checkbox" 
                                      onChange={handleSelectAll} 
                                      disabled={!isCuttingConfirmed}
                                      className="rounded bg-surface border-text-secondary text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50" 
                                      aria-label="Tümünü seç" 
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Beden</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Atölye</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Sipariş</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Kesilen</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Üretilen</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Kalan</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider w-1/4">İlerleme</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border-color">
                                {sortedDetails.map(part => (
                                    <tr key={part.key} className={selectedKeys.includes(part.key) ? 'bg-blue-900/50' : 'hover:bg-background'}>
                                        <td className="px-4 py-2">
                                            <input 
                                                type="checkbox"
                                                checked={selectedKeys.includes(part.key)}
                                                onChange={() => handleSelectPart(part.key)}
                                                disabled={!isCuttingConfirmed}
                                                className="rounded bg-background border-text-secondary text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-text-primary uppercase">{part.size}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-text-secondary">{part.producer}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-text-primary">{part.ordered}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center font-bold text-blue-400">{part.cut > 0 ? part.cut : '-'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-secondary">{part.produced}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center font-semibold text-yellow-500">{part.remaining}</td>
                                        <td className="px-4 py-2 text-sm align-top">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <div className="w-full bg-background rounded-full h-2 flex-grow">
                                                    <div className="bg-secondary h-2 rounded-full" style={{ width: `${part.percentage}%` }}></div>
                                                </div>
                                                <span className="text-text-secondary text-xs w-10 text-right">{part.percentage}%</span>
                                            </div>
                                            {part.stockUsageDetails.length > 0 && (
                                                <div className="mt-2 text-xs">
                                                    <p className="font-semibold text-text-secondary mb-1">Üretim Geçmişi:</p>
                                                    <ul className="text-text-secondary/90 space-y-0.5 pl-2">
                                                        {part.stockUsageDetails.map((d, i) => (
                                                            <li key={i} className={`flex items-center gap-1.5 ${d.isDefective ? 'text-red-400' : ''}`}>
                                                               <ArrowRightIcon className={`w-3 h-3 flex-shrink-0 ${d.isDefective ? 'text-red-400/50' : 'text-primary/50'}`} />
                                                               <span className="whitespace-nowrap">
                                                                   {new Date(d.date).toLocaleDateString('tr-TR')}: <strong>{d.qty} adet</strong>
                                                                   {d.isDefective && <span className="ml-1 font-semibold">(Defolu)</span>}
                                                               </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};

export default OrderDetail;