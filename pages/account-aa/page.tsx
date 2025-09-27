"use client";

import { useEffect, useMemo, useState } from "react";
import { useLogin, usePrivy, useWallets } from "@privy-io/react-auth";
import { ensureAgentKernel } from "../lib/aa/agent";
import { transferNative, transferErc20 } from "../lib/aa/transfers";
import type { ChainType } from "../lib/chain";
import { parseEther } from "viem";

const CHAIN: ChainType = "sepolia";

export default function Home() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useWallets();

  const [agentAddr, setAgentAddr] = useState<`0x${string}` | null>(null);
  const [kernelClient, setKernelClient] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const embeddedWallet = useMemo(
    () =>
      wallets.find(
        (w) => w.walletClientType === "privy" && w.type === "ethereum"
      ),
    [wallets]
  );

  // Create/ensure agent when logged in
  useEffect(() => {
    if (!ready || !authenticated || !user || !embeddedWallet) return;
    (async () => {
      setBusy(true);
      try {
        const { kernelClient, accountAddress } = await ensureAgentKernel(
          embeddedWallet,
          user.id!, // Privy DID
          CHAIN
        );
        setKernelClient(kernelClient);
        setAgentAddr(accountAddress);
      } catch (e) {
        console.error(e);
        alert((e as Error).message);
      } finally {
        setBusy(false);
      }
    })();
  }, [ready, authenticated, user, embeddedWallet]);

  const doNativeTransfer = async () => {
    if (!kernelClient) return;
    setBusy(true);
    setTxHash(null);
    try {
      const to = prompt("Recipient address?") as `0x${string}`;
      const eth = prompt("Amount in ETH (e.g. 0.002)?") || "0.002";
      const wei = parseEther(eth);
      const hash = await transferNative({ kernelClient, to, amountWei: wei });
      setTxHash(hash);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doErc20Transfer = async () => {
    if (!kernelClient) return;
    setBusy(true);
    setTxHash(null);
    try {
      const token = prompt(
        "Token address (ERC-20 on Sepolia)?"
      ) as `0x${string}`;
      const to = prompt("Recipient address?") as `0x${string}`;
      const amt = prompt("Amount (decimal, e.g. 25.5)?") || "1";
      const hash = await transferErc20({
        kernelClient,
        token,
        to,
        amountDecimal: amt,
      });
      setTxHash(hash);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "48px auto",
        fontFamily: "Inter, ui-sans-serif",
      }}
    >
      <h1>Agent Wallet (Kernel) — Base Sepolia</h1>

      {!ready && <p>Loading…</p>}

      {ready && !authenticated && (
        <button onClick={login} style={{ padding: 12, borderRadius: 8 }}>
          Login with Privy
        </button>
      )}

      {ready && authenticated && (
        <>
          <p>
            <b>User DID:</b> {user?.id}
          </p>
          <p>
            <b>Privy Wallet:</b> {embeddedWallet?.address}
          </p>
          <p>
            <b>Agent (Kernel) Address:</b> {agentAddr ?? "—"}
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 16,
              flexWrap: "wrap",
            }}
          >
            <button disabled={!kernelClient || busy} onClick={doNativeTransfer}>
              Native Transfer
            </button>
            <button disabled={!kernelClient || busy} onClick={doErc20Transfer}>
              ERC-20 Transfer
            </button>
            <button onClick={logout}>Logout</button>
          </div>

          {busy && <p style={{ marginTop: 12 }}>Working…</p>}
          {txHash && (
            <p style={{ marginTop: 12 }}>
              Tx submitted: <code>{txHash}</code>
            </p>
          )}
        </>
      )}
    </main>
  );
}
