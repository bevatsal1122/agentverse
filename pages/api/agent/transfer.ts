import { NextApiRequest, NextApiResponse } from "next";
import {
  encodeFunctionData,
  erc20Abi,
  parseEther,
  parseUnits,
  http,
  createPublicClient,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getEntryPoint } from "@zerodev/sdk/constants";
import { createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";
import { toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { entryPoint07Address } from "viem/account-abstraction";

const PROJECT_ID = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID!;
const BUNDLER = `https://rpc.zerodev.app/api/v3/${PROJECT_ID}/chain/11155111`; // Ethereum Sepolia

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { kernelAddress, kind, to, amount, token, sessionKeyHex } = req.body;
    if (!kernelAddress || !sessionKeyHex) {
      return res
        .status(400)
        .json({ ok: false, error: "kernelAddress and sessionKeyHex required" });
    }

    // 1) Read-only client on the SAME chain where the session was enabled
    const pc = createPublicClient({
      chain: sepolia,
      transport: http(sepolia.rpcUrls.default.http[0]),
    });

    // 2) Rebuild the permissions validator from the session key (no policies here)
    const sessionAccount = privateKeyToAccount(sessionKeyHex as `0x${string}`);
    const validator = await toPermissionValidator(pc, {
      entryPoint: getEntryPoint("0.7"),
      kernelVersion: "0.3.3",
      signer: await toECDSASigner({ signer: sessionAccount }),
      policies: [], // 👈 required by the types; on-chain policies still apply
    });
    // 3) Reconstruct the EXISTING Kernel with the session validator as the regular plugin
    //    (do not set sudo here to avoid owner-signature prompts)
    const account = await createKernelAccount(pc, {
      address: kernelAddress as `0x${string}`,
      entryPoint: { address: entryPoint07Address, version: "0.7" },
      kernelVersion: "0.3.3",
      plugins: { regular: validator }, // ✅ session key validator used to sign UserOps
    });

    // 4) Self-funded Kernel client (no paymaster)
    const client = createKernelAccountClient({
      account,
      chain: sepolia,
      bundlerTransport: http(BUNDLER),
    });

    // 5) Build the call(s)
    let calls: Array<{ to: `0x${string}`; value: bigint; data: `0x${string}` }>;
    if (kind === "native") {
      calls = [{ to, value: parseEther(String(amount)), data: "0x" }];
    } else if (kind === "erc20") {
      if (!token) throw new Error("token address required for erc20");
      const value = parseUnits(String(amount), 18); // read decimals in prod
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [to, value],
      });
      calls = [{ to: token as `0x${string}`, value: BigInt(0), data }];
    } else {
      throw new Error("unknown kind");
    }

    const callData = await client.account.encodeCalls(calls);
    const txHash = await client.sendTransaction({ callData }); // silent (session key)
    return res.status(200).json({ ok: true, txHash });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? "unknown" });
  }
}
