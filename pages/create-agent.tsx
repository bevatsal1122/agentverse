import React, { useState, useEffect } from "react";
import Link from "next/link";
import { RandomAvatar } from "react-random-avatars";
import { useAuth } from "../src/contexts/AuthContext";
import Navbar from "./components/Navbar";
import {
  useCreateWallet,
  useSessionSigners,
  usePrivy,
} from "@privy-io/react-auth";

interface TokenForm {
  name: string;
  description: string;
  category: string;
  pythonCode: string;
}

const categories = [
  "Utility",
  "DeFi",
  "Gaming",
  "NFT",
  "Infrastructure",
  "Social",
  "AI/ML",
  "Other",
];

export default function CreateAgent() {
  const { authenticated, user, databaseUser, ready } = useAuth();
  const { createWallet } = useCreateWallet();
  const { addSessionSigners } = useSessionSigners();
  const { user: privyUser } = usePrivy();
  console.log(privyUser);

  const [form, setForm] = useState<TokenForm>({
    name: "",
    description: "",
    category: "",
    pythonCode: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [embeddedWalletAddress, setEmbeddedWalletAddress] = useState<
    string | null
  >(null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const [walletCreated, setWalletCreated] = useState(false);
  const [walletFunded, setWalletFunded] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [showFundingStep, setShowFundingStep] = useState(false);
  const [isCreatingWalletLoader, setIsCreatingWalletLoader] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "form" | "funding" | "creating"
  >("form");
  const [selectedEmbededAddress, setSelectedEmbededAddress] = useState<
    string | null
  >(null);
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const createEmbeddedWallet = async () => {
    setIsCreatingWallet(true);
    setError(null);

    try {
      console.log("Creating embedded wallet...");
      await createWallet({ createAdditional: true });
      console.log("Embedded wallet created successfully");
      setWalletCreated(true);

      // Wait a moment for the wallet to be added to linkedAccounts
      setTimeout(() => {
        const walletAddress = findEmbeddedWalletAddress();
        if (walletAddress) {
          setEmbeddedWalletAddress(walletAddress);
        }
      }, 1000);
    } catch (error) {
      console.error("Error creating embedded wallet:", error);
      setError("Failed to create embedded wallet. Please try again.");
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const findEmbeddedWalletAddress = () => {
    if (!privyUser?.linkedAccounts) {
      console.log("No linked accounts found");
      return null;
    }

    console.log("All linked accounts:", privyUser.linkedAccounts);

    // First, try to find a non-delegated embedded wallet
    const nonDelegatedWallet = privyUser.linkedAccounts.find(
      (account) =>
        account.type === "wallet" &&
        account.connectorType === "embedded" &&
        account.delegated === false
    );

    if (nonDelegatedWallet && "address" in nonDelegatedWallet) {
      console.log("Found non-delegated embedded wallet:", nonDelegatedWallet);
      return nonDelegatedWallet.address;
    }

    // If no non-delegated wallet found, we need to create a new one
    console.log(
      "No non-delegated embedded wallet found. Need to create a new one."
    );
    return null;
  };

  const delegateWallet = async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const walletAddress = findEmbeddedWalletAddress();
    console.log("Wallet address:", walletAddress);
    if (!walletAddress) {
      setError("No embedded wallet found. Please create one first.");
      return;
    }

    setIsDelegating(true);
    setError(null);

    try {
      console.log("Delegating wallet:", walletAddress);
      const response = await addSessionSigners({
        address: walletAddress,
        signers: [{ signerId: "dax1262iligkh4l56txg1hgk" }],
      });
      console.log("Respons6tgrtbhte:", response);
      console.log("Wallet delegated successfully");
      setEmbeddedWalletAddress(walletAddress);
    } catch (error) {
      console.error("Error delegating wallet:", error);
      setError("Failed to delegate wallet. Please try again.");
    } finally {
      setIsDelegating(false);
    }
  };

  const checkWalletBalance = async (walletAddress: string) => {
    setIsCheckingBalance(true);
    setError(null);

    try {
      // Use a simple balance check API (you might need to implement this)
      const response = await fetch(
        `/api/check-balance?address=${walletAddress}`
      );
      const data = await response.json();

      if (data.balance && parseFloat(data.balance) > 0) {
        setWalletFunded(true);
        return true;
      } else {
        setError(
          "Token balance is 0. Please send the required ERC-20 token to the wallet first."
        );
        return false;
      }
    } catch (error) {
      console.error("Error checking balance:", error);
      setError("Failed to check token balance. Please try again.");
      return false;
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleFundedClick = async () => {
    if (!embeddedWalletAddress) {
      setError("No wallet address found.");
      return;
    }

    const isFunded = await checkWalletBalance(selectedEmbededAddress || "");
    if (isFunded) {
      setWalletFunded(true);
      setCurrentStep("funding"); // Stay in funding step, but now funded
      setError(null);
    }
  };

  // Check for embedded wallet when user changes
  useEffect(() => {
    if (privyUser?.linkedAccounts) {
      const walletAddress = findEmbeddedWalletAddress();
      if (walletAddress) {
        setEmbeddedWalletAddress(walletAddress);
        setWalletCreated(true);
      }
    }
  }, [privyUser?.linkedAccounts]);

  // Show loading while checking authentication
  if (!ready) {
    return (
      <div className="min-h-screen amongus-grid flex items-center justify-center">
        <div className="amongus-panel p-8 text-center">
          <div className="text-lg font-bold text-white mb-2">LOADING...</div>
          <div className="text-sm text-blue-300">
            Initializing authentication
          </div>
        </div>
      </div>
    );
  }

  // Show authentication required if not connected
  if (!authenticated) {
    return (
      <div className="min-h-screen amongus-grid flex items-center justify-center">
        <div className="amongus-panel p-8 text-center max-w-md">
          <div className="text-lg font-bold text-white mb-2">
            AUTHENTICATION REQUIRED
          </div>
          <div className="text-sm text-blue-300 mb-4">
            Please connect your wallet to create agents
          </div>
          <Link
            href="/auth"
            className="amongus-button px-6 py-3 text-sm bg-green-600 hover:bg-green-500"
          >
            Connect Wallet
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Step 1: Create embedded wallet and show funding step
      if (currentStep === "form") {
        console.log("Creating embedded wallet...");
        setIsCreatingWalletLoader(true);
        setError(null);

        try {
          await createEmbeddedWallet();

          // Wait for wallet to be created and detected
          setTimeout(async () => {
            const walletAddress = findEmbeddedWalletAddress();
            setSelectedEmbededAddress(walletAddress);
            if (walletAddress) {
              setEmbeddedWalletAddress(walletAddress);
              await delegateWallet();
              setCurrentStep("funding");
              setShowFundingStep(true);
              setIsCreatingWalletLoader(false);
            } else {
              setError("Failed to create wallet. Please try again.");
              setIsCreatingWalletLoader(false);
            }
          }, 2000);
        } catch (error) {
          console.error("Error creating wallet:", error);
          setError("Failed to create wallet. Please try again.");
          setIsCreatingWalletLoader(false);
        }

        setIsSubmitting(false);
        return;
      }

      // Step 2: Create agent with funded wallet
      if (currentStep === "funding" && walletFunded) {
        setCurrentStep("creating");
        console.log("Submitting agent:", form);
        console.log("Using embedded wallet:", embeddedWalletAddress);

        const response = await fetch("/api/create-agent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            embeddedWalletAddress: embeddedWalletAddress,
            userId: databaseUser?.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || data.details || "Failed to create agent"
          );
        }

        // Success!
        setSuccess(
          `Agent "${data.agent.name}" created successfully! Address: ${
            data.agent.address
          }. Database ID: ${
            data.agent.databaseId || "Not saved to database"
          }. Embedded Wallet: ${embeddedWalletAddress}`
        );
        console.log("Agent created successfully:", data);

        // Reset form and states
        setForm({
          name: "",
          description: "",
          category: "",
          pythonCode: "",
        });
        setCurrentStep("form");
        setShowFundingStep(false);
        setWalletFunded(false);
        setEmbeddedWalletAddress(null);
      }
    } catch (error) {
      console.error("Error creating agent:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(`Error creating agent: ${errorMessage}`);
      setCurrentStep("form"); // Reset to form step on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    form.name && form.description && form.category && form.pythonCode;

  return (
    <div className="min-h-screen amongus-grid overflow-hidden relative">
      {/* Navbar */}
      <Navbar currentPage="create-agent" />

      {/* Space Station Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute bottom-24 right-16 w-28 h-20 amongus-building rounded-lg">
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"></div>
          <div className="absolute top-2 left-2 w-3 h-3 amongus-window rounded-sm"></div>
        </div>

        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-cyan-300 rounded-full opacity-80 animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-70 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-cyan-400 rounded-full opacity-50 animate-pulse"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 amongus-panel p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Create Agent</h1>
            {/* Step Indicator */}
            <div className="flex items-center space-x-4 mt-2">
              <div
                className={`flex items-center space-x-2 ${
                  currentStep === "form" || isCreatingWalletLoader
                    ? "text-blue-300"
                    : currentStep === "funding"
                    ? "text-yellow-300"
                    : "text-green-300"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep === "form" || isCreatingWalletLoader
                      ? "bg-blue-600"
                      : "bg-gray-600"
                  }`}
                >
                  {isCreatingWalletLoader ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                  ) : (
                    "1"
                  )}
                </div>
                <span className="text-sm">
                  {isCreatingWalletLoader
                    ? "Creating Wallet..."
                    : "Agent Details"}
                </span>
              </div>
              <div className="w-8 h-0.5 bg-gray-600"></div>
              <div
                className={`flex items-center space-x-2 ${
                  currentStep === "funding"
                    ? "text-yellow-300"
                    : currentStep === "creating"
                    ? "text-green-300"
                    : "text-gray-400"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep === "funding" || currentStep === "creating"
                      ? "bg-yellow-600"
                      : "bg-gray-600"
                  }`}
                >
                  2
                </div>
                <span className="text-sm">Fund Wallet</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Link
              href="/dashboard"
              className="simcity-button px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white"
            >
              ← Dashboard
            </Link>
            <Link
              href="/"
              className="simcity-button px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 text-white"
            >
              ← Home
            </Link>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="relative z-10 max-w-2xl mx-auto pt-4">
        <div className="amongus-panel p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-80 border border-red-400 text-red-300 rounded-lg shadow-lg">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-900 bg-opacity-80 border border-green-400 text-green-300 rounded-lg shadow-lg">
              <div className="flex items-center space-x-3 mb-2">
                <RandomAvatar name={form.name} size={32} />
                <div className="flex-1">{success}</div>
              </div>
              <Link
                href="/dashboard"
                className="simcity-button px-3 py-1 text-xs bg-green-600 hover:bg-green-500 text-white inline-block"
              >
                View Dashboard
              </Link>
            </div>
          )}

          {/* Funding Step */}
          {currentStep === "funding" && embeddedWalletAddress && (
            <div className="mb-6 p-4 bg-yellow-900 bg-opacity-50 border border-yellow-400 rounded-lg">
              <h3 className="text-lg font-bold text-yellow-300 mb-4">
                Fund Your Agent Wallet
              </h3>

              <div className="space-y-4">
                <div className="p-3 bg-gray-800 rounded border">
                  <p className="text-sm text-white mb-2">
                    <strong>Agent Wallet Address:</strong>
                  </p>
                  <div className="font-mono text-green-300 break-all text-xs bg-gray-900 p-2 rounded">
                    {selectedEmbededAddress}
                  </div>
                </div>

                <div className="p-3 bg-blue-900 bg-opacity-50 border border-blue-400 rounded">
                  <p className="text-sm text-blue-200 mb-2">
                    💰 <strong>Instructions (Arbitrum Sepolia Testnet):</strong>
                  </p>
                  <ul className="text-xs text-blue-200 space-y-1 ml-4">
                    <li>
                      • Send the required ERC-20 token to the wallet address
                      above
                    </li>
                    <li>
                      • Token Contract:{" "}
                      <span className="font-mono text-cyan-300">
                        0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1
                      </span>
                    </li>
                    <li>• Network: Arbitrum Sepolia Testnet</li>
                    <li>• Wait for the transaction to be confirmed</li>
                    <li>• Click "I Have Funded" to verify the balance</li>
                  </ul>
                </div>

                {!walletFunded ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleFundedClick}
                      disabled={isCheckingBalance}
                      className="amongus-button px-4 py-2 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50"
                    >
                      {isCheckingBalance
                        ? "Checking Balance..."
                        : "I Have Funded"}
                    </button>

                    <button
                      onClick={() => {
                        setCurrentStep("form");
                        setShowFundingStep(false);
                        setEmbeddedWalletAddress(null);
                      }}
                      className="amongus-button px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500"
                    >
                      Back to Form
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-green-900 bg-opacity-50 border border-green-400 rounded">
                    <p className="text-sm text-green-200 mb-2">
                      ✅ <strong>Wallet Funded Successfully!</strong>
                    </p>
                    <p className="text-xs text-green-300">
                      Your wallet has been funded. Click "Create Agent" to
                      proceed with agent creation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Step */}
          {currentStep === "form" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-bold mb-2 text-blue-300"
                >
                  Agent Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border-2 border-blue-400 bg-gray-800 text-white rounded-lg focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  placeholder="Enter agent name"
                  required
                />
              </div>

              {/* Description Field */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-bold mb-2 text-blue-300"
                >
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full p-2 border-2 border-blue-400 bg-gray-800 text-white rounded-lg resize-none focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  placeholder="Describe your agent's purpose and functionality"
                  required
                />
              </div>

              {/* Category Field */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-bold mb-2 text-blue-300"
                >
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleInputChange}
                  className="w-full p-2 border-2 border-blue-400 bg-gray-800 text-white rounded-lg focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" className="bg-gray-800 text-white">
                    Select a category
                  </option>
                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                      className="bg-gray-800 text-white"
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Python Code Field */}
              <div>
                <label
                  htmlFor="pythonCode"
                  className="block text-sm font-bold mb-2 text-blue-300"
                >
                  Python Code *
                </label>
                <textarea
                  id="pythonCode"
                  name="pythonCode"
                  value={form.pythonCode}
                  onChange={handleInputChange}
                  rows={12}
                  className="w-full p-2 border-2 border-blue-400 bg-gray-800 text-white font-mono text-xs rounded-lg resize-none focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  placeholder='# Enter your uAgents Python code here
from uagents import Agent, Context

agent = Agent(name="my-agent")

@agent.on_event("startup")
async def on_start(ctx: Context):
    ctx.logger.info("Agent is up!")

if __name__ == "__main__":
    agent.run()'
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={
                    !isFormValid || isSubmitting || isCreatingWalletLoader
                  }
                  className={`amongus-button px-8 py-2 text-sm font-bold text-white border-2 border-blue-400 bg-gradient-to-b from-blue-600 to-blue-700 rounded-lg shadow-lg transition-all ${
                    !isFormValid || isSubmitting || isCreatingWalletLoader
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:from-blue-500 hover:to-blue-600 hover:shadow-xl"
                  }`}
                >
                  {isCreatingWalletLoader
                    ? "Creating Wallet..."
                    : isSubmitting
                    ? "Creating Wallet..."
                    : "Next: Create Wallet"}
                </button>
              </div>
            </form>
          )}

          {/* Wallet Creation Loader */}
          {isCreatingWalletLoader && (
            <div className="m-6 p-6 bg-blue-900 bg-opacity-50 border border-blue-400 rounded-lg">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-300"></div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-blue-300 mb-2">
                    Creating Your Agent Wallet
                  </h3>
                  <p className="text-sm text-blue-200">
                    Please wait while we create and configure your embedded
                    wallet...
                  </p>
                  <div className="mt-3 flex space-x-2">
                    <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Funding Step Submit Button */}
          {currentStep === "funding" && walletFunded && (
            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`amongus-button px-8 py-2 text-sm font-bold text-white border-2 border-green-400 bg-gradient-to-b from-green-600 to-green-700 rounded-lg shadow-lg transition-all ${
                  isSubmitting
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:from-green-500 hover:to-green-600 hover:shadow-xl"
                }`}
              >
                {isSubmitting ? "Creating Agent..." : "Create Agent"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
