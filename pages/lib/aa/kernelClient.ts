import { createPublicClient, createWalletClient, http, custom } from "viem";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccountClient, createKernelAccount } from "@zerodev/sdk";
import { getEntryPoint } from "@zerodev/sdk/constants";
import { entryPoint07Address } from "viem/account-abstraction";
import { getViemChain } from "../getViemChain";
import type { ChainType } from "../chain";
import { CHAIN_ID_BY_KEY } from "../chain";
import type { ConnectedWallet } from "@privy-io/react-auth";

const PROJECT_ID = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID!;

/** ZeroDev bundler endpoint (no paymaster, self-funded) */
function bundlerUrl(chainId: number) {
  return `https://rpc.zerodev.app/api/v3/${PROJECT_ID}/chain/${chainId}`;
}

export async function createKernelClient(
  privyWallet: ConnectedWallet,
  chain: ChainType,
  walletIndex: bigint
) {
  if (!PROJECT_ID) {
    throw new Error("Missing NEXT_PUBLIC_ZERODEV_PROJECT_ID in .env.local");
  }

  const chainId = CHAIN_ID_BY_KEY[chain];
  const viemChain = getViemChain(chain);

  // Use a regular RPC for reads (Sepolia default)
  const readRpc = viemChain.rpcUrls.default.http[0];

  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(readRpc),
  });

  const ethProvider = await privyWallet.getEthereumProvider();
  const walletClient = createWalletClient({
    account: privyWallet.address as `0x${string}`,
    chain: viemChain,
    transport: custom(ethProvider),
  });

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: walletClient,
    entryPoint: getEntryPoint("0.7"),
    kernelVersion: "0.3.3", // Kernel v3.3
  });

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: ecdsaValidator },
    entryPoint: { address: entryPoint07Address, version: "0.7" },
    kernelVersion: "0.3.3",
    index: walletIndex, // deterministic per user/agent
  });

  // ✅ Self-funded: no paymaster. Bundler handles estimation; gas paid from Kernel balance.
  const kernelClient = createKernelAccountClient({
    account,
    chain: viemChain,
    bundlerTransport: http(bundlerUrl(chainId)),
  });

  console.log("✅ Kernel (self-funded) address:", account.address);
  return { kernelClient, accountAddress: account.address as `0x${string}` };
}
