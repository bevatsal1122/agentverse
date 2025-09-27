"use client";

import { http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getViemChain } from "../getViemChain";
import { CHAIN_ID_BY_KEY, type ChainType } from "../chain";
import { getEntryPoint } from "@zerodev/sdk/constants";
import { entryPoint07Address } from "viem/account-abstraction";
import { createPublicClient, createWalletClient, custom } from "viem";
import { createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";

import { ModularSigner, toPermissionValidator } from "@zerodev/permissions";
import {
  CallPolicyVersion,
  toCallPolicy,
  toTimestampPolicy,
} from "@zerodev/permissions/policies";
import { toECDSASigner } from "@zerodev/permissions/signers";
import type { ConnectedWallet } from "@privy-io/react-auth";

const PROJECT_ID = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID!;
const bundler = (cid: number) =>
  `https://rpc.zerodev.app/api/v3/${PROJECT_ID}/chain/${cid}`;

/**
 * Installs a session-key validator on the user's Kernel.
 * Shows ONE embedded-wallet prompt the first time.
 * Returns: { kernelAddress, sessionKeyHex }
 */
export async function installSessionKey({
  ownerWallet,
  userId,
  chain,
  index,
  sessionKeyHex, // pass your own or generate & store it before calling this
}: {
  ownerWallet: ConnectedWallet;
  userId: string;
  chain: ChainType;
  index: bigint;
  sessionKeyHex: `0x${string}`;
}) {
  const chainId = CHAIN_ID_BY_KEY[chain];
  const chainCfg = getViemChain(chain);

  // viem clients
  const publicClient = createPublicClient({
    chain: chainCfg,
    transport: http(chainCfg.rpcUrls.default.http[0]),
  });
  const ethProvider = await ownerWallet.getEthereumProvider();
  const ownerClient = createWalletClient({
    account: ownerWallet.address as `0x${string}`,
    chain: chainCfg,
    transport: custom(ethProvider),
  });

  // Owner sudo validator
  const sudo = await signerToEcdsaValidator(publicClient, {
    signer: ownerClient,
    entryPoint: getEntryPoint("0.7"),
    kernelVersion: "0.3.3",
  });

  // User's Kernel
  const kernel = await createKernelAccount(publicClient, {
    plugins: { sudo },
    entryPoint: { address: entryPoint07Address, version: "0.7" },
    kernelVersion: "0.3.3",
    index,
  });

  // Session signer + policies
  const sessionAccount = privateKeyToAccount(sessionKeyHex);
  const sessionSigner = await toECDSASigner({ signer: sessionAccount });

  const now = Math.floor(Date.now() / 1000);
  const timestamp = toTimestampPolicy({
    validAfter: now,
    validUntil: now + 30 * 24 * 3600,
  }); // 30 days
  const nativeTransfer = toCallPolicy({
    policyVersion: CallPolicyVersion.V0_0_2,
    permissions: [],
  });

  const sessionValidator = await toPermissionValidator(publicClient, {
    entryPoint: { address: entryPoint07Address, version: "0.7" },
    kernelVersion: "0.3.3",
    signer: sessionSigner,
    policies: [timestamp, nativeTransfer],
  });

  // One-time enable (user signs ONCE via embedded wallet)
  const ownerKernelClient = createKernelAccountClient({
    account: kernel,
    chain: chainCfg,
    bundlerTransport: http(bundler(chainId)),
  });

  const enableCall = await ownerKernelClient.account.encodeCalls([
    {
      to: ownerKernelClient.account.address as `0x${string}`,
      value: BigInt(0),
      data: "0x",
    },
  ]);
  const txHash = (await ownerKernelClient.sendTransaction({
    callData: enableCall,
  })) as `0x${string}`;
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { kernelAddress: kernel.address as `0x${string}`, sessionKeyHex };
}
