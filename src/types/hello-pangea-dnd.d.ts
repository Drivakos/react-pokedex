import * as React from 'react';

declare module '@hello-pangea/dnd' {
  export interface DraggableLocation {
    droppableId: string;
    index: number;
  }

  export interface DropResult {
    reason: 'DROP' | 'CANCEL';
    source: DraggableLocation;
    destination: DraggableLocation | null;
    draggableId: string;
    type: string;
    combine: null;
    mode: 'FLUID' | 'SNAP';
  }

  export interface DragStart {
    draggableId: string;
    type: string;
    source: DraggableLocation;
    mode: 'FLUID' | 'SNAP';
  }

  export interface DragUpdate extends DragStart {
    destination: DraggableLocation | null;
    combine: null;
  }

  export type DropReason = 'DROP' | 'CANCEL';
  export type DragDropContextProps = any;
  export type DroppableProps = any;
  export type DraggableProps = any;
  
  export const DragDropContext: React.ComponentType<DragDropContextProps>;
  export const Droppable: React.ComponentType<DroppableProps>;
  export const Draggable: React.ComponentType<DraggableProps>;
}
