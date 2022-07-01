# L'avancement du projet

## Logique de l'application
- Ajouter un état (initial, final, régulier) ✔️
- Ajouter une transition (entre 2 états/réflexive) ✔️
- Ajouter états spéciaux (point de jonction, point de décision) ❌
- Spécifier les états (entry/exit) et transitions (garde/action) ✔️
- Encapsuler dans un état composite ✔️
- Ajouter des régions à un état composite (état parallèle) ❌
- Associer une carte à un état ✔️
- Avoir une info sur une carte 🚧 (mapping uniquement pour l'instant)
- Lier l'état du diagramme à une carte pattern enregistrable ✔️
- Pouvoir utiliser une carte pattern ❌ (problèmes pour dupliquer les transitions, fonction *recursiveAvoidSameNames* de app.js)
- Mettre en oeuvre le slot correction/bonnes pratiques ❌

## Interface graphique
- Sélectionner les éléments = cliquer 🚧 (Possible pour tous les états et transitions mais comment signifier à l'utilisateur qu'il sélectionne un état initial ou final sachant que leur nom n'est pas affiché et donc pas coloré en bleu lorsque sélectionné)
- Renommer les éléments ✔️
- Supprimer les éléments ✔️

## Plateau physique

- Utiliser un seul module RC522 pour détecter une carte ✔️
- En utiliser plusieurs ❌ (essayé de m'inspirer de ce [forum](https://raspberrypi.stackexchange.com/questions/137059/how-to-connect-multiple-rfid-readers-rc522-to-a-rpi), voir les [schémas](./images/board)) L'idée serait de définir un pin GPIO du raspberry pour différencier chaque module grâce à son pin RST mais il faut modifier la [bibliothèque](https://github.com/mxgxw/MFRC522-python/blob/master/README.md)
- Concevoir le [plan](./images/board/box.svg) du plateau pour la découpe laser ✔️ (dimensions à valider, 25x25x3cm devrait permettre de faire passer le raspberry, les câbles et les modules. Trou pour faire passer l'alimentation déjà dessiné sur une face. Il reste à savoir comment agencer tout ça).
- Appliquer le design sur les cartes ❌ (stickers ?) 