# scratch/process_logo.py
import os
from PIL import Image, ImageChops

def process_image():
    img_path = "public/logo.png"
    if not os.path.exists(img_path):
        print(f"Error: {img_path} does not exist.")
        return

    # Open image
    img = Image.open(img_path).convert("RGBA")
    width, height = img.size

    # 1. First, let's create the full logos (emblem + text) with transparent background
    full_light = Image.new("RGBA", (width, height))
    full_dark = Image.new("RGBA", (width, height))

    pixels_light = []
    pixels_dark = []

    # The text is in the lower 35% of the image height
    text_y_threshold = int(height * 0.65)

    for y in range(height):
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))

            # Detect white background (using a threshold of 200 to capture off-whites/compression noise)
            if r > 200 and g > 200 and b > 200:
                pixels_light.append((255, 255, 255, 0))
                pixels_dark.append((255, 255, 255, 0))
            else:
                if y >= text_y_threshold:
                    # Text area: black text -> white in dark mode
                    if r < 100 and g < 100 and b < 100:
                        pixels_light.append((r, g, b, 255))
                        pixels_dark.append((240, 243, 255, 255))
                    else:
                        pixels_light.append((r, g, b, 255))
                        pixels_dark.append((r, g, b, 255))
                else:
                    # Emblem area: black parts of the T -> light/white in dark mode
                    if r < 50 and g < 50 and b < 50:
                        pixels_light.append((r, g, b, 255))
                        pixels_dark.append((220, 225, 255, 255))
                    else:
                        pixels_light.append((r, g, b, 255))
                        pixels_dark.append((r, g, b, 255))

    full_light.putdata(pixels_light)
    full_dark.putdata(pixels_dark)

    full_light.save("public/logo-light.png", "PNG")
    full_dark.save("public/logo-dark.png", "PNG")

    # 2. Now let's crop the emblem (including the star!) and create the icons
    # Find bounding box of emblem by looking at non-white pixels in the upper 65% of the image
    emblem_mask = Image.new("L", (width, height), 0)
    for y in range(text_y_threshold):
        for x in range(width):
            r, g, b, a = full_light.getpixel((x, y))
            if a > 0:
                emblem_mask.putpixel((x, y), 255)

    bbox = emblem_mask.getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        
        # Crop emblem from full_light and full_dark
        emblem_light = full_light.crop(bbox)
        emblem_dark = full_dark.crop(bbox)

        # Make it a perfect square centered on the emblem
        ew = x1 - x0
        eh = y1 - y0
        size = max(ew, eh) + 10 # add small padding so star is not right on the edge

        square_light = Image.new("RGBA", (size, size), (255, 255, 255, 0))
        square_dark = Image.new("RGBA", (size, size), (255, 255, 255, 0))

        # Paste centered
        px = (size - ew) // 2
        py = (size - eh) // 2
        square_light.paste(emblem_light, (px, py), emblem_light)
        square_dark.paste(emblem_dark, (px, py), emblem_dark)

        square_light.save("public/logo-icon-light.png", "PNG")
        square_dark.save("public/logo-icon-dark.png", "PNG")
        print("Successfully generated full and icon versions of the logo.")
    else:
        print("Error: Could not determine emblem bounding box.")

if __name__ == "__main__":
    process_image()
