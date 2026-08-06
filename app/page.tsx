"use client";

import type { AnimationEvent } from "react";
import { useEffect, useRef, useState } from "react";

type Phase = "sealed" | "opening" | "revealed";

type AnimatedSvgRoot = SVGSVGElement & {
  pauseAnimations?: () => void;
  setCurrentTime?: (seconds: number) => void;
  unpauseAnimations?: () => void;
};

const HYBRID_RASTER_ASSET_COUNT = 7;

export default function Home() {
  const [phase, setPhase] = useState<Phase>("sealed");
  const [animationRun, setAnimationRun] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneRunning, setSceneRunning] = useState(false);
  const [chooseReady, setChooseReady] = useState(false);
  const [rasterAssetsLoaded, setRasterAssetsLoaded] = useState(0);
  const [formReady, setFormReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const invitationObject = useRef<HTMLObjectElement>(null);
  const formRevealTimer = useRef<number | null>(null);
  const sceneStarted = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(preference.matches);

    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => {
      preference.removeEventListener("change", updatePreference);
      if (formRevealTimer.current !== null) {
        window.clearTimeout(formRevealTimer.current);
      }
    };
  }, []);

  const showInvitation = () => {
    if (formRevealTimer.current !== null) {
      window.clearTimeout(formRevealTimer.current);
      formRevealTimer.current = null;
    }

    sceneStarted.current = false;
    setSceneReady(false);
    setSceneRunning(false);
    setChooseReady(false);
    setRasterAssetsLoaded(0);
    setFormReady(false);
    setAnimationRun((run) => run + 1);
    setPhase("revealed");
  };

  const openEnvelope = () => {
    if (phase !== "sealed") return;

    if (reduceMotion) {
      showInvitation();
      return;
    }

    setPhase("opening");
  };

  const finishExtraction = (event: AnimationEvent<HTMLDivElement>) => {
    if (
      phase !== "opening" ||
      event.currentTarget !== event.target ||
      event.animationName !== "extractInvitation"
    ) {
      return;
    }

    // The animated SVG is deliberately mounted only after this motion ends.
    showInvitation();
  };

  const handleRasterLoad = () => {
    setRasterAssetsLoaded((count) =>
      Math.min(count + 1, HYBRID_RASTER_ASSET_COUNT),
    );
  };

  const handleChooseLoad = () => {
    const document = invitationObject.current?.contentDocument;
    const root = document?.documentElement as AnimatedSvgRoot | undefined;

    root?.pauseAnimations?.();
    root?.setCurrentTime?.(0);
    setChooseReady(true);
  };

  useEffect(() => {
    if (
      phase !== "revealed" ||
      !chooseReady ||
      rasterAssetsLoaded < HYBRID_RASTER_ASSET_COUNT ||
      sceneStarted.current
    ) {
      return;
    }

    sceneStarted.current = true;
    const document = invitationObject.current?.contentDocument;
    const root = document?.documentElement as AnimatedSvgRoot | undefined;

    if (formRevealTimer.current !== null) {
      window.clearTimeout(formRevealTimer.current);
      formRevealTimer.current = null;
    }

    const animationFrames: number[] = [];

    if (reduceMotion) {
      root?.pauseAnimations?.();
      root?.setCurrentTime?.(30);
      animationFrames.push(
        window.requestAnimationFrame(() => {
          setSceneReady(true);
          setFormReady(true);
        }),
      );
      return () => {
        animationFrames.forEach((frame) => window.cancelAnimationFrame(frame));
      };
    }

    root?.pauseAnimations?.();
    root?.setCurrentTime?.(0);

    const finishChooseAnimation = () => {
      if (formRevealTimer.current !== null) {
        window.clearTimeout(formRevealTimer.current);
        formRevealTimer.current = null;
      }
      setFormReady(true);
    };

    // This is the last stroke in the hand-drawn “Choose” sequence.
    const finalChooseStroke = document?.querySelector(
      "#mask-choose-letter-5 animate:last-of-type",
    );
    finalChooseStroke?.addEventListener("endEvent", finishChooseAnimation, {
      once: true,
    });

    const firstFrame = window.requestAnimationFrame(() => {
      setSceneReady(true);
      const secondFrame = window.requestAnimationFrame(() => {
        setSceneRunning(true);
        root?.unpauseAnimations?.();

        // Fallback for browsers that do not dispatch SVG SMIL endEvent.
        formRevealTimer.current = window.setTimeout(
          finishChooseAnimation,
          4425,
        );
      });

      animationFrames.push(secondFrame);
    });

    animationFrames.push(firstFrame);
    return () => {
      animationFrames.forEach((frame) => window.cancelAnimationFrame(frame));
      finalChooseStroke?.removeEventListener(
        "endEvent",
        finishChooseAnimation,
      );
    };
  }, [chooseReady, phase, rasterAssetsLoaded, reduceMotion]);

  const replayInvitation = () => {
    if (formRevealTimer.current !== null) {
      window.clearTimeout(formRevealTimer.current);
      formRevealTimer.current = null;
    }

    sceneStarted.current = false;
    setSceneReady(false);
    setSceneRunning(false);
    setChooseReady(false);
    setRasterAssetsLoaded(0);
    setFormReady(false);
    setPhase("sealed");

    window.setTimeout(() => {
      if (reduceMotion) {
        showInvitation();
      } else {
        setPhase("opening");
      }
    }, 120);
  };

  return (
    <main className={`wedding-page phase-${phase}`}>
      <div className="wash wash-coral" aria-hidden="true" />
      <div className="wash wash-blue" aria-hidden="true" />

      <header className="welcome-copy">
        <p className="instruction">
          <span className="instruction-line" aria-hidden="true" />
          Click the envelope to open
          <span className="instruction-line" aria-hidden="true" />
        </p>
      </header>

      <section className="invitation-stage" aria-label="Wedding invitation">
        <div className="stage-shadow" aria-hidden="true" />

        <div className="envelope-piece envelope-back" aria-hidden="true">
          <span className="envelope-lining" />
        </div>

        <div className="invitation-card" onAnimationEnd={finishExtraction}>
          <img
            className="invitation-preview"
            src="invitation-poster.webp"
            alt=""
            aria-hidden="true"
          />

          {phase === "revealed" && (
            <div
              className={`invitation-scene ${sceneReady ? "is-ready" : ""} ${sceneRunning ? "is-running" : ""}`}
              role="img"
              aria-label="Sophie and Alex save-the-date wedding invitation"
            >
              <img
                className="invitation-base"
                src="invitation-base.webp"
                alt=""
                aria-hidden="true"
                onLoad={handleRasterLoad}
              />
              <img
                className="invitation-motion invitation-flag"
                src="invitation-layer-flag.webp"
                alt=""
                aria-hidden="true"
                onLoad={handleRasterLoad}
              />
              <img
                className="invitation-motion invitation-lantern-left"
                src="invitation-layer-lantern-left.webp"
                alt=""
                aria-hidden="true"
                onLoad={handleRasterLoad}
              />
              <img
                className="invitation-motion invitation-lantern-right"
                src="invitation-layer-lantern-right.webp"
                alt=""
                aria-hidden="true"
                onLoad={handleRasterLoad}
              />
              <img
                className="invitation-motion invitation-sophie"
                src="invitation-layer-sophie.webp"
                alt=""
                aria-hidden="true"
                onLoad={handleRasterLoad}
              />
              <img
                className="invitation-motion invitation-alex"
                src="invitation-layer-alex.webp"
                alt=""
                aria-hidden="true"
                onLoad={handleRasterLoad}
              />
              <img
                className="invitation-motion invitation-hands"
                src="invitation-layer-hands.webp"
                alt=""
                aria-hidden="true"
                onLoad={handleRasterLoad}
              />
              <object
                key={animationRun}
                ref={invitationObject}
                className="invitation-choose"
                data={`invitation-choose.svg?v=2&animation=${animationRun}`}
                type="image/svg+xml"
                aria-hidden="true"
                onLoad={handleChooseLoad}
              >
                Sophie and Alex save-the-date invitation
              </object>
            </div>
          )}
        </div>

        <div className="envelope-piece envelope-flap" aria-hidden="true" />
        <div className="envelope-piece envelope-front" aria-hidden="true">
          <span className="fold fold-left" />
          <span className="fold fold-right" />
        </div>

        <button
          className="envelope-open-button"
          type="button"
          onClick={openEnvelope}
          disabled={phase !== "sealed"}
          aria-label="Open Sophie and Alex's wedding invitation"
          aria-expanded={phase !== "sealed"}
        >
          <span className="wax-seal" aria-hidden="true">
            <span>囍</span>
          </span>
        </button>

        {phase === "revealed" && (
          <button
            className="replay-button"
            type="button"
            onClick={replayInvitation}
            aria-label="Replay invitation"
          >
            <span aria-hidden="true">↻</span>
          </button>
        )}

        {phase === "revealed" && formReady && (
          <a
            className="form-button"
            href="https://forms.gle/ouv3ACJxg21uFDa9A"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="form-button-label">Fill out this form!</span>
            <span className="form-button-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
        )}
      </section>

      <p className="screen-reader-status" aria-live="polite">
        {phase === "sealed"
          ? "The invitation is sealed."
          : phase === "opening"
            ? "The envelope is opening and the invitation is being pulled out."
            : "The invitation is fully open and its illustration is animating."}
      </p>
    </main>
  );
}
