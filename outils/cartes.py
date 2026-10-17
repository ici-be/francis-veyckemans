#!/usr/bin/env python3
"""Fonds de carte du site (cartes/*.svg) et leurs paramètres de projection (cartes/cartes.json).

À relancer seulement pour changer le cadrage ou ajouter une région : les lieux eux-mêmes sont placés
par le navigateur (carte.js) d'après donnees/lieux.csv, avec la même projection.

Données : Natural Earth (domaine public), via le paquet world-atlas.
Projection : azimutale équivalente de Lambert, centrée sur chaque carte.

Usage : python3 outils/cartes.py
"""
import json
import math
from pathlib import Path

import requests

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "cartes"
ATLAS = "https://unpkg.com/world-atlas@2.0.2/countries-{}.json"

# id, titre, détail (50m ou 110m), largeur en px, centre (lon, lat), cadre (lon min, lat min, lon max, lat max)
CARTES = [
    ("europe", "Europe", "50m", 1000, (10, 52), (-10, 35.5, 32, 61)),
    ("belgique", "Belgique et environs", "50m", 600, (4.8, 51), (2.2, 49.5, 7.2, 52.8)),
    # petites cartes « hors d'Europe » : affichées seulement si un lieu s'y trouve
    ("amerique-nord", "Amérique du Nord", "110m", 320, (-96, 38), (-126, 18, -64, 54)),
    ("amerique-sud", "Amérique du Sud", "110m", 320, (-60, -18), (-84, -55, -34, 13)),
    ("afrique", "Afrique", "110m", 320, (17, 3), (-19, -35, 52, 37)),
    ("asie", "Asie", "110m", 320, (95, 25), (35, -11, 148, 55)),
    ("oceanie", "Océanie", "110m", 320, (148, -27), (112, -47, 179, -9)),
]


def polygones(topo):
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def anneau(indices):
        pts = []
        for i in indices:
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            pts.extend(a if not pts else a[1:])
        return pts

    for g in topo["objects"]["countries"]["geometries"]:
        polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"] if g["type"] == "MultiPolygon" else []
        for p in polys:
            for r in p:
                yield anneau(r)


def laea(centre):
    l0, p0 = math.radians(centre[0]), math.radians(centre[1])

    def proj(lon, lat):
        l, p = math.radians(lon), math.radians(lat)
        cos_c = math.sin(p0) * math.sin(p) + math.cos(p0) * math.cos(p) * math.cos(l - l0)
        if cos_c < -0.2:  # face cachée du globe
            return None
        k = math.sqrt(2 / (1 + cos_c))
        return k * math.cos(p) * math.sin(l - l0), -k * (math.cos(p0) * math.sin(p) - math.sin(p0) * math.cos(p) * math.cos(l - l0))
    return proj


def carte(ident, titre, detail, largeur, centre, cadre, topo):
    proj = laea(centre)
    lon0, lat0, lon1, lat1 = cadre
    bord = [proj(lon0 + (lon1 - lon0) * i / 40, lat) for i in range(41) for lat in (lat0, lat1)] + \
           [proj(lon, lat0 + (lat1 - lat0) * i / 40) for i in range(41) for lon in (lon0, lon1)]
    x0, x1 = min(b[0] for b in bord), max(b[0] for b in bord)
    y0, y1 = min(b[1] for b in bord), max(b[1] for b in bord)
    k = largeur / (x1 - x0)
    hauteur = round((y1 - y0) * k)
    marge_lon, marge_lat = (lon1 - lon0) * 0.6 + 10, (lat1 - lat0) * 0.6 + 10
    morceaux = []
    for r in polygones(topo):
        if not any(lon0 - marge_lon < lon < lon1 + marge_lon and lat0 - marge_lat < lat < lat1 + marge_lat for lon, lat in r):
            continue
        # anneau à cheval sur l'antiméridien (Russie, Fidji) : ramené du côté de la carte
        if any(abs(a[0] - b[0]) > 180 for a, b in zip(r, r[1:])):
            r = [(lon + 360 if centre[0] > 0 and lon < 0 else lon - 360 if centre[0] <= 0 and lon > 0 else lon, lat) for lon, lat in r]
        # anneau très étendu : borné autour du cadre
        r = [(min(max(lon, lon0 - marge_lon), lon1 + marge_lon), min(max(lat, lat0 - marge_lat), lat1 + marge_lat)) for lon, lat in r]
        pts = [proj(lon, lat) for lon, lat in r]
        if any(p is None for p in pts):
            continue
        pts = [(round((x - x0) * k), round((y - y0) * k)) for x, y in pts]
        if max(x for x, _ in pts) < 0 or min(x for x, _ in pts) > largeur or max(y for _, y in pts) < 0 or min(y for _, y in pts) > hauteur:
            continue
        if max(x for x, _ in pts) - min(x for x, _ in pts) < 2 and max(y for _, y in pts) - min(y for _, y in pts) < 2:
            continue
        d = []
        for p in pts:
            if not d or p != d[-1]:
                d.append(p)
        if len(d) > 2:
            morceaux.append("M" + "L".join(f"{x},{y}" for x, y in d) + "Z")
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {largeur} {hauteur}" '
           f'preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="{"".join(morceaux)}"/></svg>')
    (SORTIE / f"{ident}.svg").write_text(svg)
    print(f"{ident}.svg : {largeur}×{hauteur}, {len(svg) // 1024} Ko")
    return {"id": ident, "titre": titre, "fichier": f"cartes/{ident}.svg", "w": largeur, "h": hauteur,
            "centre": list(centre), "x0": x0, "y0": y0, "k": k, "cadre": list(cadre)}


def main():
    SORTIE.mkdir(exist_ok=True)
    atlas = {d: requests.get(ATLAS.format(d), timeout=60).json() for d in ("50m", "110m")}
    cartes = [carte(*c[:5], c[5], atlas[c[2]]) for c in CARTES]
    (SORTIE / "cartes.json").write_text(json.dumps(cartes, ensure_ascii=False, indent=1))
    print("Écrit : cartes/cartes.json")


if __name__ == "__main__":
    main()
