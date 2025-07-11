'use client';

import { useState } from 'react';
import { Check, Copy, Link, Square, CheckSquare, Trash2, Plus } from 'react-feather';
import EditableField, { ColorScheme } from '../../components/EditableField';
import { ActionDetailResource } from '../../../lib/types/resources';
import { buildActionPrompt } from '../../../lib/utils/action-prompt-builder';

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
  onDelete?: (actionId: string, childHandling: 'reparent' | 'delete_recursive') => void;
  deleting?: boolean;
  onActionUpdate?: (actionId: string, field: string, value: string) => void;
  onDataRefresh?: () => void;
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
  setIsDragging,
  onDelete,
  deleting = false,
  onActionUpdate,
  onDataRefresh
}: TreemapInspectorProps) {
  const [savingField, setSavingField] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [childHandling, setChildHandling] = useState<'reparent' | 'delete_recursive'>('reparent');
  const [showGenerateChildrenModal, setShowGenerateChildrenModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [childSuggestions, setChildSuggestions] = useState<any[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [creatingChildren, setCreatingChildren] = useState(false);
  const [maxSuggestions, setMaxSuggestions] = useState(5);
  const [complexityLevel, setComplexityLevel] = useState<'simple' | 'detailed' | 'comprehensive'>('detailed');
  const [customContext, setCustomContext] = useState('');

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
      
      // Notify parent about the update
      if (onActionUpdate) {
        onActionUpdate(selectedActionDetail.id, field, value);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      throw error;
    } finally {
      setSavingField(null);
    }
  };

  const handleGenerateChildren = async () => {
    if (!selectedActionDetail) return;
    
    // Show modal immediately with loading state
    setShowGenerateChildrenModal(true);
    setGenerating(true);
    setChildSuggestions([]);
    
    await generateSuggestions();
  };

  const generateSuggestions = async () => {
    if (!selectedActionDetail) return;
    
    try {
      setGenerating(true);
      const response = await fetch(`/api/actions/${selectedActionDetail.id}/suggest-children`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_suggestions: maxSuggestions,
          include_reasoning: true,
          complexity_level: complexityLevel,
          custom_context: customContext.trim() || undefined
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate child suggestions');
      }
      
      const data = await response.json();
      if (data.success) {
        setChildSuggestions(data.data.suggestions);
        setSelectedSuggestions(new Set(data.data.suggestions.map((_: any, index: number) => index)));
      } else {
        throw new Error(data.error || 'Failed to generate suggestions');
      }
    } catch (error) {
      console.error('Error generating children:', error);
      // TODO: Show user-friendly error message
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateSelectedChildren = async () => {
    if (!selectedActionDetail || childSuggestions.length === 0) return;
    
    try {
      setCreatingChildren(true);
      const selectedSuggestionsArray = Array.from(selectedSuggestions);
      
      // Create children sequentially to maintain order
      for (const index of selectedSuggestionsArray.sort((a, b) => a - b)) {
        const suggestion = childSuggestions[index];
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: suggestion.title,
            description: suggestion.description,
            family_id: selectedActionDetail.id
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create child action: ${suggestion.title}`);
        }
      }
      
      // Close modal and refresh data
      setShowGenerateChildrenModal(false);
      setChildSuggestions([]);
      setSelectedSuggestions(new Set());
      
      // Refresh the tree data
      if (onDataRefresh) {
        onDataRefresh();
      }
    } catch (error) {
      console.error('Error creating children:', error);
      // TODO: Show user-friendly error message
    } finally {
      setCreatingChildren(false);
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
            <div className="p-3 border-b border-gray-700 flex gap-2 flex-wrap">
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
              {selectedActionDetail.children.length === 0 && !selectedActionDetail.done && (
                <button 
                  onClick={handleGenerateChildren}
                  disabled={generating}
                  className="flex items-center justify-center w-8 h-8 bg-gray-800 text-gray-400 hover:text-green-400 hover:bg-gray-700 border border-gray-600 rounded transition-all"
                  title="Generate child actions"
                >
                  <Plus size={14} />
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={() => {
                    // Reset child handling to default when opening modal
                    setChildHandling(selectedActionDetail.parent_id ? 'reparent' : 'delete_recursive');
                    setShowDeleteModal(true);
                  }}
                  disabled={deleting}
                  className="flex items-center justify-center w-8 h-8 bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 border border-gray-600 rounded transition-all"
                  title="Delete action"
                >
                  <Trash2 size={14} />
                </button>
              )}
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
      
      {/* Delete confirmation modal */}
      {showDeleteModal && selectedActionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Delete Action</h2>
            <p className="text-sm text-gray-300 mb-4">
              Are you sure you want to delete "{selectedActionDetail.title}"? This action cannot be undone.
            </p>
            
            {/* Child handling options */}
            {selectedActionDetail.children.length > 0 && (
              <div className="bg-gray-700 border border-gray-600 rounded p-4 mb-4">
                <p className="text-sm text-gray-300 mb-3">
                  This action has {selectedActionDetail.children.length} child action{selectedActionDetail.children.length !== 1 ? 's' : ''}. 
                  What should happen to them?
                </p>
                
                {/* Child action list */}
                <div className="mb-3 p-3 bg-gray-800 rounded border border-gray-600">
                  <div className="text-xs text-gray-400 font-mono mb-2">Child actions:</div>
                  <div className="space-y-1">
                    {selectedActionDetail.children.map((child) => (
                      <div key={child.id} className="text-xs text-gray-300 font-mono flex items-center">
                        <span className={`mr-2 ${child.done ? 'text-green-400' : 'text-yellow-400'}`}>
                          {child.done ? '✓' : '○'}
                        </span>
                        <span className="truncate">{child.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {selectedActionDetail.parent_id && (
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="childHandling"
                        value="reparent"
                        checked={childHandling === 'reparent'}
                        onChange={(e) => setChildHandling(e.target.value as 'reparent')}
                        className="mt-1 text-blue-500 bg-gray-800 border-gray-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-sm text-gray-200">Move to parent action</div>
                        <div className="text-xs text-gray-400">Child actions will be moved to the parent level</div>
                      </div>
                    </label>
                  )}
                  
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="childHandling"
                      value="delete_recursive"
                      checked={childHandling === 'delete_recursive'}
                      onChange={(e) => setChildHandling(e.target.value as 'delete_recursive')}
                      className="mt-1 text-blue-500 bg-gray-800 border-gray-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm text-gray-200">Delete all children</div>
                      <div className="text-xs text-gray-400">All child actions will also be permanently deleted</div>
                    </div>
                  </label>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm bg-gray-700 text-gray-200 hover:bg-gray-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onDelete) {
                    onDelete(selectedActionDetail.id, childHandling);
                    setShowDeleteModal(false);
                  }
                }}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed rounded transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Children Modal */}
      {showGenerateChildrenModal && selectedActionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Generate Child Actions</h2>
            <p className="text-sm text-gray-300 mb-4">
              AI-generated suggestions for breaking down "{selectedActionDetail.title}" into child actions:
            </p>
            
            {/* Context Controls */}
            <div className="bg-gray-700 border border-gray-600 rounded p-4 mb-4 space-y-3">
              <div className="text-sm font-medium text-gray-200 mb-2">Generation Settings</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max Suggestions</label>
                  <select
                    value={maxSuggestions}
                    onChange={(e) => setMaxSuggestions(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:border-green-500 focus:outline-none"
                  >
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={7}>7</option>
                    <option value={10}>10</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Complexity Level</label>
                  <select
                    value={complexityLevel}
                    onChange={(e) => setComplexityLevel(e.target.value as 'simple' | 'detailed' | 'comprehensive')}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:border-green-500 focus:outline-none"
                  >
                    <option value="simple">Simple</option>
                    <option value="detailed">Detailed</option>
                    <option value="comprehensive">Comprehensive</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Additional Context (optional)</label>
                <textarea
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  placeholder="Add specific context, constraints, or direction for better suggestions..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:border-green-500 focus:outline-none resize-none"
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={generateSuggestions}
                  disabled={generating}
                  className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded transition-colors"
                >
                  {generating ? 'Generating...' : 'Generate Suggestions'}
                </button>
              </div>
            </div>
            
            {/* Suggestions List */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {generating ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <div className="text-sm text-gray-400">Generating suggestions...</div>
                  </div>
                </div>
              ) : childSuggestions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-sm text-gray-400">Click "Generate Suggestions" to get AI-powered child action ideas</div>
                </div>
              ) : (
                childSuggestions.map((suggestion, index) => (
                  <div key={index} className="bg-gray-700 border border-gray-600 rounded p-4">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedSuggestions.has(index)}
                        onChange={(e) => {
                          const newSelection = new Set(selectedSuggestions);
                          if (e.target.checked) {
                            newSelection.add(index);
                          } else {
                            newSelection.delete(index);
                          }
                          setSelectedSuggestions(newSelection);
                        }}
                        className="mt-1 text-green-500 bg-gray-800 border-gray-600 focus:ring-green-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-100 mb-1">
                          {suggestion.title}
                        </div>
                        <div className="text-xs text-gray-300 mb-2">
                          {suggestion.description}
                        </div>
                        {suggestion.reasoning && (
                          <div className="text-xs text-gray-400 italic">
                            {suggestion.reasoning}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowGenerateChildrenModal(false);
                  setChildSuggestions([]);
                  setSelectedSuggestions(new Set());
                  setCustomContext('');
                }}
                className="px-4 py-2 text-sm bg-gray-700 text-gray-200 hover:bg-gray-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSelectedChildren}
                disabled={creatingChildren || selectedSuggestions.size === 0 || childSuggestions.length === 0}
                className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded transition-colors"
              >
                {creatingChildren ? 'Creating...' : `Create ${selectedSuggestions.size} Action${selectedSuggestions.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}