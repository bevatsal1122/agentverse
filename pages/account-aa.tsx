"use client";

import { useEffect, useMemo, useState } from "react";
import { useLogin, usePrivy, useWallets } from "@privy-io/react-auth";
import { deriveIndexFromString } from "./lib/aa/deriveIndex";
import { createOwnerKernelClient } from "./lib/aa/ownerKernel";
import { installSessionKey } from "./lib/client/installSession";
import {
  getOrCreateSessionKeyHex,
  loadSessionKeyHex,
} from "./lib/client/sessionKey";

export default function Home() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useWallets();

  const [kernel, setKernel] = useState<`0x${string}` | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [sessionKeyPresent, setSessionKeyPresent] = useState(false);
  const [busy, setBusy] = useState(false);

  const embedded = useMemo(
    () =>
      wallets.find(
        (w) => w.walletClientType === "privy" && w.type === "ethereum"
      ),
    [wallets]
  );

  // Check for existing session key on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const existingKey = loadSessionKeyHex();
      setSessionKeyPresent(!!existingKey);
    }
  }, []);

  // Create/ensure Kernel (owner client) just to know its address
  useEffect(() => {
    if (!ready || !authenticated || !user || !embedded) return;
    (async () => {
      setBusy(true);
      try {
        const index = deriveIndexFromString(`${user.id}:agent-1`);
        const { accountAddress } = await createOwnerKernelClient(
          embedded,
          "sepolia",
          index
        );
        setKernel(accountAddress);
      } catch (e) {
        console.error(e);
        alert((e as Error).message);
      } finally {
        setBusy(false);
      }
    })();
  }, [ready, authenticated, user, embedded]);

  async function onEnableSession() {
    if (!embedded || !user) return;
    setBusy(true);
    setTx(null);
    try {
      // generate & persist the session key in browser localStorage
      const sessionKeyHex = getOrCreateSessionKeyHex();
      const index = deriveIndexFromString(`${user.id}:agent-1`);
      const { kernelAddress } = await installSessionKey({
        ownerWallet: embedded,
        userId: user.id!,
        chain: "sepolia",
        index,
        sessionKeyHex,
      });
      setKernel(kernelAddress);
      setSessionKeyPresent(true);
      setTx("Session enabled.");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onNativeTransfer() {
    if (!user || !kernel) return;
    setBusy(true);
    setTx(null);
    try {
      const sessionKeyHex = loadSessionKeyHex();
      if (!sessionKeyHex) {
        alert(
          'No session key in this browser. Please click "Enable Session" again.'
        );
        return;
      }

      const to = prompt("Recipient address?") as `0x${string}`;
      const amount = prompt("Amount in ETH? e.g. 0.002") || "0.002";
      const r = await fetch("/api/agent/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kernelAddress: kernel,
          kind: "native",
          to,
          amount,
          sessionKeyHex,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setTx(j.txHash);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onViewBalance() {
    if (!kernel) return;
    setBusy(true);
    setBalance(null);
    try {
      const r = await fetch("/api/agent/balance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kernelAddress: kernel,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setBalance(j.balance);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "48px auto",
        fontFamily: "Inter, ui-sans-serif",
      }}
    >
      <h1>Agent (Kernel) — Sepolia</h1>
      {!ready && <p>Loading…</p>}
      {ready && !authenticated && (
        <button onClick={login} style={{ padding: 12, borderRadius: 8 }}>
          Login (Privy embedded)
        </button>
      )}
      {ready && authenticated && (
        <>
          <p>
            <b>User:</b> {user?.id}
          </p>
          <p>
            <b>Kernel:</b> {kernel ?? "—"}
          </p>
          <p>
            <b>Session Key:</b>{" "}
            <span style={{ color: sessionKeyPresent ? "#22c55e" : "#ef4444" }}>
              {sessionKeyPresent ? "✅ Present" : "❌ Not Found"}
            </span>
          </p>
          {balance && (
            <p>
              <b>Balance:</b> {balance} ETH
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 16,
              flexWrap: "wrap",
            }}
          >
            <button
              disabled={!embedded || busy || sessionKeyPresent}
              onClick={onEnableSession}
            >
              {sessionKeyPresent
                ? "Session Already Enabled"
                : "Enable Session (one-time)"}
            </button>
            <button disabled={!kernel || busy} onClick={onViewBalance}>
              View Balance
            </button>
            <button disabled={!kernel || busy} onClick={onNativeTransfer}>
              Native Transfer (silent)
            </button>
            <button onClick={logout}>Logout</button>
          </div>

          {busy && <p style={{ marginTop: 12 }}>Working…</p>}
          {tx && (
            <p style={{ marginTop: 12 }}>
              Result: <code>{tx}</code>
            </p>
          )}
          <p style={{ marginTop: 16, color: "#666" }}>
            Tip: fund the Kernel with Sepolia ETH. After enabling, transfers
            won’t show Privy popups.
          </p>
        </>
      )}
    </main>
  );
}
