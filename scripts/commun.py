"""Fonctions partagées par les scripts du Kit Bac de français — classiques libres."""
import csv
import re
import unicodedata
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
CATALOGUE = RACINE / "catalogue.csv"
DOSSIER_EPUB = RACINE / "epub"

# groupe : objet d'étude du programme de première (voir GROUPES)
# annee : année de première publication de l'œuvre
# bac : années de l'épreuve anticipée de français où l'œuvre est au programme (ex. « 2020-2023 »)
# voie : G (générale), T (technologique) ou G+T
# programme : partie de l'œuvre au programme, si ce n'est pas l'œuvre entière
# source : « bnr » (Bibliothèque numérique romande), « wikisource » ou « autre »
# page : fiche du livre sur le site source ; url : lien direct vers l'EPUB
# autres_sources : autres éditions libres (Ebooks libres et gratuits, Bibebook, Gutenberg), séparées par « | »
COLONNES = ["groupe", "auteur", "titre", "annee", "bac", "voie", "programme",
            "source", "page", "url", "wikisource", "statut", "autres_sources"]

GROUPES = {
    "poesie": "Poésie — du XIXe au XXIe siècle",
    "idees": "Littérature d'idées — du XVIe au XVIIIe siècle",
    "roman": "Roman et récit — du Moyen Âge au XXIe siècle",
    "theatre": "Théâtre — du XVIIe au XXIe siècle",
}


def sans_accents(texte):
    """Supprime accents et caractères spéciaux (noms de fichiers sûrs pour les vieilles liseuses)."""
    texte = texte.replace("œ", "oe").replace("Œ", "Oe").replace("æ", "ae")
    texte = re.sub(r"[’‘'`]", " ", texte)
    texte = unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode()
    texte = re.sub(r"[^A-Za-z0-9 \-]", "", texte)
    return re.sub(r"\s+", " ", texte).strip()


def nom_fichier(ligne):
    """« Voltaire - L Ingenu.epub »"""
    return f"{sans_accents(ligne['auteur'])} - {sans_accents(ligne['titre'])}.epub"


def chemin_epub(ligne):
    return DOSSIER_EPUB / ligne["groupe"] / nom_fichier(ligne)


def mention_bac(ligne):
    """« Bac 2020-2023 » ou « Bac 2027 · voie T »."""
    texte = f"Bac {ligne['bac']}"
    if ligne["voie"] in ("G", "T"):
        texte += f" · voie {ligne['voie']}"
    return texte


def lire_catalogue():
    with open(CATALOGUE, newline="", encoding="utf-8") as f:
        lignes = list(csv.DictReader(f))
    for l in lignes:
        for c in COLONNES:
            l.setdefault(c, "")
            l[c] = (l[c] or "").strip()
    return lignes


def ecrire_catalogue(lignes):
    with open(CATALOGUE, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLONNES, extrasaction="ignore")
        w.writeheader()
        w.writerows(lignes)
