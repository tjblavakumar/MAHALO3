"use client";

import { useState, useCallback } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";

interface Widget {
  id: string;
  title: string;
  component: React.ReactNode;
  defaultLayout: { w: number; h: number; minW?: number; minH?: number };
}

interface DashboardGridProps {
  widgets: Widget[];
  defaultLayout: Layout[];
  cols?: number;
  rowHeight?: number;
}

export default function DashboardGrid({
  widgets,
  defaultLayout,
  cols = 12,
  rowHeight = 80,
}: DashboardGridProps) {
  const [layout, setLayout] = useState<Layout[]>(defaultLayout);

  const onLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);
  }, []);

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={cols}
      rowHeight={rowHeight}
      width={1200}
      onLayoutChange={onLayoutChange}
      draggableHandle=".widget-drag-handle"
      isResizable={true}
      compactType="vertical"
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <div className="widget-drag-handle bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between cursor-move">
            <h3 className="text-sm font-medium text-gray-700">{widget.title}</h3>
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
            </svg>
          </div>
          <div className="p-4 overflow-auto h-[calc(100%-40px)]">
            {widget.component}
          </div>
        </div>
      ))}
    </GridLayout>
  );
}
