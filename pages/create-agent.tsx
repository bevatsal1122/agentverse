import React, { useState } from "react";
import Link from "next/link";

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

export default function CreateToken() {
  const [form, setForm] = useState<TokenForm>({
    name: "",
    description: "",
    category: "",
    pythonCode: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      console.log("Submitting agent:", form);

      const response = await fetch("/api/create-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to create agent");
      }

      // Success!
      setSuccess(
        `Agent "${data.agent.name}" created successfully! Address: ${
          data.agent.address
        }. Database ID: ${data.agent.databaseId || "Not saved to database"}`
      );
      console.log("Agent created successfully:", data);

      // Reset form
      setForm({
        name: "",
        description: "",
        category: "",
        pythonCode: "",
      });
    } catch (error) {
      console.error("Error creating agent:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(`Error creating agent: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    form.name && form.description && form.category && form.pythonCode;

  return (
    <div className="min-h-screen amongus-grid overflow-hidden relative p-4">
      {/* Space Station Background Elements */}
      <div className="absolute inset-0">
        {/* Space Station Buildings */}
        <div className="absolute top-20 left-20 w-40 h-32 amongus-building rounded-lg">
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"></div>
          <div className="absolute top-2 left-2 w-3 h-3 amongus-window rounded-sm"></div>
          <div className="absolute top-2 right-2 w-3 h-3 amongus-window rounded-sm"></div>
          <div className="absolute bottom-2 left-2 w-3 h-3 amongus-window rounded-sm"></div>
          <div className="absolute bottom-2 right-2 w-3 h-3 amongus-window rounded-sm"></div>
        </div>

        <div className="absolute top-32 right-24 w-32 h-24 amongus-building rounded-lg">
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"></div>
          <div className="absolute top-2 left-2 w-3 h-3 amongus-window rounded-sm"></div>
          <div className="absolute top-2 right-2 w-3 h-3 amongus-window rounded-sm"></div>
        </div>

        <div className="absolute bottom-32 left-32 w-36 h-28 amongus-building rounded-lg">
          <div className="w-full h-full bg-gradient-to-b from-gray-600 to-gray-700 rounded-lg"></div>
          <div className="absolute top-2 left-2 w-3 h-3 amongus-window rounded-sm"></div>
          <div className="absolute top-2 right-2 w-3 h-3 amongus-window rounded-sm"></div>
          <div className="absolute bottom-2 left-2 w-3 h-3 amongus-window rounded-sm"></div>
        </div>

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
          <h1 className="text-lg font-bold text-white">Create Agent</h1>
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
      <div className="relative z-10 max-w-2xl mx-auto">
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
              <div className="mb-2">{success}</div>
              <Link
                href="/dashboard"
                className="simcity-button px-3 py-1 text-xs bg-green-600 hover:bg-green-500 text-white inline-block"
              >
                View Dashboard
              </Link>
            </div>
          )}

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
                disabled={!isFormValid || isSubmitting}
                className={`amongus-button px-8 py-2 text-sm font-bold text-white border-2 border-blue-400 bg-gradient-to-b from-blue-600 to-blue-700 rounded-lg shadow-lg transition-all ${
                  !isFormValid || isSubmitting
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:from-blue-500 hover:to-blue-600 hover:shadow-xl"
                }`}
              >
                {isSubmitting ? "Creating Agent..." : "Create Agent"}
              </button>
            </div>
          </form>
        </div>

        {/* Info Panel */}
        <div className="amongus-panel p-4 mt-4">
          <h3 className="font-bold mb-2 text-blue-300">Instructions:</h3>
          <ul className="text-xs space-y-1 text-cyan-300">
            <li>• All fields marked with * are required</li>
            <li>• Choose a descriptive name for your agent</li>
            <li>• Select the most appropriate category</li>
            <li>• Python code should use uAgents framework</li>
            <li>• Your agent will be deployed to AgentVerse testnet</li>
            <li>• Make sure AGENTVERSE_API_TOKEN is set in your .env file</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
