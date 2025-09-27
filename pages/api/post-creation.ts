import { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";
import { REGISTER_CONTRACT_ABI } from "../lib/contracts/registerABI";

// Configuration - replace with your actual values
const NETWORK_CONFIG = {
  // Arbitrum Sepolia testnet
  rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC, // Arbitrum Sepolia RPC
  chainId: 421614, // Arbitrum Sepolia
  contractAddress: "0x4Ccd46b204Fb01c835808E6B76b49F7f405cd0Bc", // Your contract address
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  //   if (req.method !== 'POST') {
  //     return res.status(405).json({ error: 'Method not allowed' });
  //   }
  const { label, owner } = req.body;
  await faucetHelper(label, owner);
  await sendEthHelper(owner);
  return res.status(200).json({ 
    message: "Successfully sent 0.0005 ETH and registered label" 
  });
}

const sendEthHelper = async (owner: string, amount: string = "0.0005") => {
  try {
    const privateKey = process.env.GAS_SPONSORSHIP_PVT_KEY;
    const finalRpcUrl = NETWORK_CONFIG.rpcUrl;

    console.log("💸 Starting ETH transfer...");
    console.log("📋 Transfer parameters:", {
      to: owner,
      amount: amount + " ETH",
      rpcUrl: finalRpcUrl?.substring(0, 50) + "...",
    });

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(finalRpcUrl);
    const wallet = new ethers.Wallet(privateKey as string, provider);

    console.log("💰 Sender wallet address:", wallet.address);

    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Sender balance:", ethers.formatEther(balance), "ETH");

    const amountWei = ethers.parseEther(amount);
    if (balance < amountWei) {
      console.error("❌ Insufficient balance for transfer");
      return;
    }

    // Send ETH transaction
    console.log("📤 Sending ETH transfer...");
    const tx = await wallet.sendTransaction({
      to: owner,
      value: amountWei,
    });

    console.log("✅ ETH transfer sent:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value || 0) + " ETH",
    });

    // Wait for confirmation
    console.log("⏳ Waiting for ETH transfer confirmation...");
    const receipt = await tx.wait();

    if (receipt?.status === 1) {
      console.log("✅ ETH transfer confirmed:", {
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        effectiveGasPrice: receipt.gasPrice
          ? ethers.formatUnits(receipt.gasPrice, "gwei") + " gwei"
          : "unknown",
      });
    } else {
      console.error("❌ ETH transfer failed");
    }
  } catch (error: any) {
    console.error("❌ Error in ETH transfer:", error);
  }
};

const faucetHelper = async (label: string, owner: string) => {
  try {
    const privateKey = process.env.GAS_SPONSORSHIP_PVT_KEY;

    // Use provided config or fallback to defaults
    const finalRpcUrl = NETWORK_CONFIG.rpcUrl;
    const finalContractAddress = NETWORK_CONFIG.contractAddress;

    console.log("📋 Transaction parameters:", {
      label,
      owner,
      contractAddress: finalContractAddress,
      rpcUrl: finalRpcUrl?.substring(0, 50) + "...", // Don't log full RPC URL
    });

    // Validate contract address
    if (
      !finalContractAddress ||
      finalContractAddress === "0x0000000000000000000000000000000000000000"
    ) {
      console.error("❌ Invalid contract address:", finalContractAddress);
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(finalRpcUrl);
    const wallet = new ethers.Wallet(privateKey as string, provider);

    console.log("💰 Wallet address:", wallet.address);

    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log("💰 Wallet balance:", ethers.formatEther(balance), "ETH");

    if (balance === BigInt(0)) {
      console.warn(
        "⚠️  Warning: Wallet has 0 ETH balance. Transaction may fail due to insufficient gas."
      );
    }

    // Create contract instance
    console.log("📄 Creating contract instance...");
    const contract = new ethers.Contract(
      finalContractAddress,
      REGISTER_CONTRACT_ABI,
      wallet
    );

    // Estimate gas for the transaction
    console.log("⛽ Estimating gas...");
    let gasEstimate: bigint;
    try {
      gasEstimate = await contract.register.estimateGas(label, owner);
      console.log("⛽ Gas estimate:", gasEstimate.toString());
    } catch (error: any) {
      console.error("❌ Gas estimation failed:", error.message);
    }

    // Get current gas price
    const feeData = await provider.getFeeData();
    console.log("⛽ Gas price:", {
      gasPrice: feeData.gasPrice
        ? ethers.formatUnits(feeData.gasPrice, "gwei") + " gwei"
        : "null",
      maxFeePerGas: feeData.maxFeePerGas
        ? ethers.formatUnits(feeData.maxFeePerGas, "gwei") + " gwei"
        : "null",
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        ? ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei") + " gwei"
        : "null",
    });

    // Send the transaction
    console.log("📤 Sending register transaction...");
    const tx = await contract.register(label, owner);

    console.log("✅ Transaction sent:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
    });

    // Wait for confirmation
    console.log("⏳ Waiting for transaction confirmation...");
    const receipt = await tx.wait();

    if (receipt?.status === 1) {
      console.log("✅ Transaction confirmed:", {
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        effectiveGasPrice: receipt.gasPrice
          ? ethers.formatUnits(receipt.gasPrice, "gwei") + " gwei"
          : "unknown",
      });

    
    } else {
      console.error("❌ Transaction failed");
    }
  } catch (error: any) {
    console.error("❌ Error in register transaction:", error);
    const errorMessage = error.message;
  }
};
