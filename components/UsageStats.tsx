import React from 'react';
import { UsageStat } from '../types';

interface UsageStatsProps {
  history: UsageStat[];
}

export const UsageStats: React.FC<UsageStatsProps> = ({ history }) => {
  const totals = history.reduce(
    (acc, curr) => {
      acc.inputChars += curr.inputChars;
      acc.outputChars += curr.outputChars;
      return acc;
    },
    { inputChars: 0, outputChars: 0 }
  );

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  return (
    <div className="text-sm font-mono">
        {history.length === 0 ? (
             <div className="text-center text-gray-500 p-4">
                No usage data yet. Start an evolution to track stats.
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800/50">
                        <tr>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Iter</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Task</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Provider</th>
                            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Input Chars</th>
                            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Output Chars</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-900/50 divide-y divide-gray-800">
                        {history.map((stat, index) => (
                            <tr key={index}>
                                <td className="px-4 py-2 whitespace-nowrap text-cyan-400">{stat.iteration}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-gray-300">{stat.task}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-gray-300 uppercase">{stat.provider}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-gray-300 text-right">{formatNumber(stat.inputChars)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-gray-300 text-right">{formatNumber(stat.outputChars)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-800">
                        <tr>
                            <th scope="row" colSpan={3} className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Totals</th>
                            <td className="px-4 py-2 whitespace-nowrap text-cyan-400 font-bold text-right">{formatNumber(totals.inputChars)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-cyan-400 font-bold text-right">{formatNumber(totals.outputChars)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        )}
    </div>
  );
};
