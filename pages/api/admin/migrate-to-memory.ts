import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { confirm } = req.body;
    
    if (confirm !== 'MIGRATE_TO_MEMORY') {
      return res.status(400).json({ 
        error: 'Missing confirmation. Send { "confirm": "MIGRATE_TO_MEMORY" } to proceed.' 
      });
    }

    console.log('Starting migration to in-memory storage...');
    
    const migrationSteps = [];
    
    // Step 1: Check if tables exist and get row counts
    const tablesToDrop = ['agent_communications', 'agent_actions', 'tasks', 'tokens', 'cities', 'buildings'];
    const tableInfo: Record<string, number> = {};
    
    for (const table of tablesToDrop) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          tableInfo[table] = count || 0;
        } else {
          tableInfo[table] = -1; // Table doesn't exist
        }
      } catch (e) {
        tableInfo[table] = -1; // Table doesn't exist
      }
    }
    
    migrationSteps.push({
      step: 'table_analysis',
      data: tableInfo
    });

    // Step 2: Drop unused tables (this will remove all logs and temporary data)
    const dropResults = [];
    
    for (const table of tablesToDrop) {
      if (tableInfo[table] >= 0) { // Table exists
        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: `DROP TABLE IF EXISTS ${table} CASCADE;`
          });
          
          if (error) {
            // Try alternative approach
            const { error: altError } = await supabase
              .from(table)
              .delete()
              .neq('id', ''); // Delete all rows
            
            if (altError) {
              dropResults.push({
                table,
                status: 'error',
                message: `Could not drop table: ${error.message}`
              });
            } else {
              dropResults.push({
                table,
                status: 'cleared',
                message: 'Table cleared (could not drop, but emptied)'
              });
            }
          } else {
            dropResults.push({
              table,
              status: 'dropped',
              message: 'Table successfully dropped'
            });
          }
        } catch (e) {
          dropResults.push({
            table,
            status: 'error',
            message: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`
          });
        }
      } else {
        dropResults.push({
          table,
          status: 'not_found',
          message: 'Table did not exist'
        });
      }
    }
    
    migrationSteps.push({
      step: 'drop_tables',
      data: dropResults
    });

    // Step 3: Verify essential tables still exist
    const essentialTables = ['agents', 'tasks'];
    const essentialTableStatus = [];
    
    for (const table of essentialTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        essentialTableStatus.push({
          table,
          status: error ? 'error' : 'exists',
          count: count || 0,
          message: error ? error.message : 'Table is healthy'
        });
      } catch (e) {
        essentialTableStatus.push({
          table,
          status: 'error',
          count: 0,
          message: e instanceof Error ? e.message : 'Unknown error'
        });
      }
    }
    
    migrationSteps.push({
      step: 'verify_essential_tables',
      data: essentialTableStatus
    });

    const success = dropResults.every(r => r.status !== 'error') && 
                   essentialTableStatus.every(t => t.status !== 'error');

    return res.status(200).json({
      success,
      message: success 
        ? 'Migration completed successfully. All logs and temporary data are now stored in memory only.'
        : 'Migration completed with some warnings. Check the details.',
      migrationSteps,
      summary: {
        tablesDropped: dropResults.filter(r => r.status === 'dropped').length,
        tablesCleared: dropResults.filter(r => r.status === 'cleared').length,
        errors: dropResults.filter(r => r.status === 'error').length,
        essentialTablesHealthy: essentialTableStatus.filter(t => t.status === 'exists').length
      }
    });
  } catch (error) {
    console.error('Error during migration:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
