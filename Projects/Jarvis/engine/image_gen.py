import requests
import io
from PIL import Image

API_URL = "https://api-inference.huggingface.co/models/OEvortex/HelpingAI-PixelCraft"
headers = {"Authorization": "Bearer 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"}

def query(payload):
    response = requests.post(API_URL, headers=headers, json=payload)
    return response.content

image_bytes = query({
    "inputs": "modi ji sitting on top of a leopard ",
})

# Check the content and type of image_bytes
print(type(image_bytes))
print(image_bytes[:10])  # Print first 10 bytes of image data to check its format

# Try opening the image with PIL
try:
    image = Image.open(io.BytesIO(image_bytes))
    image.show()

    # Save the image
    with open("output.jpg", "wb") as f:
        f.write(image_bytes)
except Exception as e:
    print("Error:", e)
