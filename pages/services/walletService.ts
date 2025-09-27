import { createThirdwebClient } from "thirdweb";
import { createWallet } from "thirdweb/wallets";
import { THIRDWEB_CONFIG } from "../config/thirdweb";

// Define the client for Thirdweb
const client = createThirdwebClient({
  clientId: THIRDWEB_CONFIG.CLIENT_ID || "your-client-id-here",
});

export interface WalletConnectionResult {
  success: boolean;
  address?: string;
  error?: string;
}

export class WalletService {
  private wallet: any = null;
  private isConnected: boolean = false;

  /**
   * Connect to a wallet
   */
  async connectWallet(): Promise<WalletConnectionResult> {
    try {
      // Create a wallet instance
      this.wallet = createWallet("io.metamask");

      // Connect the wallet
      const account = await this.wallet.connect({
        client,
      });

      this.isConnected = true;

      return {
        success: true,
        address: account.address,
      };
    } catch (error) {
      console.error("Error connecting wallet:", error);

      // Reset wallet state on error
      this.wallet = null;
      this.isConnected = false;

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to connect wallet",
      };
    }
  }

  /**
   * Disconnect the wallet
   */
  async disconnectWallet(): Promise<void> {
    try {
      if (this.wallet) {
        await this.wallet.disconnect();
      }
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    } finally {
      // Always reset state
      this.wallet = null;
      this.isConnected = false;
    }
  }

  /**
   * Get the current wallet address
   */
  getWalletAddress(): string | null {
    if (!this.wallet || !this.isConnected) {
      return null;
    }

    try {
      const account = this.wallet.getAccount();
      return account?.address || null;
    } catch (error) {
      console.error("Error getting wallet address:", error);
      return null;
    }
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    return this.isConnected && this.wallet !== null;
  }

  /**
   * Get the wallet instance
   */
  getWallet() {
    return this.wallet;
  }
}

// Export a default instance
export const walletService = new WalletService();
