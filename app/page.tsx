"use client";

import type { AnimationEvent } from "react";
import { useEffect, useRef, useState } from "react";

type Phase = "sealed" | "opening" | "revealed";

type AnimatedSvgRoot = SVGSVGElement & {
  pauseAnimations?: () => void;
  setCurrentTime?: (seconds: number) => void;
  unpauseAnimations?: () => void;
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>("sealed");
  const [animationRun, setAnimationRun] = useState(0);
  const [svgReady, setSvgReady] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const invitationObject = useRef<HTMLObjectElement>(null);
  const formRevealTimer = useRef<number | null>(null);

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

    setSvgReady(false);
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

  const handleSvgLoad = () => {
    const document = invitationObject.current?.contentDocument;
    const root = document?.documentElement as AnimatedSvgRoot | undefined;

    if (formRevealTimer.current !== null) {
      window.clearTimeout(formRevealTimer.current);
      formRevealTimer.current = null;
    }

    if (reduceMotion) {
      root?.pauseAnimations?.();
      root?.setCurrentTime?.(30);
      setSvgReady(true);
      setFormReady(true);
      return;
    }

    root?.pauseAnimations?.();
    root?.setCurrentTime?.(0);
    setSvgReady(true);

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

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        root?.unpauseAnimations?.();

        // Fallback for browsers that do not dispatch SVG SMIL endEvent.
        formRevealTimer.current = window.setTimeout(
          finishChooseAnimation,
          4425,
        );
      });
    });
  };

  const replayInvitation = () => {
    if (formRevealTimer.current !== null) {
      window.clearTimeout(formRevealTimer.current);
      formRevealTimer.current = null;
    }

    setSvgReady(false);
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
            src="invitation-preview-svg.png"
            alt=""
            aria-hidden="true"
          />

          {phase === "revealed" && (
            <object
              key={animationRun}
              ref={invitationObject}
              className={`invitation-svg ${svgReady ? "is-ready" : ""}`}
              data={`invitation.svg?animation=${animationRun}`}
              type="image/svg+xml"
              aria-label="Sophie and Alex save-the-date wedding invitation"
              onLoad={handleSvgLoad}
            >
              Sophie and Alex save-the-date invitation
            </object>
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
