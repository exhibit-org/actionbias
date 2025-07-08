'use client';

import { useState } from 'react';
import { Check, Copy, Link, Square, CheckSquare } from 'react-feather';
import EditableField from '../../next/components/EditableField';
import { ActionDetailResource } from '../../../lib/types/resources';
import { buildActionPrompt } from '../../../lib/utils/action-prompt-builder';
import { ColorScheme } from '../../next/components/types';

interface TreemapInspectorProps {
  selectedActionDetail: ActionDetailResource | null;
  loadingActionDetail: boolean;
  copying: boolean;
  copyingUrl: boolean;
  onCopyPrompt: () => void;
  onCopyUrl: () => void;
  onToggleComplete: () => void;
  onClearSelection: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  isMobile: boolean;
  inspectorWidth?: number;
  isDragging?: boolean;
  setIsDragging?: (dragging: boolean) => void;
}

// Dark theme colors for the inspector
const darkColors: ColorScheme = {
  bg: '#111827', // gray-900
  surface: '#1f2937', // gray-800
  border: '#374151', // gray-700
  borderAccent: '#60a5fa', // blue-400
  text: '#f3f4f6', // gray-100
  textMuted: '#d1d5db', // gray-300
  textSubtle: '#9ca3af', // gray-400
  textFaint: '#6b7280', // gray-500
};

export default function TreemapInspector({
  selectedActionDetail,
  loadingActionDetail,
  copying,
  copyingUrl,
  onCopyPrompt,
  onCopyUrl,
  onToggleComplete,
  onClearSelection,
  isMinimized,
  onToggleMinimize,
  isMobile,
  inspectorWidth = 320,
  isDragging,
  setIsDragging
}: TreemapInspectorProps) {
  const [savingField, setSavingField] = useState<string | null>(null);

  const handleUpdateField = async (field: 'title' | 'description' | 'vision', value: string) => {
    if (!selectedActionDetail) return;
    
    try {
      setSavingField(field);
      const response = await fetch(`/api/actions/${selectedActionDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update action');
      }
      
      // Note: In a real app, you'd want to update the local state or refetch
      // For now, the parent component should handle refreshing the data
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      throw error;
    } finally {
      setSavingField(null);
    }
  };

  const getInspectorStyle = () => {
    if (isMobile) {
      return {
        height: isMinimized ? '48px' : '256px',
        width: '100%'
      };
    } else {
      return {
        width: isMinimized ? '48px' : `${inspectorWidth}px`,
        height: '100%'
      };
    }
  };

  return (
    <>
      {/* Resize handle - only show on desktop when inspector is expanded */}
      {!isMobile && !isMinimized && setIsDragging && (
        <div
          className="w-1 bg-gray-700 hover:bg-gray-600 cursor-col-resize flex-shrink-0 transition-colors"
          onMouseDown={() => setIsDragging(true)}
          title="Drag to resize inspector"
        />
      )}
      <div 
        className={`bg-gray-900 border-gray-700 ${!isMobile ? 'border-l' : 'border-t'} transition-all duration-300 flex flex-col`} 
        style={{ 
          ...getInspectorStyle(),
          maxHeight: '100vh', 
          overflow: 'hidden' 
        }}
      >
        {/* Inspector header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          {!isMinimized && (
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-mono text-gray-200">Inspector</h3>
              {selectedActionDetail && (
                <button
                  onClick={onClearSelection}
                  className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                  title="Clear selection"
                >
                  Clear
                </button>
              )}
            </div>
          )}
          <button
            onClick={onToggleMinimize}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1"
            title={isMinimized ? 'Expand inspector' : 'Minimize inspector'}
          >
            {isMinimized ? (
              !isMobile ? '◀' : '▲'
            ) : (
              !isMobile ? '▶' : '▼'
            )}
          </button>
        </div>
        
        {/* Inspector content */}
        {!isMinimized && selectedActionDetail && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Action buttons */}
            <div className="p-3 border-b border-gray-700 flex gap-2">
              <button 
                onClick={onCopyUrl} 
                disabled={copyingUrl} 
                className="flex items-center justify-center w-8 h-8 bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-600 rounded transition-all"
                title="Copy action URL"
              >
                {copyingUrl ? <Check size={14} /> : <Link size={14} />}
              </button>
              <button 
                onClick={onToggleComplete}
                className="flex items-center justify-center w-8 h-8 bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-600 rounded transition-all"
                title={selectedActionDetail.done ? "Reopen action" : "Complete action"}
              >
                {selectedActionDetail.done ? <CheckSquare size={14} /> : <Square size={14} />}
              </button>
            </div>
            
            {/* Editable fields */}
            <div className="flex-1 p-3 space-y-4 overflow-y-auto">
              {loadingActionDetail ? (
                <div className="text-xs text-gray-400 font-mono">Loading action details...</div>
              ) : (
                <>
                  {/* Title */}
                  <div>
                    <div className="text-xs text-gray-400 font-mono mb-1">Title</div>
                    <EditableField
                      value={selectedActionDetail.title}
                      placeholder="No title"
                      colors={darkColors}
                      onSave={(value) => handleUpdateField('title', value)}
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        fontSize: '0.875rem',
                        backgroundColor: 'rgba(31, 41, 55, 0.5)', // semi-transparent gray-800
                        border: '1px solid rgba(55, 65, 81, 0.5)', // semi-transparent gray-700
                      }}
                    />
                    {savingField === 'title' && (
                      <div className="text-xs text-gray-500 mt-1">Saving...</div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <div className="text-xs text-gray-400 font-mono mb-1">Description</div>
                    <EditableField
                      value={selectedActionDetail.description || ''}
                      placeholder="No description"
                      colors={darkColors}
                      onSave={(value) => handleUpdateField('description', value)}
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        fontSize: '0.875rem',
                        backgroundColor: 'rgba(31, 41, 55, 0.5)',
                        border: '1px solid rgba(55, 65, 81, 0.5)',
                        minHeight: '3em',
                      }}
                    />
                    {savingField === 'description' && (
                      <div className="text-xs text-gray-500 mt-1">Saving...</div>
                    )}
                  </div>

                  {/* Vision */}
                  <div>
                    <div className="text-xs text-gray-400 font-mono mb-1">Vision</div>
                    <EditableField
                      value={selectedActionDetail.vision || ''}
                      placeholder="No vision"
                      colors={darkColors}
                      onSave={(value) => handleUpdateField('vision', value)}
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        fontSize: '0.875rem',
                        backgroundColor: 'rgba(31, 41, 55, 0.5)',
                        border: '1px solid rgba(55, 65, 81, 0.5)',
                        minHeight: '3em',
                      }}
                    />
                    {savingField === 'vision' && (
                      <div className="text-xs text-gray-500 mt-1">Saving...</div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="pt-4 border-t border-gray-700">
                    <div className="text-xs text-gray-400 font-mono mb-2">Metadata</div>
                    <div className="space-y-1 text-xs font-mono text-gray-500">
                      <div>ID: {selectedActionDetail.id}</div>
                      <div>Status: {selectedActionDetail.done ? 'Completed' : 'Active'}</div>
                      <div>Children: {selectedActionDetail.children.length}</div>
                      <div>Dependencies: {selectedActionDetail.dependencies.length}</div>
                      <div>Dependents: {selectedActionDetail.dependents.length}</div>
                    </div>
                  </div>

                  {/* Full prompt (read-only) */}
                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-400 font-mono">Full Prompt</div>
                      <button 
                        onClick={onCopyPrompt} 
                        disabled={copying} 
                        className="flex items-center justify-center w-6 h-6 bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-600 rounded transition-all"
                        title="Copy prompt to clipboard"
                      >
                        {copying ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                    <div className="text-xs font-mono text-gray-500 whitespace-pre-wrap break-words bg-gray-800 p-2 rounded">
                      {buildActionPrompt(selectedActionDetail)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}