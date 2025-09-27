import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { address, tokenAddress } = req.query;
  console.log("Checking balance for address:", address);

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Address is required" });
  }

  // Use provided tokenAddress or default to a specific token
  const tokenContractAddress = "0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1";

  try {
    // Try multiple Arbitrum Sepolia RPC endpoints
    const rpcEndpoints = [
      "https://arbitrum-sepolia-rpc.publicnode.com",
      "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
      "https://arbitrum-sepolia-rpc.publicnode.com",
      "https://sepolia-rollup.arbitrum.io/rpc",
      "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
    ];

    let lastError: Error | null = null;

    for (const rpcUrl of rpcEndpoints) {
      try {
        console.log(`Trying RPC endpoint: ${rpcUrl}`);

        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_call",
            params: [
              {
                to: tokenContractAddress,
                data: `0x70a08231000000000000000000000000${address.slice(2)}`, // balanceOf(address) function call
              },
              "latest",
            ],
            id: 1,
          }),
          // Add timeout
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`RPC request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(`RPC error: ${data.error.message}`);
        }

        // Parse ERC-20 token balance
        const balanceHex = data.result;
        console.log("balanceHex", balanceHex);
        if (!balanceHex || balanceHex === "0x") {
          return res.status(200).json({
            balance: "0.000000",
            address: address,
            tokenAddress: tokenContractAddress,
            network: "arbitrum-sepolia",
            rpcEndpoint: rpcUrl,
          });
        }

        // Convert from wei to token units (6 decimals for this token)
        const balanceWei = parseInt(balanceHex, 16);
        const balanceTokens = balanceWei / Math.pow(10, 6);
        const balanceString = balanceTokens.toFixed(6);

        console.log(
          `Token balance check for ${address}: ${balanceString} tokens (via ${rpcUrl})`
        );

        return res.status(200).json({
          balance: balanceString,
          address: address,
          tokenAddress: tokenContractAddress,
          network: "arbitrum-sepolia",
          rpcEndpoint: rpcUrl,
        });
      } catch (endpointError) {
        console.error(`Error with endpoint ${rpcUrl}:`, endpointError);
        lastError =
          endpointError instanceof Error
            ? endpointError
            : new Error("Unknown error");
        continue; // Try next endpoint
      }
    }

    // If all endpoints failed, return the last error
    throw lastError || new Error("All RPC endpoints failed");
  } catch (error) {
    console.error("Error checking balance:", error);
    return res.status(500).json({
      error: "Failed to check balance",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
