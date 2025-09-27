import os
from uagents import Model
from openai import OpenAI, OpenAIError

OPENAI_API_KEY = "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"

if OPENAI_API_KEY is None:
    raise ValueError("You need to provide an OpenAI API Key.")

client = OpenAI(api_key=OPENAI_API_KEY)

class ImageRequest(Model):
    image_description: str

class ImageResponse(Model):
    image_url: str

def generate_image(prompt: str) -> str:
    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
        )
    except OpenAIError as e:
        return f"An error occurred: {e}"
    return response.data[0].url