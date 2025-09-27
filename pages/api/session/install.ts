import { NextApiRequest, NextApiResponse } from "next";
import { http, parseEther } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, custom } from "viem";
import { createKernelAccountClient, createKernelAccount } from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { getEntryPoint } from "@zerodev/sdk/constants";
import { entryPoint07Address } from "viem/account-abstraction";
import { toPermissionValidator } from "@zerodev/permissions";
import {
  CallPolicyVersion,
  toCallPolicy,
  toTimestampPolicy /*, toSudoPolicy, toGasPolicy etc.*/,
} from "@zerodev/permissions/policies";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { getOrCreateSessionKeyHex } from "../../lib/server/sessionVault";

const PROJECT_ID = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID!;
const bundlerUrl = (chainId: number) =>
  `https://rpc.zerodev.app/api/v3/${PROJECT_ID}/chain/${chainId}`;
const CHAIN_ID = 84532;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { userId, ownerAddress, ownerProviderJsonRpc } = req.body;
    if (!userId || !ownerAddress || !ownerProviderJsonRpc)
      return res.status(400).json({ error: "bad params" });

    // viem clients
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(sepolia.rpcUrls.default.http[0]),
    });
    const ownerProvider = custom({
      request: async (args) => ownerProviderJsonRpc(args), // pass-through from client
    });

    const ownerClient = createWalletClient({
      account: ownerAddress as `0x${string}`,
      chain: sepolia,
      transport: ownerProvider,
    });

    // Sudo ECDSA validator (owner)
    const ownerValidator = await signerToEcdsaValidator(publicClient, {
      signer: ownerClient,
      entryPoint: getEntryPoint("0.7"),
      kernelVersion: "0.3.3",
    });

    // Deterministic index per user
    const index = BigInt("0x" + Buffer.from(userId).toString("hex").slice(-16));
    const kernel = await createKernelAccount(publicClient, {
      plugins: { sudo: ownerValidator },
      entryPoint: { address: entryPoint07Address, version: "0.7" },
      kernelVersion: "0.3.3",
      index,
    });

    // Prepare session key + policies
    const sessionKeyHex = getOrCreateSessionKeyHex(userId);
    const sessionAccount = privateKeyToAccount(sessionKeyHex);

    const now = Math.floor(Date.now() / 1000);
    const policies = [
      toTimestampPolicy({ validAfter: now, validUntil: now + 30 * 24 * 3600 }), // valid 30 days
      toCallPolicy({
        policyVersion: CallPolicyVersion.V0_0_2,
        permissions: [],
      }), // native transfers <= 0.1 ETH/tx
      // add more policies (erc20TransferPolicy, recipient allowlists, daily limits) as needed
    ];

    const sessionSigner = await toECDSASigner({ signer: sessionAccount });
    const sessionValidator = await toPermissionValidator(publicClient, {
      entryPoint: getEntryPoint("0.7"),
      kernelVersion: "0.3.3",
      signer: sessionSigner,
      policies,
    });

    // Enable the session validator plugin (user signs ONCE)
    const kernelClient = createKernelAccountClient({
      account: kernel,
      chain: sepolia,
      bundlerTransport: http(bundlerUrl(CHAIN_ID)),
    });

    const enableCall = await kernelClient.account.encodeCalls([
      {
        to: kernelClient.account.address as `0x${string}`,
        value: BigInt(0),
        data: "0x",
      },
    ]);
    const txHash = (await kernelClient.sendTransaction({
      callData: enableCall,
    })) as `0x${string}`;

    return res.status(200).json({
      ok: true,
      kernelAddress: kernel.address,
      sessionAddress: sessionAccount.address,
      txHash,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "unknown" });
  }
}
