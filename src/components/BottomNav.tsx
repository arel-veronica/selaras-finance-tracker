import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PlusCircle,
  FileBarChart2,
  Settings,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaksi', icon: ArrowLeftRight },
    { id: 'add-transaction', label: 'Catat', icon: PlusCircle, special: true },
    { id: 'reports', label: 'Laporan', icon: FileBarChart2 },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 shadow-lg">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.special) {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform border-2 border-white">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-colors ${
                isActive ? 'text-emerald-700 font-semibold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
