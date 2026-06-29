"use client";
import { useEffect } from "react";
import { useSetDefaultScale } from "components/Resume/hooks";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { usePDF } from "@react-pdf/renderer";
import dynamic from "next/dynamic";

const ResumeControlBar = ({
  scale,
  setScale,
  documentSize,
  document,
  fileName,
}: {
  scale: number;
  setScale: (scale: number) => void;
  documentSize: string;
  document: JSX.Element;
  fileName: string;
}) => {
  const { scaleOnResize, setScaleOnResize } = useSetDefaultScale({
    setScale,
    documentSize,
  });

  const [instance, update] = usePDF({ document });

  // Hook to update pdf when document changes
  useEffect(() => {
    update();
  }, [update, document]);

  return (
    <div className="sticky bottom-0 left-0 right-0 flex h-[var(--resume-control-bar-height)] items-center justify-center px-[var(--resume-padding)] text-white/90 lg:justify-between border-t border-white/10 bg-black/30 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <MagnifyingGlassIcon className="h-5 w-5 text-emerald-400" aria-hidden="true" />
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.01}
          value={scale}
          onChange={(e) => {
            setScaleOnResize(false);
            setScale(Number(e.target.value));
          }}
          className="accent-emerald-400"
        />
        <div className="w-12 text-sm font-semibold text-white/95">{`${Math.round(scale * 100)}%`}</div>
        <label className="hidden items-center gap-1.5 lg:flex cursor-pointer text-sm font-medium text-white/80 select-none">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-400"
            checked={scaleOnResize}
            onChange={() => setScaleOnResize((prev) => !prev)}
          />
          <span>Autoscale</span>
        </label>
      </div>
      <a
        className="ml-1 flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 bg-white/5 hover:bg-white/10 active:scale-95 transition-all lg:ml-8"
        href={instance.url!}
        download={fileName}
      >
        <ArrowDownTrayIcon className="h-3.5 w-3.5 text-emerald-400" />
        <span className="whitespace-nowrap">Download Resume</span>
      </a>
    </div>
  );
};

/**
 * Load ResumeControlBar client side since it uses usePDF, which is a web specific API
 */
export const ResumeControlBarCSR = dynamic(
  () => Promise.resolve(ResumeControlBar),
  {
    ssr: false,
  }
);

export const ResumeControlBarBorder = () => (
  <div className="absolute bottom-[var(--resume-control-bar-height)] w-full border-t border-white/10" />
);
