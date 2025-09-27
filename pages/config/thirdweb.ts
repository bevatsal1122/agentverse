// Thirdweb Configuration
// Get your client ID from https://thirdweb.com/dashboard

export const THIRDWEB_CONFIG = {
  // Replace with your actual Thirdweb client ID
  // You can get one by:
  // 1. Going to https://thirdweb.com/dashboard
  // 2. Creating a new project
  // 3. Copying the client ID from the project settings
  CLIENT_ID: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,

  // Default chain configuration
  DEFAULT_CHAIN_ID: 11155111, // sepolia

  // Supported chains
  SUPPORTED_CHAINS: {
    sepolia: 11155111,
  },
};

// Instructions for setup:
export const SETUP_INSTRUCTIONS = `
To use the token creation functionality:

1. Go to https://thirdweb.com/dashboard
2. Create a new project or use an existing one
3. Copy your Client ID from the project settings
4. Set the environment variable: NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your-client-id
5. Or update the CLIENT_ID in this file directly

Make sure you have:
- A wallet connected (MetaMask recommended)
- Some ETH for gas fees on the network you're deploying to
- The correct network selected in your wallet
`;
