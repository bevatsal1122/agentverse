import os
import requests
from datetime import datetime, timezone
from uuid import uuid4

from uagents import Agent, Context, Protocol
from uagents.experimental.quota import QuotaProtocol, RateLimit
from uagents_core.models import ErrorMessage
from uagents_core.storage import ExternalStorage

# Import chat protocol components
from uagents_core.contrib.protocols.chat import (
    chat_protocol_spec,
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    EndSessionContent,
    StartSessionContent,
    ResourceContent,
    Resource,
)

from models import ImageRequest, ImageResponse, generate_image

AGENT_SEED = os.getenv("AGENT_SEED", "image-generator-agent-seed-phrase-1")
AGENT_NAME = os.getenv("AGENT_NAME", "Image Generator Agent")
AGENTVERSE_API_KEY = "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NjE1NDMzNDksImlhdCI6MTc1ODk1MTM0OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiI5MDhmY2YwOGQyYzMzNGEwMWQ4NjRkMDAiLCJzY29wZSI6ImF2Iiwic3ViIjoiNTEwMTA1MWZjOTYzMWQ0ZDcwNTA3NThkZTgzZGU3MzJhY2RkZjQwNjNlNGI3MDM0In0.BQjD229j-SVRSByDoaWvQlt0VGlRUUOaTCklXbaBblyNsocBGdgPejizlgn0ObVHdwnHJRjAPKj7BsAODkgrmMevxy49FfmQRoJM_2DMY__Pk2RWH8-i_SqYUpB8V7FYjrGAZ1KkiLo1YJQbT7AGxHv8l8nqqU_-qi7gVqJrpSCMPmbh7G2MkxFErbfJTqJF3REaW-aXXO1iZilWWybdsp7NYiFXfqOdgZYhTwWYR1lEwMjxYjPR-iNkv8T1is2nKRZGxREZD21Cw36fgfbZzt9gjkQAOOc2xdPNJKssWGyTUY8hulc_xN3LSeC5OWqjNo26klOjDqT73iL78dBghA"
STORAGE_URL = os.getenv("AGENTVERSE_URL", "https://agentverse.ai") + "/v1/storage"

if AGENTVERSE_API_KEY is None:
    raise ValueError("You need to provide an AGENTVERSE_API_KEY.")

external_storage = ExternalStorage(api_token=AGENTVERSE_API_KEY, storage_url=STORAGE_URL)

PORT = 8000
agent = Agent(
    name=AGENT_NAME,
    seed=AGENT_SEED,
    port=PORT,
    mailbox=True,
)

# Create the chat protocol
chat_proto = Protocol(spec=chat_protocol_spec)

def create_text_chat(text: str) -> ChatMessage:
    return ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=text)],
    )

def create_end_session_chat() -> ChatMessage:
    return ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=[EndSessionContent(type="end-session")],
    )

def create_resource_chat(asset_id: str, uri: str) -> ChatMessage:
    return ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=[
            ResourceContent(
                type="resource",
                resource_id=asset_id,
                resource=Resource(
                    uri=uri,
                    metadata={
                        "mime_type": "image/png",
                        "role": "generated-image"
                    }
                )
            )
        ]
    )

# Chat protocol message handler
@chat_proto.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    # Send acknowledgement
    await ctx.send(
        sender,
        ChatAcknowledgement(
            timestamp=datetime.now(timezone.utc), 
            acknowledged_msg_id=msg.msg_id
        ),
    )

    # Process message content
    for item in msg.content:
        if isinstance(item, StartSessionContent):
            ctx.logger.info(f"Got a start session message from {sender}")
            continue
        elif isinstance(item, TextContent):
            ctx.logger.info(f"Got a message from {sender}: {item.text}")

            prompt = item.text
            try:
                image_url = generate_image(prompt)

                response = requests.get(image_url)
                if response.status_code == 200:
                    content_type = response.headers.get("Content-Type", "")
                    image_data = response.content 
                    
                    try:
                        asset_id = external_storage.create_asset(
                            name=str(ctx.session),
                            content=image_data,
                            mime_type=content_type
                        )
                        ctx.logger.info(f"Asset created with ID: {asset_id}")

                    except RuntimeError as err:
                        ctx.logger.error(f"Asset creation failed: {err}")

                    external_storage.set_permissions(asset_id=asset_id, agent_address=sender)
                    ctx.logger.info(f"Asset permissions set to: {sender}")

                    asset_uri = f"agent-storage://{external_storage.storage_url}/{asset_id}"
                    await ctx.send(sender, create_resource_chat(asset_id, asset_uri))

                else:
                    ctx.logger.error("Failed to download image")
                    await ctx.send(
                        sender,
                        create_text_chat(
                            "Sorry, I couldn't process your request. Please try again later."
                        ),
                    )
                    return

            except Exception as err:
                ctx.logger.error(err)
                await ctx.send(
                    sender,
                    create_text_chat(
                        "Sorry, I couldn't process your request. Please try again later."
                    ),
                )
                return

            await ctx.send(sender, create_end_session_chat())

        else:
            ctx.logger.info(f"Got unexpected content from {sender}")

# Chat protocol acknowledgement handler
@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info(f"Got an acknowledgement from {sender} for {msg.acknowledged_msg_id}")

# Optional: Rate limiting protocol for direct requests
proto = QuotaProtocol(
    storage_reference=agent.storage,
    name="Image-Generation-Protocol",
    version="0.1.0",
    default_rate_limit=RateLimit(window_size_minutes=60, max_requests=30),
)

# Optional: Direct request handler for structured requests
@proto.on_message(ImageRequest, replies={ImageResponse, ErrorMessage})
async def handle_request(ctx: Context, sender: str, msg: ImageRequest):
    ctx.logger.info("Received image generation request")
    try:
        image_url = generate_image(msg.image_description)
        ctx.logger.info("Successfully generated image")
        await ctx.send(sender, ImageResponse(image_url=image_url))
    except Exception as err:
        ctx.logger.error(err)
        await ctx.send(sender, ErrorMessage(error=str(err)))

# Register protocols
agent.include(chat_proto, publish_manifest=True)
agent.include(proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()