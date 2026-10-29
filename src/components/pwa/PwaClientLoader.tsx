"use client";

import dynamic from 'next/dynamic';

const PwaRegister = dynamic(
  () => import('./PwaRegister').then((mod) => mod.PwaRegister || mod.default),
  { ssr: false }
);

export function PwaClientLoader() {
  return <PwaRegister />;
}

export default PwaClientLoader;
