import { Module } from '@nestjs/common';
import { RoomGateway } from './room.gateway';
import { RoomStateService } from './room-state.service';

@Module({
  providers: [RoomGateway, RoomStateService],
  exports: [RoomStateService],
})
export class ApiRoomModule {}
