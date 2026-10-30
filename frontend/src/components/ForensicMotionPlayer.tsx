"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  StepBack,
  StepForward,
  Video,
  Download,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getApiBaseUrl } from "../lib/api-client";

interface ForensicMotionPlayerProps {
  videoFilename: string;
  sha256?: string;
  title?: string;
  initialTimestamp?: number;
  keyframeTimestamps?: number[];
  videoClips?: string[];
  onSelectClip?: (clip: string) => void;
}

interface FramesResponse {
  filename: string;
  codec?: string;
  fps: number;
  nominal_fps: number;
  total_frames: number;
  duration_sec: number;
  timestamps: number[];
  frames: string[];
}

export default function ForensicMotionPlayer({
  videoFilename,
  sha256,
  title = "Evidence Act 1950 Sec 90A Video Exhibit",
  initialTimestamp,
  keyframeTimestamps = [],
  videoClips = [],
  onSelectClip,
}: ForensicMotionPlayerProps) {
  const [activeFilename, setActiveFilename] = useState<string>(videoFilename);
  const [frames, setFrames] = useState<string[]>([]);
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [fps, setFps] = useState<number>(25);
  const [duration, setDuration] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mode, setMode] = useState<"SCRUBBER" | "NATIVE">("SCRUBBER");
  const [nativeVideoError, setNativeVideoError] = useState<boolean>(false);
  const [codec, setCodec] = useState<string>("FMP4");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync activeFilename if parent prop updates
  useEffect(() => {
    setActiveFilename(videoFilename);
  }, [videoFilename]);

  const videoUrl = `${getApiBaseUrl()}/api/media/${encodeURIComponent(activeFilename)}`;

  // Fetch pre-decoded evidentiary frame stream from backend
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setFetchError(null);
    setCurrentIndex(0);
    setIsPlaying(false);

    const loadFrames = async () => {
      try {
        const framesUrl = `${getApiBaseUrl()}/api/media/${encodeURIComponent(activeFilename)}/frames?max_frames=100`;
        const res = await fetch(framesUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Vault media frames unavailable`);
        }
        const data: FramesResponse = await res.json();
        if (active) {
          if (Array.isArray(data.frames) && data.frames.length > 0) {
            setFrames(data.frames);
            const tsList = data.timestamps || [];
            setTimestamps(tsList);
            setFps(data.fps || 25);
            setDuration(data.duration_sec || (data.frames.length / (data.fps || 25)));
            setCodec(data.codec || "FMP4");

            // If initialTimestamp is provided, seek to closest frame
            if (typeof initialTimestamp === "number" && tsList.length > 0) {
              let bestIdx = 0;
              let minDiff = 999999;
              for (let i = 0; i < tsList.length; i++) {
                const diff = Math.abs(tsList[i] - initialTimestamp);
                if (diff < minDiff) {
                  minDiff = diff;
                  bestIdx = i;
                }
              }
              setCurrentIndex(bestIdx);
            }

            setIsLoading(false);
          } else {
            throw new Error("No decoded frames returned from media vault.");
          }
        }
      } catch (err: any) {
        if (active) {
          setFetchError(err.message || "Failed to load forensic frames");
          setIsLoading(false);
          setMode("NATIVE");
        }
      }
    };

    loadFrames();

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeFilename, initialTimestamp]);

  // Frame playback animation loop
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const intervalMs = Math.max(16, Math.round(1000 / (fps * playbackSpeed)));
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % frames.length);
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, frames.length, fps, playbackSpeed]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : frames.length - 1));
  }, [frames.length]);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex((prev) => (prev < frames.length - 1 ? prev + 1 : 0));
  }, [frames.length]);

  const seekToTimestamp = useCallback(
    (targetTs: number) => {
      setIsPlaying(false);
      if (!timestamps || timestamps.length === 0) return;
      let bestIdx = 0;
      let minDiff = 999999;
      for (let i = 0; i < timestamps.length; i++) {
        const diff = Math.abs(timestamps[i] - targetTs);
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = i;
        }
      }
      setCurrentIndex(bestIdx);
    },
    [timestamps]
  );

  const currentTime = timestamps[currentIndex] ?? (currentIndex / (fps || 25));
  const isMpeg4NonNative = codec.toUpperCase() === "FMP4" || codec.toLowerCase() === "mp4v";

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-[#060a14] overflow-hidden flex flex-col gap-0 shadow-2xl font-mono text-slate-100">
      {/* Top Evidence Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <Video className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold text-slate-100">{title}</span>
          <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] text-emerald-300">
            SEC 90A CUSTODY
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher or Codec Badge */}
          {isMpeg4NonNative ? (
            <div className="flex items-center gap-1.5 rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-300 font-bold">
              <span>MPEG-4 Part 2 · OpenCV Scrubber Active</span>
            </div>
          ) : (
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setMode("SCRUBBER")}
                className={`px-2 py-1 rounded transition ${
                  mode === "SCRUBBER"
                    ? "bg-emerald-600 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Frame Scrubber
              </button>
              <button
                type="button"
                onClick={() => setMode("NATIVE")}
                className={`px-2 py-1 rounded transition ${
                  mode === "NATIVE"
                    ? "bg-cyan-600 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                HTML5 Player
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Clip Switcher (When Episode Contains Multiple Recorded Bursts) */}
      {videoClips.length > 1 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] overflow-x-auto">
          <span className="text-slate-400 font-bold shrink-0">Burst Episodes:</span>
          {videoClips.map((clip, idx) => (
            <button
              key={clip}
              type="button"
              onClick={() => {
                setActiveFilename(clip);
                if (onSelectClip) onSelectClip(clip);
              }}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition shrink-0 ${
                activeFilename === clip
                  ? "bg-emerald-600 text-white border border-emerald-400/50 shadow"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              {clip.toLowerCase().includes("archive")
                ? `Extended Archive (12s)`
                : clip.toLowerCase().includes("burst")
                ? `Probe Burst (1s)`
                : `Clip #${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Screen Display Area */}
      <div className="relative bg-black aspect-video max-h-[340px] flex items-center justify-center overflow-hidden">
        {mode === "SCRUBBER" || isMpeg4NonNative ? (
          isLoading ? (
            <div className="flex flex-col items-center gap-2 text-slate-400 text-xs py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              <span>Decoding Video Frames from Vault...</span>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center gap-2 text-rose-300 text-xs p-6 text-center">
              <AlertCircle className="h-6 w-6 text-rose-400" />
              <span>{fetchError}</span>
              <button
                type="button"
                onClick={() => setMode("NATIVE")}
                className="mt-2 text-xs text-cyan-300 underline"
              >
                Switch to Native Player
              </button>
            </div>
          ) : frames.length > 0 ? (
            <div className="relative h-full w-full flex items-center justify-center bg-black">
              {/* Active Forensic Frame */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frames[currentIndex]}
                alt={`Frame ${currentIndex + 1}`}
                className="h-full w-full object-contain select-none"
              />

              {/* Watermark Overlay */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded bg-black/75 backdrop-blur-sm border border-slate-800 px-2 py-0.5 text-[10px] text-emerald-300">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span>FRAME {currentIndex + 1} / {frames.length}</span>
                <span className="text-slate-400">• T+{currentTime.toFixed(2)}s</span>
              </div>

              {/* Speed Badge */}
              {playbackSpeed !== 1.0 && (
                <div className="absolute top-2 right-2 rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] text-amber-300 font-bold">
                  {playbackSpeed}X SPEED
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400">No frames available.</div>
          )
        ) : (
          /* Native HTML5 Video Fallback */
          <div className="relative h-full w-full flex flex-col items-center justify-center bg-black">
            <video
              controls
              playsInline
              preload="auto"
              className="h-full w-full object-contain bg-black"
              src={videoUrl}
              onError={() => setNativeVideoError(true)}
            >
              Your browser does not support HTML5 video playback.
            </video>
            {nativeVideoError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center gap-2">
                <AlertCircle className="h-6 w-6 text-amber-400" />
                <span className="text-xs text-slate-200 font-bold">
                  Chromium Codec Restriction (MPEG-4 Part 2 / mp4v)
                </span>
                <p className="text-[11px] text-slate-400 max-w-sm">
                  Chrome &amp; Edge require H.264 for native &lt;video&gt; playback. Please use the
                  <strong className="text-emerald-400"> Frame Scrubber</strong> tab above for full in-browser playback, or download the vault file to view in VLC / Media Player.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNativeVideoError(false);
                    setMode("SCRUBBER");
                  }}
                  className="mt-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition"
                >
                  Return to Frame Scrubber
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Frame Scrubber Controls */}
      {(mode === "SCRUBBER" || isMpeg4NonNative) && frames.length > 0 && (
        <div className="p-3 bg-slate-950/95 border-t border-slate-800 flex flex-col gap-2.5">
          {/* Progress Timeline Slider */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 w-12 font-mono">
              {currentTime.toFixed(2)}s
            </span>
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={currentIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentIndex(Number(e.target.value));
              }}
              className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] text-slate-400 w-12 text-right font-mono">
              {duration.toFixed(2)}s
            </span>
          </div>

          {/* Peak Keyframe Jump Chips */}
          {keyframeTimestamps.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                PEAK KEYFRAMES:
              </span>
              {keyframeTimestamps.map((ts, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => seekToTimestamp(ts)}
                  className="rounded bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/30 px-2 py-0.5 text-amber-300 font-bold transition active:scale-95"
                  title={`Jump directly to Peak Keyframe at ${ts.toFixed(2)}s`}
                >
                  ⏱️ {ts.toFixed(2)}s
                </button>
              ))}
            </div>
          )}

          {/* Playback Button Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5">
              {/* Reset to 0 */}
              <button
                type="button"
                onClick={handleReset}
                title="Reset to Start"
                className="rounded p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              {/* Step Back 1 Frame */}
              <button
                type="button"
                onClick={handleStepBack}
                title="Previous Frame (1-frame precision)"
                className="rounded p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition active:scale-95"
              >
                <StepBack className="h-3.5 w-3.5" />
              </button>

              {/* Play / Pause Toggle */}
              <button
                type="button"
                onClick={togglePlay}
                className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 font-bold text-xs text-white shadow transition active:scale-95"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-white" />
                    <span>Play</span>
                  </>
                )}
              </button>

              {/* Step Forward 1 Frame */}
              <button
                type="button"
                onClick={handleStepForward}
                title="Next Frame (1-frame precision)"
                className="rounded p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition active:scale-95"
              >
                <StepForward className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Forensic Playback Speed Selector */}
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-400 mr-1 text-[10px]">SPEED:</span>
              {[0.25, 0.5, 1.0].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded border text-[10px] font-bold transition ${
                    playbackSpeed === spd
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                      : "border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer Actions & SHA256 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950 border-t border-slate-800 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400 truncate max-w-[280px]">
          <span className="text-emerald-400 font-bold">SHA-256:</span>
          <span className="truncate font-mono">{sha256?.slice(0, 16) || "AUTHENTIC_VAULT_EVIDENCE"}...</span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1 font-sans"
            title="Open raw stream directly in browser"
          >
            <span>Stream in Tab</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={videoUrl}
            download={activeFilename}
            className="text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-1 font-sans"
            title="Download authentic court-admissible binary under Evidence Act 1950 Sec 90A"
          >
            <span>Download Vault MP4</span>
            <Download className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
