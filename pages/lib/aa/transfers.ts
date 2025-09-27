import {
  createPublicClient,
  http,
  erc20Abi,
  encodeFunctionData,
  parseUnits,
  formatEther,
  formatUnits,
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

export async function getNativeBalance({
  kernelClient,
}: {
  kernelClient: any;
}) {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  const balance = await publicClient.getBalance({
    address: kernelClient.account.address,
  });

  return {
    wei: balance,
    eth: formatEther(balance),
  };
}

export async function getErc20Balance({
  kernelClient,
  token,
}: {
  kernelClient: any;
  token: `0x${string}`;
}) {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  const [balance, decimals, symbol, name] = await Promise.all([
    publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [kernelClient.account.address],
    }) as Promise<bigint>,
    publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "decimals",
    }) as Promise<number>,
    publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "symbol",
    }) as Promise<string>,
    publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "name",
    }) as Promise<string>,
  ]);

  return {
    raw: balance,
    formatted: formatUnits(balance, decimals),
    decimals,
    symbol,
    name,
  };
}
