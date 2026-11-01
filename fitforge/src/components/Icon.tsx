import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Minimal line icons (24×24, stroke-based), matching the design preview.
export type IconName =
  | 'summary' | 'log' | 'coach' | 'plus' | 'x' | 'search' | 'check' | 'mic' | 'send'
  | 'chev' | 'ring' | 'body' | 'cal' | 'up' | 'alert' | 'trophy';

export default function Icon({ name, size = 22, color = '#fff', strokeWidth = 2 }: {
  name: IconName; size?: number; color?: string; strokeWidth?: number;
}) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'summary' && <Path d="M3 12h4l3-8 4 16 3-8h4" {...p} />}
      {name === 'log' && <Path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" {...p} />}
      {name === 'coach' && <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16v4M17 18h4" {...p} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...p} />}
      {name === 'x' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />}
      {name === 'chev' && <Path d="M9 6l6 6-6 6" {...p} />}
      {name === 'up' && <Path d="M7 17L17 7M9 7h8v8" {...p} />}
      {name === 'send' && <Path d="M12 19V5M6 11l6-6 6 6" {...p} />}
      {name === 'ring' && <Circle cx={12} cy={12} r={8} {...p} />}
      {name === 'body' && (<><Circle cx={12} cy={5} r={2} {...p} /><Path d="M6 9l6 1 6-1M12 10v5l-3 6M12 15l3 6" {...p} /></>)}
      {name === 'cal' && (<><Rect x={4} y={5} width={16} height={15} rx={3} {...p} /><Path d="M4 10h16M9 3v4M15 3v4" {...p} /></>)}
      {name === 'alert' && (<><Circle cx={12} cy={12} r={9} {...p} /><Path d="M12 7.5v5.5M12 16.5h.01" {...p} /></>)}
      {name === 'search' && (<><Circle cx={11} cy={11} r={6.5} {...p} /><Path d="M20 20l-4-4" {...p} /></>)}
      {name === 'trophy' && <Path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4zM7.5 6H5a2.5 2.5 0 0 0 3 3.2M16.5 6H19a2.5 2.5 0 0 1-3 3.2M12 13.5V17M8.5 20h7M10 17h4v3h-4z" {...p} />}
      {name === 'mic' && (<><Rect x={9} y={3} width={6} height={11} rx={3} {...p} /><Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" {...p} /></>)}
    </Svg>
  );
}
