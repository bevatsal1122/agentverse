import { useState } from "react";

export default function TestBalance() {
  const [walletAddress, setWalletAddress] = useState(
    "0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1"
  );
  const [tokenAddress, setTokenAddress] = useState(
    "0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1"
  );
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkBalance = async () => {
    setLoading(true);
    setError(null);
    setBalance(null);

    try {
      const response = await fetch(
        `/api/check-balance?address=${walletAddress}&tokenAddress=${tokenAddress}`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setBalance(data.balance);
      }
    } catch (err) {
      setError("Failed to check balance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Token Balance Checker</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0x..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token Contract Address
            </label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0x..."
            />
          </div>

          <button
            onClick={checkBalance}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Check Balance"}
          </button>

          {balance !== null && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-medium text-green-800">Balance Result</h3>
              <p className="text-green-700">Balance: {balance} tokens</p>
              <p className="text-sm text-green-600">
                Network: Arbitrum Sepolia
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="font-medium text-yellow-800 mb-2">
              Important Notes:
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>
                • The wallet address and token address should be different
              </li>
              <li>• A token contract doesn't hold its own tokens by default</li>
              <li>• Make sure the token contract exists on Arbitrum Sepolia</li>
              <li>
                • The wallet address should have received tokens from the token
                contract
              </li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-medium text-blue-800 mb-2">Example Usage:</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>
                <strong>Wallet Address:</strong> 0x1234... (your wallet that
                received tokens)
              </p>
              <p>
                <strong>Token Address:</strong>{" "}
                0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1 (the token contract)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
