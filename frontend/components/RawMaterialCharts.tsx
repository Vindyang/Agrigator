import React from 'react';
import { AreaChart, Area, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'; // shadcn
import { TrendingUp, TrendingDown } from 'lucide-react';

// Mock 7-day data for the Indonesian raw materials (Prices in IDR)
const materials = [
  {
    name: 'Rice (Beras)',
    price: 'Rp 16,240/kg',
    trend: '+16.0%',
    isUp: true,
    color: '#ef4444', // Red for price spike
    data: [{ v: 13500 }, { v: 13600 }, { v: 13800 }, { v: 14100 }, { v: 14500 }, { v: 15200 }, { v: 16240 }],
  },
  {
    name: 'Corn (Jagung)',
    price: 'Rp 8,450/kg',
    trend: '+4.3%',
    isUp: true,
    color: '#eab308', // Amber
    data: [{ v: 8100 }, { v: 8150 }, { v: 8200 }, { v: 8250 }, { v: 8200 }, { v: 8300 }, { v: 8450 }],
  },
  {
    name: 'Soybeans (Kedelai)',
    price: 'Rp 11,200/kg',
    trend: '-6.2%',
    isUp: false,
    color: '#22c55e', // Green for price drop
    data: [{ v: 11900 }, { v: 11800 }, { v: 11750 }, { v: 11600 }, { v: 11500 }, { v: 11400 }, { v: 11200 }],
  },
  {
    name: 'Chili (Cabai)',
    price: 'Rp 45,000/kg',
    trend: '+1.1%',
    isUp: true,
    color: '#3b82f6', // Blue
    data: [{ v: 44000 }, { v: 44200 }, { v: 44500 }, { v: 44100 }, { v: 44800 }, { v: 44900 }, { v: 45000 }],
  },
];

export const RawMaterialCharts = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full mb-6">
      {materials.map((item) => (
        <Card key={item.name} className="overflow-hidden bg-card border-border shadow-sm flex flex-col min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.name}</CardTitle>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-foreground">{item.price}</span>
              <span className={`flex items-center text-sm font-semibold ${item.isUp ? 'text-destructive' : 'text-success'}`}>
                {item.isUp ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {item.trend}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-grow mt-2 min-w-0">
            <MaterialSparkline item={item} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

function MaterialSparkline({ item }: { item: typeof materials[number] }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 80 });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const nextWidth = Math.max(0, Math.floor(el.clientWidth));
      const nextHeight = Math.max(0, Math.floor(el.clientHeight));
      setSize({ width: nextWidth, height: nextHeight });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-[80px] min-h-[80px] w-full min-w-0">
      {size.width > 0 && size.height > 0 ? (
        <AreaChart width={size.width} height={size.height} data={item.data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${item.name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={item.color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={item.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Area
            type="monotone"
            dataKey="v"
            stroke={item.color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#gradient-${item.name})`}
          />
        </AreaChart>
      ) : (
        <div className="h-full w-full" />
      )}
    </div>
  );
}
