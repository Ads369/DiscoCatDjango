# Real-time Updates (WebSocket support with Channels)
# class RankingConsumer(WebsocketConsumer):
#     def connect(self):
#         self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
#         self.user = self.scope["user"]

#         if not self.user.rooms.filter(id=self.room_id).exists():
#             self.close()
#             return

#         async_to_sync(self.channel_layer.group_add)(
#             f"room_{self.room_id}", self.channel_name
#         )
#         self.accept()

#     def receive(self, text_data):
#         data = json.loads(text_data)
#         # Handle ranking updates and broadcast to group
