'use client';

import { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Video, ShieldCheck, Sparkles, Clock, Hash } from 'lucide-react';

export type KeyframeTag = {
  timestamp: number;
  label: string;
  sha256?: string;
  isThreat?: boolean;
};

type VideoScrubberProps = {
  src: string;
  title: string;
  keyframes?: KeyframeTag[];
  initialTimestamp?: number;
  onKeyframeSelect?: (tag: KeyframeTag) => void;
};

export default function VideoScrubber({
  src,
  title,
  keyframes = [],
  initialTimestamp,
  onKeyframeSelect,
}: VideoScrubberProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeKeyframe, setActiveKeyframe] = useState<KeyframeTag | null>(null);

  useEffect(() => {
    if (initialTimestamp !== undefined && videoRef.current) {
      videoRef.current.currentTime = initialTimestamp;
      setCurrentTime(initialTimestamp);
    }
  }, [initialTimestamp]);

  function seekTo(tag: KeyframeTag) {
    if (videoRef.current) {
      videoRef.current.currentTime = tag.timestamp;
      setCurrentTime(tag.timestamp);
      setActiveKeyframe(tag);
      onKeyframeSelect?.(tag);
      void videoRef.current.play();
      setIsPlaying(true);
    }
  }

  function togglePlay() {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      void videoRef.current.play();
      setIsPlaying(true);
    }
  }

  function handleReset() {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
    videoRef.current.pause();
    setIsPlaying(false);
  }

  return (
    <section
      aria-label={`${title} video forensic scrubber`}
      className="space-y-3.5 rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
            <Video className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 line-clamp-1">{title}</h3>
            <p className="font-mono text-xs text-slate-400">
              Evidence Act 1950 Sec 90A Motion Scrubber
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span>
            {currentTime.toFixed(1)}s / {duration > 0 ? duration.toFixed(1) + 's' : '--'}
          </span>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-black aspect-video flex items-center justify-center">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          preload="metadata"
          aria-label={title}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onEnded={() => setIsPlaying(false)}
        >
          <source src={src} type="video/mp4" />
          <source src={src} type="video/webm" />
          Your browser does not support HTML5 video playback.
        </video>

        {/* Overlay Play/Pause button */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/80 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white transition active:scale-95 shadow-lg backdrop-blur-sm"
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/80 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white transition active:scale-95 shadow-lg backdrop-blur-sm"
            aria-label="Restart video"
            title="Reset to 0s"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Sampled Peak-Motion Keyframe Timeline Chips */}
      {keyframes.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>RTX Motion Peak Bursts ({keyframes.length}):</span>
            </span>
            <span className="text-slate-300">Click to jump & scrub</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {keyframes.map((tag) => {
              const isActive = Math.abs(currentTime - tag.timestamp) < 0.35;
              return (
                <button
                  key={`${tag.timestamp}-${tag.label}`}
                  type="button"
                  onClick={() => seekTo(tag)}
                  className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs transition active:scale-95 ${
                    isActive
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200 shadow-md ring-1 ring-cyan-400/40'
                      : tag.isThreat
                      ? 'border-rose-500/50 bg-rose-950/40 text-rose-300 hover:border-rose-400 hover:bg-rose-900/50'
                      : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
                  }`}
                  aria-label={`Seek to ${tag.label} at ${tag.timestamp} seconds`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      tag.isThreat
                        ? 'bg-rose-500 animate-pulse'
                        : isActive
                        ? 'bg-cyan-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="font-semibold">{tag.label}</span>
                  <span className="text-[11px] opacity-75">{tag.timestamp.toFixed(1)}s</span>
                </button>
              );
            })}
          </div>

          {/* Active Keyframe Forensic Hash Inspector */}
          {activeKeyframe?.sha256 && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-1.5 font-mono text-[11px] text-slate-400">
              <Hash className="h-3 w-3 text-cyan-400 shrink-0" />
              <span className="text-slate-400">Sec 90A SHA-256:</span>
              <span className="text-cyan-300 font-semibold truncate">
                {activeKeyframe.sha256}
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 ml-auto shrink-0" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
