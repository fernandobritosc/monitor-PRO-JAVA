import React from 'react';

export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
    // Corrigido: bg-white/5 -> variável de tema
    <div className={`animate-pulse bg-[hsl(var(--bg-user-block))] rounded-2xl ${className}`} style={style} />
);

export const KPISkeleton = () => (
    // Corrigido: bg-white/5 border-white/10 -> variáveis de tema
    <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[2rem] p-6 space-y-4">
        <div className="flex justify-between items-start">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-16 h-4" />
        </div>
        <Skeleton className="w-24 h-8" />
        <Skeleton className="w-32 h-3" />
    </div>
);

export const ChartSkeleton = () => (
    <div className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[2.5rem] p-8 space-y-6 min-h-[400px]">
        <div className="flex justify-between items-center">
            <div className="space-y-2">
                <Skeleton className="w-48 h-6" />
                <Skeleton className="w-32 h-3" />
            </div>
            <Skeleton className="w-24 h-10 rounded-xl" />
        </div>
        <div className="flex-1 flex items-end gap-4 h-[250px] pt-10">
            {[1, 2, 3, 4, 5, 6, 7].map((i, idx) => (
                <Skeleton 
                    key={i} 
                    className="flex-1" 
                    style={{ height: `${[60, 40, 80, 50, 70, 45, 90][idx] || 50}%` }} 
                />
            ))}
        </div>
    </div>
);

export const DashboardSkeleton = () => (
    <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
            <KPISkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <ChartSkeleton />
            </div>
            <div className="space-y-6">
                <Skeleton className="w-full h-[200px] rounded-[2.5rem]" />
                <Skeleton className="w-full h-[180px] rounded-[2.5rem]" />
            </div>
        </div>
    </div>
);

export const FlashcardSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-[2rem] p-6 h-64 space-y-4">
                <div className="flex justify-between">
                    <Skeleton className="w-20 h-4" />
                    <Skeleton className="w-6 h-6 rounded-full" />
                </div>
                <Skeleton className="w-full h-8" />
                <Skeleton className="w-3/4 h-8" />
                <div className="pt-4 flex gap-2">
                    <Skeleton className="w-16 h-6 rounded-lg" />
                    <Skeleton className="w-16 h-6 rounded-lg" />
                </div>
            </div>
        ))}
    </div>
);