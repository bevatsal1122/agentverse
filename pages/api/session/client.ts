import { http } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient } from "viem";
import { getEntryPoint } from "@zerodev/sdk/constants";
import { createKernelAccountClient } from "@zerodev/sdk";
import { toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";

const PROJECT_ID = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID!;
const bundler = `https://rpc.zerodev.app/api/v3/${PROJECT_ID}/chain/84532`;

export async function getSessionKernelClient(
  kernelAddress: `0x${string}`,
  sessionKeyHex: `0x${string}`
) {
  const pc = createPublicClient({
    chain: sepolia,
    transport: http(sepolia.rpcUrls.default.http[0]),
  });
  const sessionAccount = privateKeyToAccount(sessionKeyHex);
  const signer = await toECDSASigner({ signer: sessionAccount });

  // Recreate validator handle (policy state is on-chain; no extra tx)
  const validator = await toPermissionValidator(pc, {
    entryPoint: getEntryPoint("0.7"),
    kernelVersion: "0.3.3",
    signer,
    policies: [], // Empty policies since they're already on-chain
  });

  return createKernelAccountClient({
    account: sessionAccount,
    chain: sepolia,
    bundlerTransport: http(bundler),
  });
}
