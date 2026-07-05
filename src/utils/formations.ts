/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PositionType, FormationType } from '../types';

export interface PitchNode {
  id: string;
  positionType: PositionType;
  x: number; // percentage width
  y: number; // percentage height
  label: string; // e.g. "CB", "LW", "LCM"
}

export const getFormationLayout = (formation: FormationType): PitchNode[] => {
  const layout: PitchNode[] = [
    { id: 'gk-1', positionType: 'GK', x: 50, y: 88, label: 'GK' },
  ];

  switch (formation) {
    case '4-3-3':
      // Defenders (4)
      layout.push(
        { id: 'def-1', positionType: 'DEF', x: 15, y: 70, label: 'LB' },
        { id: 'def-2', positionType: 'DEF', x: 38, y: 72, label: 'LCB' },
        { id: 'def-3', positionType: 'DEF', x: 62, y: 72, label: 'RCB' },
        { id: 'def-4', positionType: 'DEF', x: 85, y: 70, label: 'RB' }
      );
      // Midfielders (3)
      layout.push(
        { id: 'mid-1', positionType: 'MID', x: 25, y: 48, label: 'LCM' },
        { id: 'mid-2', positionType: 'MID', x: 50, y: 52, label: 'DM' },
        { id: 'mid-3', positionType: 'MID', x: 75, y: 48, label: 'RCM' }
      );
      // Forwards (3)
      layout.push(
        { id: 'fwd-1', positionType: 'FWD', x: 20, y: 22, label: 'LW' },
        { id: 'fwd-2', positionType: 'FWD', x: 50, y: 18, label: 'ST' },
        { id: 'fwd-3', positionType: 'FWD', x: 80, y: 22, label: 'RW' }
      );
      break;

    case '3-5-2':
      // Defenders (3)
      layout.push(
        { id: 'def-1', positionType: 'DEF', x: 25, y: 72, label: 'LCB' },
        { id: 'def-2', positionType: 'DEF', x: 50, y: 74, label: 'CB' },
        { id: 'def-3', positionType: 'DEF', x: 75, y: 72, label: 'RCB' }
      );
      // Midfielders (5)
      layout.push(
        { id: 'mid-1', positionType: 'MID', x: 12, y: 48, label: 'LM' },
        { id: 'mid-2', positionType: 'MID', x: 34, y: 50, label: 'LCM' },
        { id: 'mid-3', positionType: 'MID', x: 50, y: 54, label: 'DM' },
        { id: 'mid-4', positionType: 'MID', x: 66, y: 50, label: 'RCM' },
        { id: 'mid-5', positionType: 'MID', x: 88, y: 48, label: 'RM' }
      );
      // Forwards (2)
      layout.push(
        { id: 'fwd-1', positionType: 'FWD', x: 35, y: 20, label: 'LS' },
        { id: 'fwd-2', positionType: 'FWD', x: 65, y: 20, label: 'RS' }
      );
      break;

    case '4-2-3-1':
      // Defenders (4)
      layout.push(
        { id: 'def-1', positionType: 'DEF', x: 15, y: 70, label: 'LB' },
        { id: 'def-2', positionType: 'DEF', x: 38, y: 72, label: 'LCB' },
        { id: 'def-3', positionType: 'DEF', x: 62, y: 72, label: 'RCB' },
        { id: 'def-4', positionType: 'DEF', x: 85, y: 70, label: 'RB' }
      );
      // Defensive Mids (2)
      layout.push(
        { id: 'mid-1', positionType: 'MID', x: 35, y: 55, label: 'LDM' },
        { id: 'mid-2', positionType: 'MID', x: 65, y: 55, label: 'RDM' }
      );
      // Attacking Mids (3)
      layout.push(
        { id: 'mid-3', positionType: 'MID', x: 20, y: 36, label: 'LAM' },
        { id: 'mid-4', positionType: 'MID', x: 50, y: 34, label: 'AM' },
        { id: 'mid-5', positionType: 'MID', x: 80, y: 36, label: 'RAM' }
      );
      // Forward (1)
      layout.push(
        { id: 'fwd-1', positionType: 'FWD', x: 50, y: 16, label: 'ST' }
      );
      break;

    case '4-4-2':
      // Defenders (4)
      layout.push(
        { id: 'def-1', positionType: 'DEF', x: 15, y: 72, label: 'LB' },
        { id: 'def-2', positionType: 'DEF', x: 38, y: 74, label: 'LCB' },
        { id: 'def-3', positionType: 'DEF', x: 62, y: 74, label: 'RCB' },
        { id: 'def-4', positionType: 'DEF', x: 85, y: 72, label: 'RB' }
      );
      // Midfielders (4)
      layout.push(
        { id: 'mid-1', positionType: 'MID', x: 15, y: 48, label: 'LM' },
        { id: 'mid-2', positionType: 'MID', x: 38, y: 50, label: 'LCM' },
        { id: 'mid-3', positionType: 'MID', x: 62, y: 50, label: 'RCM' },
        { id: 'mid-4', positionType: 'MID', x: 85, y: 48, label: 'RM' }
      );
      // Forwards (2)
      layout.push(
        { id: 'fwd-1', positionType: 'FWD', x: 35, y: 20, label: 'LS' },
        { id: 'fwd-2', positionType: 'FWD', x: 65, y: 20, label: 'RS' }
      );
      break;

    case '5-3-2':
      // Defenders (5)
      layout.push(
        { id: 'def-1', positionType: 'DEF', x: 12, y: 70, label: 'LWB' },
        { id: 'def-2', positionType: 'DEF', x: 31, y: 72, label: 'LCB' },
        { id: 'def-3', positionType: 'DEF', x: 50, y: 74, label: 'CB' },
        { id: 'def-4', positionType: 'DEF', x: 69, y: 72, label: 'RCB' },
        { id: 'def-5', positionType: 'DEF', x: 88, y: 70, label: 'RWB' }
      );
      // Midfielders (3)
      layout.push(
        { id: 'mid-1', positionType: 'MID', x: 25, y: 48, label: 'LCM' },
        { id: 'mid-2', positionType: 'MID', x: 50, y: 52, label: 'DM' },
        { id: 'mid-3', positionType: 'MID', x: 75, y: 48, label: 'RCM' }
      );
      // Forwards (2)
      layout.push(
        { id: 'fwd-1', positionType: 'FWD', x: 35, y: 20, label: 'LS' },
        { id: 'fwd-2', positionType: 'FWD', x: 65, y: 20, label: 'RS' }
      );
      break;
  }

  return layout;
};
