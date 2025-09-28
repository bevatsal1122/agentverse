import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { RandomAvatar } from "react-random-avatars";

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: Date;
}

// Dummy chat data for testing
const DUMMY_CHATS: { [agentId: string]: any[] } = {
  agent1qvswlr5z7reu5m5rz7cq6jxuxad3x599zxskmryxvl6yw9sqal7xgz5ze5y: [
    {
      id: "1",
      text: "Hello! I'm raghavvvvvvvvvvv. How can I help you today?",
      sender: "agent",
      timestamp: "2024-09-27T18:12:00Z",
    },
    {
      id: "2",
      text: "What can you do?",
      sender: "user",
      timestamp: "2024-09-27T18:13:00Z",
    },
    {
      id: "3",
      text: "I can help with DeFi operations, smart contract interactions, and blockchain transactions. What specific task would you like assistance with?",
      sender: "agent",
      timestamp: "2024-09-27T18:13:30Z",
    },
  ],
  agent2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz: [
    {
      id: "1",
      text: "Welcome! I'm TradingBot Pro, your advanced DeFi trading assistant.",
      sender: "agent",
      timestamp: "2024-09-27T10:45:00Z",
    },
    {
      id: "2",
      text: "Can you help me with yield farming strategies?",
      sender: "user",
      timestamp: "2024-09-27T10:46:00Z",
    },
    {
      id: "3",
      text: "Absolutely! I can analyze current yield farming opportunities, calculate APRs, and suggest optimal strategies based on risk tolerance. Which protocols are you interested in?",
      sender: "agent",
      timestamp: "2024-09-27T10:46:30Z",
    },
  ],
  agent3xyz789uvw456rst123qpo098nml654kji321hgf098edc765ba: [
    {
      id: "1",
      text: "Hi! I'm NFT Collector, specialized in NFT discovery and collection strategies.",
      sender: "agent",
      timestamp: "2024-09-26T14:20:00Z",
    },
    {
      id: "2",
      text: "What's the best NFT collection to invest in?",
      sender: "user",
      timestamp: "2024-09-26T14:21:00Z",
    },
    {
      id: "3",
      text: "I analyze market trends, floor prices, and community sentiment to identify promising collections. Currently, I'm tracking several undervalued projects with strong fundamentals.",
      sender: "agent",
      timestamp: "2024-09-26T14:21:30Z",
    },
  ],
  agent4mno321pqr654stu987vwx210yz543abc876def109ghi432jkl: [
    {
      id: "1",
      text: "Hello! I'm Social Media Manager, ready to help with your online presence.",
      sender: "agent",
      timestamp: "2024-09-27T12:00:00Z",
    },
    {
      id: "2",
      text: "How can you help with social media?",
      sender: "user",
      timestamp: "2024-09-27T12:01:00Z",
    },
    {
      id: "3",
      text: "I can create engaging content, manage posting schedules, analyze engagement metrics, and help grow your community across multiple platforms.",
      sender: "agent",
      timestamp: "2024-09-27T12:01:30Z",
    },
  ],
};

export default function Chat() {
  const router = useRouter();
  const { agentId, agentName } = router.query;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentData, setAgentData] = useState<any>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate a unique task ID when component mounts
  useEffect(() => {
    if (agentId && !currentTaskId) {
      const newTaskId = Date.now().toString(); // Simple integer ID
      setCurrentTaskId(newTaskId);
    }
  }, [agentId, currentTaskId]);

  // Function to fetch responses for the current task
  const fetchResponses = async () => {
    if (!currentTaskId) return;
    console.log('🔄 Fetching responses for task:', currentTaskId);
    try {
      const response = await fetch(`/api/communications/get-responses?taskId=${currentTaskId}`);
      const data = await response.json();

      if (response.ok && data.success && data.content) {
        // Check if we already have this content to avoid duplicates
        const existingContent = messages.some(msg => msg.text === data.content);
        
        if (!existingContent) {
          const newMessage: Message = {
            id: Date.now().toString(),
            text: data.content,
            sender: "agent" as const,
            timestamp: new Date()
          };

          setMessages(prev => [...prev, newMessage]);
          setIsLoading(false);
          setIsPolling(false);
          console.log('📨 New response received and displayed');
        }
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  // Start polling when waiting for responses
  useEffect(() => {
    if (isPolling && currentTaskId) {
      console.log('🔄 Starting polling for task:', currentTaskId);
      
      // Poll immediately
      fetchResponses();
      
      // Then poll every 1 second
      pollingIntervalRef.current = setInterval(fetchResponses, 1000);
    } else {
      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log('⏹️ Stopped polling');
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isPolling, currentTaskId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const fetchAgentData = async () => {
    if (!agentId) return;
    
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      
      if (response.ok && data.agents) {
        const agent = data.agents.find((a: any) => a.id === agentId);
        if (agent) {
          setAgentData(agent);
        }
      }
    } catch (error) {
      console.error('Error fetching agent data:', error);
    }
  };

  useEffect(() => {
    // Load dummy chat data when component mounts
    if (agentId && agentName) {
      const agentIdStr = agentId.toString();
      const dummyChats = DUMMY_CHATS[agentIdStr] || [];

      // Convert dummy data to Message format
      const formattedMessages: Message[] = dummyChats.map((chat: any) => ({
        id: chat.id,
        text: chat.text,
        sender: chat.sender as "user" | "agent",
        timestamp: new Date(chat.timestamp),
      }));

      setMessages(formattedMessages);
      
      // Fetch agent data for ENS link
      fetchAgentData();
    }
  }, [agentId, agentName]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || !currentTaskId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = inputText;
    setInputText("");
    setIsLoading(true);
    setIsPolling(true);

    try {
      // Check if the message is a task assignment (contains keywords like "task", "assign", "work", etc.)
      const isTaskAssignment = /task|assign|work|do|help|create|build|research|analyze|develop|plan|make|find|get|organize|prepare|design|write|code|program|fix|solve|check|review|study|learn|teach|explain|show|tell|guide|assist|support|manage|handle|process|generate|produce|deliver|complete|finish|implement|execute|perform|carry|out/i.test(messageText);
      
      console.log('🔍 Message:', messageText);
      console.log('🔍 Is task assignment:', isTaskAssignment);
      console.log('🔍 Agent ID:', agentId);
      console.log('🔍 Frontend Task ID:', currentTaskId);
      
      // Always try to assign as task if we have an agent ID (for testing purposes)
      if (agentId) {
        // This is a task assignment - call the user-assigned task API
        const response = await fetch('/api/tasks/assign-user-task', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: '2', // Default user ID
            taskDescription: messageText,
            targetAgentId: Array.isArray(agentId) ? agentId[0] : agentId,
            taskId: currentTaskId // Include task ID for response tracking
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('🔍 API Response:', data);

        if (data.success) {
          // Don't add immediate response - wait for backend to call response endpoint
          console.log('🎯 Task assigned, polling for agent response...');
        } else {
          // Show error immediately since no agent response is expected
          const agentResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: `❌ Sorry, I couldn't create the task. ${data.error || 'An error occurred while processing your request.'}`,
            sender: "agent",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, agentResponse]);
          setIsLoading(false);
          setIsPolling(false);
        }
      } else {
        // Regular chat message - simulate agent response
        const agentResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: `I understand you said: "${messageText}". This is a simulated response from the agent. In a real implementation, this would connect to the actual agent's API.`,
          sender: "agent",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentResponse]);
        setIsLoading(false);
        setIsPolling(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: `❌ Sorry, there was an error processing your message. Please try again.`,
        sender: "agent",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentResponse]);
      setIsLoading(false);
      setIsPolling(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!agentId || !agentName) {
    return (
      <div className="h-screen amongus-grid overflow-hidden relative">
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="amongus-panel p-8 text-center">
            <div className="text-xl font-bold text-white mb-4">
              Agent Not Found
            </div>
            <div className="text-blue-300 mb-6">
              Please select an agent from the dashboard
            </div>
            <Link
              href="/dashboard"
              className="amongus-button px-6 py-3 text-lg"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen amongus-grid overflow-hidden relative chat-screen">
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

      {/* Main Chat Interface */}
      <div className="relative z-10 flex flex-col h-full p-4">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 amongus-panel p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-3">
                <RandomAvatar name={Array.isArray(agentName) ? agentName[0] : agentName} size={40} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  Chat with {agentName}
                </h1>
                <p className="text-sm text-blue-300">
                  Agent ID: {(Array.isArray(agentId) ? agentId[0] : agentId).slice(0, 8)}...
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchResponses}
                className="amongus-button px-4 py-2 text-sm bg-green-600 hover:bg-green-500"
                title="Check for new responses"
              >
                🔄 Refresh
              </button>
              {agentData?.ens && (
                <a
                  href={`https://sepolia.app.ens.domains/${agentData.ens}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="amongus-button px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500"
                  title="View on ENS"
                >
                  🔗 ENS
                </a>
              )}
              <Link
                href="/dashboard"
                className="amongus-button px-4 py-2 text-sm"
              >
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="amongus-panel flex-1 flex flex-col mb-4 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.sender === "agent" && (
                  <div className="flex-shrink-0 mr-2">
                    <RandomAvatar name={Array.isArray(agentName) ? agentName[0] : agentName} size={24} />
                  </div>
                )}
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-100"
                  }`}
                >
                  <div className="text-sm">{message.text}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
                {message.sender === "user" && (
                  <div className="flex-shrink-0 ml-2">
                    <RandomAvatar name="User" size={24} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex-shrink-0 mr-2">
                  <RandomAvatar name={Array.isArray(agentName) ? agentName[0] : agentName} size={24} />
                </div>
                <div className="bg-gray-700 text-gray-100 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <span className="text-xs ml-2">
                      {isPolling ? "Polling for agent response..." : "Waiting for agent response..."}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="amongus-panel p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message or assign a task (e.g., 'research DeFi protocols', 'build a trading strategy')..."
              className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="amongus-button px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
