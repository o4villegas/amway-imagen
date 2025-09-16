/**
 * Database transaction manager for D1 with rollback support
 */

import { withTimeout, TIMEOUTS } from './timeout-utils';
import { safeLog } from './validation';

export interface TransactionContext {
  db: D1Database;
  transactionId: string;
  operations: TransactionOperation[];
  rollbackQueries: string[];
}

export interface TransactionOperation {
  id: string;
  query: string;
  params?: any[];
  rollbackQuery?: string;
  description: string;
}

export class TransactionManager {
  private static nextTransactionId = 1;

  /**
   * Creates a new transaction context
   */
  static async begin(db: D1Database): Promise<TransactionContext> {
    const transactionId = `txn_${Date.now()}_${this.nextTransactionId++}`;

    safeLog('Transaction started', { transactionId });

    return {
      db,
      transactionId,
      operations: [],
      rollbackQueries: []
    };
  }

  /**
   * Adds an operation to the transaction
   */
  static addOperation(
    context: TransactionContext,
    operation: Omit<TransactionOperation, 'id'>
  ): void {
    const operationId = `op_${context.operations.length + 1}`;

    context.operations.push({
      id: operationId,
      ...operation
    });

    // Add rollback query if provided
    if (operation.rollbackQuery) {
      context.rollbackQueries.unshift(operation.rollbackQuery);
    }

    safeLog('Transaction operation added', {
      transactionId: context.transactionId,
      operationId,
      description: operation.description
    });
  }

  /**
   * Executes all operations in the transaction
   */
  static async commit(context: TransactionContext): Promise<any[]> {
    const { db, transactionId, operations } = context;

    if (operations.length === 0) {
      safeLog('Empty transaction committed', { transactionId });
      return [];
    }

    try {
      // D1 doesn't support traditional transactions, so we implement manual rollback
      const results: any[] = [];
      const executedOperations: TransactionOperation[] = [];

      for (const operation of operations) {
        try {
          safeLog('Executing operation', {
            transactionId,
            operationId: operation.id,
            description: operation.description
          });

          const result = await withTimeout(
            operation.params
              ? db.prepare(operation.query).bind(...operation.params).run()
              : db.prepare(operation.query).run(),
            TIMEOUTS.DB_OPERATION,
            `Database operation: ${operation.description}`
          );

          results.push(result);
          executedOperations.push(operation);

          if (!result.success) {
            throw new Error(`Operation failed: ${operation.description}`);
          }

        } catch (operationError: any) {
          safeLog('Transaction operation failed', {
            transactionId,
            operationId: operation.id,
            error: operationError.message
          });

          // Attempt rollback of executed operations
          await this.rollback(context, executedOperations);
          throw new Error(`Transaction failed at operation ${operation.id}: ${operationError.message}`);
        }
      }

      safeLog('Transaction committed successfully', {
        transactionId,
        operationCount: operations.length
      });

      return results;

    } catch (error: any) {
      safeLog('Transaction commit failed', {
        transactionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Manually rolls back executed operations
   */
  static async rollback(
    context: TransactionContext,
    executedOperations?: TransactionOperation[]
  ): Promise<void> {
    const { db, transactionId, rollbackQueries } = context;
    const opsToRollback = executedOperations || context.operations;

    if (rollbackQueries.length === 0) {
      safeLog('No rollback operations available', { transactionId });
      return;
    }

    safeLog('Starting transaction rollback', {
      transactionId,
      rollbackCount: rollbackQueries.length
    });

    for (const rollbackQuery of rollbackQueries) {
      try {
        await withTimeout(
          db.prepare(rollbackQuery).run(),
          TIMEOUTS.DB_OPERATION,
          'Rollback operation'
        );
      } catch (rollbackError: any) {
        // Log rollback errors but don't throw - we're already in error state
        safeLog('Rollback operation failed', {
          transactionId,
          error: rollbackError.message,
          query: rollbackQuery
        });
      }
    }

    safeLog('Transaction rollback completed', { transactionId });
  }

  /**
   * Convenience method for executing a simple transaction
   */
  static async execute<T>(
    db: D1Database,
    transactionFn: (context: TransactionContext) => Promise<T>
  ): Promise<T> {
    const context = await this.begin(db);

    try {
      const result = await transactionFn(context);
      await this.commit(context);
      return result;
    } catch (error) {
      await this.rollback(context);
      throw error;
    }
  }
}

/**
 * Specific transaction helpers for common operations
 */
export class CampaignTransactionHelpers {
  /**
   * Creates a campaign with all associated data in a transaction
   */
  static async createCampaignWithImages(
    db: D1Database,
    campaignData: any,
    imageData: any[]
  ): Promise<{ campaignId: number; imageIds: number[] }> {
    return TransactionManager.execute(db, async (context) => {
      // Create campaign
      TransactionManager.addOperation(context, {
        query: `INSERT INTO campaigns (
          product_id, campaign_type, brand_style, color_scheme,
          text_overlay, campaign_size, image_formats, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          campaignData.product_id,
          campaignData.campaign_type,
          campaignData.brand_style,
          campaignData.color_scheme,
          campaignData.text_overlay,
          campaignData.campaign_size,
          JSON.stringify(campaignData.image_formats),
          campaignData.status,
          new Date().toISOString()
        ],
        description: 'Create campaign record'
      });

      // Execute to get campaign ID
      const results = await TransactionManager.commit(context);
      const campaignResult = results[0];

      if (!campaignResult.meta?.last_row_id) {
        throw new Error('Failed to get campaign ID');
      }

      const campaignId = campaignResult.meta.last_row_id;

      // Create new transaction context for images
      const imageContext = await TransactionManager.begin(db);

      // Add rollback for campaign
      TransactionManager.addOperation(imageContext, {
        query: 'DELETE FROM campaigns WHERE id = ?',
        params: [campaignId],
        rollbackQuery: `DELETE FROM campaigns WHERE id = ${campaignId}`,
        description: 'Rollback campaign creation'
      });

      const imageIds: number[] = [];

      // Add image operations
      for (const image of imageData) {
        TransactionManager.addOperation(imageContext, {
          query: `INSERT INTO generated_images (
            campaign_id, format, prompt, file_path, r2_path,
            width, height, selected, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [
            campaignId,
            image.format,
            image.prompt,
            image.file_path,
            image.r2_path,
            image.width,
            image.height,
            image.selected,
            new Date().toISOString()
          ],
          description: `Create image record for ${image.format}`
        });
      }

      const imageResults = await TransactionManager.commit(imageContext);

      imageResults.forEach(result => {
        if (result.meta?.last_row_id) {
          imageIds.push(result.meta.last_row_id);
        }
      });

      return { campaignId, imageIds };
    });
  }

  /**
   * Updates campaign status with stats in a transaction
   */
  static async updateCampaignComplete(
    db: D1Database,
    campaignId: number,
    downloadUrl: string,
    expiresAt: string,
    totalImages: number,
    generationTime: number
  ): Promise<void> {
    return TransactionManager.execute(db, async (context) => {
      // Update campaign status
      TransactionManager.addOperation(context, {
        query: `UPDATE campaigns
                SET status = ?, download_url = ?, expires_at = ?, updated_at = ?
                WHERE id = ?`,
        params: ['completed', downloadUrl, expiresAt, new Date().toISOString(), campaignId],
        description: 'Update campaign to completed status'
      });

      // Update stats
      TransactionManager.addOperation(context, {
        query: `INSERT INTO campaign_stats (
          successful, total_images, generation_time_seconds, created_at
        ) VALUES (?, ?, ?, ?)`,
        params: [true, totalImages, generationTime, new Date().toISOString()],
        description: 'Record campaign statistics'
      });

      return;
    });
  }
}