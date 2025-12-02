import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { MachiningOperation } from '../types';

interface OperationChartProps {
  operations: MachiningOperation[];
}

const COLORS = ['#323f4b', '#f59e0b', '#7b8794', '#52606d', '#cbd2d9', '#1f2933'];

export const OperationChart: React.FC<OperationChartProps> = ({ operations }) => {
  const data = operations.map(op => ({
    name: op.name,
    value: op.estimatedTimeSeconds
  }));

  const formatTooltip = (value: number) => `${value}s`;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={formatTooltip} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
