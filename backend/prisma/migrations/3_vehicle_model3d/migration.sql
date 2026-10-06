-- Assignation des modèles 3D par véhicule.
--
-- Jusqu'ici les URLs des modèles glTF étaient des constantes hardcodées dans le
-- frontend (`/models/vehicle-exterior.glb`, `/models/vehicle-interior.glb`),
-- donc identiques pour TOUS les véhicules. Ces deux colonnes permettent de
-- rattacher un `.glb` donné à un véhicule donné.
--
-- Le champ stocké est un SIMPLE NOM DE FICHIER (`ix.glb`), jamais un chemin :
-- le préfixe `/models/exteriors/` ou `/models/interiors/` est préfixé côté
-- serveur dans les sélecteurs SQL. Un nom de fichier n'autorise jamais `/` ni
-- `..` (validé dans `validateVehicleFields`), ce qui exclut toute traversée de
-- chemin quand le frontend compose l'URL.
--
-- NULL = aucun modèle pour ce côté. C'est la valeur de tous les véhicules
-- existants : la migration est non destructive et ne change aucun comportement
-- (le bouton 360 reste actif et affiche l'écran « modèle non disponible »
-- existant tant que la colonne est NULL).
--
-- La normalisation `'' → NULL` est faite côté backend à l'écriture : un nom
-- vide ne doit jamais devenir une URL non NULL (`'/models/exteriors/' || ''`),
-- ce qui activerait un bouton pointant vers un fichier inexistant.

-- AlterTable
ALTER TABLE "vehicles"
    ADD COLUMN "model3d_exterior_filename" TEXT,
    ADD COLUMN "model3d_interior_filename" TEXT;
