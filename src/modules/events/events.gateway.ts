import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this based on your frontend URL in production
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  /**
   * Handle client connection
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Allow clients to join a center-specific room
   * @param centerId - Center ID to join
   * @param client - Socket client
   */
  @SubscribeMessage('joinCenterRoom')
  handleJoinCenterRoom(
    @MessageBody() data: { centerId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `center_${data.centerId}`;
    client.join(roomName);
    this.logger.log(`Client ${client.id} joined room: ${roomName}`);
    return { success: true, room: roomName };
  }

  /**
   * Allow clients to leave a center-specific room
   * @param centerId - Center ID to leave
   * @param client - Socket client
   */
  @SubscribeMessage('leaveCenterRoom')
  handleLeaveCenterRoom(
    @MessageBody() data: { centerId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `center_${data.centerId}`;
    client.leave(roomName);
    this.logger.log(`Client ${client.id} left room: ${roomName}`);
    return { success: true, room: roomName };
  }

  /**
   * Emit event to all clients in a center room
   * @param centerId - Center ID
   * @param event - Event name
   * @param payload - Event data
   */
  emitToCenter(centerId: number, event: string, payload: any) {
    const roomName = `center_${centerId}`;
    this.server.to(roomName).emit(event, payload);
    this.logger.log(
      `Emitted ${event} to room ${roomName}: ${JSON.stringify(payload)}`,
    );
  }

  /**
   * Emit GROUP_CONNECTED event
   * @param centerId - Center ID
   * @param groupId - Group ID
   * @param joinLink - Generated join link
   * @param telegramGroupId - Telegram group chat ID
   */
  emitGroupConnected(
    centerId: number,
    groupId: number,
    joinLink: string,
    telegramGroupId: string,
  ) {
    this.emitToCenter(centerId, 'GROUP_CONNECTED', {
      groupId,
      joinLink,
      telegramGroupId,
      timestamp: new Date().toISOString(),
    });
  }
}
