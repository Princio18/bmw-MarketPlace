-- Assignation accessoire <-> véhicule.
--
-- Jusqu'ici `GET /api/accessories` renvoyait TOUT le catalogue actif à tous les
-- véhicules : un accessoire ne pouvait pas être proposé sur un seul modèle.
-- Cette table de jointure lie explicitement chaque accessoire aux véhicules sur
-- lesquels il est proposé (onglet « Options » du configurateur).
--
-- Aucune ligne insérée par la migration : la table reste vide après application,
-- donc le catalogue reste affiché pour tous les véhicules tant qu'aucune
-- liaison n'est créée (comportement inchangé au déploiement).
--
-- ON DELETE CASCADE sur les deux FK : supprimer un véhicule ou un accessoire
-- retire automatiquement la liaison (pas de ligne orpheline).

-- CreateTable
CREATE TABLE "vehicle_accessories" (
    "vehicle_id" UUID NOT NULL,
    "accessory_id" UUID NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_accessories_pkey" PRIMARY KEY ("vehicle_id","accessory_id")
);

-- CreateIndex : le sens inverse (tous les véhicules d'un accessoire) est
-- couvert par une recherche sur `accessory_id` ; la PK couvre déjà `vehicle_id`.
CREATE INDEX "idx_vehicle_accessories_accessory" ON "vehicle_accessories" ("accessory_id");

-- AddForeignKey
ALTER TABLE "vehicle_accessories" ADD CONSTRAINT "vehicle_accessories_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_accessories" ADD CONSTRAINT "vehicle_accessories_accessory_id_fkey" FOREIGN KEY ("accessory_id") REFERENCES "accessories"("id") ON DELETE CASCADE ON UPDATE CASCADE;