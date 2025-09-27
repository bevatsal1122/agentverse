import { createPublicClient, createWalletClient, http, custom } from "viem";
import { getViemChain } from "../getViemChain";
import { CHAIN_ID_BY_KEY, type ChainType } from "../chain";
import { getEntryPoint } from "@zerodev/sdk/constants";
import { entryPoint07Address } from "viem/account-abstraction";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";
import type { ConnectedWallet } from "@privy-io/react-auth";

const PROJECT_ID = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID!;
const bundler = (cid: number) =>
  `https://rpc.zerodev.app/api/v3/${PROJECT_ID}/chain/${cid}`;

export async function createOwnerKernelClient(
  ownerWallet: ConnectedWallet,
  chain: ChainType,
  index: bigint
) {
  const chainId = CHAIN_ID_BY_KEY[chain];
  const chainCfg = getViemChain(chain);

  // normal RPC for reads
  const publicClient = createPublicClient({
    chain: chainCfg,
    transport: http(chainCfg.rpcUrls.default.http[0]),
  });

  // owner signer (Privy embedded)
  const ethProvider = await ownerWallet.getEthereumProvider();
  const ownerClient = createWalletClient({
    account: ownerWallet.address as `0x${string}`,
    chain: chainCfg,
    transport: custom(ethProvider),
  });

  // sudo (ECDSA) validator
  const sudo = await signerToEcdsaValidator(publicClient, {
    signer: ownerClient,
    entryPoint: getEntryPoint("0.7"),
    kernelVersion: "0.3.3",
  });

  // Kernel account for the user (deterministic by index)
  const account = await createKernelAccount(publicClient, {
    plugins: { sudo },
    entryPoint: { address: entryPoint07Address, version: "0.7" },
    kernelVersion: "0.3.3",
    index,
  });

  // Self-funded AA client (no paymaster)
  const kernelClient = createKernelAccountClient({
    account,
    chain: chainCfg,
    bundlerTransport: http(bundler(chainId)),
  });

  return { kernelClient, accountAddress: account.address as `0x${string}` };
}
