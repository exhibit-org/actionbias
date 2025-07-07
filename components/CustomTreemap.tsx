'use client';

import React, { useMemo } from 'react';
// Define TreemapData interface locally to avoid circular imports
interface TreemapData {
  id: string;
  name: string;
  value?: number;
  color?: string;
  children?: TreemapData[];
  depth?: number;
}

interface CustomTreemapProps {
  data: TreemapData;
  width: number;
  height: number;
  onNodeClick?: (node: TreemapData) => void;
  onNodeHover?: (node: TreemapData | null) => void;
  hoveredNodeId?: string | null;
  selectedNodeId?: string | null;
}

interface ComputedNode extends TreemapData {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  parent?: ComputedNode;
  computedChildren: ComputedNode[];
}

// Proper squarified treemap algorithm
function squarify(data: TreemapData[], x: number, y: number, width: number, height: number, depth: number = 0): ComputedNode[] {
  if (!data.length) return [];

  const total = data.reduce((sum, d) => sum + (d.value || 1), 0);
  
  if (data.length === 1) {
    const node = data[0];
    const computedNode: ComputedNode = {
      ...node,
      x,
      y,
      width,
      height,
      depth,
      computedChildren: []
    };
    
    if (node.children && node.children.length > 0) {
      // For parent nodes, reserve space for the label at the top
      const labelHeight = Math.min(24, height * 0.15);
      computedNode.computedChildren = squarify(
        node.children, 
        x, 
        y + labelHeight, 
        width, 
        height - labelHeight, 
        depth + 1
      );
      computedNode.computedChildren.forEach(child => child.parent = computedNode);
    }
    
    return [computedNode];
  }

  // Sort by value descending for better treemap layout
  const sorted = [...data].sort((a, b) => (b.value || 1) - (a.value || 1));
  
  return layoutSquarified(sorted, x, y, width, height, depth, total);
}

function layoutSquarified(data: TreemapData[], x: number, y: number, width: number, height: number, depth: number, total: number): ComputedNode[] {
  const nodes: ComputedNode[] = [];
  let dx = width;
  let dy = height;
  let x0 = x;
  let y0 = y;
  let remaining = [...data];
  
  while (remaining.length > 0) {
    const row: TreemapData[] = [];
    const minArea = (remaining[0].value || 1) / total * dx * dy;
    const beta = minArea / Math.min(dx, dy);
    let alpha = Math.max(dx, dy) / Math.min(dx, dy);
    
    // Build a row
    while (remaining.length > 0) {
      const item = remaining[0];
      const area = (item.value || 1) / total * dx * dy;
      
      if (row.length === 0) {
        row.push(remaining.shift()!);
        continue;
      }
      
      // Calculate worst aspect ratio if we add this item
      const rowArea = row.reduce((sum, d) => sum + (d.value || 1), 0) / total * dx * dy;
      const newRowArea = rowArea + area;
      const ratio1 = Math.max((alpha * beta) / rowArea, rowArea / (alpha * beta));
      const ratio2 = Math.max((alpha * beta) / newRowArea, newRowArea / (alpha * beta));
      
      if (ratio1 <= ratio2) {
        break; // Don't add this item, it makes things worse
      }
      
      row.push(remaining.shift()!);
    }
    
    // Layout the row
    const rowTotal = row.reduce((sum, d) => sum + (d.value || 1), 0);
    const isHorizontal = dx > dy;
    
    if (isHorizontal) {
      const rowWidth = rowTotal / total * dx;
      let currentY = y0;
      
      for (const item of row) {
        const itemHeight = (item.value || 1) / rowTotal * dy;
        const computedNode: ComputedNode = {
          ...item,
          x: x0,
          y: currentY,
          width: rowWidth,
          height: itemHeight,
          depth,
          computedChildren: []
        };
        
        if (item.children && item.children.length > 0) {
          const labelHeight = Math.min(24, itemHeight * 0.15);
          computedNode.computedChildren = squarify(
            item.children,
            x0,
            currentY + labelHeight,
            rowWidth,
            itemHeight - labelHeight,
            depth + 1
          );
          computedNode.computedChildren.forEach(child => child.parent = computedNode);
        }
        
        nodes.push(computedNode);
        currentY += itemHeight;
      }
      
      x0 += rowWidth;
      dx -= rowWidth;
    } else {
      const rowHeight = rowTotal / total * dy;
      let currentX = x0;
      
      for (const item of row) {
        const itemWidth = (item.value || 1) / rowTotal * dx;
        const computedNode: ComputedNode = {
          ...item,
          x: currentX,
          y: y0,
          width: itemWidth,
          height: rowHeight,
          depth,
          computedChildren: []
        };
        
        if (item.children && item.children.length > 0) {
          const labelHeight = Math.min(24, rowHeight * 0.15);
          computedNode.computedChildren = squarify(
            item.children,
            currentX,
            y0 + labelHeight,
            itemWidth,
            rowHeight - labelHeight,
            depth + 1
          );
          computedNode.computedChildren.forEach(child => child.parent = computedNode);
        }
        
        nodes.push(computedNode);
        currentX += itemWidth;
      }
      
      y0 += rowHeight;
      dy -= rowHeight;
    }
  }
  
  return nodes;
}

function getAllNodes(nodes: ComputedNode[]): ComputedNode[] {
  const result: ComputedNode[] = [];
  
  function traverse(nodeList: ComputedNode[]) {
    for (const node of nodeList) {
      result.push(node);
      if (node.computedChildren.length > 0) {
        traverse(node.computedChildren);
      }
    }
  }
  
  traverse(nodes);
  return result;
}

export default function CustomTreemap({ 
  data, 
  width, 
  height, 
  onNodeClick, 
  onNodeHover,
  hoveredNodeId,
  selectedNodeId 
}: CustomTreemapProps) {
  const computedNodes = useMemo(() => {
    if (!data.children || data.children.length === 0) return [];
    return squarify(data.children, 0, 0, width, height);
  }, [data, width, height]);

  const allNodes = useMemo(() => getAllNodes(computedNodes), [computedNodes]);

  const handleClick = (node: ComputedNode) => {
    onNodeClick?.(node);
  };

  const handleMouseEnter = (node: ComputedNode) => {
    onNodeHover?.(node);
  };

  const handleMouseLeave = () => {
    onNodeHover?.(null);
  };

  return (
    <div 
      data-testid="treemap-container"
      style={{ 
        position: 'relative', 
        width, 
        height, 
        backgroundColor: '#111827',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace'
      }}
      onMouseLeave={handleMouseLeave}
    >
      {allNodes.map((node) => {
        const hasChildren = node.computedChildren.length > 0;
        const isHovered = hoveredNodeId === node.id;
        const isSelected = selectedNodeId === node.id;
        
        return (
          <div key={node.id}>
            {/* Main node area */}
            <div
              style={{
                position: 'absolute',
                left: node.x + 1,
                top: node.y + 1,
                width: Math.max(0, node.width - 2),
                height: Math.max(0, node.height - 2),
                backgroundColor: hasChildren ? 
                  (isHovered || isSelected ? (node.color || '#4b5563') : 'rgba(75, 85, 99, 0.3)') :
                  (node.color || '#4b5563'),
                border: '1px solid #374151',
                cursor: !hasChildren ? 'pointer' : 'default',
                transition: 'background-color 0.2s ease'
              }}
              onClick={!hasChildren ? () => handleClick(node) : undefined}
              onMouseEnter={!hasChildren ? () => handleMouseEnter(node) : undefined}
            />

            {/* Parent label area - separate interaction zone */}
            {hasChildren && (
              <div
                style={{
                  position: 'absolute',
                  left: node.x + 4,
                  top: node.y + 4,
                  width: Math.max(0, node.width - 8),
                  height: Math.min(24, node.height * 0.15),
                  backgroundColor: 'rgba(55, 65, 81, 0.9)',
                  color: '#f3f4f6',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  lineHeight: '1.2',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  border: isHovered || isSelected ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                  transition: 'border 0.2s ease'
                }}
                onClick={() => handleClick(node)}
                onMouseEnter={() => handleMouseEnter(node)}
              >
                {node.name}
              </div>
            )}

            {/* Leaf node label */}
            {!hasChildren && (
              <div
                style={{
                  position: 'absolute',
                  left: node.x + 6,
                  top: node.y + 6,
                  width: Math.max(0, node.width - 12),
                  height: Math.max(0, node.height - 12),
                  color: '#d1d5db',
                  fontSize: '11px',
                  lineHeight: '1.3',
                  overflow: 'hidden',
                  wordWrap: 'break-word',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}
              >
                {node.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}