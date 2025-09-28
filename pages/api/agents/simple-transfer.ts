import { NextApiRequest, NextApiResponse } from "next";
import { AuthorizationContext, PrivyClient } from "@privy-io/node";
import { ethers } from "ethers";
import { agentService } from "../../services/agentService";
import { supabase } from "../../lib/supabase";

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fromAgentId, toAgentId, amount } = req.body;
console.log("transferrig pyusd from", fromAgentId, "to", toAgentId, "amount", amount);
    if (!fromAgentId || !toAgentId || !amount) {
      return res.status(400).json({
        error: "Missing required fields: fromAgentId, toAgentId, amount",
      });
    }

    // Get sender agent
    const fromAgentResult = await agentService.getAgentById(fromAgentId);
    if (!fromAgentResult.success || !fromAgentResult.data) {
      return res.status(404).json({ error: "From agent not found" });
    }

    // Get recipient agent
    const toAgentResult = await agentService.getAgentById(toAgentId);
    if (!toAgentResult.success || !toAgentResult.data) {
      return res.status(404).json({ error: "To agent not found" });
    }

    const fromAgent = fromAgentResult.data;
    const toAgent = toAgentResult.data;

    if (!fromAgent.privy_wallet_address) {
      return res
        .status(400)
        .json({ error: "From agent has no wallet address" });
    }

    if (!toAgent.privy_wallet_address) {
      return res.status(400).json({ error: "To agent has no wallet address" });
    }

    // Get user email from database
    let userEmail = "amitmanojgaikwad@gmail.com"; // fallback
    if (fromAgent.user_id) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email")
        .eq("id", fromAgent.user_id)
        .single();

      if (!userError && userData?.email) {
        userEmail = userData.email;
      }
      console.log("userData 1", userData);
    }
   

    // Initialize Privy client
    const privy = new PrivyClient({
      appId: "cmg25mfu6002yl10dqx1h3e0p",
      appSecret:
        "5ShRdifyjeUK6hvFTURorAAgvkY4z6uXWYUCcD4FbxtMcNHRtkpTP5XqFLxeheZXjT1j4BnG4oAuRRcvXvBD7TdV",
    });

    // Get user and wallet using the agent's user email
    console.log("Using user email:", userEmail);
    const user = await privy.users().getByEmailAddress({ address: userEmail });

    console.log(
      "User linked accounts:",
      user.linked_accounts.map((w: any) => ({
        address: w.address,
        connector_type: w.connector_type,
      }))
    );
    console.log("Looking for agent wallet:", fromAgent.privy_wallet_address);

    // Find the wallet that matches the agent's privy_wallet_address
    const wallet = user.linked_accounts.find(
      (w: any) => w.address === fromAgent.privy_wallet_address
    ) as any;

    if (!wallet || !wallet.id) {
      return res.status(400).json({
        error: "No matching wallet found for agent's Privy wallet address",
        details: `Agent wallet: ${
          fromAgent.privy_wallet_address
        }, Available wallets: ${user.linked_accounts
          .map((w: any) => w.address)
          .join(", ")}`,
      });
    }

    // Authorization context
    const authorizationContext: AuthorizationContext = {
      authorization_private_keys: [
        "wallet-auth:MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgczbbXBmmmb4tyVBUOxUntdG5hL9AUtKK+jHxxoj1NZahRANCAATtQZD/n6+4ZbFNjDHy6saXt9WtqvPI876PLQkT2dn2Za1YZUxFJoBfO77cabW1pXojUb0UGqsGGrha8dLPaawx",
      ],
    };

    // Encode transfer data using ethers
    const parsedAmount = ethers.parseUnits(amount, 6);
    const transferData = new ethers.Interface(ERC20_ABI).encodeFunctionData(
      "transfer",
      [toAgent.privy_wallet_address, parsedAmount]
    );

    console.log("Transfer data:", transferData);
    console.log("From:", fromAgent.name, fromAgent.privy_wallet_address);
    console.log("To:", toAgent.name, toAgent.privy_wallet_address);
    console.log("Amount:", amount);

    // Execute transfer
    const response = await privy
      .wallets()
      .ethereum()
      .sendTransaction(wallet.id, {
        caip2: "eip155:421614",
        params: {
          transaction: {
            to: "0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1",
            value: 0,
            data: transferData,
            chain_id: 421614,
          },
        },
        authorization_context: authorizationContext,
      });

    console.log("Transfer response:", response);

    return res.status(200).json({
      success: true,
      message: "Transfer completed successfully",
      transaction_hash:
        (response as any).transaction_hash || response.transaction_id,
      from_agent: fromAgent.name,
      to_agent: toAgent.name,
      amount: amount,
    });
  } catch (error) {
    console.error("Transfer error:", error);
    return res.status(500).json({
      error: "Transfer failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
