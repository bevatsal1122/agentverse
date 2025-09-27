import React, { useState } from "react";
import {
  tokenService,
  TokenConfig,
  TokenDeploymentResult,
} from "../services/tokenService";

interface TokenCreatorProps {
  onClose: () => void;
  onTokenCreated?: (result: TokenDeploymentResult) => void;
}

const TokenCreator: React.FC<TokenCreatorProps> = ({
  onClose,
  onTokenCreated,
}) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] =
    useState<TokenDeploymentResult | null>(null);

  const [tokenConfig, setTokenConfig] = useState<TokenConfig>({
    name: "",
    symbol: "",
    decimals: 18,
    initialSupply: "1000000",
    description: "",
    image: "",
    privateKey: "", // Private key required for deployment
  });

  const handleDeployToken = async () => {
    if (!tokenConfig.name || !tokenConfig.symbol) {
      alert("Please fill in token name and symbol");
      return;
    }

    if (!tokenConfig.privateKey) {
      alert("Please enter the private key for deployment");
      return;
    }

    setIsDeploying(true);
    setDeploymentResult(null);

    try {
      const result = await tokenService.deployToken(tokenConfig);
      setDeploymentResult(result);

      if (result.success) {
        alert(
          `Token deployed successfully!\nContract Address: ${result.contractAddress}`
        );
        onTokenCreated?.(result);
      } else {
        alert(`Token deployment failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deploying token:", error);
      alert("An unexpected error occurred during deployment");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleInputChange = (
    field: keyof TokenConfig,
    value: string | number
  ) => {
    setTokenConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create ERC20 Token</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Deployment Info */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Deployment Info</h3>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <strong>🚀 Deployment Mode:</strong> Real deployment on Base
              mainnet
            </div>
            <div className="text-xs text-blue-700 mt-1">
              <strong>Deployer Address:</strong>{" "}
              0xe309b3e0d2bf2df0115ad942368e1766c7e1f53f
            </div>
            <div className="text-xs text-blue-600 mt-1">
              <strong>Network:</strong> Base Mainnet (Chain ID: 8453)
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Enter the private key below for deployment
            </div>
          </div>
        </div>

        {/* Token Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Token Configuration</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token Name *
            </label>
            <input
              type="text"
              value={tokenConfig.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., My Awesome Token"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token Symbol *
            </label>
            <input
              type="text"
              value={tokenConfig.symbol}
              onChange={(e) => handleInputChange("symbol", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., MAT"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Decimals
            </label>
            <input
              type="number"
              value={tokenConfig.decimals}
              onChange={(e) =>
                handleInputChange("decimals", parseInt(e.target.value) || 18)
              }
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="18"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Supply
            </label>
            <input
              type="text"
              value={tokenConfig.initialSupply}
              onChange={(e) =>
                handleInputChange("initialSupply", e.target.value)
              }
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={tokenConfig.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe your token..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Private Key *
            </label>
            <input
              type="password"
              value={tokenConfig.privateKey}
              onChange={(e) => handleInputChange("privateKey", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter private key for deployment on Base mainnet..."
            />
            <div className="text-xs text-gray-500 mt-1">
              Required for token deployment on Base mainnet
            </div>
          </div>
        </div>

        {/* Deployment Result */}
        {deploymentResult && (
          <div
            className="mt-4 p-3 rounded"
            style={{
              backgroundColor: deploymentResult.success ? "#d4edda" : "#f8d7da",
              color: deploymentResult.success ? "#155724" : "#721c24",
            }}
          >
            {deploymentResult.success ? (
              <div>
                <p className="font-semibold">✅ Token Deployed Successfully!</p>
                <p className="text-sm mt-1">
                  Contract Address: {deploymentResult.contractAddress}
                </p>
                {deploymentResult.transactionHash && (
                  <p className="text-sm">
                    Transaction: {deploymentResult.transactionHash}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="font-semibold">❌ Deployment Failed</p>
                <p className="text-sm mt-1">{deploymentResult.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleDeployToken}
            disabled={isDeploying}
            className="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isDeploying ? "Deploying..." : "Deploy Token"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenCreator;
