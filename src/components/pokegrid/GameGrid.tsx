import React from 'react';
import { GridCell, GridCellData } from './GridCell';
import { ConstraintHeader, GridConstraint } from './ConstraintHeader';

interface GameGridProps {
  cells: GridCellData[];
  rowConstraints: GridConstraint[];
  colConstraints: GridConstraint[];
  totalGuesses: number;
  maxTotalGuesses: number;
  onCellClick: (cell: GridCellData) => void;
}

export const GameGrid: React.FC<GameGridProps> = ({
  cells,
  rowConstraints,
  colConstraints,
  totalGuesses,
  maxTotalGuesses,
  onCellClick
}) => {
  return (
    <div className="">
      <div className="grid grid-cols-4 gap-0.5 sm:gap-1 w-4/5 lg:max-w-lg xl:max-w-2xl mx-auto">
        {/* Top-left corner with PokéGrid branding */}
        <div className="aspect-square flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold">Challenge</div>
            <div className="text-xs font-medium">GRID</div>
          </div>
        </div>
        
        {/* Column headers */}
        {colConstraints.map((constraint, index) => (
          <ConstraintHeader
            key={`col-${index}`}
            constraint={constraint}
            type="column"
          />
        ))}

        {/* Grid rows */}
        {rowConstraints.map((rowConstraint, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            {/* Row header */}
            <ConstraintHeader
              constraint={rowConstraint}
              type="row"
            />

            {/* Grid cells */}
            {colConstraints.map((_, colIndex) => {
              const cell = cells.find(c => c.row === rowIndex && c.col === colIndex);
              if (!cell) return null;

              return (
                <GridCell
                  key={cell.id}
                  cell={cell}
                  totalGuesses={totalGuesses}
                  maxTotalGuesses={maxTotalGuesses}
                  onClick={onCellClick}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
