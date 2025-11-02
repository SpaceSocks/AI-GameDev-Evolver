import React from 'react';

interface DeveloperNotesLogProps {
  notes: string[];
}

export const DeveloperNotesLog: React.FC<DeveloperNotesLogProps> = ({ notes }) => {
  return (
    <div className="space-y-3">
      {notes.map((note, index) => (
        <div key={index} className="p-3 bg-cyan-900/40 border-l-4 border-cyan-500 rounded-r-md whitespace-pre-wrap">
          <p className="font-semibold text-cyan-300 mb-1">Note #{index + 1}</p>
          <p className="text-gray-200">{note}</p>
        </div>
      ))}
      {notes.length === 0 && (
        <div className="text-center text-gray-500 p-4">
          No notes have been added yet.
        </div>
      )}
    </div>
  );
};