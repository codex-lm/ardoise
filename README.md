# Ardoise

**Le Jeu de la vie de Conway sur un tableau d'école** — douze défis à la craie
et un atelier libre, en anglais, français et espagnol.

Un jeu de Cédric Bernadac, créé avec des agents IA (ZCode & Kimi K3.1 Pro).

## Le jeu

Une seule règle : une case morte entourée d'exactement 3 voisines vivantes
naît ; une cellule vivante entourée de 2 ou 3 voisines survit ; tout le reste
meurt (B3/S23). Tout ce qui suit — planeurs, oscillateurs, canons à planeurs —
n'est que conséquence.

**Défis (12).** Chaque défi donne une colonie et un budget de craie. On modifie
le plateau pendant que la vie est en pause (chaque trait de craie compte), puis
on laisse la vie courir jusqu'à la cloche :

- **Équilibre** — exactement N cellules vivantes quand la cloche sonne ;
- **Sauvetage** — colonie condamnée : ajouter jusqu'à K cellules pour dépasser
  N vivantes à la génération G ;
- **Extinction** — effacer jusqu'à K cellules pour vider le tableau avant G ;
- **Croissance** — poser exactement B cellules dans la zone à la craie, la plus
  grande population à la génération G gagne les étoiles.

★★★ récompense les solutions les plus économes. Un indice (solution de
référence trouvée par recherche réelle — beam search / recherche aléatoire)
peut être montré, au prix d'une étoile.

**Atelier.** Grande planche (bords rejoints au choix), vitesse 1–60 gén./s,
pas-à-pas, saupoudrage, et une bibliothèque des motifs célèbres : bloc, ruche,
clignotant, crapaud, balise, pulsar, pentadécathlon, planeur, vaisseau léger,
R-pentomino, gland, « coriace » et canon à planeurs de Gosper. Détection de
cycles : figures fixes et oscillateurs sont nommés, avec leur période.

**Détails.** Craie blanche à la naissance, jaune en vieillissant ; poussière à
chaque naissance et traînée fantôme à chaque mort ; sons doux synthétisés
(WebAudio) ; interface tactile, souris ou stylet ; Espace = pause, S = pas à
pas, R = tourner le tampon (atelier).

## Sources et construction

`index.html` est le paquet autonome publié (styles et scripts inlinés, aucune
ressource externe). Les sources modifiables sont dans `assets/` :

- `engine.js` — moteur Life (double tampon, torus optionnel, âges, détection de
  cycles par hachage, bibliothèque de motifs) ; pur, testable sous Node ;
- `levels.js` — défis, pars et solutions de référence (généré, voir below) ;
- `i18n.js` — interface EN/FR/ES ;
- `audio.js` — sons synthétisés ;
- `ui.js` — interface, rendu craie sur canvas, défis et atelier ;
- `style.css` — tableau d'école : ardoise `#2f4a3f`, craie `#f2f0e4`,
  craie jaune `#e8d44d`, bois `#8a6b4a`.

`levels.js` est généré par le harnais de conception (beam search pour les défis
d'action, recherche aléatoire dirigée pour la croissance) : chaque défi est
prouvé solvable par re-simulation, et les seuils d'étoiles viennent de
populations réellement atteintes. Le harnais et les tests vivent hors de ce
dépôt, dans l'atelier local.

Publication : LOB7 (fiche `LOB7-GAME.json`, licence MIT).

## Crédits

- Règle : John Horton Conway (1937–2020), *Game of Life* (1970).
- « Jeu de la vie » exploré par des générations de joueurs depuis les colonnes
  de Martin Gardner dans *Scientific American* (1970).
- Canon à planeurs : Bill Gosper (1970).
- Jeu, code et graphismes : Cédric Bernadac avec les agents IA Z Code
  (GLM) et Kimi K3.1 Pro.
