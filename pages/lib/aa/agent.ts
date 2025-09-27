import { createHash } from "crypto";
import type { ConnectedWallet } from "@privy-io/react-auth";
import { createKernelClient } from "./kernelClient";
import type { ChainType } from "../chain";

export function deriveWalletIndexFromDid(did: string): bigint {
  const h = createHash("sha256").update(did).digest("hex");
  return BigInt("0x" + h.slice(-16)); // 8 bytes → BigInt
}

export async function ensureAgentKernel(
  privyWallet: ConnectedWallet,
  userDid: string,
  chain: ChainType
) {
  const walletIndex = deriveWalletIndexFromDid(`${userDid}:agent-1`);
  return createKernelClient(privyWallet, chain, walletIndex);
}
