
import React from 'react';

interface CheckboxProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({ id, label, description, checked, onChange }) => {
  return (
    <label htmlFor={id} className="flex items-start p-3 space-x-3 bg-gray-900/50 rounded-lg hover:bg-gray-800/70 transition-colors duration-200 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
      />
      <div className="flex flex-col">
        <span className="font-medium text-gray-100">{label}</span>
        <span className="text-sm text-gray-400">{description}</span>
      </div>
    </label>
  );
};
