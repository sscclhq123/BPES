import json
from pathlib import Path

WORLD_SOURCE = Path("/tmp/ne-world.geojson")
KOREA_SOURCE = Path("/tmp/ne-countries-10m.geojson")
OUTPUT = Path(__file__).resolve().parents[1] / "studio-source" / "public" / "maps"


def rings(geometry):
    coordinates = geometry["coordinates"]
    if geometry["type"] == "Polygon":
        yield from coordinates
    elif geometry["type"] == "MultiPolygon":
        for polygon in coordinates:
            yield from polygon


def path_for(features, project):
    paths = []
    for feature in features:
        for ring in rings(feature["geometry"]):
            points = [project(lon, lat) for lon, lat, *_ in ring]
            if len(points) < 3:
                continue
            paths.append("M" + " ".join(f"{x:.2f},{y:.2f}" for x, y in points) + "Z")
    return " ".join(paths)


def write_svg(name, view_box, path, stroke_width):
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" role="img">'
        '<path fill="#e7eee9" stroke="#b9c9bf" '
        f'stroke-width="{stroke_width}" vector-effect="non-scaling-stroke" d="{path}"/>'
        '</svg>'
    )
    (OUTPUT / name).write_text(svg, encoding="utf-8")


OUTPUT.mkdir(parents=True, exist_ok=True)
world = json.loads(WORLD_SOURCE.read_text(encoding="utf-8"))["features"]
write_svg(
    "natural-earth-world.svg",
    "0 0 1000 500",
    path_for(world, lambda lon, lat: ((lon + 180) / 360 * 1000, (90 - lat) / 180 * 500)),
    0.8,
)

countries = json.loads(KOREA_SOURCE.read_text(encoding="utf-8"))["features"]
korea = [
    feature
    for feature in countries
    if feature["properties"].get("ADM0_A3") == "KOR"
    or feature["properties"].get("ISO_A3") == "KOR"
]
write_svg(
    "natural-earth-korea.svg",
    "0 0 500 500",
    path_for(
        korea,
        lambda lon, lat: (
            48 + (lon - 125.5) / (129.8 - 125.5) * 404,
            28 + (38.7 - lat) / (38.7 - 33.0) * 444,
        ),
    ),
    1.4,
)

(OUTPUT / "SOURCE.txt").write_text(
    "Natural Earth Admin 0 Countries, 1:110m and 1:10m. Public domain.\n"
    "https://www.naturalearthdata.com/downloads/\n",
    encoding="utf-8",
)
