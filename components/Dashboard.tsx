
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Order, ProductionStatus, ProducerPerformanceStat, StockUsage, Sizes, CuttingReport, View } from '../types';
import { CheckCircleIcon, ClockIcon, ExclamationIcon, ListIcon, FactoryIcon } from './icons/Icons';

const SIZES_ORDER: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

interface DashboardProps {
  stats: {
    totalOrders: number;
    completedOrders: number;
    inProgressOrders: number;
    issues: number;
  };
  orders: Order[];
  producerPerformanceStats: ProducerPerformanceStat[];
  stockUsage: StockUsage[];
  cuttingReports: CuttingReport[];
  navigateTo: (view: View) => void;
}

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
    <article className="bg-surface p-4 sm:p-6 rounded-xl shadow-lg flex items-center gap-4 border border-border-color">
        <div className={`rounded-full p-3 ${color}`}>
            <Icon className="h-7 w-7 text-white" />
        </div>
        <div>
            <p className="text-sm text-text-secondary font-medium">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
    </article>
);

const Dashboard: React.FC<DashboardProps> = ({ stats, orders, producerPerformanceStats, stockUsage, cuttingReports, navigateTo }) => {

  const statusOrder: ProductionStatus[] = ['Devam Ediyor', 'Tamamlandı', 'İptal Edildi'];
  const statusCounts = statusOrder.map(status => ({
    name: status,
    count: orders.filter(order => order.status === status).length
  })).filter(item => item.count > 0);

  const [modelFilter, setModelFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState<keyof Sizes | ''>('');
  
  const uniqueModels = useMemo(() => Array.from(new Set(orders.map(o => o.productName))).sort(), [orders]);
  const uniqueColors = useMemo(() => Array.from(new Set(orders.map(o => o.color))).sort(), [orders]);

  const completionPercentageData = useMemo(() => {
    const filteredOrders = orders.filter(order => {
        const modelMatch = !modelFilter || order.productName === modelFilter;
        const colorMatch = !colorFilter || order.color === colorFilter;
        return modelMatch && colorMatch;
    });

    if (filteredOrders.length === 0) {
        return { percentage: 0, produced: 0, target: 0 };
    }

    const filteredOrderIds = new Set(filteredOrders.map(o => o.id));
    const filteredGroupIds = new Set(filteredOrders.map(o => o.groupId));

    const totalCut = cuttingReports
        .filter(cr => cr.isConfirmed && filteredGroupIds.has(cr.groupId))
        .reduce((sum, report) => {
            if (sizeFilter) {
                return sum + (report.sizes[sizeFilter] || 0);
            }
            // FIX: Explicitly cast value to a number in reduce function to prevent type error.
            return sum + Object.values(report.sizes).reduce((s, q) => s + Number(q), 0);
        }, 0);

    const totalProduced = stockUsage
        .filter(su => filteredOrderIds.has(su.orderId))
        .reduce((sum, su) => {
            if (sizeFilter) {
                return sum + (su.usedSizes[sizeFilter] || 0);
            }
            // FIX: Explicitly cast value to a number in reduce function to prevent type error.
            return sum + Object.values(su.usedSizes).reduce((s, q) => s + Number(q), 0);
        }, 0);

    const percentage = totalCut > 0 ? Math.round((totalProduced / totalCut) * 100) : 0;
    
    return {
        percentage,
        produced: totalProduced,
        target: totalCut,
    };
  }, [orders, stockUsage, cuttingReports, modelFilter, colorFilter, sizeFilter]);

  const handleResetFilters = () => {
    setModelFilter('');
    setColorFilter('');
    setSizeFilter('');
  };

  return (
    <section className="space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Gösterge Paneli</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Toplam Sipariş" value={stats.totalOrders} icon={ListIcon} color="bg-blue-500" />
        <StatCard title="Devam Eden" value={stats.inProgressOrders} icon={ClockIcon} color="bg-yellow-500" />
        <StatCard title="Tamamlanan" value={stats.completedOrders} icon={CheckCircleIcon} color="bg-secondary" />
        <StatCard title="Sorunlu/İptal" value={stats.issues} icon={ExclamationIcon} color="bg-red-500" />
      </div>

       <section className="bg-surface p-4 sm:p-6 rounded-xl shadow-lg border border-border-color">
          <h2 className="text-xl font-bold mb-4 text-text-primary">Genel Üretim Tamamlanma Oranı</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-background rounded-lg border border-border-color">
              <select value={modelFilter} onChange={e => setModelFilter(e.target.value)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Tüm Modeller</option>
                  {uniqueModels.map(model => <option key={model} value={model}>{model}</option>)}
              </select>
              <select value={colorFilter} onChange={e => setColorFilter(e.target.value)} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Tüm Renkler</option>
                  {uniqueColors.map(color => <option key={color} value={color}>{color}</option>)}
              </select>
              <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value as keyof Sizes | '')} className="bg-surface border border-border-color rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Tüm Bedenler</option>
                  {SIZES_ORDER.map(size => <option key={size} value={size}>{size.toUpperCase()}</option>)}
              </select>
              <button onClick={handleResetFilters} className="px-4 py-2 bg-red-600/80 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors">
                Filtreleri Temizle
              </button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative w-32 h-32 flex-shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path className="text-border-color"
                          stroke="currentColor" strokeWidth="3" fill="none"
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path className="text-secondary transition-all duration-500 ease-in-out"
                          stroke="currentColor" strokeWidth="3" fill="none"
                          strokeDasharray={`${completionPercentageData.percentage}, 100`}
                          strokeLinecap="round"
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-text-primary">{completionPercentageData.percentage}%</span>
                  </div>
              </div>
              <div className="flex-grow text-center md:text-left">
                  <p className="text-sm text-text-secondary">Seçili filtreye göre tamamlanma oranı.</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">{completionPercentageData.produced.toLocaleString()} / {completionPercentageData.target.toLocaleString()}</p>
                  <p className="text-sm text-text-secondary">Üretilen / Kesilen</p>
              </div>
          </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-surface p-4 sm:p-6 rounded-xl shadow-lg border border-border-color">
            <h2 className="text-xl font-bold mb-4 text-text-primary">Sipariş Durum Dağılımı</h2>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <BarChart data={statusCounts} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
                        <YAxis tick={{ fill: '#9CA3AF' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            borderColor: '#374151',
                            color: '#F9FAFB'
                          }} 
                          cursor={{fill: 'rgba(255,255,255,0.1)'}}
                        />
                        <Bar dataKey="count" fill="#1E3A8A" name="Sipariş Sayısı" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
        {producerPerformanceStats && producerPerformanceStats.length > 0 && (
          <section className="bg-surface p-4 sm:p-6 rounded-xl shadow-lg border border-border-color flex flex-col">
              <button 
                onClick={() => navigateTo('workshopManagement')}
                className="inline-flex items-center text-xl font-bold mb-4 text-text-primary hover:text-primary transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                aria-label="Atölye yönetimi sayfasına git"
              >
                <FactoryIcon className="w-6 h-6 mr-3 text-primary"/>
                <span className="group-hover:underline">Atölye Performansı</span>
              </button>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                  {producerPerformanceStats.map((stat) => (
                      <div key={stat.name} className="bg-background p-4 rounded-lg border border-border-color">
                          <h3 className="font-bold text-text-primary mb-3">{stat.name}</h3>
                           <div className="grid grid-cols-2 gap-3 text-sm">
                              <div><p className="text-text-secondary">Tamamlanan</p><p className="font-semibold text-text-primary">{stat.completedOrders}</p></div>
                              <div><p className="text-text-secondary">Devam Eden</p><p className="font-semibold text-text-primary">{stat.inProgressOrders}</p></div>
                              <div><p className="text-text-secondary">Toplam Sipariş</p><p className="font-semibold text-text-primary">{stat.totalOrders}</p></div>
                              <div><p className="text-text-secondary">Toplam Ürün</p><p className="font-semibold text-text-primary">{stat.totalQuantity.toLocaleString()}</p></div>
                              <div className="col-span-2"><p className="text-text-secondary">Ort. Süre</p><p className="font-semibold text-secondary">{stat.avgCompletionDays ?? '-'}{stat.avgCompletionDays ? ' gün' : ''}</p></div>
                          </div>
                      </div>
                  ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-border-color">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Atölye</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Tamamlanan</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Devam Eden</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Toplam Sipariş</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Toplam Ürün</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Ort. Süre (gün)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-border-color">
                    {producerPerformanceStats.map((stat) => (
                      <tr key={stat.name} className="hover:bg-background/50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{stat.name}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-text-secondary">{stat.completedOrders}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-text-secondary">{stat.inProgressOrders}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-text-secondary">{stat.totalOrders}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-text-secondary">{stat.totalQuantity.toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-semibold text-secondary">{stat.avgCompletionDays ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </section>
        )}
      </div>
    </section>
  );
};

export default Dashboard;
