"use client";

import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCurrentUserProfile } from "@/hooks/use-user-profile";
import { updateUserPreferences } from "@/lib/firebase/firestore";
import {
  DEFAULT_LOCATION,
  getWeather,
  type WeatherSnapshot,
} from "@/lib/weather/open-meteo";

/* =========================================================================
   <WeatherWidget> — sprint 5 bloc F.9

   Affiche la météo du foyer en mode minimaliste : emoji + température +
   condition. Cache localStorage 1h pour ne pas spam Open-Meteo.

   Flow géoloc :
   - Si preferences.location existe → fetch direct
   - Sinon, si locationConsent === "denied" → fallback Paris
   - Sinon → nudge "📍 Activer la géoloc" qui appelle
     navigator.geolocation.getCurrentPosition au tap (donc déclenche
     le prompt natif). Save lat/lng + consent dans Firestore.
   ========================================================================= */

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; weather: WeatherSnapshot; locationLabel?: string }
  | { kind: "error"; message: string };

export function WeatherWidget() {
  const { user } = useAuth();
  const { profile } = useCurrentUserProfile();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [askingPermission, setAskingPermission] = useState(false);

  const location = profile?.raw?.preferences?.location;
  const consent = profile?.raw?.preferences?.locationConsent;

  useEffect(() => {
    if (!profile) return;
    // Détermine la position à utiliser
    let lat: number;
    let lng: number;
    let label: string | undefined;
    if (location) {
      lat = location.lat;
      lng = location.lng;
      label = location.label;
    } else if (consent === "denied") {
      lat = DEFAULT_LOCATION.lat;
      lng = DEFAULT_LOCATION.lng;
      label = DEFAULT_LOCATION.name;
    } else {
      // Pas encore consenti, on attend une action user
      setState({ kind: "idle" });
      return;
    }

    setState({ kind: "loading" });
    let cancelled = false;
    getWeather(lat, lng)
      .then((weather) => {
        if (cancelled) return;
        setState({ kind: "ready", weather, locationLabel: label });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Météo indisponible",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [location, consent, profile]);

  async function handleRequestGeoloc() {
    if (!user || !navigator.geolocation) return;
    setAskingPermission(true);
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 8000,
            maximumAge: 60 * 60 * 1000, // accepte une position cache 1h
          });
        },
      );
      await updateUserPreferences(user.uid, {
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        locationConsent: "granted",
      });
    } catch {
      // Refus utilisateur ou erreur — on bascule en "denied" + Paris
      await updateUserPreferences(user.uid, {
        locationConsent: "denied",
      });
    } finally {
      setAskingPermission(false);
    }
  }

  if (state.kind === "idle") {
    // Pas de consent encore → nudge
    return (
      <button
        type="button"
        onClick={handleRequestGeoloc}
        disabled={askingPermission}
        className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-surface border border-border-subtle hover:bg-surface-elevated transition-colors text-left disabled:opacity-50"
      >
        <MapPin size={14} className="text-muted-foreground shrink-0" />
        <span className="text-[12px] text-muted-foreground">
          {askingPermission
            ? "Demande en cours…"
            : "Activer la géoloc pour la météo"}
        </span>
      </button>
    );
  }

  if (state.kind === "loading") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-surface">
        <span className="w-2 h-2 rounded-full glow-dot animate-pulse" />
        <span className="text-[12px] text-muted-foreground">Météo…</span>
      </div>
    );
  }

  if (state.kind === "error") {
    return null; // silencieux, on ne pollue pas l'UI
  }

  const { weather, locationLabel } = state;
  return (
    <article className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] bg-surface border border-border-subtle">
      <span className="text-[20px] leading-none">{weather.emoji}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-[13px] font-semibold">
          {Math.round(weather.temperature)}° · {weather.condition}
        </span>
        {locationLabel ? (
          <span className="text-[10px] text-muted-foreground">
            {locationLabel}
          </span>
        ) : null}
      </div>
    </article>
  );
}
