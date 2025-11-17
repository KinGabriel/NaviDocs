/**
 * @fileoverview StatCard component for displaying statistical information
 * @module components/cards/StatCard
 */

import React from 'react';

/**
 * StatCard Component
 * 
 * A simple card component for displaying a statistical metric with a title and value.
 * Uses a light purple background with centered text layout.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.title - The label/title for the statistic (e.g., "Total Documents", "Active Users")
 * @param {string|number} props.value - The statistical value to display (e.g., "150", "2,345")
 * 
 * @example
 * // Display document count
 * <StatCard title="Total Documents" value="150" />
 * 
 * @example
 * // Display numeric value
 * <StatCard title="Active Users" value={2345} />
 * 
 * @example
 * // Multiple stat cards in a flex container
 * <div className="flex gap-4">
 *   <StatCard title="Templates" value="42" />
 *   <StatCard title="Published" value="28" />
 *   <StatCard title="Pending" value="14" />
 * </div>
 */
export default function StatCard({ title, value }) {
  return (
    <div className="bg-[#ECEEF6] shadow rounded-xl p-6 flex-1 min-w-[160px] text-center">
      <p className="text-m text-[#717171]">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}