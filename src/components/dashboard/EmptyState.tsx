import React from "react";
import { FileText, Plus } from "lucide-react";

interface EmptyStateProps {
  onAddClick: () => void;
}

export function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-navy-deep/10 rounded-[2.5rem] bg-white group hover:border-oxford/30 transition-all cursor-pointer"
      onClick={onAddClick}
    >
      {/* Branded illustration placeholder */}
      <div className="relative mb-6">
        <div className="w-24 h-24 bg-gradient-to-br from-alice-gray to-blue-50 rounded-3xl flex items-center justify-center border border-navy-deep/5 shadow-lg group-hover:scale-110 transition-transform">
          <FileText size={40} className="text-oxford" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-plum-magenta rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
          <Plus size={20} className="text-white" />
        </div>
      </div>

      <h3 className="text-navy-deep font-semibold text-lg mb-2">
        Your Licensing Hub is Empty
      </h3>
      <p className="text-navy-deep/50 text-sm max-w-sm text-center">
        Register your first content asset to start earning from human citations and AI model access
      </p>

      <button className="mt-6 px-6 py-3 bg-oxford text-white rounded-lg font-medium hover:bg-oxford-dark transition-colors active:scale-[0.98]">
        Add Your First Asset
      </button>
    </div>
  );
}
