import type { NextApiRequest, NextApiResponse } from 'next';

// Test endpoint to simulate an agent sending a response
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { taskId, testMessage } = req.body;

    if (!taskId) {
      return res.status(400).json({ 
        error: 'taskId is required' 
      });
    }

    // Simulate agent processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Send the response to the task
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/communications/webhook-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: taskId,
        response: testMessage || `Hello! I've received your message and I'm working on it. This is a test response for task ${taskId}.`
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send response: ${response.statusText}`);
    }

    const result = await response.json();

    res.status(200).json({ 
      success: true, 
      message: 'Test response sent successfully',
      response: result
    });
  } catch (error) {
    console.error('Error sending test response:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
