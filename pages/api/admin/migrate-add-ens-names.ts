import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Starting ENS name migration for existing agents...');

    // First, get all agents that don't have ENS names
    const { data: agents, error: fetchError } = await supabase
      .from('agents')
      .select('id, name, ens')
      .is('ens', null);

    if (fetchError) {
      console.error('❌ Error fetching agents:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to fetch agents',
        details: fetchError.message
      });
    }

    if (!agents || agents.length === 0) {
      console.log('✅ No agents need ENS name migration');
      return res.status(200).json({
        success: true,
        message: 'No agents need ENS name migration - all agents already have ENS names',
        updatedCount: 0
      });
    }

    console.log(`📋 Found ${agents.length} agents that need ENS names`);

    // Update each agent with an ENS name
    let updatedCount = 0;
    const errors: string[] = [];

    for (const agent of agents) {
      try {
        // Generate ENS name from agent name
        const ensPreFix = agent.name.toLowerCase().replace(/ /g, "-");
        const ensName = `${ensPreFix}.agenticverse.eth`;

        console.log(`🔄 Updating agent ${agent.name} with ENS: ${ensName}`);

        const { error: updateError } = await supabase
          .from('agents')
          .update({ ens: ensName })
          .eq('id', agent.id);

        if (updateError) {
          console.error(`❌ Error updating agent ${agent.name}:`, updateError);
          errors.push(`Failed to update ${agent.name}: ${updateError.message}`);
        } else {
          updatedCount++;
          console.log(`✅ Successfully updated agent ${agent.name} with ENS: ${ensName}`);
        }
      } catch (error) {
        console.error(`❌ Error processing agent ${agent.name}:`, error);
        errors.push(`Failed to process ${agent.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`🎉 ENS name migration completed. Updated ${updatedCount} agents.`);

    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} errors occurred during migration:`, errors);
    }

    res.status(200).json({
      success: true,
      message: `Successfully migrated ENS names for ${updatedCount} agents`,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Error during ENS name migration:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
