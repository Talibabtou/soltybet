import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.exceptions import DenyConnection

logger = logging.getLogger(__name__)

current_state = {
    "message": "",
    "redFighter": "",
    "blueFighter": "",
    "m_id": "",
    "total_red": "",
    "total_blue": ""
}

class PhaseConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("phase_group", self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps(current_state))

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard("phase_group", self.channel_name)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get("type")
            if message_type == "phase":
                message_text = data.get("text", "")
                red_fighter = data.get("redFighter", "")
                blue_fighter = data.get("blueFighter", "")
                m_id = data.get("m_id", "")
                total_red = data.get("total_red", "")
                total_blue = data.get("total_blue", "")
                global current_state
                current_state = {
                    "message": message_text,
                    "redFighter": red_fighter,
                    "blueFighter": blue_fighter,
                    "m_id": m_id,
                    "total_red": total_red,
                    "total_blue": total_blue
                }

                await self.channel_layer.group_send(
                    "phase_group",
                    {
                        "type": "phase_message",
                        "message": message_text,
                        "redFighter": red_fighter,
                        "blueFighter": blue_fighter,
                        "m_id": m_id,
                        "total_red": total_red,
                        "total_blue": total_blue
                    }
                )
            elif message_type == "info":
                info_text = data.get("text", "")
                m_id = data.get("m_id", "")
                
                await self.channel_layer.group_send(
                    "phase_group",
                    {
                        "type": "info_message",
                        "text": info_text,
                        "m_id": m_id
                    }
                )
        except Exception as e:
            logger.error(f"Unexpected error: {e}")

    async def phase_message(self, event):
        try:
            message = event["message"]
            red_fighter = event["redFighter"]
            blue_fighter = event["blueFighter"]
            m_id = event["m_id"]
            total_red = event["total_red"]
            total_blue = event["total_blue"]

            await self.send(text_data=json.dumps({
                "message": message,
                "redFighter": red_fighter,
                "blueFighter": blue_fighter,
                "m_id": m_id,
                "total_red": total_red,
                "total_blue": total_blue
            }))
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
    
    async def info_message(self, event):
        try:
            info_text = event["text"]
            m_id = event["m_id"]

            await self.send(text_data=json.dumps({
                "type": "info",
                "text": info_text,
                "m_id": m_id
            }))
        except Exception as e:
            logger.error(f"Unexpected error: {e}")