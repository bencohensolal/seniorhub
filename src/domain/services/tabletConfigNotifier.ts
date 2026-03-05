import type { FastifyReply } from 'fastify';

/**
 * Manages Server-Sent Events (SSE) connections for tablet configuration updates
 * Allows tablets to receive real-time notifications when their config changes
 */
export class TabletConfigNotifier {
  private connections: Map<string, FastifyReply> = new Map();

  /**
   * Register a tablet for config update notifications
   * @param tabletId - The tablet ID
   * @param reply - Fastify reply object for SSE
   */
  registerTablet(tabletId: string, reply: FastifyReply): void {
    // Close any existing connection for this tablet
    this.unregisterTablet(tabletId);

    // Store the new connection
    this.connections.set(tabletId, reply);

    console.log(`[TabletConfigNotifier] Tablet ${tabletId} registered for config updates (${this.connections.size} active)`);

    // Send initial connection confirmation
    this.sendEvent(reply, 'connected', {
      message: 'Connected to config update stream',
      tabletId: tabletId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unregister a tablet from config updates
   * @param tabletId - The tablet ID
   */
  unregisterTablet(tabletId: string): void {
    const reply = this.connections.get(tabletId);
    if (reply) {
      try {
        if (!reply.sent) {
          reply.raw.end();
        }
      } catch (error) {
        console.error(`[TabletConfigNotifier] Error closing connection for ${tabletId}:`, error);
      }
      this.connections.delete(tabletId);
      console.log(`[TabletConfigNotifier] Tablet ${tabletId} unregistered (${this.connections.size} active)`);
    }
  }

  /**
   * Notify a specific tablet that its config has been updated
   * @param tabletId - The tablet ID
   * @param config - The updated configuration
   */
  notifyConfigUpdate(tabletId: string, config: { lastUpdated?: string }): void {
    const reply = this.connections.get(tabletId);
    
    if (reply) {
      console.info(`[TabletConfigNotifier] Notifying tablet ${tabletId} of config update`);
      
      this.sendEvent(reply, 'config-updated', {
        tabletId: tabletId,
        timestamp: new Date().toISOString(),
        lastUpdated: config.lastUpdated,
      });
    } else {
      console.info(`[TabletConfigNotifier] Tablet ${tabletId} not connected, skipping notification`);
    }
  }

  /**
   * Send an SSE event to a client in standard SSE format
   * @param reply - Fastify reply object
   * @param eventType - Event type (connected, config-updated, heartbeat)
   * @param data - Event data to send
   */
  private sendEvent(reply: FastifyReply, eventType: string, data: Record<string, unknown>): void {
    try {
      if (!reply.sent) {
        // Standard SSE format with event type prefix
        const sseMessage = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        reply.raw.write(sseMessage);
      }
    } catch (error) {
      console.error('[TabletConfigNotifier] Error sending event:', error);
    }
  }

  /**
   * Send a heartbeat to all connected tablets
   * Helps detect dead connections
   */
  sendHeartbeat(): void {
    const deadConnections: string[] = [];

    for (const [tabletId, reply] of this.connections.entries()) {
      try {
        if (!reply.sent && !reply.raw.destroyed) {
          this.sendEvent(reply, 'heartbeat', {
            timestamp: new Date().toISOString(),
          });
        } else {
          deadConnections.push(tabletId);
        }
      } catch (error) {
        console.error(`[TabletConfigNotifier] Heartbeat failed for ${tabletId}:`, error);
        deadConnections.push(tabletId);
      }
    }

    // Clean up dead connections
    for (const tabletId of deadConnections) {
      this.unregisterTablet(tabletId);
    }
  }

  /**
   * Get count of active connections
   */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Check if a tablet is currently connected
   */
  isTabletConnected(tabletId: string): boolean {
    return this.connections.has(tabletId);
  }
}

// Singleton instance
export const tabletConfigNotifier = new TabletConfigNotifier();

// Start heartbeat interval (every 30 seconds)
setInterval(() => {
  tabletConfigNotifier.sendHeartbeat();
}, 30000);
