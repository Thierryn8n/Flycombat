-- ============================================
-- Seed default aircraft
-- ============================================

INSERT INTO public.aircraft (name, description, category, country, base_speed, base_health, base_damage, base_armor, flygold_price, is_default, is_published, parts_json) VALUES
(
  'Falcon MK-I',
  'Caca leve e agil, ideal para iniciantes. Velocidade alta e manobrabilidade excelente.',
  'fighter',
  'Brasil',
  120, 80, 12, 4, 0, true, true,
  '[{"id":"fuselage_main","label":"Fuselagem Principal","type":"fuselage","x":0,"y":0,"z":0,"w":6,"h":1.5,"d":1.5,"color":"#94A3B8"},{"id":"wing_left","label":"Asa Esquerda","type":"wing","x":-1,"y":0,"z":-4,"w":1,"h":0.2,"d":4,"color":"#64748B"},{"id":"wing_right","label":"Asa Direita","type":"wing","x":-1,"y":0,"z":4,"w":1,"h":0.2,"d":4,"color":"#64748B"},{"id":"tail_v","label":"Estabilizador Vertical","type":"tail","x":-3,"y":1,"z":0,"w":1,"h":1.5,"d":0.15,"color":"#475569"},{"id":"tail_h","label":"Estabilizador Horizontal","type":"tail","x":-3,"y":0.3,"z":0,"w":0.8,"h":0.12,"d":2,"color":"#475569"},{"id":"cockpit","label":"Cockpit","type":"cockpit","x":2,"y":0.5,"z":0,"w":1.5,"h":0.8,"d":0.8,"color":"#38BDF8"},{"id":"engine_l","label":"Motor Esquerdo","type":"engine","x":-2,"y":-0.3,"z":-1.5,"w":1.5,"h":0.6,"d":0.6,"color":"#F97316"},{"id":"engine_r","label":"Motor Direito","type":"engine","x":-2,"y":-0.3,"z":1.5,"w":1.5,"h":0.6,"d":0.6,"color":"#F97316"},{"id":"nose","label":"Cone Frontal","type":"fuselage","x":3,"y":0,"z":0,"w":1,"h":0.8,"d":0.8,"color":"#CBD5E1"}]'::jsonb
),
(
  'Thunderhawk X',
  'Caca pesado de combate. Dano alto e blindagem robusta.',
  'fighter',
  'EUA',
  100, 130, 18, 8, 500, false, true,
  '[{"id":"fuselage_main","label":"Fuselagem Principal","type":"fuselage","x":0,"y":0,"z":0,"w":7,"h":1.8,"d":2,"color":"#374151"},{"id":"wing_left","label":"Asa Esquerda","type":"wing","x":-0.5,"y":0,"z":-5,"w":2,"h":0.3,"d":5,"color":"#1F2937"},{"id":"wing_right","label":"Asa Direita","type":"wing","x":-0.5,"y":0,"z":5,"w":2,"h":0.3,"d":5,"color":"#1F2937"},{"id":"tail_v_l","label":"Estab. Vertical Esq","type":"tail","x":-3.5,"y":0.8,"z":-1,"w":1,"h":1.8,"d":0.15,"color":"#111827"},{"id":"tail_v_r","label":"Estab. Vertical Dir","type":"tail","x":-3.5,"y":0.8,"z":1,"w":1,"h":1.8,"d":0.15,"color":"#111827"},{"id":"cockpit","label":"Cockpit","type":"cockpit","x":2.5,"y":0.6,"z":0,"w":1.8,"h":0.9,"d":1,"color":"#60A5FA"},{"id":"engine_l","label":"Motor Esquerdo","type":"engine","x":-2.5,"y":-0.2,"z":-1.8,"w":2,"h":0.8,"d":0.8,"color":"#EF4444"},{"id":"engine_r","label":"Motor Direito","type":"engine","x":-2.5,"y":-0.2,"z":1.8,"w":2,"h":0.8,"d":0.8,"color":"#EF4444"},{"id":"weapon_l","label":"Missil Esquerdo","type":"weapon","x":0,"y":-0.5,"z":-3,"w":1.5,"h":0.3,"d":0.3,"color":"#FCD34D"},{"id":"weapon_r","label":"Missil Direito","type":"weapon","x":0,"y":-0.5,"z":3,"w":1.5,"h":0.3,"d":0.3,"color":"#FCD34D"}]'::jsonb
),
(
  'Phantom Stealth',
  'Aeronave furtiva com design angular. Dificil de detectar.',
  'experimental',
  'Russia',
  110, 100, 15, 6, 1200, false, true,
  '[{"id":"fuselage_main","label":"Fuselagem Principal","type":"fuselage","x":0,"y":0,"z":0,"w":8,"h":1.2,"d":2.5,"color":"#1E293B"},{"id":"wing_left","label":"Asa Esquerda Delta","type":"wing","x":-1,"y":0,"z":-4,"w":4,"h":0.15,"d":4,"color":"#0F172A"},{"id":"wing_right","label":"Asa Direita Delta","type":"wing","x":-1,"y":0,"z":4,"w":4,"h":0.15,"d":4,"color":"#0F172A"},{"id":"tail_v","label":"Estab. Vertical","type":"tail","x":-4,"y":0.8,"z":0,"w":1.2,"h":1.2,"d":0.12,"color":"#334155"},{"id":"cockpit","label":"Cockpit","type":"cockpit","x":3,"y":0.4,"z":0,"w":2,"h":0.6,"d":0.9,"color":"#22D3EE"},{"id":"engine_c","label":"Motor Central","type":"engine","x":-3,"y":-0.1,"z":0,"w":2.5,"h":0.9,"d":1.2,"color":"#7C3AED"}]'::jsonb
),
(
  'Sky Fortress',
  'Bombardeiro pesado. Lento mas devastador. Vida altissima.',
  'bomber',
  'Alemanha',
  70, 200, 25, 12, 2500, false, true,
  '[{"id":"fuselage_main","label":"Fuselagem Principal","type":"fuselage","x":0,"y":0,"z":0,"w":10,"h":2.5,"d":3,"color":"#57534E"},{"id":"wing_left","label":"Asa Esquerda","type":"wing","x":-1,"y":0.3,"z":-6,"w":3,"h":0.4,"d":6,"color":"#44403C"},{"id":"wing_right","label":"Asa Direita","type":"wing","x":-1,"y":0.3,"z":6,"w":3,"h":0.4,"d":6,"color":"#44403C"},{"id":"tail_v","label":"Estab. Vertical","type":"tail","x":-5,"y":1.5,"z":0,"w":1.5,"h":2.5,"d":0.2,"color":"#292524"},{"id":"tail_h","label":"Estab. Horizontal","type":"tail","x":-5,"y":0.5,"z":0,"w":1.2,"h":0.15,"d":3,"color":"#292524"},{"id":"cockpit","label":"Cockpit","type":"cockpit","x":4,"y":0.8,"z":0,"w":2,"h":1.2,"d":1.5,"color":"#A3E635"},{"id":"engine_1","label":"Motor 1","type":"engine","x":-1,"y":-0.5,"z":-3,"w":2,"h":1,"d":1,"color":"#DC2626"},{"id":"engine_2","label":"Motor 2","type":"engine","x":-1,"y":-0.5,"z":3,"w":2,"h":1,"d":1,"color":"#DC2626"},{"id":"engine_3","label":"Motor 3","type":"engine","x":-1,"y":-0.5,"z":-5,"w":2,"h":1,"d":1,"color":"#DC2626"},{"id":"engine_4","label":"Motor 4","type":"engine","x":-1,"y":-0.5,"z":5,"w":2,"h":1,"d":1,"color":"#DC2626"},{"id":"bomb_bay","label":"Baia de Bombas","type":"weapon","x":0,"y":-1,"z":0,"w":4,"h":0.5,"d":1.5,"color":"#FDE047"}]'::jsonb
);
