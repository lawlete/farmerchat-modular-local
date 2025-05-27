
import React from 'react';

interface IconProps {
  className?: string;
}

export const TractorIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.9_13.61a1_1_0_00-1.3.54_3.5_3.5_0_01-6.2_0_1_1_0_00-1.3-.54A5.5_5.5_0_007.5_18H5a1_1_0_000_2h2.5A3.5_3.5_0_0011_16.5a3.5_3.5_0_003.03-1.75_3.5_3.5_0_003.04_1.75A3.5_3.5_0_0020_16.5a1_1_0_00-1-1h-.5a1.5_1.5_0_010-3H19a1_1_0_000-2h-1.22a3_3_0_00-5.88-1V6a1_1_0_00-1-1H9a1_1_0_00-1_1v2H5a1_1_0_000_2h2.33L6_12.5A1_1_0_007_14h5.5a1_1_0_00.9-.55_1.5_1.5_0_012.73_0_1_1_0_00.9.55H19a1_1_0_00.9-1.39zM6.5_5A1.5_1.5_0_115_6.5_1.5_1.5_0_016.5_5zm11_0A1.5_1.5_0_1116_6.5_1.5_1.5_0_0117.5_5z"/>
  </svg>
);

export const TreeIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
     <path d="M12,2A7,7,0,0,0,5,9c0,1.92.74,3.7,2.11,5.1C7,14,7,14,7,14.05_12_22h0a1,1,0,0,0,1-1V19h4v2a1,1,0,0,0,1,1h0s0,0,0,0c.06,0,.11,0,.17,0L17,14.05C17,14,17,14,17,14.05,18.26,12.7,19,10.92,19,9A7,7,0,0,0,12,2Zm0,11a2,2,0,1,1,2-2A2,2,0,0,1,12,13Z" />
  </svg>
);

export const WorkersIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5 7.5a2 2 0 10-2-2 2 2 0 002 2zM10 9H8v1.5a.5.5 0 00.5.5h3a.5.5 0 00.5-.5V9h-2zm6.5-1.5a2 2 0 10-2-2 2 2 0 002 2zM14 9h-2v1.5a.5.5 0 00.5.5h3a.5.5 0 00.5-.5V9h-2zm-4 4H7.5a2.5 2.5 0 00-2.5 2.5V18h10v-2.5A2.5 2.5 0 0012.5 13H10zm6.5 0h-2.5a2.5 2.5 0 00-2.5 2.5V18h10v-2.5A2.5 2.5 0 0016.5 13zM6 4.5a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5zm12 0a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5z"/>
  </svg>
);
