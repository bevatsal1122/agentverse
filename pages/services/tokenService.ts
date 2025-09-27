import { createThirdwebClient } from "thirdweb";
import { arbitrumSepolia, defineChain } from "thirdweb/chains";
import { getContract } from "thirdweb";
import { deployERC20Contract } from "thirdweb/deploys";
import { privateKeyToAccount } from "thirdweb/wallets/private-key";
import { THIRDWEB_CONFIG } from "../config/thirdweb";
import { supabaseService } from "./supabaseService";

// Define the client for Thirdweb
const client = createThirdwebClient({
  clientId: THIRDWEB_CONFIG.CLIENT_ID || "your-client-id-here",
});

// Define supported chains
export const supportedChains = {
  arbitrumSepolia: defineChain(421614),
};

export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
  description?: string;
  image?: string;
  privateKey?: string; // Optional private key for real deployment
}

export interface TokenDeploymentResult {
  success: boolean;
  contractAddress?: string;
  transactionHash?: string;
  error?: string;
}

export class TokenService {
  private chain: any;

  constructor(chainId: number = 8453) {
    this.chain =
      Object.values(supportedChains).find((chain) => chain.id === chainId) ||
      supportedChains.arbitrumSepolia;
  }

  /**
   * Deploy a new ERC20 token contract
   */
  async deployToken(
    tokenConfig: TokenConfig,
    account?: any
  ): Promise<TokenDeploymentResult> {
    try {
      console.log("Deploying token with config:", tokenConfig);

      // Check if we have a private key for deployment
      if (!tokenConfig.privateKey || tokenConfig.privateKey.trim() === "") {
        throw new Error("Private key is required for token deployment");
      }

      console.log("Using private key for real deployment");

      // Create account from private key
      const deployAccount = privateKeyToAccount({
        client,
        privateKey: tokenConfig.privateKey,
      });

      // Deploy the ERC20 contract with real account
      const contractAddress = await deployERC20Contract({
        client,
        chain: this.chain,
        account: deployAccount,
        type: "TokenERC20",
        params: {
          name: tokenConfig.name,
          symbol: tokenConfig.symbol,
        },
      });

      console.log("Token deployed successfully:", contractAddress);

      // Save token to Supabase
      const tokenData = {
        name: tokenConfig.name,
        symbol: tokenConfig.symbol,
        contract_address: contractAddress,
        decimals: tokenConfig.decimals,
        initial_supply: tokenConfig.initialSupply,
        description: tokenConfig.description || null,
        image_url: tokenConfig.image || null,
        deployer_address: "0xe309b3e0d2bf2df0115ad942368e1766c7e1f53f",
        transaction_hash: contractAddress, // Using contract address as transaction hash for now
      };

      const saveResult = await supabaseService.createToken(tokenData);
      if (!saveResult.success) {
        console.warn("Failed to save token to database:", saveResult.error);
      }

      return {
        success: true,
        contractAddress: contractAddress,
        transactionHash: contractAddress, // In newer versions, this might be the transaction hash
      };
    } catch (error) {
      console.error("Error deploying token:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get token information from a deployed contract
   */
  async getTokenInfo(contractAddress: string) {
    try {
      const contract = getContract({
        client,
        chain: this.chain,
        address: contractAddress,
      });

      // Note: You would need to import the appropriate contract extensions
      // to read token information like name, symbol, decimals, etc.
      // This is a placeholder for the actual implementation

      return {
        success: true,
        contract,
      };
    } catch (error) {
      console.error("Error getting token info:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Switch to a different chain
   */
  switchChain(chainId: number) {
    this.chain =
      Object.values(supportedChains).find((chain) => chain.id === chainId) ||
      supportedChains.arbitrumSepolia;
  }

  /**
   * Get current chain information
   */
  getCurrentChain() {
    return this.chain;
  }

  /**
   * Get all supported chains
   */
  getSupportedChains() {
    return supportedChains;
  }

  /**
   * Get all deployed tokens from database
   */
  async getDeployedTokens() {
    try {
      const result = await supabaseService.getTokens();
      return result;
    } catch (error) {
      console.error("Error fetching deployed tokens:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get token by contract address
   */
  async getTokenByAddress(contractAddress: string) {
    try {
      const result = await supabaseService.getTokens();
      if (result.success && result.data) {
        const token = result.data.find(
          (t) => t.contract_address === contractAddress
        );
        return {
          success: true,
          data: token || null,
        };
      }
      return result;
    } catch (error) {
      console.error("Error fetching token by address:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}

// Export a default instance
export const tokenService = new TokenService();
