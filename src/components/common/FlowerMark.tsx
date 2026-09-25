import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Rect } from 'react-native-svg';

interface FlowerMarkProps {
  size?: number;
  /** Small accent full-stop after the glyph — the signature dot. */
  dot?: boolean;
}

/**
 * Builder mark: a minimal `</>` code glyph with a horizontal grey→accent
 * gradient. `dot` adds a pink full-stop so it reads like a signed line
 * of code. Pure SVG, scales cleanly via `size`.
 */
export const FlowerMark: React.FC<FlowerMarkProps> = ({ size = 52, dot = false }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Defs>
      <LinearGradient
        id="fmGrad"
        x1="0"
        y1="32"
        x2="64"
        y2="32"
        gradientUnits="userSpaceOnUse"
      >
        <Stop offset="0" stopColor="#8E8E93" />
        <Stop offset="0.55" stopColor="#C2576B" />
        <Stop offset="1" stopColor="#FA2D55" />
      </LinearGradient>
    </Defs>
    {/* < */}
    <Path
      d="M21 19 L9 32 L21 45"
      stroke="url(#fmGrad)"
      strokeWidth={5.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* > */}
    <Path
      d="M43 19 L55 32 L43 45"
      stroke="url(#fmGrad)"
      strokeWidth={5.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* / */}
    <Path
      d="M36.5 13 L27.5 51"
      stroke="url(#fmGrad)"
      strokeWidth={6}
      strokeLinecap="round"
    />
    {dot && <Rect x="46" y="46" width="7" height="7" rx="2" fill="#FA2D55" />}
  </Svg>
);
