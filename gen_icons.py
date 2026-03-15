import json

def generate_icons():
    from PIL import Image, ImageDraw, ImageFont
    for size in [192, 512]:
        img = Image.new('RGB', (size, size), color=(0, 0, 0))
        d = ImageDraw.Draw(img)
        # Draw a neon green circle
        d.ellipse([size*0.1, size*0.1, size*0.9, size*0.9], outline=(0, 255, 0), width=int(size*0.05))
        # Text
        try:
            # try to load a font
            fnt = ImageFont.truetype("arial.ttf", int(size*0.2))
        except:
            fnt = ImageFont.load_default()
        d.text((size/2, size/2), "ATMOS", fill=(0, 255, 0), anchor="mm", font=fnt)
        img.save(f"C:/Users/ecosm/.gemini/antigravity/scratch/atmos-pwa/icon-{size}.png")

if __name__ == "__main__":
    generate_icons()
