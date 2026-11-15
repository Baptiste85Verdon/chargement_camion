-- Données de démarrage (RG-01) : base d'exemple, plausible mais fictive, et
-- modifiable dans l'application.
--
-- - 24 articles en 9 familles et 4 modèles de camions (captures 07 et 09) ;
-- - la tournée T-2026-118 du jeu d'essai « couloirs » (cahier technique,
--   section 8 ; tests/jeux-essai/couloirs.json), en préparation.
--
-- Rejouable à volonté : chaque ligne a un identifiant fixe, et une ligne déjà
-- présente est laissée telle quelle (on conflict do nothing), même si
-- l'utilisateur l'a modifiée entre-temps.
--
-- Dimensions en millimètres, en pose « à plat » (cahier technique, 4.7) :
-- une fenêtre de 1 500 × 1 350 × 180 à plat occupe 1 500 × 180 × 1 350 debout.

-- ---------------------------------------------------------------------------
-- Modèles de camions : dimensions utiles de la caisse
-- ---------------------------------------------------------------------------
insert into public.modele_camion (id, nom, longueur, largeur, hauteur) values
  ('c0000000-0000-4000-8000-000000000001', 'Porteur 7,2 m', 7200, 2400, 2500),
  ('c0000000-0000-4000-8000-000000000002', 'Porteur 6,2 m', 6200, 2450, 2400),
  ('c0000000-0000-4000-8000-000000000003', 'Porteur 8,5 m', 8500, 2450, 2600),
  ('c0000000-0000-4000-8000-000000000004', 'Fourgon 20 m³', 4400, 2050, 2200)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Catalogue des articles
-- ---------------------------------------------------------------------------
insert into public.article (
  id, reference, nom, famille,
  longueur_emballee, largeur_emballee, hauteur_emballee,
  longueur_nue, largeur_nue, hauteur_nue,
  poids, fragile, orientations, forme, dessus_porteur
) values
  -- Fenêtres : transportées debout (RG-04), fragiles, livrables nues.
  ('a0000000-0000-4000-8000-000000000001', 'FEN-PVC-2V', 'Fenêtre PVC 2 vantaux 150 × 135', 'Fenêtres',
    1500, 1350, 180, 1450, 1300, 80, 45, true, array['debout'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000002', 'FEN-CIN-120', 'Fenêtre cintrée PVC 120 × 140', 'Fenêtres',
    1200, 1400, 180, 1150, 1350, 80, 38, true, array['debout'], 'irreguliere', false),
  ('a0000000-0000-4000-8000-000000000003', 'FEN-PVC-1V', 'Fenêtre PVC 1 vantail 60 × 125', 'Fenêtres',
    650, 1300, 180, 600, 1250, 80, 22, true, array['debout'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000004', 'FEN-ALU-BC', 'Baie coulissante alu 240 × 215', 'Fenêtres',
    2450, 2200, 250, 2400, 2150, 120, 110, true, array['debout'], 'rectangulaire', true),
  -- Fenêtres de toit
  ('a0000000-0000-4000-8000-000000000005', 'VLX-GGL-MK04', 'Fenêtre de toit Velux 78 × 98', 'Fenêtres de toit',
    1040, 840, 230, null, null, null, 21, true, array['a_plat', 'debout'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000006', 'VLX-GGL-SK06', 'Fenêtre de toit Velux 114 × 118', 'Fenêtres de toit',
    1240, 1200, 230, null, null, null, 32, true, array['a_plat', 'debout'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000007', 'VLX-EDW-MK04', 'Raccord d''étanchéité Velux 78 × 98', 'Fenêtres de toit',
    1000, 400, 150, null, null, null, 6, false, array['a_plat'], 'rectangulaire', true),
  -- Plaques de plâtre : à plat ou debout contre une paroi (RG-04).
  ('a0000000-0000-4000-8000-000000000008', 'PLQ-BA13', 'Paquet de plaques BA13 250 × 120', 'Plaques de plâtre',
    2500, 1200, 250, null, null, null, 500, false, array['a_plat', 'contre_paroi'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000009', 'PLQ-BA13H', 'Paquet de plaques BA13 hydro 260 × 120', 'Plaques de plâtre',
    2600, 1200, 260, null, null, null, 600, false, array['a_plat', 'contre_paroi'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000010', 'PLQ-BA18', 'Paquet de plaques BA18 phoniques 250 × 120', 'Plaques de plâtre',
    2500, 1200, 270, null, null, null, 720, false, array['a_plat', 'contre_paroi'], 'rectangulaire', true),
  -- Planches et panneaux
  ('a0000000-0000-4000-8000-000000000011', 'PLA-PIN-4', 'Botte de planches de pin 4 m', 'Planches et panneaux',
    4000, 1000, 400, null, null, null, 800, false, array['a_plat'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000012', 'PLA-DOU-3', 'Botte de planches de douglas 3 m', 'Planches et panneaux',
    3000, 800, 300, null, null, null, 220, false, array['a_plat'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000013', 'PLA-OSB-18', 'Paquet de panneaux OSB 18 mm', 'Planches et panneaux',
    2500, 1250, 450, null, null, null, 700, false, array['a_plat', 'contre_paroi'], 'rectangulaire', true),
  -- Poutres et charpente
  ('a0000000-0000-4000-8000-000000000014', 'POU-LC-2040', 'Poutre lamellé-collé 200 × 400', 'Poutres et charpente',
    8000, 200, 400, null, null, null, 293, false, array['a_plat'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000015', 'POU-BAS-4', 'Bastaing sapin 63 × 175, 4 m', 'Poutres et charpente',
    4000, 175, 63, null, null, null, 15, false, array['a_plat'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000016', 'POU-CHE-4', 'Botte de chevrons 63 × 75, 4 m', 'Poutres et charpente',
    4000, 400, 300, null, null, null, 90, false, array['a_plat'], 'rectangulaire', true),
  -- Maçonnerie
  ('a0000000-0000-4000-8000-000000000017', 'MAC-PAR-20', 'Palette de parpaings 20 cm', 'Maçonnerie',
    1200, 1000, 1050, null, null, null, 1225, false, array['a_plat'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000018', 'MAC-CIM-35', 'Palette de sacs de ciment 35 kg', 'Maçonnerie',
    1200, 1000, 1100, null, null, null, 1425, false, array['a_plat'], 'rectangulaire', true),
  -- Couverture
  ('a0000000-0000-4000-8000-000000000019', 'COU-TUI-MEC', 'Palette de tuiles mécaniques', 'Couverture',
    1200, 1000, 1100, null, null, null, 1150, false, array['a_plat'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000020', 'COU-CRO', 'Carton de crochets de tuile', 'Couverture',
    400, 300, 300, null, null, null, 12, false, array['a_plat'], 'rectangulaire', true),
  -- Isolation : un rouleau n'a pas un dessus porteur (RG-18).
  ('a0000000-0000-4000-8000-000000000021', 'ISO-LV-100', 'Rouleau de laine de verre 100 mm', 'Isolation',
    1200, 400, 400, null, null, null, 12, false, array['a_plat'], 'cylindrique', false),
  -- Quincaillerie
  ('a0000000-0000-4000-8000-000000000022', 'QUI-CAR', 'Carton de quincaillerie', 'Quincaillerie',
    600, 600, 600, null, null, null, 30, false, array['a_plat'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000023', 'QUI-VIS-35', 'Boîte de vis à plaque 3,5 × 35', 'Quincaillerie',
    200, 150, 100, null, null, null, 4, false, array['a_plat'], 'rectangulaire', true),
  ('a0000000-0000-4000-8000-000000000024', 'QUI-RAIL-M48', 'Botte de rails métalliques M48, 3 m', 'Quincaillerie',
    3000, 300, 150, null, null, null, 40, false, array['a_plat'], 'rectangulaire', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Tournée T-2026-118 : jeu d'essai « couloirs », Porteur 7,2 m
-- ---------------------------------------------------------------------------
insert into public.tournee (id, reference, date_livraison, modele_camion_id, statut) values
  ('b0000000-0000-4000-8000-000000000118', 'T-2026-118', '2026-11-05',
    'c0000000-0000-4000-8000-000000000001', 'en_preparation')
on conflict (id) do nothing;

-- Le rang de livraison donne le code affiché : C1 est livrée en premier.
insert into public.commande (id, tournee_id, numero, destination, ville, rang_livraison) values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000118',
    'CMD-2026-0431', 'Menuiserie Dubois', null, 1),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000118',
    'CMD-2026-0432', 'Chantier Les Ormeaux', null, 2),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000118',
    'CMD-2026-0433', 'SCI Martin', null, 3),
  ('d0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000118',
    'CMD-2026-0434', 'Maçonnerie Pereira', null, 4)
on conflict (id) do nothing;

insert into public.ligne_commande (
  id, commande_id, article_id, quantite, nu,
  longueur_propre, largeur_propre, hauteur_propre, poids_propre, poids_estime
) values
  -- C1 : deux poutres recoupées à 6 m pour cette commande (RG-03) ;
  -- poids proposé au prorata du volume, 293 × 6 000 / 8 000 ≈ 220 kg, estimé.
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000014', 2, false, 6000, 200, 400, 220, true),
  -- C2 : deux fenêtres PVC 2 vantaux emballées (A10, A11), un carton de quincaillerie (A12).
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001', 2, false, null, null, null, null, false),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000022', 1, false, null, null, null, null, false),
  -- C3 : deux paquets de BA13 (A04, A05), deux bottes de planches de pin (A06, A07).
  ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000008', 2, false, null, null, null, null, false),
  ('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000011', 2, false, null, null, null, null, false),
  -- C4 : deux palettes de parpaings (A01, A03), une palette de ciment (A02).
  ('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000017', 2, false, null, null, null, null, false),
  ('e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000018', 1, false, null, null, null, null, false)
on conflict (id) do nothing;
