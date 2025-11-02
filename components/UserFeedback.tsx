import React, { useState } from 'react';

interface UserFeedbackProps {
  onSend: (feedback: string) => void;
  disabled: boolean;
}

export const UserFeedback: React.FC<UserFeedbackProps> = ({ onSend, disabled }) => {
  const [notes, setNotes] = useState('');

  const handleSend = () => {
    if (notes.trim()) {
      onSend(notes.trim());
      setNotes('');
    }
  };

  return (
    <div>
      <label htmlFor="userFeedback" className="block text-sm font-medium text-gray-300 mb-2">
        Add a Developer Note:
      </label>
      <textarea
        id="userFeedback"
        rows={3}
        className="block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm p-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50"
        placeholder="e.g., Make the player jump higher. Add a score counter."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={disabled}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !notes.trim()}
        className="mt-2 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
      >
        Add Note to Checklist
      </button>
    </div>
  );
};