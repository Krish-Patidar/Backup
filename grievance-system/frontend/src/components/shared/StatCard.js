import React from 'react';

const StatCard = ({ icon, label, value, sub, color = 'blue', trend }) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-400 to-orange-500',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
    teal: 'from-teal-500 to-teal-600',
  };
  return (
    <div className="card flex items-center gap-4 animate-fadeInUp">
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors[color] || colors.blue} flex items-center justify-center text-2xl shadow-md flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-800">{value}</div>
        <div className="text-sm font-medium text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
        {trend !== undefined && (
          <div className={`text-xs font-semibold mt-0.5 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
