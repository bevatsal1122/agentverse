import { NextApiRequest, NextApiResponse } from "next";
import { http, formatUnits } from "viem";
import { sepolia } from "viem/chains";
import { createPublicClient } from "viem";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { kernelAddress } = req.body;

    if (!kernelAddress) {
      return res.status(400).json({
        ok: false,
        error: "kernelAddress required",
      });
    }

    const pc = createPublicClient({
      chain: sepolia,
      transport: http(sepolia.rpcUrls.default.http[0]),
    });

    // Get the native ETH balance
    const balance = await pc.getBalance({
      address: kernelAddress as `0x${string}`,
    });

    // Format with higher precision (18 decimals) and then format to show more decimal places
    const balanceInEth = formatUnits(balance, 18);
    const formattedBalance = parseFloat(balanceInEth).toFixed(8);

    return res.status(200).json({
      ok: true,
      balance: formattedBalance,
      balanceWei: balance.toString(),
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e?.message ?? "unknown",
    });
  }
}
