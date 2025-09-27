import { createPublicClient, createWalletClient, http, custom } from "viem";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  createZeroDevPaymasterClient,
  createKernelAccountClient,
  createKernelAccount,
} from "@zerodev/sdk";
import { getEntryPoint } from "@zerodev/sdk/constants";
import { entryPoint07Address } from "viem/account-abstraction";
import { getViemChain } from "../getViemChain";
import type { ChainType } from "../chain";
import { CHAIN_ID_BY_KEY } from "../chain";
import type { ConnectedWallet } from "@privy-io/react-auth";

const PROJECT_ID = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID!;
const BASE_URL = process.env.NEXT_PUBLIC_ZERODEV_BASE!;
const BUNDLER_URL = process.env.NEXT_PUBLIC_ZERODEV_BUNDLER_URL!;

function paymasterRpc(chainId: number) {
  // Keep selfFunded=true while you test; remove when sponsorship is configured.
  return `${BASE_URL}/${PROJECT_ID}/chain/${chainId}?selfFunded=true`;
}

export async function createKernelClient(
  privyWallet: ConnectedWallet,
  chain: ChainType,
  walletIndex: bigint
) {
  const chainId = CHAIN_ID_BY_KEY[chain];
  const viemChain = getViemChain(chain);

  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(paymasterRpc(chainId)),
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
    index: walletIndex, // deterministic
  });

  const paymasterClient = createZeroDevPaymasterClient({
    chain: viemChain,
    transport: http(paymasterRpc(chainId)),
  });

  const kernelClient = createKernelAccountClient({
    account,
    chain: viemChain,
    bundlerTransport: http(`${BUNDLER_URL}/${chainId}`),
    paymaster: {
      getPaymasterData: (userOperation) =>
        paymasterClient.sponsorUserOperation({ userOperation }),
    },
  });

  return { kernelClient, accountAddress: account.address as `0x${string}` };
}
