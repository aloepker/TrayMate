// components/SystemDiagnosticsModal.tsx
//
// Hidden diagnostics panel triggered by tapping the granny logo on the
// admin portal header. Runs a handful of connectivity / health checks
// in parallel:
//
//   - Backend API (Render)
//   - Gemini AI (the model that powers GrannyGBT)
//   - Auth session (do we still have a valid token?)
//   - Local data bundle (FALLBACK_MEALS / residents)
//   - Internet (basic outbound fetch)
//
// Each check carries a status, latency, and optional error message.
// The modal auto-runs on open and exposes a Re-run button.

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";

import { BASE_URL, reseedSoftBiteMeals } from "../../services/api";
import { getAuthToken } from "../../services/storage";
import { GEMINI_CONFIG } from "../../config/geminiConfig";
import { FALLBACK_MEALS } from "../../services/localDataService";

// ---------- types ----------

type Status = "pending" | "ok" | "slow" | "fail";

type CheckResult = {
  key: string;
  label: string;
  description: string;
  status: Status;
  latencyMs?: number;
  detail?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

// ---------- helpers ----------

const SLOW_THRESHOLD_MS = 1500;
const TIMEOUT_MS = 6000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
}

function classify(latencyMs: number): Status {
  return latencyMs > SLOW_THRESHOLD_MS ? "slow" : "ok";
}

// ---------- individual checks ----------

async function checkBackend(): Promise<Omit<CheckResult, "key" | "label" | "description">> {
  const started = Date.now();
  try {
    const res = await withTimeout(
      fetch(`${BASE_URL}/menu`, { method: "GET", headers: { Accept: "application/json" } }),
      TIMEOUT_MS,
    );
    const latencyMs = Date.now() - started;
    // Any HTTP response — even a 401/403 — means the server is alive.
    if (res.status >= 500) {
      return { status: "fail", latencyMs, detail: `server error ${res.status}` };
    }
    return { status: classify(latencyMs), latencyMs, detail: `HTTP ${res.status}` };
  } catch (e: any) {
    return {
      status: "fail",
      latencyMs: Date.now() - started,
      detail: e?.message ?? "unreachable",
    };
  }
}

async function checkGemini(): Promise<Omit<CheckResult, "key" | "label" | "description">> {
  // Pings the backend AI proxy rather than calling Gemini directly — the
  // client no longer holds the API key. A 5xx from the proxy means the
  // server is up but Gemini is unreachable/over quota.
  const started = Date.now();
  try {
    const tok = await getAuthToken();
    const res = await withTimeout(
      fetch("https://traymate-auth.onrender.com/ai/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        },
        body: JSON.stringify({
          model: GEMINI_CONFIG.model,
          body: {
            contents: [{ role: "user", parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 8 },
          },
        }),
      }),
      TIMEOUT_MS,
    );
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return {
        status: "fail",
        latencyMs,
        detail: `HTTP ${res.status}` + (res.status === 429 ? " (quota)" : ""),
      };
    }
    return { status: classify(latencyMs), latencyMs, detail: GEMINI_CONFIG.model };
  } catch (e: any) {
    return {
      status: "fail",
      latencyMs: Date.now() - started,
      detail: e?.message ?? "unreachable",
    };
  }
}

async function checkAuthSession(): Promise<Omit<CheckResult, "key" | "label" | "description">> {
  try {
    const token = await getAuthToken();
    if (!token) return { status: "fail", detail: "no token stored" };
    // Very rough JWT expiry decode — best-effort, ignore errors.
    const parts = token.split(".");
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(
          // RN doesn't have atob in all envs — use Buffer-free decoder.
          decodeURIComponent(
            escape(globalThis.atob ? globalThis.atob(parts[1]) : ""),
          ),
        );
        if (payload?.exp && Date.now() / 1000 > payload.exp) {
          return { status: "fail", detail: "token expired" };
        }
      } catch {
        /* decode failed — token might still be valid, fall through */
      }
    }
    return { status: "ok", detail: "token present" };
  } catch (e: any) {
    return { status: "fail", detail: e?.message ?? "storage error" };
  }
}

function checkLocalData(): Omit<CheckResult, "key" | "label" | "description"> {
  const count = Array.isArray(FALLBACK_MEALS) ? FALLBACK_MEALS.length : 0;
  if (count === 0) return { status: "fail", detail: "bundle empty" };
  return { status: "ok", detail: `${count} bundled meals` };
}

async function checkInternet(): Promise<Omit<CheckResult, "key" | "label" | "description">> {
  const started = Date.now();
  try {
    // Cloudflare's no-content endpoint — tiny, fast, no CORS issues on RN.
    const res = await withTimeout(
      fetch("https://www.gstatic.com/generate_204", { method: "GET" }),
      TIMEOUT_MS,
    );
    const latencyMs = Date.now() - started;
    if (res.status === 204 || res.ok) return { status: classify(latencyMs), latencyMs };
    return { status: "fail", latencyMs, detail: `HTTP ${res.status}` };
  } catch (e: any) {
    return { status: "fail", latencyMs: Date.now() - started, detail: e?.message ?? "no network" };
  }
}

// ---------- component ----------

const INITIAL_CHECKS: CheckResult[] = [
  { key: "internet", label: "Internet", description: "Basic outbound connectivity", status: "pending" },
  { key: "backend", label: "Backend (Render)", description: "TrayMate API server", status: "pending" },
  { key: "gemini", label: "AI (Gemini)", description: "GrannyGBT model endpoint", status: "pending" },
  { key: "auth", label: "Auth session", description: "Admin token validity", status: "pending" },
  { key: "local", label: "Local data", description: "Bundled meals + residents", status: "pending" },
];

type SeedState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; detail: string }
  | { status: "error"; detail: string };

export default function SystemDiagnosticsModal({ visible, onClose }: Props) {
  const [checks, setChecks] = useState<CheckResult[]>(INITIAL_CHECKS);
  const [running, setRunning] = useState(false);
  const [seed, setSeed] = useState<SeedState>({ status: "idle" });

  const updateCheck = useCallback(
    (key: string, patch: Partial<CheckResult>) => {
      setChecks((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
    },
    [],
  );

  const runAll = useCallback(async () => {
    setRunning(true);
    setChecks(INITIAL_CHECKS);

    // Local check is instant — resolve it first.
    updateCheck("local", checkLocalData());

    // Run remote checks in parallel; update each as it finishes so the
    // user gets feedback even if one of them stalls until timeout.
    const tasks: Array<[string, Promise<Omit<CheckResult, "key" | "label" | "description">>]> = [
      ["internet", checkInternet()],
      ["backend", checkBackend()],
      ["gemini", checkGemini()],
      ["auth", checkAuthSession()],
    ];

    await Promise.all(
      tasks.map(async ([key, p]) => {
        try {
          const result = await p;
          updateCheck(key, result);
        } catch (e: any) {
          updateCheck(key, { status: "fail", detail: e?.message ?? "error" });
        }
      }),
    );

    setRunning(false);
  }, [updateCheck]);

  useEffect(() => {
    if (visible) runAll();
  }, [visible, runAll]);

  const reseed = useCallback(async () => {
    setSeed({ status: "running" });
    try {
      const result = await reseedSoftBiteMeals();
      if (result?.status === "ok") {
        setSeed({
          status: "ok",
          detail: typeof result.durationMs === "number"
            ? `Seed complete in ${result.durationMs}ms`
            : "Seed complete",
        });
      } else {
        setSeed({ status: "error", detail: result?.message ?? "Unknown error" });
      }
    } catch (e: any) {
      setSeed({ status: "error", detail: e?.message ?? "Request failed" });
    }
  }, []);

  const summary = (() => {
    const fail = checks.filter((c) => c.status === "fail").length;
    const slow = checks.filter((c) => c.status === "slow").length;
    const pending = checks.filter((c) => c.status === "pending").length;
    if (pending > 0) return { text: "Running checks…", tone: "neutral" as const };
    if (fail > 0) return { text: `${fail} issue${fail > 1 ? "s" : ""} found`, tone: "fail" as const };
    if (slow > 0) return { text: `All up — ${slow} slow`, tone: "slow" as const };
    return { text: "All systems operational", tone: "ok" as const };
  })();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.header}>
            <View style={s.headerTextWrap}>
              <Text style={s.title}>System Diagnostics</Text>
              <Text
                style={[
                  s.subtitle,
                  summary.tone === "fail" && { color: "#C0392B" },
                  summary.tone === "slow" && { color: "#B47C00" },
                  summary.tone === "ok" && { color: "#2E7D32" },
                ]}
              >
                {summary.text}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
              <Feather name="x" size={18} color="#6D6B3B" />
            </Pressable>
          </View>

          <ScrollView style={s.list} contentContainerStyle={{ paddingVertical: 4 }}>
            {checks.map((c) => (
              <CheckRow key={c.key} check={c} />
            ))}

            <View style={s.actionsSection}>
              <Text style={s.actionsTitle}>Admin actions</Text>

              <Pressable
                onPress={reseed}
                disabled={seed.status === "running"}
                style={({ pressed }) => [
                  s.actionBtn,
                  seed.status === "running" && { opacity: 0.6 },
                  pressed && seed.status !== "running" && { opacity: 0.85 },
                ]}
              >
                {seed.status === "running" ? (
                  <ActivityIndicator size="small" color="#6D6B3B" />
                ) : (
                  <Feather name="database" size={15} color="#6D6B3B" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.actionBtnLabel}>Re-seed Soft Bite meals</Text>
                  <Text style={s.actionBtnDesc}>
                    Idempotent — upserts the 13 bundled rows into the DB.
                  </Text>
                </View>
              </Pressable>

              {seed.status === "ok" && (
                <View style={[s.actionResult, { borderColor: "#A8D5BA", backgroundColor: "#E8F5EC" }]}>
                  <Feather name="check-circle" size={14} color="#2E7D32" />
                  <Text style={[s.actionResultText, { color: "#2E7D32" }]}>{seed.detail}</Text>
                </View>
              )}
              {seed.status === "error" && (
                <View style={[s.actionResult, { borderColor: "#F0B5B0", backgroundColor: "#FBEAE8" }]}>
                  <Feather name="alert-circle" size={14} color="#C0392B" />
                  <Text style={[s.actionResultText, { color: "#C0392B" }]} numberOfLines={3}>
                    {seed.detail}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={s.footer}>
            <Pressable
              onPress={runAll}
              disabled={running}
              style={({ pressed }) => [
                s.rerunBtn,
                running && { opacity: 0.6 },
                pressed && !running && { opacity: 0.85 },
              ]}
            >
              {running ? (
                <ActivityIndicator size="small" color="#6D6B3B" />
              ) : (
                <Feather name="refresh-cw" size={14} color="#6D6B3B" />
              )}
              <Text style={s.rerunBtnText}>{running ? "Running…" : "Re-run checks"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- row ----------

function CheckRow({ check }: { check: CheckResult }) {
  const tone =
    check.status === "ok" ? "#2E7D32" :
    check.status === "slow" ? "#B47C00" :
    check.status === "fail" ? "#C0392B" :
    "#888";
  const icon =
    check.status === "ok" ? "check-circle" :
    check.status === "slow" ? "clock" :
    check.status === "fail" ? "alert-circle" :
    "loader";

  return (
    <View style={s.row}>
      <View style={s.rowIconWrap}>
        {check.status === "pending" ? (
          <ActivityIndicator size="small" color="#888" />
        ) : (
          <Feather name={icon as any} size={18} color={tone} />
        )}
      </View>
      <View style={s.rowText}>
        <Text style={s.rowLabel}>{check.label}</Text>
        <Text style={s.rowDesc}>{check.description}</Text>
        {check.detail && (
          <Text style={[s.rowDetail, { color: tone }]} numberOfLines={2}>
            {check.detail}
            {typeof check.latencyMs === "number" && ` · ${check.latencyMs}ms`}
          </Text>
        )}
      </View>
    </View>
  );
}

// ---------- styles ----------

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "85%",
    backgroundColor: "#FBF7E8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5DDB8",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5DDB8",
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: "800", color: "#3F3F1F" },
  subtitle: { fontSize: 13, marginTop: 2, color: "#6D6B3B", fontWeight: "600" },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#F0E9CC",
    alignItems: "center", justifyContent: "center",
  },
  list: { paddingHorizontal: 14, maxHeight: 380 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE5C2",
    gap: 12,
  },
  rowIconWrap: { width: 22, alignItems: "center", paddingTop: 2 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "700", color: "#3F3F1F" },
  rowDesc: { fontSize: 12, color: "#888", marginTop: 1 },
  rowDetail: { fontSize: 12, marginTop: 4, fontWeight: "600" },
  footer: {
    padding: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5DDB8",
  },
  rerunBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#F0E9CC",
    borderWidth: 1,
    borderColor: "#D9D0A0",
  },
  rerunBtnText: { fontSize: 13, fontWeight: "700", color: "#6D6B3B" },
  actionsSection: {
    marginTop: 6,
    paddingTop: 14,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: "#EDE5C2",
  },
  actionsTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F0E9CC",
    borderWidth: 1,
    borderColor: "#D9D0A0",
  },
  actionBtnLabel: { fontSize: 13, fontWeight: "700", color: "#3F3F1F" },
  actionBtnDesc: { fontSize: 11, color: "#6D6B3B", marginTop: 1 },
  actionResult: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionResultText: { flex: 1, fontSize: 12, fontWeight: "600" },
});
