"""Script optionnel: supprime le fond blanc (nécessite Pillow)."""
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pip install Pillow d'abord: pip install Pillow")
    sys.exit(1)

def remove_white_background(input_path: str, output_path: str, threshold: int = 240):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    new_data = []
    for item in data:
        r, g, b, a = item
        # Blanc ou presque blanc -> transparent
        if r >= threshold and g >= threshold and b >= threshold:
            new_data.append((255, 255, 255, 0))
        # Rouge vif (bordure) -> transparent
        elif r > 200 and g < 100 and b < 100:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Sauvegardé: {output_path}")

if __name__ == "__main__":
    src = Path(__file__).parent.parent / "assets" / "c__Users_missi_AppData_Roaming_Cursor_User_workspaceStorage_ec03d43a7eeda45aa529645d490fe245_images_image-a6cb9ea1-3b46-4df4-8bca-f3b56e0aa2b8.png"
    dst = Path(__file__).parent.parent / "landing" / "images" / "hero-app-mockup.png"
    if not src.exists():
        # Utiliser l'image actuelle si la source n'existe pas
        src = dst
        dst = Path(__file__).parent.parent / "landing" / "images" / "hero-app-mockup-clean.png"
    if src.exists():
        remove_white_background(str(src), str(dst), threshold=235)
    else:
        print(f"Fichier source introuvable: {src}")
