
import React, { useMemo } from 'react';
import { CuttingReport, Order, Sizes } from '../types';
import { ArrowUturnLeftIcon, CuttingIcon } from './icons/Icons';

interface CuttingReportDetailProps {
  reports: CuttingReport[];
  orders: Order[];
  onClose: () => void;
}

const SIZES_ORDER: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
const emptySizes: Sizes = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 };

const CuttingReportDetail: React.FC<CuttingReportDetailProps> = ({ reports, orders, onClose }) => {
    if (!reports || reports.length === 0) {
        return null;
    }

    const groupData = useMemo(() => {
        const representativeReport = reports[0];
        const groupId = representativeReport.groupId;
        const ordersInGroup = orders.filter(o => o.groupId === groupId);

        const totalOrderedSizes = ordersInGroup.reduce((acc, order) => {
            SIZES_ORDER.forEach(size => {
                acc[size] = (acc[size] || 0) + (order.sizes[size] || 0);
            });
            return acc;
        }, { ...emptySizes } as Sizes);
        // FIX: Explicitly cast value to a number in reduce function to prevent type error.
        const totalOrderedQuantity = Object.values(totalOrderedSizes).reduce((sum, qty) => sum + Number(qty), 0);

        const totalCutSizes = reports.reduce((acc, report) => {
            SIZES_ORDER.forEach(size => {
                acc[size] = (acc[size] || 0) + (report.sizes[size] || 0);
            });
            return acc;
        }, { ...emptySizes } as Sizes);
        // FIX: Explicitly cast value to a number in reduce function to prevent type error.
        const totalCutQuantity = Object.values(totalCutSizes).reduce((sum, qty) => sum + Number(qty), 0);

        const isGroupConfirmed = reports.some(r => r.isConfirmed);

        const sortedReports = [...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            groupId,
            productName: representativeReport.productName,
            color: representativeReport.color,
            totalOrderedSizes,
            totalOrderedQuantity,
            totalCutSizes,
            totalCutQuantity,
            status: isGroupConfirmed ? 'Onaylandı' : 'Onay Bekliyor',
            individualReports: sortedReports
        };
    }, [reports, orders]);

    return (
        <section className="bg-surface rounded-xl shadow-lg border border-border-color flex flex-col h-full">
            <header className="flex-shrink-0 flex items-start p-4 sm:p-6 border-b border-border-color">
                <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-background hover:text-text-primary transition-colors mr-2 flex-shrink-0">
                    <ArrowUturnLeftIcon className="h-6 w-6" />
                </button>
                <div className="min-w-0">
                    <p className="text-xs text-text-secondary font-mono lowercase">{groupData.groupId}</p>
                    <h1 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-3">
                        <CuttingIcon className="w-8 h-8 text-primary"/>
                        Kesim Raporu Detayları
                    </h1>
                    <p className="text-md text-text-secondary mt-1">{groupData.productName} - {groupData.color}</p>
                </div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-background p-3 rounded-lg text-center">
                        <p className="text-sm text-text-secondary">Toplam Sipariş Adedi</p>
                        <p className="text-2xl font-bold text-text-primary">{groupData.totalOrderedQuantity.toLocaleString()}</p>
                    </div>
                    <div className="bg-background p-3 rounded-lg text-center">
                        <p className="text-sm text-text-secondary">Toplam Kesilen Adet</p>
                        <p className="text-2xl font-bold text-secondary">{groupData.totalCutQuantity.toLocaleString()}</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-color">
                        <thead className="bg-background">
                            <tr>
                                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider align-bottom">Kesim Tarihi</th>
                                {SIZES_ORDER.map(size => (
                                    <th key={size} className="px-2 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">{size}</th>
                                ))}
                                <th rowSpan={2} className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider align-bottom">Toplam</th>
                                <th rowSpan={2} className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider align-bottom">Durum</th>
                            </tr>
                            <tr>
                                {SIZES_ORDER.map(size => (
                                    <th key={`${size}-sub`} className="px-2 py-1 text-center text-[10px] font-medium text-text-secondary/80 normal-case">Kesilen / İstenen</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border-color">
                            {groupData.individualReports.map((report) => {
                                // FIX: Explicitly cast value to a number in reduce function to prevent type error.
                                const totalForRow = Object.values(report.sizes).reduce((sum, q) => sum + Number(q), 0);
                                return (
                                    <tr key={report.id} className="hover:bg-background transition-colors duration-150">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">{new Date(report.date).toLocaleDateString('tr-TR')}</td>
                                        {SIZES_ORDER.map(size => {
                                            const cut = report.sizes[size] || 0;
                                            const ordered = groupData.totalOrderedSizes[size] || 0;
                                            return (
                                                <td key={size} className="px-2 py-4 text-center whitespace-nowrap text-sm text-text-primary">
                                                    {cut > 0 || ordered > 0 ? (
                                                        <>
                                                            <span className="font-bold text-secondary">{cut}</span>
                                                            <span className="text-text-secondary"> / {ordered}</span>
                                                        </>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                            )
                                        })}
                                        <td className="px-4 py-4 text-center whitespace-nowrap text-sm font-bold text-primary">{totalForRow.toLocaleString()}</td>
                                        <td className="px-4 py-4 text-center whitespace-nowrap text-sm">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${report.isConfirmed ? 'bg-secondary text-green-900' : 'bg-yellow-500 text-yellow-900'}`}>
                                                {report.isConfirmed ? 'Onaylandı' : 'Onay Bekliyor'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-background font-bold">
                            <tr className="border-t-2 border-border-color">
                                <td className="px-4 py-3 text-left text-sm text-text-primary">TOPLAM</td>
                                {SIZES_ORDER.map(size => {
                                    const cut = groupData.totalCutSizes[size];
                                    const ordered = groupData.totalOrderedSizes[size];
                                    return (
                                        <td key={size} className="px-2 py-3 text-center text-sm">
                                            <span className="font-bold text-secondary">{cut}</span>
                                            <span className="text-text-secondary"> / {ordered}</span>
                                        </td>
                                    )
                                })}
                                <td className="px-4 py-3 text-center text-sm">
                                    <span className="font-bold text-secondary">{groupData.totalCutQuantity.toLocaleString()}</span>
                                    <span className="text-text-secondary"> / {groupData.totalOrderedQuantity.toLocaleString()}</span>
                                </td>
                                <td className="px-4 py-3 text-center text-sm">
                                     <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${groupData.status === 'Onaylandı' ? 'bg-secondary text-green-900' : 'bg-yellow-500 text-yellow-900'}`}>
                                        {groupData.status}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </section>
    );
};

export default CuttingReportDetail;
