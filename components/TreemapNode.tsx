'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TreemapNodeProps {
  node: any;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  onClick?: (node: any) => void;
  onMouseEnter?: (nodeId: string) => void;
  onMouseLeave?: () => void;
  isHovered?: boolean;
}

export function TreemapNode({
  node,
  x,
  y,
  width,
  height,
  color,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isHovered = false,
}: TreemapNodeProps) {
  const nodeData = node.data;
  const hasChildren = node.children && node.children.length > 0;
  
  // Determine styling based on hierarchy
  const fontSize = hasChildren ? 20 : 16;
  const fontWeight = hasChildren ? 'font-semibold' : 'font-normal';
  const textColor = hasChildren ? 'text-gray-100' : 'text-gray-300';
  
  return (
    <div
      className={cn(
        "absolute flex items-start justify-start p-1 cursor-pointer transition-all duration-200",
        "hover:brightness-110",
        isHovered && "ring-2 ring-blue-400 ring-opacity-50"
      )}
      style={{
        left: x,
        top: y,
        width,
        height,
        backgroundColor: color,
      }}
      onClick={() => onClick?.(node)}
      onMouseEnter={() => onMouseEnter?.(nodeData.id)}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={cn(
          "font-mono leading-tight break-words overflow-hidden w-full",
          fontWeight,
          textColor
        )}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: '1.3',
        }}
      >
        {nodeData.name}
      </div>
    </div>
  );
}