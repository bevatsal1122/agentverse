import {
  createPublicClient,
  http,
  erc20Abi,
  encodeFunctionData,
  parseUnits,
} from "viem";
import { sepolia } from "viem/chains";

export async function transferNative({
  kernelClient,
  to,
  amountWei,
}: {
  kernelClient: any;
  to: `0x${string}`;
  amountWei: bigint;
}) {
  const callData = await kernelClient.account.encodeCalls([
    {
      to,
      value: amountWei,
      data: "0x",
    },
  ]);
  return kernelClient.sendTransaction({ callData }) as Promise<`0x${string}`>;
}

export async function transferErc20({
  kernelClient,
  token,
  to,
  amountDecimal,
}: {
  kernelClient: any;
  token: `0x${string}`;
  to: `0x${string}`;
  amountDecimal: string;
}) {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  const decimals = (await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "decimals",
  })) as number;

  const amount = parseUnits(amountDecimal, decimals);

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, amount],
  });

  const callData = await kernelClient.account.encodeCalls([
    {
      to: token,
      value: BigInt(0),
      data,
    },
  ]);

  return kernelClient.sendTransaction({ callData }) as Promise<`0x${string}`>;
}
