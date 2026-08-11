import os
import sys
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

# Source and target directories
SOURCE_ROOT = Path("/Users/rahmanshafiee/Downloads/OneDrive_Photos_Sorted/Website_Best_Candidates")
TARGET_DIR = Path("/Users/rahmanshafiee/Downloads/CASA/public/media/casa")

# Configuration for each image
# Each config has:
# - source: filename in SOURCE_ROOT or its subdirectories
# - output: target filename in TARGET_DIR
# - crop: optional tuple (left, top, right, bottom)
# - brightness: factor (default 1.0)
# - contrast: factor (default 1.0)
# - color: factor (saturation/vibrancy, default 1.0)
# - red/green/blue: channel balance multipliers (default 1.0)
# - autocontrast_cutoff: cutoff percent for hist stretch (default 0.5)
CONFIGS = [
    {
        "source": "14147_068.jpg",
        "output": "classroom-community-table.jpg",
        "brightness": 1.08,
        "contrast": 1.10,
        "color": 1.25,
        "blue": 1.04,
        "red": 0.98,
        "green": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "15024_672.jpg",
        "output": "course-classroom-wide.jpg",
        "brightness": 1.08,
        "contrast": 1.10,
        "color": 1.25,
        "blue": 1.03,
        "red": 0.99,
        "green": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "15024_688.jpg",
        "output": "course-discussion-row.jpg",
        "brightness": 1.06,
        "contrast": 1.10,
        "color": 1.22,
        "blue": 1.02,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "15024_714.jpg",
        "output": "course-seminar-wide.jpg",
        "brightness": 1.08,
        "contrast": 1.12,
        "color": 1.25,
        "blue": 1.04,
        "red": 0.98,
        "green": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "15024_724.jpg",
        "output": "course-classroom-circle.jpg",
        "brightness": 1.10,
        "contrast": 1.10,
        "color": 1.22,
        "blue": 1.04,
        "red": 0.98,
        "green": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "15024_578.jpg",
        "output": "course-whiteboard-practice.jpg",
        "brightness": 1.06,
        "contrast": 1.10,
        "color": 1.20,
        "blue": 1.03,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "15109_179.jpg",
        "output": "whiteboard-german-coaching.jpg",
        "brightness": 1.08,
        "contrast": 1.12,
        "color": 1.22,
        "blue": 1.03,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "Casa Schule2.JPG",
        "output": "learners-writing-class.jpg",
        "brightness": 1.06,
        "contrast": 1.08,
        "color": 1.20,
        "blue": 1.02,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "15024_722.jpg",
        "output": "learner-conversation-smile.jpg",
        "brightness": 1.10,
        "contrast": 1.08,
        "color": 1.25,
        "blue": 1.04,
        "red": 0.98,
        "green": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "15024_309.jpg",
        "output": "exam-preparation-writing.jpg",
        "brightness": 1.08,
        "contrast": 1.10,
        "color": 1.20,
        "blue": 1.03,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "15024_813.jpg",
        "output": "advising-session-classroom.jpg",
        "brightness": 1.10,
        "contrast": 1.10,
        "color": 1.22,
        "blue": 1.03,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "Einzelunterricht.jpg",
        "output": "individual-tutoring.jpg",
        "brightness": 1.08,
        "contrast": 1.10,
        "color": 1.20,
        "blue": 1.03,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "casa_corporate_teaching_discussion.jpg",
        "output": "business-german-group.jpg",
        "brightness": 1.06,
        "contrast": 1.10,
        "color": 1.22,
        "blue": 1.03,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "15024_098.jpg",
        "output": "study-materials-map.jpg",
        "brightness": 1.05,
        "contrast": 1.08,
        "color": 1.22,
        "blue": 1.02,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "Zimmer2.jpg",
        "output": "student-room-balcony.jpg",
        "brightness": 1.10,
        "contrast": 1.12,
        "color": 1.20,
        "blue": 1.04,
        "red": 0.98,
        "green": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "Küche.jpg",
        "output": "student-shared-kitchen.jpg",
        "brightness": 1.08,
        "contrast": 1.12,
        "color": 1.22,
        "blue": 1.03,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "Biber-WG4.jpg",
        "output": "shared-flat-kitchen-table.jpg",
        "brightness": 1.08,
        "contrast": 1.10,
        "color": 1.25,
        "blue": 1.03,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "bremen_schnoor_giebel.jpg",
        "output": "bremen-schnoor-houses.jpg",
        "brightness": 1.04,
        "contrast": 1.10,
        "color": 1.30,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "casa_student_talking.jpg",
        "output": "school-entrance-sign.jpg",
        "brightness": 1.06,
        "contrast": 1.10,
        "color": 1.18,
        "blue": 1.02,
        "red": 1.0,
        "green": 1.0,
        "autocontrast_cutoff": 0.5
    },
    # Alternative Candidates for Accommodation Review
    {
        "source": "Zimmer.jpg",
        "output": "student-room-alternative-1.jpg",
        "brightness": 1.10,
        "contrast": 1.12,
        "color": 1.20,
        "blue": 1.04,
        "red": 0.98,
        "green": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "CASA WG2.jpg",
        "output": "student-room-alternative-2.jpg",
        "brightness": 1.08,
        "contrast": 1.10,
        "color": 1.22,
        "blue": 1.03,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    {
        "source": "CASA WG3.jpg",
        "output": "student-room-alternative-3.jpg",
        "brightness": 1.08,
        "contrast": 1.10,
        "color": 1.22,
        "blue": 1.03,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    # FIXED: student-group-activity-outdoor.jpg (replaced Bremen places grid 'student_rallye_activity_14.jpg' with real outdoor student group activity 'student_rallye_activity_15.jpg')
    {
        "source": "student_rallye_activity_15.jpg",
        "output": "student-group-activity-outdoor.jpg",
        "brightness": 1.08,
        "contrast": 1.10,
        "color": 1.25,
        "blue": 1.02,
        "autocontrast_cutoff": 0.5
    },
    # FIXED: student-group-excursion.jpg (corrected museum visit excursions)
    {
        "source": "student_excursion_museum_12.jpg",
        "output": "student-group-excursion.jpg",
        "brightness": 1.08,
        "contrast": 1.10,
        "color": 1.22,
        "blue": 1.03,
        "red": 0.99,
        "autocontrast_cutoff": 0.5
    },
    # Do not generate portrait-style testimonial or team photos for the public site.
    # Story slots should use real CASA classroom, advising, exam, activity, or accommodation scenes.
]

def channel_balance(img: Image.Image, red: float = 1.0, green: float = 1.0, blue: float = 1.0) -> Image.Image:
    if (red, green, blue) == (1.0, 1.0, 1.0):
        return img
    r, g, b = img.split()
    r = r.point(lambda value: max(0, min(255, int(value * red))))
    g = g.point(lambda value: max(0, min(255, int(value * green))))
    b = b.point(lambda value: max(0, min(255, int(value * blue))))
    return Image.merge("RGB", (r, g, b))

def fractional_crop(img: Image.Image, crop: tuple[float, float, float, float]) -> Image.Image:
    width, height = img.size
    left, top, right, bottom = crop
    box = (
        round(width * left),
        round(height * top),
        round(width * right),
        round(height * bottom),
    )
    return img.crop(box)

def fit_long_edge(img: Image.Image, long_edge: int = 2400) -> Image.Image:
    width, height = img.size
    scale = long_edge / max(width, height)
    if scale >= 1:
        return img
    size = (round(width * scale), round(height * scale))
    return img.resize(size, Image.Resampling.LANCZOS)

def find_source_file(filename: str) -> Path:
    direct_path = SOURCE_ROOT / filename
    if direct_path.exists():
        return direct_path
        
    for root, dirs, files in os.walk(SOURCE_ROOT):
        for f in files:
            if f.lower() == filename.lower():
                return Path(root) / f
                
    raise FileNotFoundError(f"Could not find source image '{filename}' under '{SOURCE_ROOT}'")

def enhance_image(config: dict) -> bool:
    source_name = config["source"]
    output_name = config["output"]
    
    try:
        source_path = find_source_file(source_name)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return False
        
    output_path = TARGET_DIR / output_name
    print(f"Processing: {source_name} -> {output_name}")
    
    try:
        with Image.open(source_path) as img:
            # 1. Handle EXIF rotation and convert to RGB
            img = ImageOps.exif_transpose(img).convert("RGB")
            
            # 2. Apply fractional crop if configured (e.g. for vertical portraits)
            if "crop" in config:
                img = fractional_crop(img, config["crop"])
            
            # 3. Stretch dynamic range with autocontrast
            cutoff = config.get("autocontrast_cutoff", 0.5)
            img = ImageOps.autocontrast(img, cutoff=cutoff)
            
            # 4. Channel balance (neutralize warm/yellow color cast)
            img = channel_balance(
                img,
                red=config.get("red", 1.0),
                green=config.get("green", 1.0),
                blue=config.get("blue", 1.0),
            )
            
            # 5. Enhance Brightness, Contrast, Color (vibrancy)
            img = ImageEnhance.Brightness(img).enhance(config.get("brightness", 1.0))
            img = ImageEnhance.Contrast(img).enhance(config.get("contrast", 1.0))
            img = ImageEnhance.Color(img).enhance(config.get("color", 1.0))
            
            # 6. Fit long edge to 2400px (standard size)
            img = fit_long_edge(img, long_edge=2400)
            
            # 7. Apply UnsharpMask filter to crisp details
            img = img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=70, threshold=3))
            
            # 8. Save as optimized high-quality JPEG
            output_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(output_path, "JPEG", quality=90, optimize=True, progressive=True)
            print(f"  Saved to {output_path} (size: {output_path.stat().st_size / 1024:.1f} KB)")
            return True
    except Exception as e:
        print(f"  Failed to process {source_name}: {e}")
        return False

def main():
    print(f"Starting photo enhancement pipeline...")
    print(f"Source folder: {SOURCE_ROOT}")
    print(f"Target folder: {TARGET_DIR}")
    print("-" * 50)
    
    success_count = 0
    for config in CONFIGS:
        if enhance_image(config):
            success_count += 1
            
    print("-" * 50)
    print(f"Enhancement pipeline finished. Success: {success_count}/{len(CONFIGS)}")

if __name__ == "__main__":
    main()
